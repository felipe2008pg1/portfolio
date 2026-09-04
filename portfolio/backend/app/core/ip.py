import ipaddress

from fastapi import Request

from app.core.config import get_settings

settings = get_settings()

_FALLBACK_IP = "127.0.0.1"


def _socket_peer(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return _FALLBACK_IP


def _is_valid_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def get_client_ip(request: Request) -> str:
    """Resolves the client's real IP by trusting exactly
    `settings.TRUSTED_PROXY_HOPS` reverse proxies (Railway edge = 1 hop).

    X-Forwarded-For is a common header that can be controlled by the client—never
    trust it directly (CWE-348). With a fixed number of hops, the value
    written by *our* trusted proxy always appears at a fixed position
    counting from the *right*, regardless of how many fake values ​​an attacker
    adds to the left.

    TRUSTED_PROXY_HOPS = 0 (default) ignores the header and always uses the raw
    TCP peer—safe for local development and any unverified environment.
    Set to 1 for standard deployment behind the Railway edge.
    """
    fallback = _socket_peer(request)

    hops = settings.TRUSTED_PROXY_HOPS
    if hops <= 0:
        return fallback

    forwarded_for = request.headers.get("X-Forwarded-For")
    if not forwarded_for:
        return fallback

    parts = [p.strip() for p in forwarded_for.split(",") if p.strip()]
    if len(parts) < hops:
        return fallback

    candidate = parts[-hops]
    if not _is_valid_ip(candidate):
        return fallback

    return candidate