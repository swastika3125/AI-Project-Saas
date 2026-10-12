import pytest
from app.services.ai.validator import AIValidator


def test_ai_validator_rejects_missing_evidence():
    validator = AIValidator()
    
    # Payload with missing evidence_refs
    invalid_data = {
        "summary": "Summary",
        "overall_risk_score": 70.0,
        "uncertainty_range": 6.0,
        "merge_recommendation": "REVIEW",
        "rationale": "Rationale",
        "enrichments": [
            {
                "title": "Unsubstantiated Hypothesis",
                "severity": "HIGH",
                "explanation": "No evidence cited",
                "why_it_matters": "None",
                "impact": "None",
                "suggested_tests": [],
                "confidence": 0.7,
                "evidence_refs": []  # INVALID: Empty evidence
            }
        ]
    }

    # Strict Pydantic validation should raise error or filter out
    with pytest.raises(Exception):
        validator.validate_and_filter(invalid_data, ["app/auth.py"])


def test_ai_validator_accepts_valid_evidence():
    validator = AIValidator()

    valid_data = {
        "summary": "Summary",
        "overall_risk_score": 75.0,
        "uncertainty_range": 6.0,
        "merge_recommendation": "BLOCK",
        "rationale": "Rationale",
        "enrichments": [
            {
                "title": "Verified JWT Defect",
                "severity": "CRITICAL",
                "explanation": "Signature verification disabled",
                "why_it_matters": "Auth bypass",
                "impact": "Full compromise",
                "suggested_tests": [
                    {"command": "pytest tests/test_auth.py", "description": "Verify token reject"}
                ],
                "confidence": 0.95,
                "evidence_refs": [{"file": "app/auth.py", "line": 42}]
            }
        ]
    }

    report, rejections = validator.validate_and_filter(valid_data, ["app/auth.py"])
    assert len(report.enrichments) == 1
    assert len(rejections) == 0
