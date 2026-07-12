from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuração central da aplicação. Todos os valores vêm do .env —
    nunca hardcoded no código. Falha rápido (na inicialização) se algo
    obrigatório estiver faltando ou for inseguro.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    CORS_ALLOWED_ORIGINS: str = ""
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"

    WHATSAPP_NUMBER: str

    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str

    RATE_LIMIT_CONTACT: str = "5/hour"
    RATE_LIMIT_LOGIN: str = "5/minute"

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or v.startswith("CHANGE_ME") or len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY inválida ou não configurada. "
                "Gere uma com: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        return v

    @field_validator("WHATSAPP_NUMBER")
    @classmethod
    def validate_whatsapp(cls, v: str) -> str:
        if not v.isdigit() or not (10 <= len(v) <= 15):
            raise ValueError("WHATSAPP_NUMBER deve conter apenas dígitos (DDI+DDD+numero).")
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()