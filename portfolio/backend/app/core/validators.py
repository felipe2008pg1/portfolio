"""Shared input validators used across Pydantic schemas."""
from ipaddress import ip_address
from urllib.parse import urlparse

BLOCKED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "0.0.0.0",
}

def validate_public_url(value: str | None, *, max_length: int = 500) -> str | None:
    """Validate a user-supplied URL that will be rendered client-side
    (``<a href>`` / ``<img src>``) and never fetched server-side.

    Rejects internal/private/link-local hosts as defense-in-depth, so this
    validator remains safe to reuse if a server-side fetch (e.g. link
    preview, thumbnail generation) is ever introduced for the same field.
    """
    if value is None or value == "":
        return None

    value = value.strip()

    if len(value) > max_length:
        raise ValueError("URL is too long")

    parsed = urlparse(value)

    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http:// or https://")

    if not parsed.netloc:
        raise ValueError("Invalid URL")

    hostname = (parsed.hostname or "").lower()

    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".local"):
        raise ValueError("URL points to an internal host, which is not allowed")

    try:
        ip = ip_address(hostname)
    except ValueError:
        # Not a literal IP (normal domain name) — nothing further to check
        # here without a DNS lookup, which this validator intentionally
        # does not perform (see DECISIONS.md: DNS rebinding is only a real
        # concern if server-side fetching is ever added).
        return value

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

    return value