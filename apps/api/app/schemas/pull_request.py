from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.scan import ScanResponse


class PullRequestBase(BaseModel):
    pr_number: int
    title: str
    author: str
    source_branch: str
    target_branch: str = "main"
    head_sha: str
    state: str = "open"


class PullRequestCreate(PullRequestBase):
    repo_id: str


class PullRequestResponse(PullRequestBase):
    id: str
    repo_id: str
    created_at: datetime
    updated_at: datetime
    latest_scan: Optional[ScanResponse] = None

    model_config = ConfigDict(from_attributes=True)
