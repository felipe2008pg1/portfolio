from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.logging import security_logger
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
    token_hash = hash_refresh_token(token)
    now = datetime.now(timezone.utc)

    claim_stmt = (
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .values(revoked_at=now)
        .returning(RefreshToken.admin_id)
    )
    claimed = db.execute(claim_stmt).first()

    if claimed is not None:
        admin_id = claimed.admin_id
        new_token = issue_refresh_token(db, admin_id)
        db.commit()
        return admin_id, new_token

    record = db.scalars(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).first()

    if record is None:
        return None

    revoked_at = ensure_aware_utc(record.revoked_at)
    if revoked_at is not None:
        security_logger.warning("refresh_token_reuse_detected admin_id=%s", record.admin_id)
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.admin_id == record.admin_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        db.commit()

    return None

def revoke_refresh_token(db: Session, token: str) -> None:
    token_hash = hash_refresh_token(token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    record = db.scalars(stmt).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()