import { PullRequest, Scan, Repository, CallGraphData, Policy, FeedbackMetrics } from "@/types";

export const DEMO_REPOSITORIES: Repository[] = [
  {
    id: "repo-core-api",
    name: "core-api",
    full_name: "octo-corp/core-api",
    owner: "octo-corp",
    default_branch: "main",
    is_active: true,
    open_prs_count: 3,
    health_score: 72,
    recent_scans_count: 14,
  },
  {
    id: "repo-billing",
    name: "billing-service",
    full_name: "octo-corp/billing-service",
    owner: "octo-corp",
    default_branch: "main",
    is_active: true,
    open_prs_count: 1,
    health_score: 84,
    recent_scans_count: 8,
  },
  {
    id: "repo-users",
    name: "users-service",
    full_name: "octo-corp/users-service",
    owner: "octo-corp",
    default_branch: "main",
    is_active: true,
    open_prs_count: 2,
    health_score: 96,
    recent_scans_count: 21,
  },
];

export const DEMO_HERO_SCAN: Scan = {
  id: "demo-scan-142",
  pr_id: "demo-pr-142",
  commit_sha: "a7b4c9e81f23d4e5",
  status: "completed",
  pipeline_stage: "finished",
  risk_score: 86.0,
  uncertainty_range: 5.5,
  merge_decision: "BLOCK",
  summary:
    "Critical vulnerabilities detected: Unverified JWT token decoding permits authentication bypass, and dynamic SQL formatting introduces SQL Injection risk in authentication logs.",
  pipeline_timings: {
    fetching_ms: 110,
    scanning_ms: 340,
    mapping_ms: 280,
    ai_analysis_ms: 820,
    total_ms: 1550,
  },
  created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  completed_at: new Date(Date.now() - 1.9 * 3600000).toISOString(),
  counts: {
    total: 3,
    critical: 2,
    high: 0,
    medium: 1,
    low: 0,
    verified: 2,
    hypotheses: 1,
  },
  findings: [
    {
      id: "find-hero-1",
      scan_id: "demo-scan-142",
      fingerprint: "fp-semgrep-jwt-unverified",
      severity: "CRITICAL",
      is_verified: true,
      confidence: 1.0,
      source: "semgrep",
      rule_id: "semgrep.python.jwt.unverified-token",
      file_path: "app/auth/tokens.py",
      start_line: 42,
      end_line: 45,
      code_snippet: `payload = jwt.decode(
    token, 
    options={"verify_signature": False}  # Disabled for legacy clients
)`,
      title: "JWT Signature Verification Explicitly Disabled",
      explanation:
        "The `jwt.decode` call explicitly disables cryptographic signature verification. An attacker can construct arbitrary JSON tokens containing elevated privileges (such as `role='superadmin'`) and the application will blindly trust them.",
      why_it_matters:
        "Complete authentication and authorization barrier breakdown across all API endpoints.",
      impact:
        "Total compromise of user identity verification and unauthorized administrative privilege escalation.",
      suggested_tests: [
        {
          command: "pytest tests/test_auth.py -k 'test_reject_unsigned_jwt' --tb=short",
          description: "Asserts HTTP 401 Unauthorized when a crafted token without signature is supplied.",
          framework: "pytest",
        },
        {
          command: "pytest tests/test_auth.py -k 'test_signature_verification_enforced'",
          description: "Validates that forged tokens signed with wrong secret keys are strictly rejected.",
          framework: "pytest",
        },
      ],
      safer_alternative: `# Secure Implementation:
payload = jwt.decode(
    token,
    key=settings.JWT_SECRET_KEY,
    algorithms=["HS256"],
    options={"verify_signature": True}
)`,
      evidence_refs: [
        {
          engine: "Semgrep OSS",
          rule: "semgrep.python.jwt.unverified-token",
          ast_node: "Call(func=Attribute(value=Name(id='jwt'), attr='decode'))",
          line_match: 'options={"verify_signature": False}',
        },
      ],
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "find-hero-2",
      scan_id: "demo-scan-142",
      fingerprint: "fp-bandit-b608-sql",
      severity: "CRITICAL",
      is_verified: true,
      confidence: 0.98,
      source: "bandit",
      rule_id: "bandit.B608",
      file_path: "app/auth/audit.py",
      start_line: 88,
      end_line: 91,
      code_snippet: `query = f"INSERT INTO auth_audit_logs (user_id, ip) VALUES ('{user_id}', '{client_ip}')"
await db.execute(text(query))`,
      title: "SQL Injection via Dynamic f-string Query Formatting",
      explanation:
        "Dynamic string interpolation constructs an SQL query directly from untrusted `user_id` and `client_ip` arguments without parameter binding.",
      why_it_matters:
        "Malicious input containing SQL metacharacters (e.g. `' OR '1'='1`) will manipulate SQL syntax, allowing arbitrary statement execution or data exfiltration.",
      impact: "Direct database access, potential privilege manipulation, and log injection attacks.",
      suggested_tests: [
        {
          command: "pytest tests/test_audit.py -k 'test_sql_injection_payload' --tb=short",
          description: "Executes audit logging with quote escape payloads to guarantee database syntax error never occurs.",
          framework: "pytest",
        },
      ],
      safer_alternative: `# Secure Implementation using SQLAlchemy parameterized bindings:
stmt = insert(AuditLog).values(user_id=user_id, ip=client_ip)
await db.execute(stmt)`,
      evidence_refs: [
        {
          engine: "Bandit AST Analyzer",
          test_id: "B608",
          node: "JoinedStr with SQL keywords",
          line: 88,
        },
      ],
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "find-hero-3",
      scan_id: "demo-scan-142",
      fingerprint: "fp-ai-hypo-revocation",
      severity: "MEDIUM",
      is_verified: false,
      confidence: 0.88,
      source: "ai_hypothesis",
      rule_id: "ai.hypothesis.session_revocation_gap",
      file_path: "app/auth/session.py",
      start_line: 104,
      end_line: 112,
      code_snippet: `async def terminate_session(session_id: str):
    # Removes local cache entry but does not invalidate refresh token
    await redis.delete(f"session:{session_id}")`,
      title: "AI Hypothesis: Incomplete Session Invalidation on Logout",
      explanation:
        "Tracing the call graph indicates `terminate_session` clears Redis session cache, but does not blacklist or revoke the issued JWT refresh token in the persistent store.",
      why_it_matters:
        "If an active refresh token is compromised, a logout action by the user will not terminate the attacker's ability to obtain fresh access tokens.",
      impact: "Session hijacking persistence across user-initiated logout events.",
      suggested_tests: [
        {
          command: "pytest tests/test_auth.py -k 'test_refresh_token_revocation_after_logout'",
          description: "Verifies that refresh token exchange fails immediately after logout.",
          framework: "pytest",
        },
      ],
      safer_alternative: `async def terminate_session(session_id: str, refresh_token_jti: str):
    await redis.delete(f"session:{session_id}")
    await token_blacklist.add(refresh_token_jti, ttl=timedelta(days=7))`,
      evidence_refs: [
        {
          call_graph_trace: "app.auth.session::terminate_session -> Redis.delete",
          missing_callee: "token_blacklist.add",
          anchor_file: "app/auth/session.py",
          lines: "104-112",
        },
      ],
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ],
};

export const DEMO_PULL_REQUESTS: PullRequest[] = [
  {
    id: "demo-pr-142",
    repo_id: "repo-core-api",
    pr_number: 142,
    title: "feat: Refactor session authentication and token validation",
    author: "sophia-dev",
    source_branch: "refactor/session-tokens",
    target_branch: "main",
    head_sha: "a7b4c9e81f23d4e5",
    state: "open",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1.8 * 3600000).toISOString(),
    latest_scan: DEMO_HERO_SCAN,
  },
  {
    id: "demo-pr-143",
    repo_id: "repo-billing",
    pr_number: 143,
    title: "fix: Stripe payment webhook signature parsing and checkout retry",
    author: "marcus-dev",
    source_branch: "fix/stripe-webhook-retry",
    target_branch: "main",
    head_sha: "f2e4d6c8b0a19283",
    state: "open",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 23 * 3600000).toISOString(),
    latest_scan: {
      id: "demo-scan-143",
      pr_id: "demo-pr-143",
      commit_sha: "f2e4d6c8b0a19283",
      status: "completed",
      pipeline_stage: "finished",
      risk_score: 68.0,
      uncertainty_range: 8.0,
      merge_decision: "REVIEW",
      summary: "Medium-High risk: Hardcoded Stripe test API key and concurrency lock omission during payment retry.",
      pipeline_timings: { total_ms: 1120 },
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      counts: { total: 1, critical: 0, high: 1, medium: 0, low: 0, verified: 1, hypotheses: 0 },
    },
  },
  {
    id: "demo-pr-144",
    repo_id: "repo-users",
    pr_number: 144,
    title: "perf: Optimize user profile query and cache serialization",
    author: "charlotte-dev",
    source_branch: "perf/user-cache",
    target_branch: "main",
    head_sha: "9988776655443322",
    state: "open",
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 47 * 3600000).toISOString(),
    latest_scan: {
      id: "demo-scan-144",
      pr_id: "demo-pr-144",
      commit_sha: "9988776655443322",
      status: "completed",
      pipeline_stage: "finished",
      risk_score: 14.0,
      uncertainty_range: 4.0,
      merge_decision: "SAFE",
      summary: "Clean PR: All database access uses parameterized query builders. No scanner flags.",
      pipeline_timings: { total_ms: 780 },
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      counts: { total: 0, critical: 0, high: 0, medium: 0, low: 0, verified: 0, hypotheses: 0 },
    },
  },
];

