from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class PolicyBase(BaseModel):
    name: str = "Default Security Gate"
    block_on_critical: bool = True
    block_on_high: bool = True
    block_unverified_sensitive_mods: bool = True
    max_risk_score: int = Field(70, ge=1, le=100)
    require_ai_verification: bool = False
    is_active: bool = True


class PolicyCreate(PolicyBase):
    repo_id: Optional[str] = None


class PolicyUpdate(PolicyBase):
    pass


class PolicyResponse(PolicyBase):
    id: str
    repo_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
