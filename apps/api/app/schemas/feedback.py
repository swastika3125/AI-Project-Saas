from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class FeedbackCreate(BaseModel):
    finding_id: str
    action: str = Field(..., description="accept, reject, or correct")
    corrected_severity: Optional[str] = None
    note: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    finding_id: str
    action: str
    corrected_severity: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackMetrics(BaseModel):
    total_feedbacks: int = 0
    accepted_count: int = 0
    rejected_count: int = 0
    corrected_count: int = 0
    precision_rate: float = 0.0
    verified_precision: float = 0.0
    hypothesis_precision: float = 0.0
