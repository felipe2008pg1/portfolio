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

def authenticate_admin(db: Session, username: str, password: str, client_ip: str | None) -> AdminUser | None:
    user = get_admin_by_username(db, username)
    now = datetime.now(timezone.utc)

    if user is None:
        verify_password(password, "$argon2id$v=19$m=19456,t=3,p=1$c29tZXNhbHQ$ZmFrZWhhc2hmYWtlaGFzaA")
        security_logger.warning("login_failed_unknown_user ip=%s", client_ip)
        return None

    if user.locked_until and ensure_aware_utc(user.locked_until) > now:
        security_logger.warning("login_blocked_lockout user=%s ip=%s", username, client_ip)
        return None

    if not verify_password(password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            security_logger.warning("account_locked user=%s ip=%s", username, client_ip)
        db.commit()
        security_logger.warning("login_failed_bad_password user=%s ip=%s", username, client_ip)
        return None

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    security_logger.info("login_success user=%s ip=%s", username, client_ip)
    return user