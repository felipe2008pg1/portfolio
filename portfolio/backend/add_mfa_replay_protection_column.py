"""
Adds mfa_last_totp_counter to admin_users (TOTP replay protection).
Run once:

    cd backend
    python add_mfa_replay_protection_column.py
"""
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    dialect = conn.dialect.name

    if dialect == "postgresql":
        existing = {
            row[0]
            for row in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='admin_users'"
            )).fetchall()
        }
    else:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(admin_users)")).fetchall()}

    if "mfa_last_totp_counter" not in existing:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN mfa_last_totp_counter INTEGER"))
        conn.commit()
        print("[migration] coluna mfa_last_totp_counter adicionada.")
    else:
        print("[migration] coluna mfa_last_totp_counter já existe, pulando.")