export const DEMO_CALL_GRAPH: CallGraphData = {
  scan_id: "demo-scan-142",
  nodes: [
    {
      id: "app/auth/tokens.py::decode_token",
      type: "custom",
      data: {
        label: "decode_token",
        kind: "function",
        file_path: "app/auth/tokens.py",
        is_changed: true,
        is_sensitive: true,
        sensitive_category: "auth",
        call_depth: 1,
        metrics: { start_line: 40, end_line: 62, total_calls: 3 },
      },
      position: { x: 380, y: 80 },
    },
    {
      id: "app/auth/audit.py::log_auth_event",
      type: "custom",
      data: {
        label: "log_auth_event",
        kind: "function",
        file_path: "app/auth/audit.py",
        is_changed: true,
        is_sensitive: true,
        sensitive_category: "data_access",
        call_depth: 1,
        metrics: { start_line: 85, end_line: 102, total_calls: 2 },
      },
      position: { x: 380, y: 260 },
    },
    {
      id: "app/api/v1/endpoints/login.py::authenticate_user",
      type: "custom",
      data: {
        label: "authenticate_user",
        kind: "function",
        file_path: "app/api/v1/endpoints/login.py",
        is_changed: false,
        is_sensitive: true,
        sensitive_category: "auth",
        call_depth: 0,
        metrics: { start_line: 15, end_line: 45, total_calls: 4 },
      },
      position: { x: 50, y: 170 },
    },
    {
      id: "app/database/models.py::execute_query",
      type: "custom",
      data: {
        label: "execute_query",
        kind: "function",
        file_path: "app/database/models.py",
        is_changed: false,
        is_sensitive: false,
        sensitive_category: undefined,
        call_depth: 2,
        metrics: { start_line: 110, end_line: 125, total_calls: 1 },
      },
      position: { x: 740, y: 260 },
    },
  ],
  edges: [
    {
      id: "e-1",
      source: "app/api/v1/endpoints/login.py::authenticate_user",
      target: "app/auth/tokens.py::decode_token",
      label: "invokes",
      animated: true,
      style: { stroke: "#EF4444", strokeWidth: 2.5 },
    },
    {
      id: "e-2",
      source: "app/api/v1/endpoints/login.py::authenticate_user",
      target: "app/auth/audit.py::log_auth_event",
      label: "logs to",
      animated: true,
      style: { stroke: "#F97316", strokeWidth: 2 },
    },
    {
      id: "e-3",
      source: "app/auth/audit.py::log_auth_event",
      target: "app/database/models.py::execute_query",
      label: "raw sql",
      animated: true,
      style: { stroke: "#EF4444", strokeWidth: 2 },
    },
  ],
  affected_modules: ["app/auth/tokens.py", "app/auth/audit.py", "app/api/v1/endpoints/login.py"],
  sensitive_touchpoints: ["decode_token (auth)", "log_auth_event (data_access)", "authenticate_user (auth)"],
};

export const DEMO_POLICY: Policy = {
  id: "pol-1",
  name: "Production Zero-Trust Security Gate",
  block_on_critical: true,
  block_on_high: true,
  block_unverified_sensitive_mods: true,
  max_risk_score: 70,
  require_ai_verification: false,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_FEEDBACK_METRICS: FeedbackMetrics = {
  total_feedbacks: 48,
  accepted_count: 42,
  rejected_count: 4,
  corrected_count: 2,
  precision_rate: 92.4,
  verified_precision: 96.8,
  hypothesis_precision: 84.2,
};
