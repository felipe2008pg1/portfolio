import httpx
from app.core.config import get_settings
from app.core.logging import security_logger

settings = get_settings()
VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile_token(token: str, remote_ip: str | None) -> bool:
    if not token:
        security_logger.warning("turnstile_verify_failed reason=empty_token")
        return False
    payload = {"secret": settings.TURNSTILE_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(VERIFY_URL, data=payload)
            result = response.json()
            success = bool(result.get("success"))
            if not success:
                security_logger.warning(
                    "turnstile_verify_failed error_codes=%s",
                    result.get("error-codes"),
                )
            return success
    except (httpx.HTTPError, ValueError) as exc:
        security_logger.warning("turnstile_verify_failed exception=%s", exc)
        return False