"""
PII purge script (LGPD/GDPR data minimization).

Anonymizes `ip_address` on contact_messages and conversations older than
settings.PII_RETENTION_DAYS (default 90). Does NOT delete the rows
themselves — the message/chat content stays for historical/support
purposes, only the IP address (personal data) is nulled out.

Safe to run multiple times (idempotent — already-null IPs are skipped).

Run manually:
    cd backend
    python purge_pii.py

Or schedule it (recommended: monthly), e.g. via a cron-style Railway job
or a system crontab entry:
    0 3 1 * * cd /path/to/backend && /path/to/venv/bin/python purge_pii.py
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.core.config import get_settings
from app.core.logging import security_logger
from app.db.session import SessionLocal
from app.models.contact_message import ContactMessage
from app.models.conversation import Conversation

settings = get_settings()


def purge_old_ip_addresses() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.PII_RETENTION_DAYS)
    db = SessionLocal()
    try:
        contact_result = db.execute(
            update(ContactMessage)
            .where(ContactMessage.created_at < cutoff, ContactMessage.ip_address.is_not(None))
            .values(ip_address=None)
        )
        conversation_result = db.execute(
            update(Conversation)
            .where(Conversation.created_at < cutoff, Conversation.ip_address.is_not(None))
            .values(ip_address=None)
        )
        db.commit()

        security_logger.info(
            "pii_purge_completed contact_messages=%s conversations=%s retention_days=%s",
            contact_result.rowcount,
            conversation_result.rowcount,
            settings.PII_RETENTION_DAYS,
        )
        print(
            f"Purged IPs older than {settings.PII_RETENTION_DAYS} days: "
            f"{contact_result.rowcount} contact message(s), {conversation_result.rowcount} conversation(s)."
        )
    finally:
        db.close()


if __name__ == "__main__":
    purge_old_ip_addresses()