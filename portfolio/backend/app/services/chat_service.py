from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.security import hash_opaque_token, ensure_aware_utc
from app.models.conversation import Conversation
from app.models.chat_message import ChatMessage

settings = get_settings()


class ConversationClosedError(Exception):
    pass


class CooldownError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_conversation(db: Session, ip_address: str | None) -> tuple[Conversation, str]:
    raw_token = secrets.token_urlsafe(32)
    conversation = Conversation(
        token_hash=hash_opaque_token(raw_token),
        status="open",
        ip_address=ip_address,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation, raw_token


def get_conversation_by_token(db: Session, raw_token: str | None) -> Conversation | None:
    if not raw_token:
        return None
    token_hash = hash_opaque_token(raw_token)
    return db.execute(
        select(Conversation).where(Conversation.token_hash == token_hash)
    ).scalar_one_or_none()


def get_conversation_by_id(db: Session, conversation_id: int) -> Conversation | None:
    return db.get(Conversation, conversation_id)


def list_conversations(db: Session, limit: int = 50, offset: int = 0) -> list[Conversation]:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    return list(
        db.execute(
            select(Conversation)
            .order_by(Conversation.last_message_at.desc().nulls_last(), Conversation.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).scalars()
    )


def list_messages(db: Session, conversation_id: int, after_id: int = 0, limit: int = 100) -> list[ChatMessage]:
    limit = max(1, min(limit, 200))
    after_id = max(0, after_id)
    return list(
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id, ChatMessage.id > after_id)
            .order_by(ChatMessage.id.asc())
            .limit(limit)
        ).scalars()
    )


def _message_count(db: Session, conversation_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.conversation_id == conversation_id)
    ).scalar_one()


def add_visitor_message(db: Session, conversation: Conversation, content: str) -> ChatMessage:
    if conversation.status != "open":
        raise ConversationClosedError()

    now = _now()
    last = ensure_aware_utc(conversation.last_visitor_message_at)
    cooldown = timedelta(seconds=settings.CHAT_MESSAGE_COOLDOWN_SECONDS)
    if last is not None and (now - last) < cooldown:
        raise CooldownError()

    if _message_count(db, conversation.id) >= settings.CHAT_MAX_MESSAGES_PER_CONVERSATION:
        raise ConversationClosedError()

    message = ChatMessage(conversation_id=conversation.id, sender="visitor", content=content)
    conversation.last_visitor_message_at = now
    conversation.last_message_at = now
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def add_admin_message(db: Session, conversation: Conversation, content: str) -> ChatMessage:
    if conversation.status == "closed":
        raise ConversationClosedError()

    now = _now()
    message = ChatMessage(conversation_id=conversation.id, sender="admin", content=content)
    conversation.last_message_at = now
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def set_status(db: Session, conversation: Conversation, new_status: str) -> Conversation:
    conversation.status = new_status
    db.commit()
    db.refresh(conversation)
    return conversation
