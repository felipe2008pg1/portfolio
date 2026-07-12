from functools import lru_cache
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Central application configuration. All values are loaded from the .env file—
    never hardcoded in the source code. The application fails fast during startup
    if any required value is missing or considered insecure.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

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
    def validate_jwt_secret(cls, value: str) -> str:
        if not value or value.startswith("CHANGE_ME") or len(value) < 32:
            raise ValueError(
                "Invalid or missing JWT_SECRET_KEY. "
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
            )
        return value

    @field_validator("WHATSAPP_NUMBER")
    @classmethod
    def validate_whatsapp(cls, value: str) -> str:
        if not value.isdigit() or not (10 <= len(value) <= 15):
            raise ValueError(
                "WHATSAPP_NUMBER must contain only digits "
                "(country code + area code + phone number)."
            )
        return value

    @property
    def cors_origins_list(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [
            host.strip()
            for host in self.ALLOWED_HOSTS.split(",")
            if host.strip()
        ]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

@lru_cache
def get_settings() -> Settings:
    return Settings()