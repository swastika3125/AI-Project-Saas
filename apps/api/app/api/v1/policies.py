from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.policy import Policy
from app.models.scan import Scan
from app.models.finding import Finding
from app.schemas.policy import PolicyResponse, PolicyCreate, PolicyUpdate

router = APIRouter(prefix="/policies", tags=["policies"])


class PolicySimulationResponse(BaseModel):
    policy: PolicyResponse
    total_evaluated_scans: int
    would_block_count: int
    would_review_count: int
    would_pass_count: int
    blocked_percentage: float


@router.get("", response_model=List[PolicyResponse])
async def list_policies(db: AsyncSession = Depends(get_db)):
    """Lists configured merge policies."""
    result = await db.execute(select(Policy).order_by(Policy.created_at.desc()))
    policies = result.scalars().all()
    if not policies:
        # Create default organization policy
        default_pol = Policy(
            name="Strict Production Security Gate",
            block_on_critical=True,
            block_on_high=True,
            block_unverified_sensitive_mods=True,
            max_risk_score=70,
            is_active=True
        )
        db.add(default_pol)
        await db.commit()
        await db.refresh(default_pol)
        return [PolicyResponse.model_validate(default_pol)]
    return [PolicyResponse.model_validate(p) for p in policies]


@router.post("", response_model=PolicyResponse)
async def create_policy(policy_in: PolicyCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new merge policy."""
    policy = Policy(
        name=policy_in.name,
        repo_id=policy_in.repo_id,
        block_on_critical=policy_in.block_on_critical,
        block_on_high=policy_in.block_on_high,
        block_unverified_sensitive_mods=policy_in.block_unverified_sensitive_mods,
        max_risk_score=policy_in.max_risk_score,
        require_ai_verification=policy_in.require_ai_verification,
        is_active=policy_in.is_active
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return PolicyResponse.model_validate(policy)


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(policy_id: str, policy_in: PolicyUpdate, db: AsyncSession = Depends(get_db)):
    """Updates policy rules and thresholds."""
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalars().first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    policy.name = policy_in.name
    policy.block_on_critical = policy_in.block_on_critical
    policy.block_on_high = policy_in.block_on_high
    policy.block_unverified_sensitive_mods = policy_in.block_unverified_sensitive_mods
    policy.max_risk_score = policy_in.max_risk_score
    policy.require_ai_verification = policy_in.require_ai_verification
    policy.is_active = policy_in.is_active

    await db.commit()
    await db.refresh(policy)
    return PolicyResponse.model_validate(policy)


@router.get("/{policy_id}/simulate", response_model=PolicySimulationResponse)
async def simulate_policy_on_past_prs(policy_id: str, db: AsyncSession = Depends(get_db)):
    """
    Live simulation: evaluates how many historical PRs would have been blocked under this policy.
    """
    pol_res = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = pol_res.scalars().first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    scans_res = await db.execute(select(Scan).where(Scan.status == "completed").limit(50))
    scans = scans_res.scalars().all()

    total = len(scans)
    blocked = 0
    review = 0
    passed = 0

    for s in scans:
        findings_res = await db.execute(select(Finding).where(Finding.scan_id == s.id))
        findings = findings_res.scalars().all()

        crit_count = sum(1 for f in findings if f.severity == "CRITICAL")
        high_count = sum(1 for f in findings if f.severity == "HIGH")

        # Evaluate conditions
        is_blocked = False
        if policy.block_on_critical and crit_count > 0:
            is_blocked = True
        elif policy.block_on_high and high_count > 0:
            is_blocked = True
        elif s.risk_score >= policy.max_risk_score:
            is_blocked = True

        if is_blocked:
            blocked += 1
        elif s.risk_score >= 40:
            review += 1
        else:
            passed += 1

    pct = round((blocked / total * 100) if total > 0 else 0.0, 1)

    return PolicySimulationResponse(
        policy=PolicyResponse.model_validate(policy),
        total_evaluated_scans=total,
        would_block_count=blocked,
        would_review_count=review,
        would_pass_count=passed,
        blocked_percentage=pct
    )
