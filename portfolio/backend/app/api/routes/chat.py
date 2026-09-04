import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_db, verify_csrf
from app.core.ip import get_client_ip
from app.core.config import get_settings
from app.core.logging import security_logger
from app.core.turnstile import verify_turnstile_token
from app.schemas.chat import (
    BlockedIpOut,
    ChatCsrfTokenOut,
    ChatMessageCreate,
    ChatMessageOut,
    ConversationCreate,
    ConversationCreateResponse,
    ConversationOut,
    ConversationStatusUpdate,
)
from app.services import chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

VISITOR_TOKEN_COOKIE = "visitor_token"
CHAT_CSRF_COOKIE = "chat_csrf_token"
CHAT_CSRF_HEADER = "X-Chat-CSRF-Token"


def _set_visitor_cookies(response: Response, raw_token: str) -> None:
    # httpOnly: an XSS elsewhere on the site can't read/exfiltrate this —
    # it's the actual bearer credential for the anonymous chat session.
    response.set_cookie(
        key=VISITOR_TOKEN_COOKIE,
        value=raw_token,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        max_age=60 * 60 * 24 * 30,
        path="/api/chat",
    )
    # SameSite=None (required cross-origin, frontend/backend live on
    # different domains) means the browser attaches visitor_token even on
    # cross-site requests — a forged <form>/fetch from another origin can
    # trigger a POST here. This second cookie is the CSRF compensating
    # control (double-submit): non-httpOnly so it CAN be handed to the
    # widget (via GET /csrf-token, since cross-origin JS can't read a
    # cookie set by a different domain directly), but a cross-site
    # attacker page can never read it, so it can't be echoed back in the
    # X-Chat-CSRF-Token header. Kept separate (different name/path) from
    # the admin panel's csrf_token cookie so the two never collide in a
    # browser that has both an admin and a visitor session open.
    response.set_cookie(
        key=CHAT_CSRF_COOKIE,
        value=secrets.token_urlsafe(32),
        httponly=False,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        max_age=60 * 60 * 24 * 30,
        path="/api/chat",
    )


def verify_chat_csrf(request: Request) -> None:
    cookie_token = request.cookies.get(CHAT_CSRF_COOKIE)
    header_token = request.headers.get(CHAT_CSRF_HEADER)

    if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid CSRF token.",
        )


def _set_chat_csrf_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=CHAT_CSRF_COOKIE,
        value=raw_token,
        httponly=False,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        max_age=60 * 60 * 24 * 30,
        path="/api/chat",
    )

def _require_conversation_by_token(db: Session, token: str | None):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing visitor token.")
    conversation = chat_service.get_conversation_by_token(db, token)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conversation


