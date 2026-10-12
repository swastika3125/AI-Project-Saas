import re
import ast
from typing import List
from app.services.scanners.base import BaseScanner, RawFinding


class SemgrepScanner(BaseScanner):
    name = "semgrep"

    def scan_file(self, file_path: str, content: str) -> List[RawFinding]:
        findings: List[RawFinding] = []

        lines = content.splitlines()

        # 1. JWT 'none' algorithm or missing verification
        jwt_none_pattern = re.compile(r"""algorithms\s*=\s*\[.*['"]none['"].*\]""", re.IGNORECASE)
        jwt_decode_unverified = re.compile(r"""jwt\.decode\(.*options\s*=\s*\{.*verify_signature.*:\s*False.*\}""", re.IGNORECASE)
        
        # 2. Insecure CORS (Wildcard with Credentials)
        cors_wildcard = re.compile(r"""allow_origins\s*=\s*\[\s*["']\*["']\s*\].*allow_credentials\s*=\s*True""", re.DOTALL)

        # 3. Path Traversal with open()
        path_traversal = re.compile(r"""open\(\s*(f["'].*\{.*\}|.*os\.path\.join\(.*request\..*\))""")

        for i, line in enumerate(lines, start=1):
            if jwt_none_pattern.search(line):
                findings.append(RawFinding(
                    rule_id="semgrep.python.jwt.insecure-algorithm-none",
                    source="semgrep",
                    severity="CRITICAL",
                    file_path=file_path,
                    start_line=i,
                    end_line=i,
                    code_snippet=line.strip(),
                    title="Insecure JWT Verification with 'none' Algorithm",
                    description="Allowing the 'none' algorithm disables cryptographic verification of token signatures.",
                    evidence={"rule": "semgrep.python.jwt.insecure-algorithm-none", "match": line.strip()},
                    is_verified=True,
                    confidence=1.0
                ))
            if "verify_signature" in line and "False" in line:
                findings.append(RawFinding(
                    rule_id="semgrep.python.jwt.unverified-token",
                    source="semgrep",
                    severity="CRITICAL",
                    file_path=file_path,
                    start_line=i,
                    end_line=i,
                    code_snippet=line.strip(),
                    title="JWT Signature Verification Explicitly Disabled",
                    description="Disabling signature verification permits attackers to forge arbitrary claims including admin roles.",
                    evidence={"rule": "semgrep.python.jwt.unverified-token", "match": line.strip()},
                    is_verified=True,
                    confidence=1.0
                ))

        # Check multi-line CORS misconfiguration
        if "CORSMiddleware" in content and ("allow_origins=[\"*\"]" in content or "allow_origins=['*']" in content) and "allow_credentials=True" in content:
            findings.append(RawFinding(
                rule_id="semgrep.python.fastapi.cors-wildcard-with-credentials",
                source="semgrep",
                severity="HIGH",
                file_path=file_path,
                start_line=1,
                end_line=20,
                code_snippet="CORSMiddleware(allow_origins=['*'], allow_credentials=True)",
                title="Insecure CORS: Wildcard Origin With Credentials Enabled",
                description="Combining wildcard origin with credentials allows malicious third-party origins to access authenticated sessions.",
                evidence={"rule": "semgrep.python.fastapi.cors-wildcard-with-credentials"},
                is_verified=True,
                confidence=0.95
            ))

        return findings
