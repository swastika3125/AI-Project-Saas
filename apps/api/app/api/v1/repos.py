from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.repository import Repository
from app.models.pull_request import PullRequest
from app.models.scan import Scan

router = APIRouter(prefix="/repos", tags=["repos"])


class RepoSummary(BaseModel):
    id: str
    name: str
    full_name: str
    owner: str
    default_branch: str
    is_active: bool
    open_prs_count: int
    health_score: int
    recent_scans_count: int

    class Config:
        from_attributes = True


@router.get("", response_model=List[RepoSummary])
async def list_repositories(db: AsyncSession = Depends(get_db)):
    """Lists all monitored repositories with health metrics."""
    result = await db.execute(select(Repository).order_by(Repository.created_at.desc()))
    repos = result.scalars().all()

    summaries = []
    for r in repos:
        # Count PRs
        pr_res = await db.execute(select(func.count(PullRequest.id)).where(PullRequest.repo_id == r.id))
        pr_count = pr_res.scalar() or 0

        # Recent scans
        scans_res = await db.execute(
            select(Scan)
            .join(PullRequest, PullRequest.id == Scan.pr_id)
            .where(PullRequest.repo_id == r.id)
            .order_by(Scan.created_at.desc())
            .limit(5)
        )
        recent_scans = scans_res.scalars().all()
        avg_risk = 0.0
        if recent_scans:
            avg_risk = sum(s.risk_score for s in recent_scans) / len(recent_scans)

        health = max(0, int(100 - avg_risk))

        summaries.append(RepoSummary(
            id=r.id,
            name=r.name,
            full_name=r.full_name,
            owner=r.owner,
            default_branch=r.default_branch,
            is_active=r.is_active,
            open_prs_count=pr_count,
            health_score=health,
            recent_scans_count=len(recent_scans)
        ))

    return summaries
