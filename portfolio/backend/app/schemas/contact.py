import re
from pydantic import BaseModel, EmailStr, Field, field_validator

# Removes control and other non-printable characters (defense in depth
# against payload injection through free-text input fields).
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

def _strip_control_chars(value: str) -> str:
    return _CONTROL_CHARS_RE.sub("", value).strip()

class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=10, max_length=2000)

    # Honeypot: hidden form field. If it is filled, the request is
    # assumed to come from a bot.
    website: str = Field(default="", max_length=0)

    @field_validator("name", "subject", "message")
    @classmethod
    def sanitize_text(cls, value: str) -> str:
        return _strip_control_chars(value)

class ContactResponse(BaseModel):
    whatsapp_url: str