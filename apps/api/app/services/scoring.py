from typing import List, Dict, Any, Tuple
from app.schemas.finding import FindingCreate
from app.models.policy import Policy


def calculate_risk_score(
    findings: List[FindingCreate],
    sensitive_touchpoints_count: int,
    total_changed_lines: int = 0
) -> Tuple[float, float]:
    """
    Computes a risk score between 0.0 and 100.0, alongside an uncertainty interval margin (+/-).
    Risk scores are prioritization aids, NEVER proof of safety.
    """
    raw_score = 0.0

    severity_weights = {
        "CRITICAL": 35.0,
        "HIGH": 20.0,
        "MEDIUM": 10.0,
        "LOW": 3.0,
        "INFO": 1.0,
    }

    verified_count = 0
    hypothesis_count = 0

    for f in findings:
        weight = severity_weights.get(f.severity.upper(), 5.0)
        # Verified scanner facts carry full deterministic weight; hypotheses scaled by confidence
        if f.is_verified:
            raw_score += weight
            verified_count += 1
        else:
            raw_score += weight * (f.confidence or 0.8)
            hypothesis_count += 1

    # Blast radius: touchpoints in sensitive auth/payment modules
    raw_score += min(sensitive_touchpoints_count * 12.0, 30.0)

    # Complexity penalty for large diffs
    if total_changed_lines > 400:
        raw_score += 10.0
    elif total_changed_lines > 150:
        raw_score += 5.0

    # Clamp to 0 - 100
    final_score = min(max(raw_score, 0.0), 100.0)

    # Uncertainty calculation
    # Starts at 4.0 margin. Increases when hypotheses outnumber verified facts or blast radius is high
    uncertainty = 4.0
    if hypothesis_count > 0:
        uncertainty += min(hypothesis_count * 3.5, 12.0)
    if sensitive_touchpoints_count > 0:
        uncertainty += 4.0
    if final_score > 80 or final_score < 15:
        # Extreme ends have tighter convergence
        uncertainty = max(uncertainty * 0.75, 4.0)

    final_uncertainty = round(min(uncertainty, 25.0), 1)

    return round(final_score, 1), final_uncertainty


def evaluate_merge_decision(
    risk_score: float,
    critical_count: int,
    high_count: int,
    sensitive_touchpoints_count: int,
    policy: Policy = None
) -> str:
    """
    Evaluates merge decision (BLOCK, REVIEW, SAFE) based on active policy rules.
    """
    if policy is None:
        # Default safety policy
        if critical_count > 0:
            return "BLOCK"
        if high_count > 0 or risk_score >= 70:
            return "BLOCK"
        if risk_score >= 40 or sensitive_touchpoints_count > 0:
            return "REVIEW"
        return "SAFE"

    # Evaluated against custom configured policy
    if policy.block_on_critical and critical_count > 0:
        return "BLOCK"
    if policy.block_on_high and high_count > 0:
        return "BLOCK"
    if policy.block_unverified_sensitive_mods and sensitive_touchpoints_count > 0 and critical_count + high_count > 0:
        return "BLOCK"
    if risk_score >= policy.max_risk_score:
        return "BLOCK"

    if risk_score >= 40 or sensitive_touchpoints_count > 0:
        return "REVIEW"

    return "SAFE"
