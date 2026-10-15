"""
Sets a new admin password and revokes every active session.

    cd backend
    python reset_admin_password.py

The password is read interactively (never via argv/env/history).
MFA settings are preserved. Failed-login lockout is cleared.
"""

import getpass
import sys
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser
from app.models.refresh_token import RefreshToken

MIN_LEN = 12
FORBIDDEN = {"CHANGE_ME_USE_A_STRONG_PASSWORD", "ci_password_placeholder_1234"}


def _validate(pwd: str, username: str) -> str | None:
    if len(pwd) < MIN_LEN:
        return f"Minimum length is {MIN_LEN}."
    if pwd in FORBIDDEN or pwd.upper().startswith("CHANGE_ME"):
        return "Placeholder passwords are not allowed."
    if username.lower() in pwd.lower():
        return "Password must not contain the username."
    if len(set(pwd)) < 6:
        return "Password is too repetitive."
    return None


def run() -> int:
    settings = get_settings()
    db = SessionLocal()
    try:
        admin = db.query(AdminUser).filter_by(username=settings.ADMIN_USERNAME).first()
        if admin is None:
            print(f"[reset] admin '{settings.ADMIN_USERNAME}' not found. Run seed.py first.")
            return 1

        pwd = getpass.getpass("New password: ")
        if pwd != getpass.getpass("Repeat: "):
            print("[reset] passwords do not match.")
            return 1
        error = _validate(pwd, admin.username)
        if error:
            print(f"[reset] rejected: {error}")
            return 1

        admin.hashed_password = hash_password(pwd)
        admin.failed_login_attempts = 0
        admin.locked_until = None
        revoked = (
            db.query(RefreshToken)
            .filter(RefreshToken.admin_id == admin.id, RefreshToken.revoked_at.is_(None))
            .update({RefreshToken.revoked_at: datetime.now(timezone.utc)}, synchronize_session=False)
        )
        db.commit()
        print(f"[reset] password updated; {revoked} session(s) revoked.")
        print("[reset] also update ADMIN_PASSWORD in the host env (or remove it) so it is not stale.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(run())