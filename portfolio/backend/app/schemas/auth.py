from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)
    turnstile_token: str = Field(min_length=1, max_length=2000)

class LoginResponse(BaseModel):
    mfa_required: bool = False
    mfa_token: str | None = None
    message: str = "login succesfully"

class TokenResponse(BaseModel):
    message: str = "login succesfully"

class MfaVerifyRequest(BaseModel):
    mfa_token: str = Field(min_length=1)
    code: str = Field(min_length=4, max_length=20)

class MfaSetupInitResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_base64: str

class MfaSetupConfirmRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)

class MfaSetupConfirmResponse(BaseModel):
    backup_codes: list[str]

class MfaStatusResponse(BaseModel):
    enabled: bool

class MfaDisableRequest(BaseModel):
    code: str = Field(min_length=4, max_length=20)