import re
from typing import List, Dict, Any
from app.services.scanners.base import BaseScanner, RawFinding

KNOWN_VULNERABILITIES = [
    {
        "package": "requests",
        "vulnerable_below": "2.31.0",
        "cve": "CVE-2023-32681",
        "severity": "MEDIUM",
        "title": "requests: Unintended leak of Proxy-Authorization header",
        "desc": "Requests leaks Proxy-Authorization headers to destination servers when following redirects."
    },
    {
        "package": "urllib3",
        "vulnerable_below": "2.0.7",
        "cve": "CVE-2023-45803",
        "severity": "HIGH",
        "title": "urllib3: Request body not stripped on redirect leading to header leak",
        "desc": "urllib3 fails to remove sensitive headers and body on cross-origin redirects."
    },
    {
        "package": "cryptography",
        "vulnerable_below": "42.0.4",
        "cve": "CVE-2024-26130",
        "severity": "CRITICAL",
        "title": "cryptography: NULL pointer dereference in PKCS#12 decoding",
        "desc": "Calling load_pkcs12 without a password or with invalid structures can cause process termination or memory corruption."
    },
    {
        "package": "jinja2",
        "vulnerable_below": "3.1.4",
        "cve": "CVE-2024-34064",
        "severity": "HIGH",
        "title": "Jinja2: XML/HTML attribute injection in compiler",
        "desc": "Improper escaping allows attackers to inject arbitrary attributes into rendered HTML."
    },
    {
        "package": "aiohttp",
        "vulnerable_below": "3.9.4",
        "cve": "CVE-2024-27306",
        "severity": "HIGH",
        "title": "aiohttp: HTTP request smuggling vulnerability in parser",
        "desc": "A parser discrepancy allows attackers to smuggle HTTP requests through reverse proxies."
    },
    {
        "package": "pyyaml",
        "vulnerable_below": "5.4",
        "cve": "CVE-2020-14343",
        "severity": "CRITICAL",
        "title": "PyYAML: Insecure YAML deserialization allows arbitrary code execution",
        "desc": "Default loader executes arbitrary Python objects in untrusted YAML documents."
    }
]


def parse_version_tuple(v: str):
    parts = []
    for p in v.split("."):
        try:
            parts.append(int(p))
        except ValueError:
            parts.append(0)
    return tuple(parts)


class PipAuditScanner(BaseScanner):
    name = "pip_audit"

    def scan_file(self, file_path: str, content: str) -> List[RawFinding]:
        if not any(f in file_path.lower() for f in ["requirements", "setup.py", "pyproject.toml", "pipfile"]):
            return []

        findings: List[RawFinding] = []
        lines = content.splitlines()

        for line_num, line in enumerate(lines, start=1):
            clean = line.strip().split("#")[0]
            if not clean or "==" not in clean:
                continue

            parts = clean.split("==")
            pkg_name = parts[0].strip().lower()
            pkg_version = parts[1].strip()

            for vuln in KNOWN_VULNERABILITIES:
                if vuln["package"] == pkg_name:
                    if parse_version_tuple(pkg_version) < parse_version_tuple(vuln["vulnerable_below"]):
                        findings.append(RawFinding(
                            rule_id=f"pip_audit.{vuln['cve']}",
                            source="pip_audit",
                            severity=vuln["severity"],
                            file_path=file_path,
                            start_line=line_num,
                            end_line=line_num,
                            code_snippet=clean,
                            title=vuln["title"],
                            description=f"{vuln['desc']} (Installed: {pkg_version}, Fixed in: {vuln['vulnerable_below']}+)",
                            evidence={
                                "package": pkg_name,
                                "installed_version": pkg_version,
                                "fixed_version": vuln["vulnerable_below"],
                                "cve": vuln["cve"],
                                "advisory": f"https://nvd.nist.gov/vuln/detail/{vuln['cve']}"
                            },
                            is_verified=True,
                            confidence=1.0
                        ))

        return findings
