from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.core.config import get_settings
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse
from app.services import refresh_service
from app.services.auth_service import authenticate_admin, get_admin_by_id

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    # Restricted path: the refresh token is only sent to the backend on auth routes
    # and is never exposed to other API calls (reduces the attack surface).
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
    )

@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, response: Response, payload: LoginRequest, db: Session = Depends(get_db)):
    client_ip = get_remote_address(request)
    user = authenticate_admin(db, payload.username, payload.password, client_ip)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    access_token = create_access_token(subject=user.username)
    refresh_token = refresh_service.issue_refresh_token(db, user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse()

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    old_refresh = request.cookies.get("refresh_token")
    if not old_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired."
        )

    result = refresh_service.validate_and_rotate_refresh_token(db, old_refresh)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired."
        )

    admin_id, new_refresh_token = result
    admin = get_admin_by_id(db, admin_id)
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired."
        )

    new_access_token = create_access_token(subject=admin.username)
    _set_auth_cookies(response, new_access_token, new_refresh_token)
    return TokenResponse()

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        refresh_service.revoke_refresh_token(db, refresh_token)

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/auth")

    return {"message": "Logout successful"}

@router.get("/me")
def me(username: str = Depends(get_current_admin)):
    return {"username": username}