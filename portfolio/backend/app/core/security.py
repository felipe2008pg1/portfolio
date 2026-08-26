import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError, VerificationError
from jwt.exceptions import PyJWTError

from app.core.config import get_settings

settings = get_settings()

_ph = PasswordHasher(
    time_cost=3,
    memory_cost=19456,
    parallelism=1,
    hash_len=32,
    salt_len=16,
)


def hash_password(plain_password: str) -> str:
    return _ph.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        _ph.verify(hashed_password, plain_password)
        return True
    except (VerifyMismatchError, InvalidHashError, VerificationError):
        return False


def needs_rehash(hashed_password: str) -> bool:
    return _ph.check_needs_rehash(hashed_password)


def create_access_token(
    subject: str,
    expires_minutes: Optional[int] = None,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode = {
        "sub": subject,
        "exp": expire,
        "type": "access",
    }

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != "access":
            return None

        return payload.get("sub")

    except PyJWTError:
        return None


def ensure_aware_utc(dt):
    """SQLite/Postgres may return a naive datetime (no timezone) — normalize it to
    UTC-aware before comparing it against datetime.now(timezone.utc)."""
    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_opaque_token(value: str) -> str:
    """Same algorithm as the refresh token — also used for MFA backup codes."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def create_mfa_pending_token(subject: str) -> str:
    """Intermediate 5-minute token: proves the password was already validated,
    but the full session is only granted after the MFA code is verified."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)

    to_encode = {
        "sub": subject,
        "exp": expire,
        "type": "mfa_pending",
    }

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_mfa_pending_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != "mfa_pending":
            return None

        return payload.get("sub")

    except PyJWTError:
        return None


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_provisioning_uri(
    secret: str,
    account_name: str,
    issuer: str = "Felipe Portfolio Admin",
) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=account_name,
        issuer_name=issuer,
    )


def verify_totp_code(secret: str, code: str) -> bool:
    if not code or not secret:
        return False

    try:
        return pyotp.TOTP(secret).verify(
            code.strip(),
            valid_window=1,
        )
    except Exception:
        return False


def generate_backup_codes(count: int = 10) -> list[str]:
    codes = []

    for _ in range(count):
        raw = secrets.token_hex(4).upper()
        codes.append(f"{raw[:4]}-{raw[4:]}")

    return codes