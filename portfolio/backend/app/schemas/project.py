from pydantic import BaseModel, ConfigDict, Field, field_validator
from urllib.parse import urlparse


def _validate_public_url(value: str | None) -> str | None:
    """
    Valida que a URL é http(s) e não aponta para hosts internos/privados —
    mitigação de SSRF caso essa URL seja usada em fetch/preview no futuro,
    e proteção contra injeção de schemes perigosos (javascript:, data:, file:).
    """
    if value is None or value == "":
        return None
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL deve usar http:// ou https://")
    if not parsed.netloc:
        raise ValueError("URL inválida")
    blocked_hosts = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
    hostname = (parsed.hostname or "").lower()
    if hostname in blocked_hosts or hostname.endswith(".local"):
        raise ValueError("URL aponta para host interno, não permitido")
    if len(value) > 500:
        raise ValueError("URL muito longa")
    return value


class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    stack: str = Field(min_length=1, max_length=255)
    repo_url: str | None = Field(default=None, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)
    is_published: bool = True
    display_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("repo_url", "demo_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        return _validate_public_url(v)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    stack: str | None = Field(default=None, min_length=1, max_length=255)
    repo_url: str | None = Field(default=None, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)
    is_published: bool | None = None
    display_order: int | None = Field(default=None, ge=0, le=9999)

    @field_validator("repo_url", "demo_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        return _validate_public_url(v)


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_path: str | None = None