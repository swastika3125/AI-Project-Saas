from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class RawFinding(BaseModel):
    rule_id: str
    source: str  # semgrep, bandit, pip_audit, secrets
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    file_path: str
    start_line: int
    end_line: int
    code_snippet: str
    title: str
    description: str
    evidence: Dict[str, Any]
    is_verified: bool = True
    confidence: float = 1.0


class BaseScanner(ABC):
    name: str

    @abstractmethod
    def scan_file(self, file_path: str, content: str) -> List[RawFinding]:
        """Scans a single file's content and returns raw findings."""
        pass