def _require_conversation_by_id(db: Session, conversation_id: int):
    conversation = chat_service.get_conversation_by_id(db, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conversation


@router.post("/conversations", response_model=ConversationCreateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_CHAT_START)
async def start_conversation(request: Request, response: Response, payload: ConversationCreate, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)

    if not await verify_turnstile_token(payload.turnstile_token, client_ip):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Security verification failed.")

    try:
        conversation, raw_token = chat_service.create_conversation(db, client_ip)
    except chat_service.IpBlockedError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation is no longer open.")
    security_logger.info("chat_conversation_created id=%s ip=%s", conversation.id, client_ip)
    _set_visitor_cookies(response, raw_token)
    csrf_token = secrets.token_urlsafe(32)
    _set_chat_csrf_cookie(response, csrf_token)
    return ConversationCreateResponse(conversation_status=conversation.status, csrf_token=csrf_token)


@router.get("/conversations/me/csrf-token", response_model=ChatCsrfTokenOut)
@limiter.limit(settings.RATE_LIMIT_CHAT_POLL)
async def get_chat_csrf_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    _require_conversation_by_token(db, request.cookies.get(VISITOR_TOKEN_COOKIE))

    existing = request.cookies.get(CHAT_CSRF_COOKIE)
    if existing:
        return ChatCsrfTokenOut(csrf_token=existing)

    csrf_token = secrets.token_urlsafe(32)
    _set_chat_csrf_cookie(response, csrf_token)
    return ChatCsrfTokenOut(csrf_token=csrf_token)


@router.get("/conversations/me/messages", response_model=list[ChatMessageOut])
@limiter.limit(settings.RATE_LIMIT_CHAT_POLL)
async def get_my_messages(
    request: Request,
    after_id: int = 0,
    db: Session = Depends(get_db),
):
    conversation = _require_conversation_by_token(db, request.cookies.get(VISITOR_TOKEN_COOKIE))
    return chat_service.list_messages(db, conversation.id, after_id=after_id)


@router.post(
    "/conversations/me/messages",
    response_model=ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_chat_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_CHAT_MESSAGE)
async def send_message(
    request: Request,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
):
    conversation = _require_conversation_by_token(db, request.cookies.get(VISITOR_TOKEN_COOKIE))
    try:
        return chat_service.add_visitor_message(db, conversation, payload.content)
    except chat_service.CooldownError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You're sending messages too fast. Please wait a moment.",
        )
    except (chat_service.ConversationClosedError, chat_service.IpBlockedError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation is no longer open.")


@router.get("/admin/conversations", response_model=list[ConversationOut])
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_list_conversations(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversations = chat_service.list_conversations(db, limit=limit, offset=offset)
    blocked_ips = chat_service.list_blocked_ip_addresses(db)
    result = []
    for conversation in conversations:
        item = ConversationOut.model_validate(conversation)
        item.ip_blocked = conversation.ip_address in blocked_ips
        result.append(item)
    return result


@router.get("/admin/conversations/{conversation_id}/messages", response_model=list[ChatMessageOut])
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_get_messages(
    request: Request,
    conversation_id: int,
    after_id: int = 0,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversation = _require_conversation_by_id(db, conversation_id)
    return chat_service.list_messages(db, conversation.id, after_id=after_id, limit=200)


@router.post(
    "/admin/conversations/{conversation_id}/messages",
    response_model=ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_send_message(
    request: Request,
    conversation_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversation = _require_conversation_by_id(db, conversation_id)
    try:
        return chat_service.add_admin_message(db, conversation, payload.content)
    except chat_service.ConversationClosedError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation is closed.")


@router.patch(
    "/admin/conversations/{conversation_id}/status",
    response_model=ConversationOut,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_update_status(
    request: Request,
    conversation_id: int,
    payload: ConversationStatusUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversation = _require_conversation_by_id(db, conversation_id)
    chat_service.set_status(db, conversation, payload.status)
    security_logger.info(
        "chat_conversation_status_changed id=%s status=%s admin=%s", conversation_id, payload.status, admin
    )
    return conversation


@router.post(
    "/admin/conversations/{conversation_id}/block-ip",
    response_model=BlockedIpOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_block_ip(
    request: Request,
    conversation_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversation = _require_conversation_by_id(db, conversation_id)
    if not conversation.ip_address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This conversation has no recorded IP address.")
    blocked = chat_service.block_ip(db, conversation.ip_address, reason=f"Blocked from conversation #{conversation_id}")
    chat_service.set_status(db, conversation, "blocked")
    security_logger.info(
        "chat_ip_blocked ip=%s conversation_id=%s admin=%s", conversation.ip_address, conversation_id, admin
    )
    return blocked


@router.delete(
    "/admin/conversations/{conversation_id}/block-ip",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_unblock_ip(
    request: Request,
    conversation_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversation = _require_conversation_by_id(db, conversation_id)
    if conversation.ip_address:
        chat_service.unblock_ip(db, conversation.ip_address)
        security_logger.info(
            "chat_ip_unblocked ip=%s conversation_id=%s admin=%s", conversation.ip_address, conversation_id, admin
        )
    return None


@router.delete(
    "/admin/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def admin_delete_conversation(
    request: Request,
    conversation_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    conversation = _require_conversation_by_id(db, conversation_id)
    chat_service.delete_conversation(db, conversation)
    security_logger.info("chat_conversation_deleted id=%s admin=%s", conversation_id, admin)
    return None