from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class AITestSuggestion(BaseModel):
    command: str = Field(..., description="Executable test command, e.g. pytest tests/test_auth.py -k test_jwt_validation")
    description: str = Field(..., description="Clear explanation of the test condition")
    framework: str = Field("pytest")


class AIFindingEnrichment(BaseModel):
    finding_id: Optional[str] = Field(None, description="Target finding ID if enriching existing scanner finding")
    title: str = Field(..., description="Concise technical title")
    severity: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW, or INFO")
    explanation: str = Field(..., description="Evidence-backed explanation of the risk")
    why_it_matters: str = Field(..., description="Explains business and security implications")
    impact: str = Field(..., description="Blast radius of exploitation or failure")
    suggested_tests: List[AITestSuggestion] = Field(default_factory=list)
    safer_code: Optional[str] = Field(None, description="Recommended remediation code or unified diff")
    confidence: float = Field(..., ge=0.1, le=1.0, description="Hypothesis confidence level")
    evidence_refs: List[Dict[str, Any]] = Field(
        ...,
        min_length=1,
        description="Non-empty list of code locations or scanner findings that prove this hypothesis. Reject any claim without evidence_refs."
    )

    @field_validator("evidence_refs")
    @classmethod
    def validate_has_evidence(cls, v: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not v or len(v) == 0:
            raise ValueError("Every AI hypothesis MUST provide non-empty evidence_refs pointing to exact code lines or scanner outputs.")
        return v


class AIAnalysisReport(BaseModel):
    summary: str
    overall_risk_score: float = Field(..., ge=0.0, le=100.0)
    uncertainty_range: float = Field(..., ge=1.0, le=30.0)
    merge_recommendation: str = Field(..., description="BLOCK, REVIEW, or SAFE")
    rationale: str
    enrichments: List[AIFindingEnrichment] = Field(default_factory=list)
