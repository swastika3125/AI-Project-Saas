import asyncio
import time
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.call_graph import CallGraph
from app.models.policy import Policy
from app.models.pull_request import PullRequest
from app.services.scanners.normalizer import ScannerPipeline
from app.services.analyzer.call_graph import CallGraphBuilder
from app.services.ai.client import AIAnalyzerClient
from app.services.scoring import calculate_risk_score, evaluate_merge_decision
from app.worker.celery_app import celery_app

# Synchronous session for worker tasks
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.SYNC_DATABASE_URL else {}
)
SyncSessionLocal = sessionmaker(bind=sync_engine, autoflush=False, expire_on_commit=False)


def run_scan_pipeline_job(
    scan_id: str,
    files_data: Dict[str, str],
    pr_title: str = "Pull Request"
) -> Dict[str, Any]:
    """
    Executes the 5-stage analysis pipeline:
    1. Fetching / Validating diffs
    2. Deterministic scanning (Bandit, Semgrep, PipAudit, Secrets)
    3. AST Call Graph Mapping
    4. AI Reasoning with evidence reference enforcement
    5. Scoring, Uncertainty calculation, and Merge Policy evaluation
    """
    start_time = time.time()
    timings = {}

    with SyncSessionLocal() as db:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return {"error": "Scan not found"}

        try:
            # Stage 1: Diff parsing
            scan.status = "processing"
            scan.pipeline_stage = "fetching"
            db.commit()
            t0 = time.time()
            time.sleep(0.1)
            timings["fetching_ms"] = int((time.time() - t0) * 1000)

            # Stage 2: Deterministic scanning
            scan.pipeline_stage = "scanning"
            db.commit()
            t1 = time.time()
            pipeline = ScannerPipeline()
            scanner_findings = pipeline.scan_files(scan_id=scan_id, files=files_data)
            timings["scanning_ms"] = int((time.time() - t1) * 1000)

            # Stage 3: Impact Mapping (Call graph)
            scan.pipeline_stage = "mapping"
            db.commit()
            t2 = time.time()
            builder = CallGraphBuilder()
            graph_response = builder.build_graph(scan_id=scan_id, files=files_data)
            timings["mapping_ms"] = int((time.time() - t2) * 1000)

            # Stage 4: AI Analysis
            scan.pipeline_stage = "ai_analyzing"
            db.commit()
            t3 = time.time()
            ai_client = AIAnalyzerClient()
            # Run async AI client in event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            ai_report = loop.run_until_complete(
                ai_client.analyze_pr(
                    pr_title=pr_title,
                    files=files_data,
                    scanner_findings=scanner_findings,
                    affected_symbols=graph_response.sensitive_touchpoints
                )
            )
            loop.close()
            timings["ai_analysis_ms"] = int((time.time() - t3) * 1000)

            # Stage 5: Merge AI enrichments into findings
            all_findings_to_store = []
            
            # Map scanner findings
            for sf in scanner_findings:
                # Check if AI enriched this finding
                enrichment = next((e for e in ai_report.enrichments if e.severity == sf.severity), None)
                if enrichment:
                    sf.explanation = enrichment.explanation
                    sf.why_it_matters = enrichment.why_it_matters
                    sf.impact = enrichment.impact
                    sf.safer_alternative = enrichment.safer_code
                    if enrichment.suggested_tests:
                        from app.schemas.finding import TestSuggestion
                        sf.suggested_tests = [
                            TestSuggestion(command=st.command, description=st.description, framework=st.framework)
                            for st in enrichment.suggested_tests
                        ]

                db_finding = Finding(
                    scan_id=scan_id,
                    fingerprint=sf.fingerprint,
                    severity=sf.severity,
                    is_verified=sf.is_verified,
                    confidence=sf.confidence,
                    source=sf.source,
                    rule_id=sf.rule_id,
                    file_path=sf.file_path,
                    start_line=sf.start_line,
                    end_line=sf.end_line,
                    code_snippet=sf.code_snippet,
                    title=sf.title,
                    explanation=sf.explanation,
                    why_it_matters=sf.why_it_matters,
                    impact=sf.impact,
                    suggested_tests=[t.model_dump() for t in sf.suggested_tests],
                    safer_alternative=sf.safer_alternative,
                    evidence_refs=sf.evidence_refs
                )
                db.add(db_finding)
                all_findings_to_store.append(sf)

            # Store any standalone AI hypotheses (clearly marked is_verified=False)
            for enh in ai_report.enrichments:
                if enh.confidence < 0.95 or not any(f.severity == enh.severity for f in scanner_findings):
                    hypothesis_finding = Finding(
                        scan_id=scan_id,
                        fingerprint=f"hypo-{enh.title[:20].strip()}",
                        severity=enh.severity,
                        is_verified=False,  # Clearly marked as AI Hypothesis
                        confidence=enh.confidence,
                        source="ai_hypothesis",
                        rule_id=f"ai.hypothesis.{enh.severity.lower()}",
                        file_path=list(files_data.keys())[0] if files_data else "unknown.py",
                        start_line=1,
                        end_line=1,
                        code_snippet="# AI inferred risk from architectural diff review",
                        title=enh.title,
                        explanation=enh.explanation,
                        why_it_matters=enh.why_it_matters,
                        impact=enh.impact,
                        suggested_tests=[st.model_dump() for st in enh.suggested_tests],
                        safer_alternative=enh.safer_code,
                        evidence_refs=enh.evidence_refs
                    )
                    db.add(hypothesis_finding)

            # Save Call Graph
            db_call_graph = CallGraph(
                scan_id=scan_id,
                nodes=[n.model_dump() for n in graph_response.nodes],
                edges=[e.model_dump() for e in graph_response.edges],
                affected_modules=graph_response.affected_modules,
                sensitive_touchpoints=graph_response.sensitive_touchpoints
            )
            db.add(db_call_graph)

            # Calculate Risk Score and Decision
            crit_count = sum(1 for f in scanner_findings if f.severity == "CRITICAL")
            high_count = sum(1 for f in scanner_findings if f.severity == "HIGH")
            
            risk_score, uncertainty = calculate_risk_score(
                findings=scanner_findings,
                sensitive_touchpoints_count=len(graph_response.sensitive_touchpoints)
            )

            # Fetch repository policy if available
            pr = db.query(PullRequest).filter(PullRequest.id == scan.pr_id).first()
            policy = None
            if pr and pr.repo_id:
                policy = db.query(Policy).filter(Policy.repo_id == pr.repo_id, Policy.is_active == True).first()

            decision = evaluate_merge_decision(
                risk_score=risk_score,
                critical_count=crit_count,
                high_count=high_count,
                sensitive_touchpoints_count=len(graph_response.sensitive_touchpoints),
                policy=policy
            )

            # Complete scan
            timings["total_ms"] = int((time.time() - start_time) * 1000)
            scan.status = "completed"
            scan.pipeline_stage = "finished"
            scan.risk_score = risk_score
            scan.uncertainty_range = uncertainty
            scan.merge_decision = decision
            scan.summary = ai_report.summary
            scan.pipeline_timings = timings
            scan.completed_at = datetime.utcnow()

            db.commit()

            return {
                "scan_id": scan_id,
                "status": "completed",
                "risk_score": risk_score,
                "merge_decision": decision,
                "timings": timings
            }

        except Exception as exc:
            db.rollback()
            scan.status = "failed"
            scan.summary = f"Pipeline execution failed: {str(exc)}"
            db.commit()
            raise exc


@celery_app.task(name="tasks.run_pr_scan_pipeline")
def celery_scan_task(scan_id: str, files_data: Dict[str, str], pr_title: str):
    return run_scan_pipeline_job(scan_id, files_data, pr_title)
