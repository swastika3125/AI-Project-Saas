import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.repository import Repository
from app.models.pull_request import PullRequest
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.call_graph import CallGraph
from app.models.policy import Policy
from app.models.feedback import FindingFeedback

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    """
    Seeds comprehensive, realistic demo PRs, scans, findings, impact graphs, and policies
    so that the SaaS dashboard, hero PR view, impact graph, and policies page work completely offline.
    """
    # Check if already seeded
    res = await db.execute(select(Repository))
    existing_repo = res.scalars().first()
    if existing_repo:
        return {"status": "already_seeded", "message": "Demo data is already loaded in database."}

    # 1. Repositories
    repo_core = Repository(
        id=str(uuid.uuid4()),
        github_repo_id="10101",
        full_name="octo-corp/core-api",
        name="core-api",
        owner="octo-corp",
        default_branch="main",
        is_active=True
    )
    repo_billing = Repository(
        id=str(uuid.uuid4()),
        github_repo_id="10102",
        full_name="octo-corp/billing-service",
        name="billing-service",
        owner="octo-corp",
        default_branch="main",
        is_active=True
    )
    repo_users = Repository(
        id=str(uuid.uuid4()),
        github_repo_id="10103",
        full_name="octo-corp/users-service",
        name="users-service",
        owner="octo-corp",
        default_branch="main",
        is_active=True
    )
    db.add_all([repo_core, repo_billing, repo_users])
    await db.flush()

    # 2. Policies
    policy = Policy(
        id=str(uuid.uuid4()),
        repo_id=repo_core.id,
        name="Production Zero-Trust Security Gate",
        block_on_critical=True,
        block_on_high=True,
        block_unverified_sensitive_mods=True,
        max_risk_score=70,
        is_active=True
    )
    db.add(policy)

    # 3. PR #142 (The Primary Hero Demo PR - High Risk)
    pr_hero = PullRequest(
        id="demo-pr-142",
        repo_id=repo_core.id,
        pr_number=142,
        title="feat: Refactor session authentication and token validation",
        author="sophia-dev",
        source_branch="refactor/session-tokens",
        target_branch="main",
        head_sha="a7b4c9e81f23d4e5",
        state="open",
        created_at=datetime.utcnow() - timedelta(hours=2)
    )
    db.add(pr_hero)
    await db.flush()

    scan_hero = Scan(
        id="demo-scan-142",
        pr_id=pr_hero.id,
        commit_sha="a7b4c9e81f23d4e5",
        status="completed",
        pipeline_stage="finished",
        risk_score=86.0,
        uncertainty_range=5.5,
        merge_decision="BLOCK",
        summary="Critical vulnerabilities detected: Unverified JWT token decoding permits authentication bypass, and dynamic SQL formatting introduces SQL Injection risk in authentication logs.",
        pipeline_timings={"fetching_ms": 110, "scanning_ms": 340, "mapping_ms": 280, "ai_analysis_ms": 820, "total_ms": 1550},
        created_at=datetime.utcnow() - timedelta(hours=2),
        completed_at=datetime.utcnow() - timedelta(hours=1, minutes=58)
    )
    db.add(scan_hero)
    await db.flush()

    # Findings for Hero Scan
    f1 = Finding(
        id="find-hero-1",
        scan_id=scan_hero.id,
        fingerprint="fp-semgrep-jwt-unverified",
        severity="CRITICAL",
        is_verified=True,
        confidence=1.0,
        source="semgrep",
        rule_id="semgrep.python.jwt.unverified-token",
        file_path="app/auth/tokens.py",
        start_line=42,
        end_line=45,
        code_snippet="""payload = jwt.decode(
    token, 
    options={"verify_signature": False}  # Disabled for legacy clients
)""",
        title="JWT Signature Verification Explicitly Disabled",
        explanation="The `jwt.decode` call explicitly disables cryptographic signature verification. An attacker can construct arbitrary JSON tokens containing elevated privileges (such as `role='superadmin'`) and the application will blindly trust them.",
        why_it_matters="Complete authentication and authorization barrier breakdown across all API endpoints.",
        impact="Total compromise of user identity verification and unauthorized administrative privilege escalation.",
        suggested_tests=[
            {
                "command": "pytest tests/test_auth.py -k 'test_reject_unsigned_jwt' --tb=short",
                "description": "Asserts HTTP 401 Unauthorized when a crafted token without signature is supplied.",
                "framework": "pytest"
            },
            {
                "command": "pytest tests/test_auth.py -k 'test_signature_verification_enforced'",
                "description": "Validates that forged tokens signed with wrong secret keys are strictly rejected.",
                "framework": "pytest"
            }
        ],
        safer_alternative="""# Secure Implementation:
payload = jwt.decode(
    token,
    key=settings.JWT_SECRET_KEY,
    algorithms=["HS256"],
    options={"verify_signature": True}
)""",
        evidence_refs=[{
            "engine": "Semgrep OSS",
            "rule": "semgrep.python.jwt.unverified-token",
            "ast_node": "Call(func=Attribute(value=Name(id='jwt'), attr='decode'))",
            "line_match": "options={\"verify_signature\": False}"
        }],
        created_at=datetime.utcnow() - timedelta(hours=2)
    )

    f2 = Finding(
        id="find-hero-2",
        scan_id=scan_hero.id,
        fingerprint="fp-bandit-b608-sql",
        severity="CRITICAL",
        is_verified=True,
        confidence=0.98,
        source="bandit",
        rule_id="bandit.B608",
        file_path="app/auth/audit.py",
        start_line=88,
        end_line=91,
        code_snippet="""query = f"INSERT INTO auth_audit_logs (user_id, ip) VALUES ('{user_id}', '{client_ip}')"
await db.execute(text(query))""",
        title="SQL Injection via Dynamic f-string Query Formatting",
        explanation="Dynamic string interpolation constructs an SQL query directly from untrusted `user_id` and `client_ip` arguments without parameter binding.",
        why_it_matters="Malicious input containing SQL metacharacters (e.g. `' OR '1'='1`) will manipulate SQL syntax, allowing arbitrary statement execution or data exfiltration.",
        impact="Direct database access, potential privilege manipulation, and log injection attacks.",
        suggested_tests=[
            {
                "command": "pytest tests/test_audit.py -k 'test_sql_injection_payload' --tb=short",
                "description": "Executes audit logging with quote escape payloads to guarantee database syntax error never occurs.",
                "framework": "pytest"
            }
        ],
        safer_alternative="""# Secure Implementation using SQLAlchemy parameterized bindings:
stmt = insert(AuditLog).values(user_id=user_id, ip=client_ip)
await db.execute(stmt)""",
        evidence_refs=[{
            "engine": "Bandit AST Analyzer",
            "test_id": "B608",
            "node": "JoinedStr with SQL keywords",
            "line": 88
        }],
        created_at=datetime.utcnow() - timedelta(hours=2)
    )

    f3 = Finding(
        id="find-hero-3",
        scan_id=scan_hero.id,
        fingerprint="fp-ai-hypo-revocation",
        severity="MEDIUM",
        is_verified=False,
        confidence=0.88,
        source="ai_hypothesis",
        rule_id="ai.hypothesis.session_revocation_gap",
        file_path="app/auth/session.py",
        start_line=104,
        end_line=112,
        code_snippet="""async def terminate_session(session_id: str):
    # Removes local cache entry but does not invalidate refresh token
    await redis.delete(f"session:{session_id}")""",
        title="AI Hypothesis: Incomplete Session Invalidation on Logout",
        explanation="Tracing the call graph indicates `terminate_session` clears Redis session cache, but does not blacklist or revoke the issued JWT refresh token in the persistent store.",
        why_it_matters="If an active refresh token is compromised, a logout action by the user will not terminate the attacker's ability to obtain fresh access tokens.",
        impact="Session hijacking persistence across user-initiated logout events.",
        suggested_tests=[
            {
                "command": "pytest tests/test_auth.py -k 'test_refresh_token_revocation_after_logout'",
                "description": "Verifies that refresh token exchange fails immediately after logout.",
                "framework": "pytest"
            }
        ],
        safer_alternative="""async def terminate_session(session_id: str, refresh_token_jti: str):
    await redis.delete(f"session:{session_id}")
    await token_blacklist.add(refresh_token_jti, ttl=timedelta(days=7))""",
        evidence_refs=[{
            "call_graph_trace": "app.auth.session::terminate_session -> Redis.delete",
            "missing_callee": "token_blacklist.add",
            "anchor_file": "app/auth/session.py",
            "lines": "104-112"
        }],
        created_at=datetime.utcnow() - timedelta(hours=2)
    )

    db.add_all([f1, f2, f3])

    # Call Graph for Hero PR #142 (React Flow format)
    nodes = [
        {
            "id": "app/auth/tokens.py::decode_token",
            "type": "custom",
            "data": {
                "label": "decode_token",
                "kind": "function",
                "file_path": "app/auth/tokens.py",
                "is_changed": True,
                "is_sensitive": True,
                "sensitive_category": "auth",
                "call_depth": 1,
                "metrics": {"start_line": 40, "end_line": 62, "total_calls": 3}
            },
            "position": {"x": 380, "y": 80}
        },
        {
            "id": "app/auth/audit.py::log_auth_event",
            "type": "custom",
            "data": {
                "label": "log_auth_event",
                "kind": "function",
                "file_path": "app/auth/audit.py",
                "is_changed": True,
                "is_sensitive": True,
                "sensitive_category": "data_access",
                "call_depth": 1,
                "metrics": {"start_line": 85, "end_line": 102, "total_calls": 2}
            },
            "position": {"x": 380, "y": 240}
        },
        {
            "id": "app/api/v1/endpoints/login.py::authenticate_user",
            "type": "custom",
            "data": {
                "label": "authenticate_user",
                "kind": "function",
                "file_path": "app/api/v1/endpoints/login.py",
                "is_changed": False,
                "is_sensitive": True,
                "sensitive_category": "auth",
                "call_depth": 0,
                "metrics": {"start_line": 15, "end_line": 45, "total_calls": 4}
            },
            "position": {"x": 50, "y": 140}
        },
        {
            "id": "app/database/models.py::execute_query",
            "type": "custom",
            "data": {
                "label": "execute_query",
                "kind": "function",
                "file_path": "app/database/models.py",
                "is_changed": False,
                "is_sensitive": False,
                "sensitive_category": None,
                "call_depth": 2,
                "metrics": {"start_line": 110, "end_line": 125, "total_calls": 1}
            },
            "position": {"x": 720, "y": 240}
        }
    ]

    edges = [
        {
            "id": "e-1",
            "source": "app/api/v1/endpoints/login.py::authenticate_user",
            "target": "app/auth/tokens.py::decode_token",
            "label": "invokes",
            "animated": True,
            "style": {"stroke": "#EF4444", "strokeWidth": 2.5}
        },
        {
            "id": "e-2",
            "source": "app/api/v1/endpoints/login.py::authenticate_user",
            "target": "app/auth/audit.py::log_auth_event",
            "label": "logs to",
            "animated": True,
            "style": {"stroke": "#F97316", "strokeWidth": 2}
        },
        {
            "id": "e-3",
            "source": "app/auth/audit.py::log_auth_event",
            "target": "app/database/models.py::execute_query",
            "label": "raw sql",
            "animated": True,
            "style": {"stroke": "#EF4444", "strokeWidth": 2}
        }
    ]

    cg_hero = CallGraph(
        id=str(uuid.uuid4()),
        scan_id=scan_hero.id,
        nodes=nodes,
        edges=edges,
        affected_modules=["app/auth/tokens.py", "app/auth/audit.py", "app/api/v1/endpoints/login.py"],
        sensitive_touchpoints=["decode_token (auth)", "log_auth_event (data_access)", "authenticate_user (auth)"]
    )
    db.add(cg_hero)

    # 4. Seed PR #143 (Billing PR - Review Required)
    pr_billing = PullRequest(
        id="demo-pr-143",
        repo_id=repo_billing.id,
        pr_number=143,
        title="fix: Stripe payment webhook signature parsing and checkout retry",
        author="marcus-dev",
        source_branch="fix/stripe-webhook-retry",
        target_branch="main",
        head_sha="f2e4d6c8b0a19283",
        state="open",
        created_at=datetime.utcnow() - timedelta(days=1)
    )
    db.add(pr_billing)
    await db.flush()

    scan_billing = Scan(
        id="demo-scan-143",
        pr_id=pr_billing.id,
        commit_sha="f2e4d6c8b0a19283",
        status="completed",
        pipeline_stage="finished",
        risk_score=68.0,
        uncertainty_range=8.0,
        merge_decision="REVIEW",
        summary="Medium-High risk: Hardcoded Stripe test API key and concurrency lock omission during payment webhook idempotent retries.",
        pipeline_timings={"total_ms": 1120},
        created_at=datetime.utcnow() - timedelta(days=1),
        completed_at=datetime.utcnow() - timedelta(days=1, minutes=-2)
    )
    db.add(scan_billing)

    f_billing = Finding(
        id="find-billing-1",
        scan_id=scan_billing.id,
        fingerprint="fp-secret-stripe",
        severity="HIGH",
        is_verified=True,
        confidence=1.0,
        source="secrets",
        rule_id="secret.stripe.live-key",
        file_path="services/payments/stripe_client.py",
        start_line=19,
        end_line=19,
        code_snippet="""STRIPE_SECRET_KEY = "sk_test_mock_sandbox_key_0123456789abcdef" """,
        title="Hardcoded Live Stripe Secret Key",
        explanation="A live Stripe secret key was committed directly to repository source code.",
        why_it_matters="Exposure of payment provider credentials gives unauthorized parties the ability to issue refunds, alter banking details, or access customer financial metadata.",
        impact="Financial liability and potential merchant account suspension.",
        suggested_tests=[
            {
                "command": "pytest tests/test_billing.py -k 'test_env_key_loading'",
                "description": "Verifies that Stripe secret key is loaded from environment variables only.",
                "framework": "pytest"
            }
        ],
        safer_alternative="""STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]""",
        evidence_refs=[{"regex_rule": "secret.stripe.live-key", "line": 19}],
        created_at=datetime.utcnow() - timedelta(days=1)
    )
    db.add(f_billing)

    # 5. Seed PR #144 (Clean Safe PR)
    pr_safe = PullRequest(
        id="demo-pr-144",
        repo_id=repo_users.id,
        pr_number=144,
        title="perf: Optimize user profile query and cache serialization",
        author="charlotte-dev",
        source_branch="perf/user-cache",
        target_branch="main",
        head_sha="9988776655443322",
        state="open",
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    db.add(pr_safe)
    await db.flush()

    scan_safe = Scan(
        id="demo-scan-144",
        pr_id=pr_safe.id,
        commit_sha="9988776655443322",
        status="completed",
        pipeline_stage="finished",
        risk_score=14.0,
        uncertainty_range=4.0,
        merge_decision="SAFE",
        summary="Clean PR: All database access uses parameterized query builders. No scanner flags or sensitive boundary modifications.",
        pipeline_timings={"total_ms": 780},
        created_at=datetime.utcnow() - timedelta(days=2),
        completed_at=datetime.utcnow() - timedelta(days=2, minutes=-1)
    )
    db.add(scan_safe)

    # 6. Seed Sample Feedback
    fb1 = FindingFeedback(
        finding_id=f1.id,
        action="accept",
        note="Verified: Definitely cannot allow unverified JWTs in production."
    )
    fb2 = FindingFeedback(
        finding_id=f2.id,
        action="accept",
        note="Good catch on the audit log SQL injection."
    )
    db.add_all([fb1, fb2])

    await db.commit()

    return {
        "status": "success",
        "message": "Seeded 3 repositories, 3 PRs, 5 findings, 1 call graph, and policies successfully.",
        "hero_pr_id": pr_hero.id,
        "hero_scan_id": scan_hero.id
    }
