from slowapi import Limiter

from app.core.ip import get_client_ip

limiter = Limiter(key_func=get_client_ip)