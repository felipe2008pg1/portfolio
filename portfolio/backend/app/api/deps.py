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


def verify_csrf(request: Request) -> None:
    """Double-submit CSRF check for mutating admin requests.

    The admin session cookies use SameSite=None in production (frontend and
    backend live on different domains), which disables the browser's native
    CSRF mitigation. This dependency requires the caller to echo back, in a
    custom header, the same random value that was set in a non-HttpOnly
    cookie at login/refresh — something a cross-site form/fetch/img tag can
    trigger but cannot read or forge, because it can't read cookies from a
    different origin and CORS blocks the response to a script origin that
    isn't allowlisted.
    """
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME)

    if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid CSRF token.",
        )


def get_current_admin_ws(websocket: WebSocket) -> str | None:
    """Same cookie-based check as get_current_admin, adapted for the
    WebSocket handshake (no Request object available). Returns None
    instead of raising — caller is responsible for closing the socket.
    """
    token = websocket.cookies.get("access_token")

    if not token:
        return None

    return decode_access_token(token)