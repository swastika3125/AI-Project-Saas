from app.services.scoring import calculate_risk_score, evaluate_merge_decision
from app.schemas.finding import FindingCreate
from app.models.policy import Policy


def test_risk_score_bounds_and_uncertainty():
    findings = [
        FindingCreate(
            scan_id="s1",
            rule_id="bandit.B608",
            source="bandit",
            severity="CRITICAL",
            is_verified=True,
            confidence=1.0,
            file_path="auth.py",
            title="SQL Injection"
        ),
        FindingCreate(
            scan_id="s1",
            rule_id="semgrep.jwt",
            source="semgrep",
            severity="HIGH",
            is_verified=True,
            confidence=1.0,
            file_path="auth.py",
            title="JWT flaw"
        )
    ]

    score, uncertainty = calculate_risk_score(findings, sensitive_touchpoints_count=2)
    # Critical (35) + High (20) + 2 sensitive touchpoints (24) = 79
    assert 70 <= score <= 95
    assert 4.0 <= uncertainty <= 25.0


def test_merge_policy_block_decision():
    # Critical vulnerability must BLOCK under standard policy
    decision = evaluate_merge_decision(
        risk_score=85.0,
        critical_count=1,
        high_count=0,
        sensitive_touchpoints_count=1,
        policy=None
    )
    assert decision == "BLOCK"

    # Clean PR with low risk score should pass SAFE
    safe_decision = evaluate_merge_decision(
        risk_score=15.0,
        critical_count=0,
        high_count=0,
        sensitive_touchpoints_count=0,
        policy=None
    )
    assert safe_decision == "SAFE"
