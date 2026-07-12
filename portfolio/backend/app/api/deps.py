from typing import Generator

from fastapi import Depends, HTTPException, Request, status

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
    Lê o JWT do cookie HttpOnly. Não aceita token via header/query string
    para reduzir superfície de XSS/leak em logs de URL.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado.",
        )
    username = decode_access_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )
    return username