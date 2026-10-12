from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator


class RepositoryImportSchema(BaseModel):
    name: str
    full_name: Optional[str] = None
    owner: Optional[str] = "octo-corp"
    default_branch: Optional[str] = "main"

    @model_validator(mode="after")
    def populate_full_name(self):
        if not self.full_name:
            self.full_name = f"{self.owner}/{self.name}"
        return self


class PolicyImportSchema(BaseModel):
    name: Optional[str] = "Production Zero-Trust Security Gate"
    block_on_critical: Optional[bool] = True
    block_on_high: Optional[bool] = True
    block_unverified_sensitive_mods: Optional[bool] = True
    max_risk_score: Optional[int] = 70
    require_ai_verification: Optional[bool] = False


class PullRequestImportSchema(BaseModel):
    pr_number: int
    title: str
    author: Optional[str] = "alex-dev"
    source_branch: Optional[str] = "fix/legacy-login"
    target_branch: Optional[str] = "main"
    head_sha: Optional[str] = "e4a1f9c8b7d6e5a4"
    state: Optional[str] = "open"
    risk_score: Optional[float] = 91.0
    uncertainty_range: Optional[float] = 4.5
    merge_decision: Optional[str] = "BLOCK"
    summary: Optional[str] = None


class FindingImportSchema(BaseModel):
    id: Optional[str] = None
    duplicate_of: Optional[str] = None
    rule_id: str
    source: Optional[str] = "semgrep"
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    is_verified: Optional[bool] = None
    verified: Optional[bool] = None  # Support alias
    confidence: Optional[float] = 1.0
    file_path: Optional[str] = None
    file: Optional[str] = None  # Support alias
    start_line: Optional[int] = None
    line: Optional[int] = None  # Support alias
    end_line: Optional[int] = None
    code_snippet: Optional[str] = None
    title: str
    explanation: Optional[str] = None
    why_it_matters: Optional[str] = None
    impact: Optional[str] = None
    suggested_tests: Optional[List[Any]] = Field(default_factory=list)
    safer_alternative: Optional[str] = None
    safer_code: Optional[str] = None  # Support alias
    evidence_refs: Optional[List[Any]] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize_aliases(self):
        if not self.file_path and self.file:
            self.file_path = self.file
        if not self.file_path:
            self.file_path = "unknown_file.py"

        if self.start_line is None:
            self.start_line = self.line if self.line is not None else 1
        if self.end_line is None:
            self.end_line = self.start_line

        if not self.safer_alternative and self.safer_code:
            self.safer_alternative = self.safer_code

        # Keep verified flag: prioritize explicit verified/is_verified, fallback for AI hypotheses
        if self.is_verified is None:
            if self.verified is not None:
                self.is_verified = self.verified
            elif self.source in ["ai_hypothesis", "ai", "llm"]:
                self.is_verified = False
            else:
                self.is_verified = True

        self.severity = self.severity.upper()
        return self


class ImpactImportSchema(BaseModel):
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    affected_modules: List[str] = Field(default_factory=list)
    sensitive_touchpoints: List[str] = Field(default_factory=list)


class ImportPayload(BaseModel):
    repository: RepositoryImportSchema
    policy: Optional[PolicyImportSchema] = None
    pull_request: PullRequestImportSchema
    findings: List[FindingImportSchema] = Field(default_factory=list)
    impact: Optional[ImpactImportSchema] = None

    model_config = ConfigDict(extra="ignore")


class ImportResponse(BaseModel):
    status: str
    message: str
    pr_id: str
    scan_id: str
    pr_number: int
    findings_count: int
    merged_duplicates_count: int
    redirect_url: str
