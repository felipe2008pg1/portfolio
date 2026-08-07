"""
Adds MFA: mfa_secret/mfa_enabled columns to admin_users and creates the mfa_backup_codes table.
Run once:

    cd backend
    python add_mfa_columns.py
"""
from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine
from app import models  # noqa: F401

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

    if "mfa_secret" not in existing:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN mfa_secret VARCHAR(64)"))
        print("[migration] coluna mfa_secret adicionada.")
    else:
        print("[migration] coluna mfa_secret It already exists, skipping ahead.")

    if "mfa_enabled" not in existing:
        default_clause = "DEFAULT FALSE" if dialect == "postgresql" else "DEFAULT 0"
        conn.execute(text(f"ALTER TABLE admin_users ADD COLUMN mfa_enabled BOOLEAN NOT NULL {default_clause}"))
        print("[migration] coluna mfa_enabled adicionada.")
    else:
        print("[migration] coluna mfa_enabled It already exists, skipping ahead.")

    conn.commit()

Base.metadata.create_all(bind=engine)
print("[migration] tabela mfa_backup_codes guaranteed.")