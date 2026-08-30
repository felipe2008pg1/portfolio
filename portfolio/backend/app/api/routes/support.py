from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_current_admin_ws, get_db
from app.core.config import get_settings
from app.core.turnstile import verify_turnstile_token
from app.core.ws_manager import support_ws_manager
from app.schemas.support import (
    SupportConversationAdminOut,
    SupportConversationOut,
    SupportConversationStart,
    SupportConversationStatusUpdate,
    SupportMessageCreate,
    SupportMessageOut,
)
from app.services import support_service
from app.services.support_service import ConversationBlockedError, RateLimitedError

router = APIRouter(prefix="/api/support", tags=["support"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------- visitor --

@router.post(
    "/conversations",
    response_model=SupportConversationOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.RATE_LIMIT_SUPPORT_START)
async def start_conversation(
    request: Request,
    payload: SupportConversationStart,
    db: Session = Depends(get_db),
):
    client_ip = get_remote_address(request)

    if not await verify_turnstile_token(payload.turnstile_token, client_ip):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security verification failed.",
        )

    conversation = support_service.start_conversation(db, payload.message)

    await support_ws_manager.push_to_admins(
        {
            "type": "new_message",
            "conversation_id": conversation.id,
        }
    )

    return SupportConversationOut(
        visitor_token=conversation.visitor_token,
        status=conversation.status,
        messages=conversation.messages,
    )

@router.get(
    "/conversations/{visitor_token}",
    response_model=SupportConversationOut,
)
def get_conversation(visitor_token: str, db: Session = Depends(get_db)):
    conversation = support_service.get_conversation_by_token(db, visitor_token)

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return SupportConversationOut(
        visitor_token=conversation.visitor_token,
        status=conversation.status,
        messages=conversation.messages,
    )

@router.post(
    "/conversations/{visitor_token}/messages",
    response_model=SupportMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_visitor_message(
    visitor_token: str,
    payload: SupportMessageCreate,
    db: Session = Depends(get_db),
):
    conversation = support_service.get_conversation_by_token(db, visitor_token)

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    try:
        message = support_service.add_visitor_message(db, conversation, payload.message)
    except ConversationBlockedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This conversation is blocked.",
        )
    except RateLimitedError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You're sending messages too fast.",
            headers={"Retry-After": str(round(exc.retry_after_seconds, 1))},
        )

    await support_ws_manager.push_to_admins(
        {"type": "new_message", "conversation_id": conversation.id}
    )

    return message

@router.websocket("/ws/conversations/{visitor_token}")
async def visitor_websocket(websocket: WebSocket, visitor_token: str):
    db: Session = next(get_db())
    try:
        conversation = support_service.get_conversation_by_token(db, visitor_token)
        if conversation is None:
            await websocket.close(code=4404)
            return

        await support_ws_manager.connect_visitor(conversation.id, websocket)
        try:
            while True:
                # This socket is push-only from the server; it just needs to
                # stay open. Any inbound frame is ignored — writes go through
                # the REST endpoint above, which is the single validation path.
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            support_ws_manager.disconnect_visitor(conversation.id, websocket)
    finally:
        db.close()

# ------------------------------------------------------------------ admin --

@router.get(
    "/admin/conversations",
    response_model=list[SupportConversationAdminOut],
)
def list_conversations(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    conversations = support_service.list_conversations_admin(db)
    return [
        SupportConversationAdminOut(
            id=c.id,
            visitor_token=c.visitor_token,
            status=c.status,
            created_at=c.created_at,
            last_message_at=c.last_message_at,
            last_message_preview=support_service.last_message_preview(c),
            unread=support_service.is_unread(c),
        )
        for c in conversations
    ]

def _get_conversation_or_404(db: Session, conversation_id: int):
    conversation = support_service.get_conversation(db, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conversation

@router.get(
    "/admin/conversations/{conversation_id}/messages",
    response_model=SupportConversationOut,
)
def get_conversation_admin(
    conversation_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    conversation = _get_conversation_or_404(db, conversation_id)
    support_service.mark_read_by_admin(db, conversation)

    return SupportConversationOut(
        visitor_token=conversation.visitor_token,
        status=conversation.status,
        messages=conversation.messages,
    )

@router.post(
    "/admin/conversations/{conversation_id}/messages",
    response_model=SupportMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_admin_message(
    conversation_id: int,
    payload: SupportMessageCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    conversation = _get_conversation_or_404(db, conversation_id)
    message = support_service.add_admin_message(db, conversation, payload.message)

    await support_ws_manager.push_to_visitor(
        conversation.id,
        {
            "type": "new_message",
            "message": {
                "id": message.id,
                "sender": message.sender,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            },
        },
    )

    return message

@router.patch(
    "/admin/conversations/{conversation_id}",
    response_model=SupportConversationAdminOut,
)
def update_conversation_status(
    conversation_id: int,
    payload: SupportConversationStatusUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    conversation = _get_conversation_or_404(db, conversation_id)
    conversation = support_service.set_status(db, conversation, payload.status)

    return SupportConversationAdminOut(
        id=conversation.id,
        visitor_token=conversation.visitor_token,
        status=conversation.status,
        created_at=conversation.created_at,
        last_message_at=conversation.last_message_at,
        last_message_preview=support_service.last_message_preview(conversation),
        unread=support_service.is_unread(conversation),
    )

@router.delete(
    "/admin/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    conversation = _get_conversation_or_404(db, conversation_id)
    support_service.delete_conversation(db, conversation)
    return None

@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket):
    admin = get_current_admin_ws(websocket)
    if not admin:
        await websocket.close(code=4401)
        return

    await support_ws_manager.connect_admin(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        support_ws_manager.disconnect_admin(websocket)