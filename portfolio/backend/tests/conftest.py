import os
import tempfile

# Must run before any `from app...` import, since app.core.config.get_settings()
# is called at module-import time across the codebase (lru_cache singleton).
os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.mktemp(suffix='.db')}")
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-key-not-for-production-use-x")
os.environ.setdefault("ADMIN_USERNAME", "ci_admin")
os.environ.setdefault("ADMIN_PASSWORD", "ci_password_placeholder_1234")
os.environ.setdefault("WHATSAPP_NUMBER", "5511999999999")
os.environ.setdefault("TURNSTILE_SITE_KEY", "test-site-key")
os.environ.setdefault("TURNSTILE_SECRET_KEY", "test-secret-key")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://testserver")
os.environ.setdefault("ALLOWED_HOSTS", "testserver,localhost")

from cryptography.fernet import Fernet  # noqa: E402

os.environ.setdefault("MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)