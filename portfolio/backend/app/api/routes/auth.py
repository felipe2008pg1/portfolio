from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
import secrets

from app.api.deps import get_db, get_current_admin, verify_csrf, CSRF_COOKIE_NAME
from app.core.config import get_settings
from app.core.security import create_access_token, create_mfa_pending_token, decode_mfa_pending_token
from app.core.turnstile import verify_turnstile_token
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TokenResponse,
    MfaVerifyRequest,
    MfaSetupInitResponse,
    MfaSetupConfirmRequest,
    MfaSetupConfirmResponse,
    MfaStatusResponse,
    MfaDisableRequest,
)
from app.services import refresh_service, mfa_service
from app.services.auth_service import (
    authenticate_admin,
    get_admin_by_id,
    get_admin_by_username,
    is_locked_out,
    register_failed_attempt,
    clear_failed_attempts,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    cookie_samesite = "none" if settings.is_production else "strict"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite=cookie_samesite,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite=cookie_samesite,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
    )
    # Non-HttpOnly on purpose: the admin dashboard JS must read this value and
    # echo it back in the X-CSRF-Token header (double-submit pattern). It is
    # never a secret by itself — its only job is to prove the request came
    # from a page that could read our own cookie, i.e. not cross-site.
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=secrets.token_urlsafe(32),
        httponly=False,
        secure=settings.is_production,
        samesite=cookie_samesite,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, response: Response, payload: LoginRequest, db: Session = Depends(get_db)):
    client_ip = get_remote_address(request)

    if not await verify_turnstile_token(payload.turnstile_token, client_ip):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Security check failed.")

    user = authenticate_admin(db, payload.username, payload.password, client_ip)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user or password.",
        )

    if user.mfa_enabled:
        mfa_token = create_mfa_pending_token(subject=user.username)
        return LoginResponse(
            mfa_required=True,
            mfa_token=mfa_token,
            message="Authentication code required.",
        )

    access_token = create_access_token(subject=user.username)
    refresh_token = refresh_service.issue_refresh_token(db, user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return LoginResponse()


@router.post("/mfa/verify", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def mfa_verify(
    request: Request,
    response: Response,
    payload: MfaVerifyRequest,
    db: Session = Depends(get_db),
):
    client_ip = get_remote_address(request)
    username = decode_mfa_pending_token(payload.mfa_token)

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification session expired.",
        )

    admin = get_admin_by_username(db, username)

    if admin is None or not admin.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification session expired.",
        )

    # Same lockout counter as the password step: an attacker who already has
    # the password can't brute-force the TOTP/backup code indefinitely across
    # distributed IPs just because per-IP rate limiting doesn't catch them.
    if is_locked_out(admin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account temporarily locked. Try again later.",
        )

    if not mfa_service.verify_mfa_code(db, admin, payload.code):
        register_failed_attempt(db, admin, client_ip, "mfa_verify_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid code.",
        )

    clear_failed_attempts(db, admin)
    access_token = create_access_token(subject=admin.username)
    refresh_token = refresh_service.issue_refresh_token(db, admin.id)
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse()


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    old_refresh = request.cookies.get("refresh_token")

    if not old_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired Session.",
        )

    result = refresh_service.validate_and_rotate_refresh_token(db, old_refresh)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired Session.",
        )

    admin_id, new_refresh_token = result
    admin = get_admin_by_id(db, admin_id)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired Session.",
        )

    new_access_token = create_access_token(subject=admin.username)
    _set_auth_cookies(response, new_access_token, new_refresh_token)

    return TokenResponse()


@router.post("/logout", dependencies=[Depends(verify_csrf)])
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        refresh_service.revoke_refresh_token(db, refresh_token)

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/auth")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")

    return {"message": "logout succesfully"}


@router.get("/me")
def me(username: str = Depends(get_current_admin)):
    return {"username": username}


@router.get("/csrf-token")
def get_csrf_token(request: Request, username: str = Depends(get_current_admin)):
    """
    The frontend and backend live on different domains (Vercel/Railway), so
    the csrf_token cookie set by _set_auth_cookies belongs to the backend's
    domain and can never be read via document.cookie from the frontend page
    — that's a browser same-origin restriction, not a bug. Instead, the
    already-authenticated frontend asks the backend directly for the value
    it should echo back in X-CSRF-Token on mutating requests.
    """
    csrf_value = request.cookies.get(CSRF_COOKIE_NAME)
    if not csrf_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session. Please log in again.",
        )
    return {"csrf_token": csrf_value}


@router.get("/mfa/status", response_model=MfaStatusResponse)
def mfa_status(
    username: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    admin = get_admin_by_username(db, username)

    return MfaStatusResponse(enabled=bool(admin and admin.mfa_enabled))


@router.post("/mfa/setup/init", response_model=MfaSetupInitResponse, dependencies=[Depends(verify_csrf)])
def mfa_setup_init(
    username: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    admin = get_admin_by_username(db, username)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found.",
        )

    data = mfa_service.init_mfa_setup(db, admin)

    return MfaSetupInitResponse(**data)


@router.post("/mfa/setup/confirm", response_model=MfaSetupConfirmResponse, dependencies=[Depends(verify_csrf)])
@limiter.limit("5/minute")
def mfa_setup_confirm(
    request: Request,
    payload: MfaSetupConfirmRequest,
    username: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    admin = get_admin_by_username(db, username)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )

    codes = mfa_service.confirm_mfa_setup(db, admin, payload.code)

    if codes is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Code.",
        )

    return MfaSetupConfirmResponse(backup_codes=codes)


@router.post("/mfa/disable", dependencies=[Depends(verify_csrf)])
@limiter.limit("5/minute")
def mfa_disable(
    request: Request,
    payload: MfaDisableRequest,
    username: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    admin = get_admin_by_username(db, username)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found.",
        )

    if not admin.mfa_enabled or not mfa_service.verify_mfa_code(db, admin, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code.",
        )

    mfa_service.disable_mfa(db, admin)

    return {"message": "MFA disabled."}