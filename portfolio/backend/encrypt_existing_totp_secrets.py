"""
Encrypts existing plaintext admin_users.mfa_secret values at rest.
Idempotent: skips rows that already decrypt successfully (already encrypted).

Requires MFA_ENCRYPTION_KEY set in the environment. Run once:

    cd backend
    python encrypt_existing_totp_secrets.py
"""
from cryptography.fernet import InvalidToken
from sqlalchemy import select
from app.core.security import encrypt_totp_secret, decrypt_totp_secret
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser

db = SessionLocal()
try:
    admins = db.scalars(select(AdminUser).where(AdminUser.mfa_secret.is_not(None))).all()
    changed = 0
    for admin in admins:
        try:
            decrypt_totp_secret(admin.mfa_secret)
            continue
        except (InvalidToken, ValueError):
            admin.mfa_secret = encrypt_totp_secret(admin.mfa_secret)
            changed += 1
    db.commit()
    print(f"[migration] {changed} mfa_secret(s) encrypted, {len(admins) - changed} already encrypted.")
finally:
    db.close()