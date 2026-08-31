from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class BlockedIp(Base):
    __tablename__ = "blocked_ips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ip_address: Mapped[str] = mapped_column(String(45), unique=True, index=True, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )