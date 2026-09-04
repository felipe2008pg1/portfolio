import threading
from datetime import datetime, timedelta, timezone

from app.core.security import hash_opaque_token
from app.db.session import SessionLocal
from app.models.conversation import Conversation
from app.services import chat_service


def _run_concurrently(fn, n=10):
    results = []
    lock = threading.Lock()

    def _wrapped():
        try:
            result = fn()
        except Exception as exc:  # noqa: BLE001
            result = exc
        with lock:
            results.append(result)

    threads = [threading.Thread(target=_wrapped) for _ in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


def _make_open_conversation(raw_token: str) -> int:
    db = SessionLocal()
    try:
        conversation = Conversation(token_hash=hash_opaque_token(raw_token), status="open")
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation.id
    finally:
        db.close()


def test_cooldown_cannot_be_bypassed_by_concurrent_requests():
    raw_token = "race-cooldown-token"
    conversation_id = _make_open_conversation(raw_token)

    def _attempt():
        db = SessionLocal()
        try:
            conversation = db.get(Conversation, conversation_id)
            try:
                chat_service.add_visitor_message(db, conversation, "hi")
                return True
            except chat_service.CooldownError:
                return False
        finally:
            db.close()

    results = _run_concurrently(_attempt)
    assert sum(1 for r in results if r is True) == 1

    db = SessionLocal()
    try:
        assert db.get(Conversation, conversation_id).message_count == 1
    finally:
        db.close()


def test_message_cap_cannot_be_exceeded_by_concurrent_requests():
    raw_token = "race-cap-token"
    conversation_id = _make_open_conversation(raw_token)

    db = SessionLocal()
    try:
        conversation = db.get(Conversation, conversation_id)
        from app.core.config import get_settings
        settings = get_settings()
        conversation.message_count = settings.CHAT_MAX_MESSAGES_PER_CONVERSATION - 1
        conversation.last_visitor_message_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    def _attempt():
        db = SessionLocal()
        try:
            conversation = db.get(Conversation, conversation_id)
            try:
                chat_service.add_visitor_message(db, conversation, "hi")
                return True
            except chat_service.ConversationClosedError:
                return False
        finally:
            db.close()

    results = _run_concurrently(_attempt)
    assert sum(1 for r in results if r is True) == 1

    db = SessionLocal()
    try:
        settings = get_settings()
        conv = db.get(Conversation, conversation_id)
        assert conv.message_count == settings.CHAT_MAX_MESSAGES_PER_CONVERSATION
    finally:
        db.close()