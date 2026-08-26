import ipaddress
from pydantic import BaseModel, ConfigDict, Field, field_validator
from urllib.parse import urlparse


_BLOCKED_NETWORKS = (
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("ff00::/8"),
)

_BLOCKED_HOST_SUFFIXES = (".local", ".localhost", ".internal", ".home.arpa")


def _is_blocked_ip(hostname: str) -> bool:
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return False

    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
        or any(address in network for network in _BLOCKED_NETWORKS)
    )


def _validate_public_url(value: str | None) -> str | None:
    if value is None or value == "":
        return None

    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http:// or https://")
    if not parsed.netloc:
        raise ValueError("Invalid URL")

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname:
        raise ValueError("Invalid URL")

    if hostname.endswith(_BLOCKED_HOST_SUFFIXES) or _is_blocked_ip(hostname):
        raise ValueError("URL points to an internal host, which is not allowed")

    if len(value) > 500:
        raise ValueError("URL is too long")
    return value


def _validate_image_path(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return _validate_public_url(value)
    if ".." in value or value.startswith("/") or not value.startswith("assets/"):
        raise ValueError("Invalid image path. Use a full URL or a path starting with assets/.")
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
