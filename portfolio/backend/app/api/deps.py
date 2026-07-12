from typing import Generator
from fastapi import Depends
from fastapi import HTTPException, Request, status
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