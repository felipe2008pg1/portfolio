from urllib.parse import quote
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.contact_message import ContactMessage
from app.schemas.contact import ContactCreate

settings = get_settings()

def save_and_build_whatsapp_link(
    db: Session,
    data: ContactCreate,
    ip_address: str | None,
) -> str:
    record = ContactMessage(
        name=data.name,
        email=data.email,
        subject=data.subject,
        message=data.message,
        ip_address=ip_address,
    )

    db.add(record)
    db.commit()

    template = (
        f"Hello Felipe, my name is {data.name}.\n"
        f"Subject: {data.subject}\n\n"
        f"{data.message}\n\n"
        f"(Contact through portfolio, email: {data.email})"
    )

    encoded_text = quote(template)

    return f"https://wa.me/{settings.WHATSAPP_NUMBER}?text={encoded_text}"