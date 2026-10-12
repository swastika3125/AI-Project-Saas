import hashlib
from typing import List, Dict, Any, Tuple
from app.services.scanners.base import RawFinding, BaseScanner
from app.services.scanners.bandit import BanditScanner
from app.services.scanners.semgrep import SemgrepScanner
from app.services.scanners.secrets import SecretScanner
from app.services.scanners.pip_audit import PipAuditScanner
from app.schemas.finding import FindingCreate, TestSuggestion

SEVERITY_ORDER = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFO": 1
}


def calculate_fingerprint(rule_id: str, file_path: str, start_line: int, snippet: str) -> str:
    """Computes deterministic SHA-256 fingerprint for deduplication."""
    clean_snippet = "".join(snippet.split())[:100]  # whitespace-invariant snippet
    raw = f"{rule_id}:{file_path}:{start_line}:{clean_snippet}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:32]


class ScannerPipeline:
    def __init__(self):
        self.scanners: List[BaseScanner] = [
            BanditScanner(),
            SemgrepScanner(),
            SecretScanner(),
            PipAuditScanner(),
        ]

    def scan_files(self, scan_id: str, files: Dict[str, str]) -> List[FindingCreate]:
        """
        Runs all scanners over the changed files dictionary {file_path: file_content}.
        Normalizes and deduplicates findings.
        """
        raw_findings: List[RawFinding] = []

        for file_path, content in files.items():
            for scanner in self.scanners:
                try:
                    results = scanner.scan_file(file_path, content)
                    raw_findings.extend(results)
                except Exception as e:
                    # Never crash the entire pipeline on a single scanner error
                    print(f"Error in {scanner.name} on {file_path}: {e}")

        return self.normalize_and_deduplicate(scan_id, raw_findings)

    def normalize_and_deduplicate(self, scan_id: str, raw_findings: List[RawFinding]) -> List[FindingCreate]:
        """
        Deduplicates raw findings by fingerprint and line collisions.
        Returns sorted list by severity descending.
        """
        dedup_map: Dict[str, FindingCreate] = {}

        for item in raw_findings:
            fp = calculate_fingerprint(item.rule_id, item.file_path, item.start_line, item.code_snippet)
            
            # Default test suggestion derived from deterministic scanner rule
            tests = [
                TestSuggestion(
                    command=f"pytest -k 'test_{item.rule_id.replace('.', '_')}'",
                    description=f"Verify fix for {item.rule_id} in {item.file_path}",
                    framework="pytest"
                )
            ]

            finding = FindingCreate(
                scan_id=scan_id,
                fingerprint=fp,
                rule_id=item.rule_id,
                source=item.source,
                severity=item.severity,
                is_verified=item.is_verified,
                confidence=item.confidence,
                file_path=item.file_path,
                start_line=item.start_line,
                end_line=item.end_line,
                code_snippet=item.code_snippet,
                title=item.title,
                explanation=item.description,
                why_it_matters=f"Direct vulnerability flagged by deterministic {item.source} scanner ({item.rule_id}).",
                impact="Potential security boundary breach or privilege escalation if merged without remediation.",
                suggested_tests=tests,
                safer_alternative=None,
                evidence_refs=[item.evidence],
            )

            if fp in dedup_map:
                # Merge: elevate severity if the new one is higher, combine evidence
                existing = dedup_map[fp]
                if SEVERITY_ORDER.get(finding.severity, 0) > SEVERITY_ORDER.get(existing.severity, 0):
                    existing.severity = finding.severity
                    existing.title = finding.title
                existing.evidence_refs.extend(finding.evidence_refs)
            else:
                dedup_map[fp] = finding

        # Sort by severity descending
        sorted_findings = sorted(
            list(dedup_map.values()),
            key=lambda x: SEVERITY_ORDER.get(x.severity, 0),
            reverse=True
        )

        return sorted_findings
