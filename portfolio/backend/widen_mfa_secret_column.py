"""
Widens admin_users.mfa_secret from VARCHAR(64) to VARCHAR(255) — the
plaintext TOTP secret fit in 64 chars, but the Fernet-encrypted ciphertext
does not. Run once, before encrypt_existing_totp_secrets.py:

    cd backend
    python widen_mfa_secret_column.py
"""
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    dialect = conn.dialect.name

    if dialect == "postgresql":
        conn.execute(text("ALTER TABLE admin_users ALTER COLUMN mfa_secret TYPE VARCHAR(255)"))
        conn.commit()
        print("[migration] admin_users.mfa_secret alargada para VARCHAR(255).")
    else:
        print("[migration] dialect != postgresql, nada a fazer (SQLite não trunca VARCHAR).")