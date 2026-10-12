from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.pull_request import PullRequest
from app.models.scan import Scan
from app.schemas.pull_request import PullRequestResponse
from app.schemas.scan import ScanResponse
from app.worker.tasks import run_scan_pipeline_job

router = APIRouter(prefix="/pull-requests", tags=["pull_requests"])


@router.get("", response_model=List[PullRequestResponse])
async def list_pull_requests(
    repo_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lists pull requests with their latest scan risk assessment."""
    query = select(PullRequest).order_by(PullRequest.updated_at.desc())
    if repo_id:
        query = query.where(PullRequest.repo_id == repo_id)

    result = await db.execute(query)
    prs = result.scalars().all()

    items = []
    for pr in prs:
        # Get latest scan
        scan_res = await db.execute(
            select(Scan).where(Scan.pr_id == pr.id).order_by(Scan.created_at.desc()).limit(1)
        )
        latest_scan = scan_res.scalars().first()
        
        pr_item = PullRequestResponse.model_validate(pr)
        if latest_scan:
            pr_item.latest_scan = ScanResponse.model_validate(latest_scan)
        items.append(pr_item)

    return items


@router.get("/{pr_id}", response_model=PullRequestResponse)
async def get_pull_request(pr_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves single PR with scan history."""
    result = await db.execute(select(PullRequest).where(PullRequest.id == pr_id))
    pr = result.scalars().first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")

    scan_res = await db.execute(
        select(Scan).where(Scan.pr_id == pr.id).order_by(Scan.created_at.desc()).limit(1)
    )
    latest_scan = scan_res.scalars().first()

    pr_item = PullRequestResponse.model_validate(pr)
    if latest_scan:
        pr_item.latest_scan = ScanResponse.model_validate(latest_scan)
    return pr_item


@router.post("/{pr_id}/rescan")
async def trigger_rescan(
    pr_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Triggers an immediate re-scan for a pull request."""
    result = await db.execute(select(PullRequest).where(PullRequest.id == pr_id))
    pr = result.scalars().first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")

    scan = Scan(
        pr_id=pr.id,
        commit_sha=pr.head_sha,
        status="pending",
        pipeline_stage="queued"
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Sample diff for rescan simulation if no git connection
    sample_files = {
        "app/api/endpoints/auth.py": """
import jwt
from fastapi import APIRouter, HTTPException

router = APIRouter()

def decode_token(token: str):
    # INSECURE: Disables cryptographic verification
    return jwt.decode(token, options={"verify_signature": False})
""",
        "app/services/billing.py": """
import sqlite3

def get_billing_record(user_id: str):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    # INSECURE: SQL Injection via f-string
    query = f"SELECT * FROM invoices WHERE user_id = '{user_id}'"
    return cursor.execute(query).fetchall()
"""
    }

    background_tasks.add_task(run_scan_pipeline_job, scan.id, sample_files, pr.title)

    return {"status": "enqueued", "scan_id": scan.id}
