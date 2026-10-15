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

pool_args = {}

if not settings.DATABASE_URL.startswith("sqlite"):
    # Small footprint for a single-worker deployment on Neon's pooled endpoint:
    # the default (5 + 10 overflow) can hold up to 15 server-side connections.
    # pool_recycle drops connections before Neon/pgbouncer idles them out.
    pool_args = {
        "pool_size": 3,
        "max_overflow": 2,
        "pool_timeout": 10,
        "pool_recycle": 300,
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    **pool_args,
)

@event.listens_for(Engine, "connect")
def _enforce_sqlite_pragmas(dbapi_connection, connection_record):
    """Enables foreign key constraints in SQLite (disabled by default) and
    gives concurrent writers (e.g. the concurrency test suite) up to 5s to
    wait for a lock instead of failing immediately with 'database is locked'."""
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)