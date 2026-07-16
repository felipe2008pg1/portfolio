import httpx
from app.core.config import get_settings
from app.core.logging import security_logger

settings = get_settings()

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile_token(token: str, remote_ip: str | None) -> bool:
    if not token:
        return False

    payload = {"secret": settings.TURNSTILE_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(VERIFY_URL, data=payload)
            result = response.json()
            
            print(f"DEBUG: Completed reponse Turnstile: {result}")
            
            return bool(result.get("success"))
    except Exception as exc:
        security_logger.warning("turnstile_verify_failed error=%s", exc)
        return False