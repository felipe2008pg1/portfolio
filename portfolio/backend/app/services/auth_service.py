from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.logging import security_logger
from app.core.security import verify_password, ensure_aware_utc
from app.models.admin_user import AdminUser

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

def get_admin_by_username(db: Session, username: str) -> AdminUser | None:
    stmt = select(AdminUser).where(AdminUser.username == username)
    return db.scalars(stmt).first()

def get_admin_by_id(db: Session, admin_id: int) -> AdminUser | None:
    return db.get(AdminUser, admin_id)

def is_locked_out(user: AdminUser) -> bool:
    """Shared lockout check used by both the password step and the MFA step,
    so a distributed attacker can't bypass the account lockout simply by
    already knowing (or guessing) the password and only brute-forcing MFA."""
    now = datetime.now(timezone.utc)
    return bool(user.locked_until and ensure_aware_utc(user.locked_until) > now)


def register_failed_attempt(db: Session, user: AdminUser, client_ip: str | None, reason: str) -> None:
    """Increments the shared failed-attempt counter and applies the same
    lockout used for bad passwords. Called on bad password AND bad MFA code."""
    now = datetime.now(timezone.utc)
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        security_logger.warning("account_locked user=%s ip=%s reason=%s", user.username, client_ip, reason)
    db.commit()
    security_logger.warning("%s user=%s ip=%s", reason, user.username, client_ip)


def clear_failed_attempts(db: Session, user: AdminUser) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()


def authenticate_admin(db: Session, username: str, password: str, client_ip: str | None) -> AdminUser | None:
    user = get_admin_by_username(db, username)

    if user is None:
        verify_password(password, "$argon2id$v=19$m=19456,t=3,p=1$c29tZXNhbHQ$ZmFrZWhhc2hmYWtlaGFzaA")
        security_logger.warning("login_failed_unknown_user ip=%s", client_ip)
        return None

    if is_locked_out(user):
        security_logger.warning("login_blocked_lockout user=%s ip=%s", username, client_ip)
        return None

    if not verify_password(password, user.hashed_password):
        register_failed_attempt(db, user, client_ip, "login_failed_bad_password")
        return None

    clear_failed_attempts(db, user)
    security_logger.info("login_success user=%s ip=%s", username, client_ip)
    return user