from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.schemas.finding import FindingResponse


class ScanCreate(BaseModel):
    pr_id: str
    commit_sha: str


class ScanSummaryCounts(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    verified: int = 0
    hypotheses: int = 0


class ScanResponse(BaseModel):
    id: str
    pr_id: str
    commit_sha: str
    status: str
    pipeline_stage: str
    risk_score: float
    uncertainty_range: float
    merge_decision: str
    summary: Optional[str] = None
    pipeline_timings: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    completed_at: Optional[datetime] = None
    counts: Optional[ScanSummaryCounts] = None

    model_config = ConfigDict(from_attributes=True)


class ScanDetailResponse(ScanResponse):
    findings: List[FindingResponse] = Field(default_factory=list)
