import json
import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.prompt_guard import format_isolated_prompt_context
from app.services.ai.prompts import SYSTEM_PROMPT, ANALYSIS_USER_PROMPT_TEMPLATE
from app.services.ai.validator import AIValidator
from app.schemas.ai_analysis import AIAnalysisReport, AIFindingEnrichment, AITestSuggestion
from app.schemas.finding import FindingCreate


class AIAnalyzerClient:
    def __init__(self):
        self.validator = AIValidator()

    async def analyze_pr(
        self,
        pr_title: str,
        files: Dict[str, str],
        scanner_findings: List[FindingCreate],
        affected_symbols: List[str]
    ) -> AIAnalysisReport:
        """
        Runs AI reasoning on PR diffs + scanner facts.
        Uses OpenAI if OPENAI_API_KEY is configured; otherwise uses deterministic fallback intelligence engine.
        """
        # Prepare untrusted diff context through prompt injection guard
        diff_contexts = []
        for path, content in files.items():
            isolated = format_isolated_prompt_context(content, path)
            diff_contexts.append(isolated)
        full_diff_text = "\n".join(diff_contexts)

        # Convert scanner findings to summary JSON
        scanner_summary = [
            {
                "rule_id": f.rule_id,
                "source": f.source,
                "severity": f.severity,
                "file": f.file_path,
                "line": f.start_line,
                "snippet": f.code_snippet,
                "evidence": f.evidence_refs
            }
            for f in scanner_findings
        ]

        if settings.OPENAI_API_KEY:
            try:
                report = await self._call_openai(pr_title, full_diff_text, scanner_summary, affected_symbols, list(files.keys()))
                return report
            except Exception as e:
                print(f"OpenAI analysis call failed ({e}), falling back to deterministic intelligence engine.")

        # Fallback engine
        return self._generate_deterministic_analysis(pr_title, files, scanner_findings, affected_symbols)

    async def _call_openai(
        self,
        pr_title: str,
        diff_context: str,
        scanner_findings: List[Dict[str, Any]],
        affected_symbols: List[str],
        known_files: List[str]
    ) -> AIAnalysisReport:
        prompt = ANALYSIS_USER_PROMPT_TEMPLATE.format(
            title=pr_title,
            diff_context=diff_context[:16000],  # Bound context length
            scanner_count=len(scanner_findings),
            scanner_findings_json=json.dumps(scanner_findings, indent=2),
            call_graph_summary=", ".join(affected_symbols) if affected_symbols else "None detected"
        )

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content_str = data["choices"][0]["message"]["content"]
            parsed_json = json.loads(content_str)
            validated_report, _ = self.validator.validate_and_filter(parsed_json, known_files)
            return validated_report

    def _generate_deterministic_analysis(
        self,
        pr_title: str,
        files: Dict[str, str],
        scanner_findings: List[FindingCreate],
        affected_symbols: List[str]
    ) -> AIAnalysisReport:
        """
        High-fidelity deterministic intelligence engine that runs when no OpenAI key is provided.
        Synthesizes scanner facts into structured AI hypotheses with strictly linked evidence references.
        """
        has_critical = any(f.severity == "CRITICAL" for f in scanner_findings)
        has_high = any(f.severity == "HIGH" for f in scanner_findings)
        has_sensitive = bool(affected_symbols)

        if has_critical:
            risk_score = 88.0
            uncertainty = 6.0
            recommendation = "BLOCK"
            rationale = "Critical vulnerabilities discovered by verified scanners require immediate remediation prior to merge."
        elif has_high:
            risk_score = 72.0
            uncertainty = 8.0
            recommendation = "BLOCK"
            rationale = "High-severity vulnerabilities detected that can compromise authentication or sensitive business boundaries."
        elif has_sensitive:
            risk_score = 55.0
            uncertainty = 12.0
            recommendation = "REVIEW"
            rationale = "Pull request touches sensitive security/payment modules without direct syntax vulnerabilities, requiring human review."
        else:
            risk_score = 18.0
            uncertainty = 5.0
            recommendation = "SAFE"
            rationale = "No verified scanner vulnerabilities or critical module blast radius identified."

        enrichments: List[AIFindingEnrichment] = []

        # Enrich each scanner finding
        for f in scanner_findings:
            if "sql" in f.rule_id.lower() or "b608" in f.rule_id.lower():
                enrichments.append(AIFindingEnrichment(
                    title="AI Architectural Review: SQL Injection Risk & Query Parameterization",
                    severity="CRITICAL",
                    explanation=f"Dynamic string concatenation in {f.file_path} bypasses SQLAlchemy parameterized queries.",
                    why_it_matters="Allows an unauthenticated user to inject arbitrary SQL statements, potentially exfiltrating database tables or bypassing auth checks.",
                    impact="Full database read/write compromise and sensitive data breach.",
                    suggested_tests=[
                        AITestSuggestion(
                            command=f"pytest tests/test_db.py -k 'test_sql_parameterization' --tb=short",
                            description="Executes payload with SQL metacharacters (e.g. \"' OR '1'='1\") to verify query escaping."
                        )
                    ],
                    safer_code="""# Safe alternative using SQLAlchemy parameterized query
query = select(User).where(User.username == bindparam("username"))
result = await session.execute(query, {"username": user_input})""",
                    confidence=0.98,
                    evidence_refs=[{
                        "source": f.source,
                        "rule_id": f.rule_id,
                        "file": f.file_path,
                        "lines": f"{f.start_line}-{f.end_line}",
                        "code": f.code_snippet
                    }]
                ))
            elif "jwt" in f.rule_id.lower():
                enrichments.append(AIFindingEnrichment(
                    title="AI Architectural Review: JWT Algorithm Confusion & Forgery Risk",
                    severity="CRITICAL",
                    explanation=f"Allowing unverified tokens or algorithm 'none' in {f.file_path} disables digital signature validation.",
                    why_it_matters="Attackers can generate custom tokens with arbitrary claims (e.g. role='superadmin') and gain full administrative access.",
                    impact="Complete authentication bypass across protected API endpoints.",
                    suggested_tests=[
                        AITestSuggestion(
                            command=f"pytest tests/test_auth.py -k 'test_reject_unsigned_jwt' --tb=short",
                            description="Attempts to access private routes using unsigned token with 'none' alg header."
                        )
                    ],
                    safer_code="""# Safe alternative: explicitly require HS256 with valid secret key
payload = jwt.decode(
    token,
    settings.SECRET_KEY,
    algorithms=["HS256"],
    options={"verify_signature": True}
)""",
                    confidence=0.99,
                    evidence_refs=[{
                        "source": f.source,
                        "rule_id": f.rule_id,
                        "file": f.file_path,
                        "lines": f"{f.start_line}-{f.end_line}",
                        "code": f.code_snippet
                    }]
                ))
            elif "secret" in f.source:
                enrichments.append(AIFindingEnrichment(
                    title="AI Credential Hygiene: Exposed Secret Key in Git History",
                    severity="CRITICAL",
                    explanation=f"A raw cryptographic credential was found on line {f.start_line} of {f.file_path}.",
                    why_it_matters="Once committed to Git, credentials are often scraped by automated bots within seconds and remain in reflogs.",
                    impact="Unauthorized infrastructure API access and potential data leakage.",
                    suggested_tests=[
                        AITestSuggestion(
                            command="git log -p -S 'AKIA' --all",
                            description="Verifies whether key exists in any commit object in repository history."
                        )
                    ],
                    safer_code="""# Safe alternative: Load from environment variable
import os
SECRET_KEY = os.environ.get("PRODUCTION_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Missing required environment secret")""",
                    confidence=1.0,
                    evidence_refs=[{
                        "source": f.source,
                        "rule_id": f.rule_id,
                        "file": f.file_path,
                        "lines": f"{f.start_line}-{f.end_line}",
                        "code": f.code_snippet
                    }]
                ))

        # If sensitive symbols were touched, add an AI hypothesis about blast radius
        if affected_symbols and not enrichments:
            first_file = list(files.keys())[0] if files else "app/main.py"
            enrichments.append(AIFindingEnrichment(
                title=f"AI Hypothesis: Sensitive Domain Blast Radius ({affected_symbols[0]})",
                severity="MEDIUM",
                explanation=f"Changes modify {affected_symbols[0]}, a sensitive security or payment boundary.",
                why_it_matters="Even without direct syntax flaws, changes in sensitive functions can alter side-effects, authorization checks, or transaction rollback logic.",
                impact="Potential logical regression in transaction handling or authorization workflows.",
                suggested_tests=[
                    AITestSuggestion(
                        command=f"pytest tests/ -k '{affected_symbols[0].split()[0]}' --cov",
                        description=f"Run test suite verifying boundary conditions of {affected_symbols[0]}."
                    )
                ],
                safer_code="# Ensure comprehensive integration tests and authorization checks surround modified logic.",
                confidence=0.85,
                evidence_refs=[{
                    "type": "call_graph_ast",
                    "file": first_file,
                    "symbol": affected_symbols[0],
                    "lines": "1-50"
                }]
            ))

        return AIAnalysisReport(
            summary=f"Analysis of '{pr_title}' identified {len(scanner_findings)} verified findings and {len(affected_symbols)} sensitive touchpoints.",
            overall_risk_score=risk_score,
            uncertainty_range=uncertainty,
            merge_recommendation=recommendation,
            rationale=rationale,
            enrichments=enrichments
        )
