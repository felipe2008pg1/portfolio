from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)
    turnstile_token: str = Field(min_length=1, max_length=2000)

class TokenResponse(BaseModel):
    message: str = "Login succesfully"