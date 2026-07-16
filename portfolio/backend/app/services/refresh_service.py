from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.security import generate_refresh_token, hash_refresh_token, ensure_aware_utc
from app.models.refresh_token import RefreshToken

settings = get_settings()

def issue_refresh_token(db: Session, admin_id: int) -> str:
    token = generate_refresh_token()
    record = RefreshToken(
        admin_id=admin_id,
        token_hash=hash_refresh_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(record)
    db.commit()
    return token

def validate_and_rotate_refresh_token(db: Session, token: str) -> tuple[int, str] | None:
    """Validates the refresh token; if valid, revokes the old one and issues a new one (rotation).
    Returns (admin_id, new_token) or None if invalid/expired/revoked."""
    token_hash = hash_refresh_token(token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    record = db.scalars(stmt).first()

    now = datetime.now(timezone.utc)
    if record is None:
        return None

    expires_at = ensure_aware_utc(record.expires_at)
    revoked_at = ensure_aware_utc(record.revoked_at)

    if revoked_at is not None or expires_at < now:
        return None

    record.revoked_at = now
    new_token = issue_refresh_token(db, record.admin_id)
    db.commit()
    return record.admin_id, new_token

def revoke_refresh_token(db: Session, token: str) -> None:
    token_hash = hash_refresh_token(token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    record = db.scalars(stmt).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()