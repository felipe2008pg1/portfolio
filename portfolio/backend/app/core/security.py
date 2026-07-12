from datetime import datetime, timedelta, timezone
from typing import Optional
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from jose import JWTError, jwt
from app.core.config import get_settings

settings = get_settings()

# Argon2id is the default algorithm used by argon2-cffi (type=ID).
# The parameters below exceed the minimum values recommended by OWASP
# (m=19456 KiB, t=2, p=1), providing stronger resistance against GPU attacks.
# They can be adjusted according to the server's available resources.
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
    """Returns the subject (username) if the token is valid; otherwise, None."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != "access":
            return None

        return payload.get("sub")

    except JWTError:
        return None