from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings

settings = get_settings()

connect_args = {}

if settings.DATABASE_URL.startswith("sqlite"):
    # check_same_thread=False is safe here because each request uses its own
    # Session (via the get_db dependency), which is never shared between threads.
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

@event.listens_for(Engine, "connect")
def _enforce_sqlite_pragmas(dbapi_connection, connection_record):
    """Enables foreign key constraints in SQLite (disabled by default)."""
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)