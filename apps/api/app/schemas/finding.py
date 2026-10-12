from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class TestSuggestion(BaseModel):
    command: str = Field(..., description="Copyable terminal command to run test")
    description: str = Field(..., description="Explanation of what the test asserts")
    framework: str = Field("pytest", description="Testing framework")


class FindingBase(BaseModel):
    rule_id: str
    source: str = Field(..., description="semgrep, bandit, pip_audit, secrets, ast, ai_hypothesis")
    severity: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW, INFO")
    is_verified: bool = Field(True, description="True if proven by deterministic scanner; False for AI hypotheses")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Confidence level between 0.0 and 1.0")
    file_path: str
    start_line: int = 1
    end_line: int = 1
    code_snippet: Optional[str] = None
    title: str
    explanation: Optional[str] = None
    why_it_matters: Optional[str] = None
    impact: Optional[str] = None
    suggested_tests: List[TestSuggestion] = Field(default_factory=list)
    safer_alternative: Optional[str] = None
    evidence_refs: List[Dict[str, Any]] = Field(default_factory=list)


class FindingCreate(FindingBase):
    scan_id: str
    fingerprint: Optional[str] = None


class FindingResponse(FindingBase):
    id: str
    scan_id: str
    fingerprint: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
