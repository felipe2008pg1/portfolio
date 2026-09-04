from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy import select, or_, update
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.security import hash_opaque_token, ensure_aware_utc
from app.models.conversation import Conversation
from app.models.chat_message import ChatMessage
from app.models.blocked_ip import BlockedIp

settings = get_settings()


class ConversationClosedError(Exception):
    pass


class CooldownError(Exception):
    pass


class IpBlockedError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def list_blocked_ip_addresses(db: Session) -> set[str]:
    return set(db.execute(select(BlockedIp.ip_address)).scalars())


def is_ip_blocked(db: Session, ip_address: str | None) -> bool:
    if not ip_address:
        return False
    return db.execute(
        select(BlockedIp).where(BlockedIp.ip_address == ip_address)
    ).scalar_one_or_none() is not None


def block_ip(db: Session, ip_address: str, reason: str | None = None) -> BlockedIp:
    existing = db.execute(
        select(BlockedIp).where(BlockedIp.ip_address == ip_address)
    ).scalar_one_or_none()
    if existing:
        return existing
    blocked = BlockedIp(ip_address=ip_address, reason=reason)
    db.add(blocked)
    db.commit()
    db.refresh(blocked)
    return blocked


def unblock_ip(db: Session, ip_address: str) -> None:
    existing = db.execute(
        select(BlockedIp).where(BlockedIp.ip_address == ip_address)
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.commit()


def create_conversation(db: Session, ip_address: str | None) -> tuple[Conversation, str]:
    if is_ip_blocked(db, ip_address):
        raise IpBlockedError()

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


def _raise_add_visitor_message_error(db: Session, conversation_id: int) -> None:
    """Called after the atomic UPDATE fails, solely to select the correct
    exception. The check was already performed atomically during the UPDATE—
    this read serves only to determine the reason for the error in the response."""
    fresh = db.get(Conversation, conversation_id)

    if fresh is None or fresh.status != "open":
        raise ConversationClosedError()

    if is_ip_blocked(db, fresh.ip_address):
        raise IpBlockedError()

    if fresh.visitor_message_count >= settings.CHAT_MAX_MESSAGES_PER_CONVERSATION:
        raise ConversationClosedError()

    now = _now()
    last = ensure_aware_utc(fresh.last_visitor_message_at)
    cooldown = timedelta(seconds=settings.CHAT_MESSAGE_COOLDOWN_SECONDS)
    if last is not None and (now - last) < cooldown:
        raise CooldownError()

    raise CooldownError()


def add_visitor_message(db: Session, conversation: Conversation, content: str) -> ChatMessage:
    if is_ip_blocked(db, conversation.ip_address):
        raise IpBlockedError()

    now = _now()
    cutoff = now - timedelta(seconds=settings.CHAT_MESSAGE_COOLDOWN_SECONDS)

    # Single atomic UPDATE: the cooldown, the message limit, and the
    # mutation itself occur in the same statement, on the same line. A
    # concurrent request either commits first (seeing 0 affected rows and
    # failing) or blocks on the row lock until the first one commits, then
    # re-evaluates the WHERE clause against the updated value—there is no
    # read-and-write window where two requests can proceed simultaneously.
    claim_stmt = (
        update(Conversation)
        .where(
            Conversation.id == conversation.id,
            Conversation.status == "open",
            or_(
                Conversation.last_visitor_message_at.is_(None),
                Conversation.last_visitor_message_at <= cutoff,
            ),
            Conversation.visitor_message_count < settings.CHAT_MAX_MESSAGES_PER_CONVERSATION,
        )
        .values(
            last_visitor_message_at=now,
            last_message_at=now,
            visitor_message_count=Conversation.visitor_message_count + 1,
        )
        .returning(Conversation.id)
    )
    claimed = db.execute(claim_stmt).first()

    if claimed is None:
        db.rollback()
        _raise_add_visitor_message_error(db, conversation.id)

    message = ChatMessage(conversation_id=conversation.id, sender="visitor", content=content)
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


def delete_conversation(db: Session, conversation: Conversation) -> None:
    # cascade="all, delete-orphan" on Conversation.messages (ORM-level) plus
    # ondelete="CASCADE" on the FK (DB-level) both cover this — belt and
    # suspenders in case a message row was ever inserted outside the ORM.
    db.delete(conversation)
    db.commit()