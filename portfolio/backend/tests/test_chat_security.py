from app.core.config import get_settings
from app.core.turnstile import verify_turnstile_token  # noqa: F401 (import kept for monkeypatch target discoverability)


def _fake_turnstile(monkeypatch):
    async def _ok(token, ip):
        return True
    monkeypatch.setattr("app.api.routes.chat.verify_turnstile_token", _ok)


def _start_conversation(client, monkeypatch):
    _fake_turnstile(monkeypatch)
    resp = client.post("/api/chat/conversations", json={"turnstile_token": "x", "website": ""})
    assert resp.status_code == 201
    return resp


def test_send_message_without_csrf_header_is_rejected(client, monkeypatch):
    _start_conversation(client, monkeypatch)

    resp = client.post(
        "/api/chat/conversations/me/messages",
        json={"content": "hello", "website": ""},
    )
    assert resp.status_code == 403
    assert "csrf" in resp.json()["detail"].lower()


def test_send_message_with_valid_csrf_header_succeeds(client, monkeypatch):
    _start_conversation(client, monkeypatch)

    csrf = client.get("/api/chat/csrf-token").json()["csrf_token"]
    resp = client.post(
        "/api/chat/conversations/me/messages",
        json={"content": "hello", "website": ""},
        headers={"X-Chat-CSRF-Token": csrf},
    )
    assert resp.status_code == 201


def test_send_message_with_wrong_csrf_value_is_rejected(client, monkeypatch):
    _start_conversation(client, monkeypatch)

    client.get("/api/chat/csrf-token").json()["csrf_token"]
    resp = client.post(
        "/api/chat/conversations/me/messages",
        json={"content": "hello", "website": ""},
        headers={"X-Chat-CSRF-Token": "not-the-real-token"},
    )
    assert resp.status_code == 403


def test_csrf_token_cookie_is_not_httponly_but_visitor_token_is(client, monkeypatch):
    resp = _start_conversation(client, monkeypatch)
    cookie_headers = resp.headers.get_list("set-cookie")

    visitor_cookie = next(c for c in cookie_headers if c.startswith("visitor_token="))
    csrf_cookie = next(c for c in cookie_headers if c.startswith("chat_csrf_token="))

    assert "httponly" in visitor_cookie.lower()
    assert "httponly" not in csrf_cookie.lower()


def test_cooldown_blocks_second_message_sent_immediately(client, monkeypatch):
    _start_conversation(client, monkeypatch)
    csrf = client.get("/api/chat/csrf-token").json()["csrf_token"]
    headers = {"X-Chat-CSRF-Token": csrf}

    first = client.post(
        "/api/chat/conversations/me/messages", json={"content": "one", "website": ""}, headers=headers
    )
    assert first.status_code == 201

    second = client.post(
        "/api/chat/conversations/me/messages", json={"content": "two", "website": ""}, headers=headers
    )
    assert second.status_code == 429


def test_message_cap_is_enforced(client, monkeypatch):
    settings = get_settings()
    _start_conversation(client, monkeypatch)
    csrf = client.get("/api/chat/csrf-token").json()["csrf_token"]
    headers = {"X-Chat-CSRF-Token": csrf}

    from app.db.session import SessionLocal
    from app.services import chat_service

    db = SessionLocal()
    try:
        conversation = chat_service.get_conversation_by_token(
            db, client.cookies.get("visitor_token")
        )
        from datetime import datetime, timedelta, timezone
        conversation.message_count = settings.CHAT_MAX_MESSAGES_PER_CONVERSATION - 1
        conversation.last_visitor_message_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    ok = client.post(
        "/api/chat/conversations/me/messages", json={"content": "last one", "website": ""}, headers=headers
    )
    assert ok.status_code == 201

    over_cap = client.post(
        "/api/chat/conversations/me/messages", json={"content": "one too many", "website": ""}, headers=headers
    )
    assert over_cap.status_code == 403