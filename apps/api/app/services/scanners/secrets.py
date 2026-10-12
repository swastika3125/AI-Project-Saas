import re
import math
from typing import List
from app.services.scanners.base import BaseScanner, RawFinding

SECRET_REGEXES = [
    ("secret.aws.access-key", "CRITICAL", re.compile(r"""\b(AKIA[0-9A-Z]{16})\b"""), "Exposed AWS Access Key ID"),
    ("secret.stripe.live-key", "CRITICAL", re.compile(r"""\b(sk_live_[0-9a-zA-Z]{24,})\b"""), "Exposed Stripe Live Secret Key"),
    ("secret.github.pat", "CRITICAL", re.compile(r"""\b(ghp_[0-9a-zA-Z]{36})\b"""), "Exposed GitHub Personal Access Token"),
    ("secret.slack.token", "HIGH", re.compile(r"""\b(xoxb-[0-9]{11,}-[0-9]{11,}-[a-zA-Z0-9]{24})\b"""), "Exposed Slack Bot Token"),
    ("secret.private-key", "CRITICAL", re.compile(r"""-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----"""), "Hardcoded Cryptographic Private Key"),
    ("secret.generic.api-key", "HIGH", re.compile(r"""(?i)(?:api_key|secret_key|auth_token)\s*=\s*['"]([a-zA-Z0-9_\-]{32,})['"]"""), "Hardcoded High-Entropy API Secret"),
]


def shannon_entropy(data: str) -> float:
    """Calculates Shannon entropy of string to spot high-entropy secrets."""
    if not data:
        return 0.0
    entropy = 0.0
    for x in set(data):
        p_x = float(data.count(x)) / len(data)
        if p_x > 0:
            entropy += - p_x * math.log2(p_x)
    return entropy


class SecretScanner(BaseScanner):
    name = "secrets"

    def scan_file(self, file_path: str, content: str) -> List[RawFinding]:
        findings: List[RawFinding] = []
        lines = content.splitlines()

        for line_num, line in enumerate(lines, start=1):
            # Mask commented documentation placeholders if obvious
            if "example" in line.lower() or "placeholder" in line.lower() or "your_token" in line.lower():
                continue

            for rule_id, severity, regex, title in SECRET_REGEXES:
                match = regex.search(line)
                if match:
                    matched_str = match.group(0)
                    # Mask snippet for security in reports
                    masked_snippet = line[:match.start()] + matched_str[:4] + ("*" * 12) + line[match.end():]
                    findings.append(RawFinding(
                        rule_id=rule_id,
                        source="secrets",
                        severity=severity,
                        file_path=file_path,
                        start_line=line_num,
                        end_line=line_num,
                        code_snippet=masked_snippet.strip(),
                        title=title,
                        description=f"Detected potentially live credentials committed to source code: {title}.",
                        evidence={
                            "rule_id": rule_id,
                            "pattern_match": True,
                            "entropy": round(shannon_entropy(matched_str), 2)
                        },
                        is_verified=True,
                        confidence=0.99
                    ))
                    break

        return findings
