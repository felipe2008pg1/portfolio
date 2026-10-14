from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.ip import get_client_ip
from app.core.limiter import limiter
from app.core.turnstile import verify_turnstile_token
from app.schemas.contact import ContactCreate, ContactResponse
from app.services import contact_service

router = APIRouter(prefix="/api/contact", tags=["contact"])
settings = get_settings()

@router.post("", response_model=ContactResponse)
@limiter.limit(settings.RATE_LIMIT_CONTACT)
async def send_contact(request: Request, payload: ContactCreate, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)

    if not await verify_turnstile_token(payload.turnstile_token, client_ip):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Security verification was failed")

    whatsapp_url = contact_service.save_and_build_whatsapp_link(db, payload, client_ip)
    return ContactResponse(whatsapp_url=whatsapp_url)