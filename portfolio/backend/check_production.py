"""
Read-only production audit. Prints no secrets.

    cd backend
    python check_production.py        # run with the PRODUCTION env vars

Exit code 1 if any check fails.
"""

import sys

from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.core.security import needs_rehash, verify_password
from app.db.session import SessionLocal, engine
from app.models.admin_user import AdminUser

KNOWN_WEAK = ["CHANGE_ME_USE_A_STRONG_PASSWORD", "ci_password_placeholder_1234", "admin", "password"]
HEAD = "a8b8c6e5e0eb"


def run() -> int:
    ok = True

    def report(name: str, passed: bool, detail: str = "") -> None:
        nonlocal ok
        ok &= passed
        print(f"[{'OK ' if passed else 'FAIL'}] {name}{' - ' + detail if detail else ''}")

    settings = get_settings()  # raises if production config is unsafe
    report("ENVIRONMENT=production", settings.is_production, settings.ENVIRONMENT)
    report("HTTPS-only CORS origins", all(o.startswith("https://") for o in settings.cors_origins_list) and bool(settings.cors_origins_list))
    report("TRUSTED_PROXY_HOPS set", settings.TRUSTED_PROXY_HOPS >= 1, str(settings.TRUSTED_PROXY_HOPS))

    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("experiences")} if insp.has_table("experiences") else set()
    report("experiences.logo_url exists", "logo_url" in cols)
    with engine.connect() as conn:
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar() if insp.has_table("alembic_version") else None
    report("alembic at head", rev == HEAD, f"current={rev}")

    db = SessionLocal()
    try:
        admin = db.query(AdminUser).filter_by(username=settings.ADMIN_USERNAME).first()
        report("admin user exists", admin is not None)
        if admin:
            weak = [w for w in KNOWN_WEAK if verify_password(w, admin.hashed_password)]
            report("admin password is not a known placeholder", not weak)
            report("admin hash is Argon2id", admin.hashed_password.startswith("$argon2id$"))
            report("admin hash params current", not needs_rehash(admin.hashed_password))
            report("MFA enabled", admin.mfa_enabled)
            report("admin not locked/failing", admin.failed_login_attempts == 0)
    finally:
        db.close()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(run())