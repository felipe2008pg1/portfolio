import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_VALID_STATUSES = {"open", "blocked", "closed"}

def _strip_control_chars(value: str) -> str:
    return _CONTROL_CHARS_RE.sub("", value).strip()

class ConversationCreate(BaseModel):
    turnstile_token: str = Field(min_length=1, max_length=2000)
    website: str = Field(default="", max_length=0)

class ConversationCreateResponse(BaseModel):
    conversation_status: str

class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    website: str = Field(default="", max_length=0)

    @field_validator("content")
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        v = _strip_control_chars(v)
        if not v:
            raise ValueError("Message cannot be empty.")
        return v

class ChatMessageOut(BaseModel):
    id: int
    sender: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}

class ConversationOut(BaseModel):
    id: int
    status: str
    created_at: datetime
    last_message_at: datetime | None
    ip_address: str | None = None
    ip_blocked: bool = False

    model_config = {"from_attributes": True}


class BlockedIpOut(BaseModel):
    id: int
    ip_address: str
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

class ConversationStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_STATUSES)}")
        return v