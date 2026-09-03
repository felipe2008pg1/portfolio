import base64
import io
from datetime import datetime, timezone
import qrcode
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session
from app.core.security import (
    generate_totp_secret,
    get_totp_provisioning_uri,
    verify_totp_code,
    generate_backup_codes,
    hash_opaque_token,
    encrypt_totp_secret,
    decrypt_totp_secret,
)

from app.models.admin_user import AdminUser
from app.models.mfa_backup_code import MfaBackupCode

def _generate_qr_base64(data: str) -> str:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"

def init_mfa_setup(db: Session, admin: AdminUser) -> dict:
    """Generates a new TOTP secret. It remains 'pending' (mfa_enabled=False) until
    the admin confirms it with a valid code in confirm_mfa_setup."""
    secret = generate_totp_secret()
    admin.mfa_secret = encrypt_totp_secret(secret)
    admin.mfa_enabled = False
    db.commit()

    uri = get_totp_provisioning_uri(secret, admin.username)
    return {
        "secret": secret,
        "otpauth_url": uri,
        "qr_code_base64": _generate_qr_base64(uri),
    }

def confirm_mfa_setup(db: Session, admin: AdminUser, code: str) -> list[str] | None:
    if not admin.mfa_secret:
        return None

    ok, counter = verify_totp_code(decrypt_totp_secret(admin.mfa_secret), code, admin.mfa_last_totp_counter)
    if not ok:
        return None

    admin.mfa_enabled = True
    admin.mfa_last_totp_counter = counter

    db.query(MfaBackupCode).filter(MfaBackupCode.admin_id == admin.id).delete()

    plain_codes = generate_backup_codes(10)
    for plain in plain_codes:
        db.add(MfaBackupCode(admin_id=admin.id, code_hash=hash_opaque_token(plain)))

    db.commit()
    return plain_codes

def verify_mfa_code(db: Session, admin: AdminUser, code: str) -> bool:
    if not code:
        return False

    if admin.mfa_secret:
        ok, counter = verify_totp_code(decrypt_totp_secret(admin.mfa_secret), code, admin.mfa_last_totp_counter)
        if ok:
            # Atomic compare-and-swap against the DB value (not the possibly
            # stale in-memory one): two concurrent requests replaying the
            # same captured code can't both win — only the first UPDATE to
            # land claims this counter step, closing the replay race.
            claim_stmt = (
                update(AdminUser)
                .where(
                    AdminUser.id == admin.id,
                    or_(
                        AdminUser.mfa_last_totp_counter.is_(None),
                        AdminUser.mfa_last_totp_counter < counter,
                    ),
                )
                .values(mfa_last_totp_counter=counter)
            )
            result = db.execute(claim_stmt)
            db.commit()
            if result.rowcount > 0:
                admin.mfa_last_totp_counter = counter
                return True
            return False

    code_hash = hash_opaque_token(code.strip().upper())
    stmt = (
        update(MfaBackupCode)
        .where(
            MfaBackupCode.admin_id == admin.id,
            MfaBackupCode.code_hash == code_hash,
            MfaBackupCode.used_at.is_(None),
        )
        .values(used_at=datetime.now(timezone.utc))
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount > 0

def disable_mfa(db: Session, admin: AdminUser) -> None:
    admin.mfa_enabled = False
    admin.mfa_secret = None
    db.query(MfaBackupCode).filter(MfaBackupCode.admin_id == admin.id).delete()
    db.commit()