from ipaddress import ip_address
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_public_url(value: str | None) -> str | None:
    if value is None or value == "":
        return None

    parsed = urlparse(value)

    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http:// or https://")

    if not parsed.netloc:
        raise ValueError("Invalid URL")

    hostname = (parsed.hostname or "").lower()

    blocked_hosts = {
        "localhost",
        "localhost.localdomain",
        "ip6-localhost",
        "ip6-loopback",
        "0.0.0.0",
    }

    if hostname in blocked_hosts or hostname.endswith(".local"):
        raise ValueError("URL points to an internal host, which is not allowed")

    try:
        ip = ip_address(hostname)

        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise ValueError(
                "URL points to a private or internal IP address, which is not allowed"
            )

    except ValueError as exc:
        if str(exc).startswith(
            "URL points to a private or internal IP address"
        ):
            raise

    if len(value) > 500:
        raise ValueError("URL is too long")

    return value


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