import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.core.database import get_db
from app.models.repository import Repository
from app.models.pull_request import PullRequest
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.call_graph import CallGraph
from app.models.policy import Policy
from app.schemas.import_data import ImportPayload, ImportResponse

router = APIRouter(tags=["import"])


@router.post("/import", response_model=ImportResponse)
async def import_test_pr_data(
    payload: ImportPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Imports a complete test PR JSON payload (repository, policy, pull_request, findings, impact).
    Features:
    - Pydantic validation with explicit error responses.
    - Idempotent upsert: updates existing records if re-imported without duplicate rows.
    - Automatic deduplication of findings: items marked with `duplicate_of` merge into their target finding.
    - Preserves verification status: AI hypotheses stay unverified (is_verified = False).
    - Returns scan_id and direct redirect URL for frontend navigation.
    """
    try:
        # 1. Repository Upsert
        repo_data = payload.repository
        repo_query = select(Repository).where(
            (Repository.full_name == repo_data.full_name) | (Repository.name == repo_data.name)
        )
        repo_res = await db.execute(repo_query)
        repo = repo_res.scalars().first()

        if not repo:
            repo = Repository(
                id=str(uuid.uuid4()),
                github_repo_id=str(uuid.uuid4())[:8],
                full_name=repo_data.full_name or f"{repo_data.owner}/{repo_data.name}",
                name=repo_data.name,
                owner=repo_data.owner or "octo-corp",
                default_branch=repo_data.default_branch or "main",
                is_active=True
            )
            db.add(repo)
            await db.flush()
        else:
            if repo_data.default_branch:
                repo.default_branch = repo_data.default_branch

        # 2. Policy Upsert
        if payload.policy:
            pol_data = payload.policy
            pol_res = await db.execute(select(Policy).where(Policy.repo_id == repo.id))
            policy = pol_res.scalars().first()
            if not policy:
                policy = Policy(
                    id=str(uuid.uuid4()),
                    repo_id=repo.id,
                    name=pol_data.name or "Production Zero-Trust Security Gate",
                    block_on_critical=pol_data.block_on_critical if pol_data.block_on_critical is not None else True,
                    block_on_high=pol_data.block_on_high if pol_data.block_on_high is not None else True,
                    block_unverified_sensitive_mods=pol_data.block_unverified_sensitive_mods if pol_data.block_unverified_sensitive_mods is not None else True,
                    max_risk_score=pol_data.max_risk_score or 70,
                    require_ai_verification=pol_data.require_ai_verification or False,
                    is_active=True
                )
                db.add(policy)
            else:
                policy.name = pol_data.name or policy.name
                if pol_data.block_on_critical is not None:
                    policy.block_on_critical = pol_data.block_on_critical
                if pol_data.block_on_high is not None:
                    policy.block_on_high = pol_data.block_on_high
                if pol_data.max_risk_score is not None:
                    policy.max_risk_score = pol_data.max_risk_score

        # 3. Pull Request Upsert (Idempotent by repo_id + pr_number)
        pr_data = payload.pull_request
        pr_res = await db.execute(
            select(PullRequest).where(
                (PullRequest.repo_id == repo.id) & (PullRequest.pr_number == pr_data.pr_number)
            )
        )
        pr = pr_res.scalars().first()

        if not pr:
            pr = PullRequest(
                id=f"pr-{repo.name}-{pr_data.pr_number}",
                repo_id=repo.id,
                pr_number=pr_data.pr_number,
                title=pr_data.title,
                author=pr_data.author or "alex-dev",
                source_branch=pr_data.source_branch or "fix/legacy-login",
                target_branch=pr_data.target_branch or "main",
                head_sha=pr_data.head_sha or "e4a1f9c8b7d6e5a4",
                state=pr_data.state or "open",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(pr)
            await db.flush()
        else:
            pr.title = pr_data.title
            pr.author = pr_data.author or pr.author
            pr.source_branch = pr_data.source_branch or pr.source_branch
            pr.target_branch = pr_data.target_branch or pr.target_branch
            pr.head_sha = pr_data.head_sha or pr.head_sha
            pr.state = pr_data.state or pr.state
            pr.updated_at = datetime.utcnow()

        # 4. Scan Upsert
        scan_res = await db.execute(
            select(Scan).where(Scan.pr_id == pr.id).order_by(Scan.created_at.desc())
        )
        scan = scan_res.scalars().first()

        risk_score = float(pr_data.risk_score if pr_data.risk_score is not None else 91.0)
        uncertainty = float(pr_data.uncertainty_range if pr_data.uncertainty_range is not None else 4.5)
        decision = (pr_data.merge_decision or "BLOCK").upper()
        summary_text = pr_data.summary or f"Automated risk intelligence scan for PR #{pr.pr_number}."

        if not scan:
            scan = Scan(
                id=f"scan-pr-{pr.pr_number}",
                pr_id=pr.id,
                commit_sha=pr.head_sha,
                status="completed",
                pipeline_stage="finished",
                risk_score=risk_score,
                uncertainty_range=uncertainty,
                merge_decision=decision,
                summary=summary_text,
                pipeline_timings={
                    "fetching_ms": 115,
                    "scanning_ms": 320,
                    "mapping_ms": 260,
                    "ai_analysis_ms": 780,
                    "total_ms": 1475
                },
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            db.add(scan)
            await db.flush()
        else:
            scan.commit_sha = pr.head_sha
            scan.risk_score = risk_score
            scan.uncertainty_range = uncertainty
            scan.merge_decision = decision
            scan.summary = summary_text
            scan.status = "completed"
            scan.pipeline_stage = "finished"
            scan.completed_at = datetime.utcnow()

        # 5. Findings Deduplication and Ingestion
        # Separate primary findings from duplicates marked with `duplicate_of`
        primary_findings: list = []
        duplicate_findings: list = []

        for f in payload.findings:
            if f.duplicate_of:
                duplicate_findings.append(f)
            else:
                primary_findings.append(f)

        # Merge duplicates into primary findings
        for dup in duplicate_findings:
            target = None
            # Find target by ID
            for p in primary_findings:
                if p.id and p.id == dup.duplicate_of:
                    target = p
                    break

            # Fallback: find target by same rule_id category or same file/line
            if not target:
                for p in primary_findings:
                    if p.file_path == dup.file_path and abs(p.start_line - dup.start_line) <= 5:
                        target = p
                        break

            if target:
                # Merge secondary scanner evidence into target evidence_refs
                merged_evidence = {
                    "duplicate_merged": True,
                    "source": dup.source,
                    "rule_id": dup.rule_id,
                    "title": dup.title,
                    "severity": dup.severity,
                    "line": dup.start_line,
                    "file_path": dup.file_path
                }
                if target.evidence_refs is None:
                    target.evidence_refs = []
                target.evidence_refs.append(merged_evidence)

                # Inherit safer alternative or tests if primary lacked them
                if not target.safer_alternative and dup.safer_alternative:
                    target.safer_alternative = dup.safer_alternative
                if not target.suggested_tests and dup.suggested_tests:
                    target.suggested_tests = dup.suggested_tests
            else:
                # If target was not found, keep duplicate as standalone to avoid data loss
                primary_findings.append(dup)

        # Clear existing findings for this scan to allow clean idempotent overwrite
        await db.execute(delete(Finding).where(Finding.scan_id == scan.id))

        # Insert deduped findings
        for idx, f in enumerate(primary_findings):
            finding_id = f.id or f"find-import-{pr.pr_number}-{idx + 1}"
            finding_db = Finding(
                id=finding_id,
                scan_id=scan.id,
                fingerprint=f"fp-{f.rule_id}-{f.file_path}-{f.start_line}",
                severity=f.severity,
                is_verified=bool(f.is_verified),
                confidence=float(f.confidence if f.confidence is not None else 1.0),
                source=f.source or "semgrep",
                rule_id=f.rule_id,
                file_path=f.file_path,
                start_line=f.start_line or 1,
                end_line=f.end_line or f.start_line or 1,
                code_snippet=f.code_snippet or "",
                title=f.title,
                explanation=f.explanation or "",
                why_it_matters=f.why_it_matters or "",
                impact=f.impact or "",
                suggested_tests=f.suggested_tests or [],
                safer_alternative=f.safer_alternative or "",
                evidence_refs=f.evidence_refs or [],
                created_at=datetime.utcnow()
            )
            db.add(finding_db)

        # 6. Call Graph / Impact Upsert
        if payload.impact:
            impact_data = payload.impact
            # Clear existing call graph for this scan
            await db.execute(delete(CallGraph).where(CallGraph.scan_id == scan.id))
            cg = CallGraph(
                id=f"cg-scan-{scan.id}",
                scan_id=scan.id,
                nodes=impact_data.nodes,
                edges=impact_data.edges,
                affected_modules=impact_data.affected_modules,
                sensitive_touchpoints=impact_data.sensitive_touchpoints,
                created_at=datetime.utcnow()
            )
            db.add(cg)

        await db.commit()

        return ImportResponse(
            status="success",
            message=f"Successfully imported PR #{pr.pr_number} '{pr.title}' into repository '{repo.full_name}'.",
            pr_id=pr.id,
            scan_id=scan.id,
            pr_number=pr.pr_number,
            findings_count=len(primary_findings),
            merged_duplicates_count=len(duplicate_findings),
            redirect_url=f"/dashboard/scans/{scan.id}"
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process and import PR risk data: {str(e)}"
        )
