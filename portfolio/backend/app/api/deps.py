import secrets
from typing import Generator
from fastapi import Depends
from fastapi import HTTPException, Request, WebSocket, status
from app.core.security import decode_access_token
from app.db.session import SessionLocal

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_admin(request: Request) -> str:
    """
    Reads the JWT from the HttpOnly cookie. Tokens are not accepted through
    headers or query parameters to reduce the attack surface for XSS and
    accidental exposure in URL logs.
    """
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    username = decode_access_token(token)

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    return username

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

CHAT_CSRF_COOKIE_NAME = "chat_csrf_token"
CHAT_CSRF_HEADER_NAME = "X-Chat-CSRF-Token"


def _verify_double_submit(request: Request, cookie_name: str, header_name: str) -> None:
    cookie_token = request.cookies.get(cookie_name)
    header_token = request.headers.get(header_name)

    if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid CSRF token.",
        )


def verify_csrf(request: Request) -> None:
    """Double-submit CSRF check for mutating admin requests."""
    _verify_double_submit(request, CSRF_COOKIE_NAME, CSRF_HEADER_NAME)


def verify_chat_csrf(request: Request) -> None:
    """Double-submit CSRF check for POST /api/chat/conversations/me/messages.

    The `visitor_token` is `HttpOnly` and `SameSite=None` in production (across different domains), so the browser
    attaches this cookie to forged cross-site requests. An additional token (`chat_csrf_token`), also 
    `HttpOnly`, is delivered to the legitimate frontend solely via the JSON body (protected by CORS) 
    and must be echoed in the `X-Chat-CSRF-Token` header. A cross-site attacker 
    can trigger the cookie to be sent but cannot read its value.
    """
    _verify_double_submit(request, CHAT_CSRF_COOKIE_NAME, CHAT_CSRF_HEADER_NAME)


def get_current_admin_ws(websocket: WebSocket) -> str | None:
    """Same cookie-based check as get_current_admin, adapted for the
    WebSocket handshake (no Request object available). Returns None
    instead of raising — caller is responsible for closing the socket.
    """
    token = websocket.cookies.get("access_token")

    if not token:
        return None

    return decode_access_token(token)