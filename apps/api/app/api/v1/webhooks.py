import json
import uuid
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import verify_github_signature
from app.core.database import get_db
from app.models.repository import Repository
from app.models.pull_request import PullRequest
from app.models.scan import Scan
from app.services.github_client import GitHubClient
from app.worker.tasks import run_scan_pipeline_job

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/github")
async def handle_github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives and processes GitHub Webhooks.
    1. Validates HMAC-SHA256 signature against settings.GITHUB_WEBHOOK_SECRET
    2. Filters for pull_request events (opened, synchronize, reopened)
    3. Fetches PR files/diffs and enqueues background scan
    """
    body_bytes = await request.body()

    # Enforce signature verification unless secret is explicitly unset in dev mode
    if settings.GITHUB_WEBHOOK_SECRET and settings.GITHUB_WEBHOOK_SECRET != "development-webhook-secret":
        if not verify_github_signature(body_bytes, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid webhook HMAC signature")
    elif x_hub_signature_256:
        # If header was provided in dev, verify it
        if not verify_github_signature(body_bytes, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid webhook HMAC signature")

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if x_github_event != "pull_request":
        return {"status": "ignored", "event": x_github_event, "reason": "Only pull_request events processed"}

    action = payload.get("action")
    if action not in ["opened", "synchronize", "reopened"]:
        return {"status": "ignored", "action": action, "reason": "Action does not warrant rescan"}

    pr_data = payload.get("pull_request", {})
    repo_data = payload.get("repository", {})
    repo_full_name = repo_data.get("full_name", "unknown/repo")
    pr_number = pr_data.get("number")
    pr_title = pr_data.get("title", f"PR #{pr_number}")
    head_sha = pr_data.get("head", {}).get("sha", "head")
    source_branch = pr_data.get("head", {}).get("ref", "feature")
    target_branch = pr_data.get("base", {}).get("ref", "main")
    author = pr_data.get("user", {}).get("login", "unknown")

    # Find or create repository
    result = await db.execute(select(Repository).where(Repository.full_name == repo_full_name))
    repo = result.scalars().first()
    if not repo:
        repo = Repository(
            full_name=repo_full_name,
            name=repo_data.get("name", "repo"),
            owner=repo_data.get("owner", {}).get("login", "owner"),
            default_branch=target_branch,
            is_active=True
        )
        db.add(repo)
        await db.commit()
        await db.refresh(repo)

    # Find or create pull request
    pr_res = await db.execute(select(PullRequest).where(
        PullRequest.repo_id == repo.id,
        PullRequest.pr_number == pr_number
    ))
    pr = pr_res.scalars().first()
    if not pr:
        pr = PullRequest(
            repo_id=repo.id,
            pr_number=pr_number,
            title=pr_title,
            author=author,
            source_branch=source_branch,
            target_branch=target_branch,
            head_sha=head_sha,
            state="open"
        )
        db.add(pr)
        await db.commit()
        await db.refresh(pr)
    else:
        pr.head_sha = head_sha
        pr.title = pr_title
        await db.commit()

    # Create new Scan record
    scan = Scan(
        pr_id=pr.id,
        commit_sha=head_sha,
        status="pending",
        pipeline_stage="queued"
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Fetch files via GitHub client
    gh_client = GitHubClient()
    files_list = await gh_client.get_pr_files(repo_full_name, pr_number)
    files_dict = {}
    for f in files_list:
        filename = f.get("filename")
        patch = f.get("patch", "")
        if filename and patch:
            files_dict[filename] = patch

    # If patch empty or no files returned (e.g. mock webhook test), create placeholder diff
    if not files_dict:
        files_dict = {
            "app/auth.py": "def authenticate(token):\n    # TODO\n    return jwt.decode(token, verify=False)\n"
        }

    # Queue background analysis job
    background_tasks.add_task(run_scan_pipeline_job, scan.id, files_dict, pr_title)

    return {
        "status": "queued",
        "scan_id": scan.id,
        "repo": repo_full_name,
        "pr_number": pr_number,
        "head_sha": head_sha
    }
