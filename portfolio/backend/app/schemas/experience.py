from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.validators import validate_public_url as _validate_company_url

class ExperienceBase(BaseModel):
    company: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=120)
    period: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=3000)
    description_en: str | None = Field(default=None, max_length=3000)
    company_url: str | None = Field(default=None, max_length=500)
    logo_url: str | None = Field(default=None, max_length=500)
    is_published: bool = True
    display_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("company_url")
    @classmethod
    def validate_company_url(cls, value: str | None) -> str | None:
        return _validate_company_url(value)

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        return _validate_company_url(value)

class ExperienceCreate(ExperienceBase):
    pass

class ExperienceUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = Field(default=None, min_length=1, max_length=120)
    period: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=3000)
    description_en: str | None = Field(default=None, max_length=3000)
    company_url: str | None = Field(default=None, max_length=500)
    logo_url: str | None = Field(default=None, max_length=500)
    is_published: bool | None = None
    display_order: int | None = Field(default=None, ge=0, le=9999)

    @field_validator("company_url")
    @classmethod
    def validate_company_url(cls, value: str | None) -> str | None:
        return _validate_company_url(value)

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        return _validate_company_url(value)

class ExperienceOut(ExperienceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int