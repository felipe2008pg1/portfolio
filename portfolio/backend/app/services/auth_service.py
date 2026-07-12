from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import security_logger
from app.core.security import verify_password
from app.models.admin_user import AdminUser

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def authenticate_admin(db: Session, username: str, password: str, client_ip: str | None) -> AdminUser | None:
    stmt = select(AdminUser).where(AdminUser.username == username)
    user = db.scalars(stmt).first()

    now = datetime.now(timezone.utc)

    if user is None:
        # Não revela se o usuário existe ou não (evita enumeração de usuários).
        # Ainda assim executa um hash "fake" para igualar o tempo de resposta
        # e mitigar timing attacks que distinguem usuário existente vs inexistente.
        verify_password(password, "$argon2id$v=19$m=19456,t=3,p=1$c29tZXNhbHQ$ZmFrZWhhc2hmYWtlaGFzaA")
        security_logger.warning("login_failed_unknown_user ip=%s", client_ip)
        return None

    if user.locked_until and user.locked_until > now:
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

    # Login bem-sucedido: zera contadores
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    security_logger.info("login_success user=%s ip=%s", username, client_ip)
    return user