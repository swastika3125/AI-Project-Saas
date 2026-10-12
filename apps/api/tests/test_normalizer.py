from app.services.scanners.normalizer import ScannerPipeline, calculate_fingerprint
from app.services.scanners.base import RawFinding


def test_fingerprint_generation():
    fp1 = calculate_fingerprint("bandit.B608", "app/auth.py", 42, "query = f'SELECT * FROM users'")
    fp2 = calculate_fingerprint("bandit.B608", "app/auth.py", 42, "query =  f'SELECT * FROM users' ")
    # Whitespace invariant fingerprinting
    assert fp1 == fp2
    assert len(fp1) == 32


def test_deduplication_and_severity_ordering():
    pipeline = ScannerPipeline()
    
    raw = [
        RawFinding(
            rule_id="bandit.B608",
            source="bandit",
            severity="CRITICAL",
            file_path="app/auth.py",
            start_line=10,
            end_line=10,
            code_snippet="query = f'SELECT * FROM {user}'",
            title="SQL Injection",
            description="SQL injection in auth",
            evidence={"type": "ast"}
        ),
        RawFinding(
            rule_id="bandit.B608",
            source="bandit",
            severity="CRITICAL",
            file_path="app/auth.py",
            start_line=10,
            end_line=10,
            code_snippet="query = f'SELECT * FROM {user}'",
            title="SQL Injection",
            description="Duplicate report on same line",
            evidence={"type": "second_pass"}
        ),
        RawFinding(
            rule_id="semgrep.cors",
            source="semgrep",
            severity="LOW",
            file_path="app/cors.py",
            start_line=5,
            end_line=5,
            code_snippet="cors = '*'",
            title="Wildcard CORS",
            description="Wildcard CORS",
            evidence={"type": "semgrep"}
        )
    ]

    deduped = pipeline.normalize_and_deduplicate("scan-123", raw)
    
    # 3 raw findings deduplicated into 2 unique findings
    assert len(deduped) == 2
    # Highest severity first (CRITICAL before LOW)
    assert deduped[0].severity == "CRITICAL"
    assert deduped[1].severity == "LOW"
    # Combined evidence
    assert len(deduped[0].evidence_refs) == 2
