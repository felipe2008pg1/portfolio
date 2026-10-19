from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.validators import validate_public_url as _validate_public_url

def _validate_image_path(value: str | None) -> str | None:
    if value is None or value == "":
        return None

    if value.startswith("http://") or value.startswith("https://"):
        return _validate_public_url(value)

    if (
        ".." in value
        or value.startswith("/")
        or not value.startswith("assets/")
    ):
        raise ValueError(
            "Invalid image path. Use a full URL or a path starting with assets/."
        )

    if len(value) > 500:
        raise ValueError("Path is too long")

    return value


class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    description_en: str | None = Field(default=None, max_length=2000)
    stack: str = Field(min_length=1, max_length=255)
    repo_url: str | None = Field(default=None, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)
    image_path: str | None = Field(default=None, max_length=500)
    is_published: bool = True
    display_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("repo_url", "demo_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        return _validate_public_url(v)

    @field_validator("image_path")
    @classmethod
    def validate_image(cls, v: str | None) -> str | None:
        return _validate_image_path(v)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    description_en: str | None = Field(default=None, max_length=2000)
    stack: str | None = Field(default=None, min_length=1, max_length=255)
    repo_url: str | None = Field(default=None, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)
    image_path: str | None = Field(default=None, max_length=500)
    is_published: bool | None = None
    display_order: int | None = Field(default=None, ge=0, le=9999)

    @field_validator("repo_url", "demo_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        return _validate_public_url(v)

    @field_validator("image_path")
    @classmethod
    def validate_image(cls, v: str | None) -> str | None:
        return _validate_image_path(v)


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int