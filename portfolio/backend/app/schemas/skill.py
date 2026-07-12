from pydantic import BaseModel, ConfigDict, Field


class SkillBase(BaseModel):
    category: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=64)
    display_order: int = Field(default=0, ge=0, le=9999)


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=64)
    display_order: int | None = Field(default=None, ge=0, le=9999)


class SkillOut(SkillBase):
    model_config = ConfigDict(from_attributes=True)
    id: int