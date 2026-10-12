import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_import_endpoint_and_deduplication():
    await init_db()

    payload = {
        "repository": {
            "name": "core-api",
            "full_name": "octo-corp/core-api",
            "owner": "octo-corp",
            "default_branch": "main"
        },
        "policy": {
            "name": "Production Zero-Trust Security Gate",
            "block_on_critical": True,
            "max_risk_score": 70
        },
        "pull_request": {
            "pr_number": 42,
            "title": "Fix login for legacy usernames",
            "author": "alex-dev",
            "source_branch": "fix/legacy-login",
            "target_branch": "main",
            "head_sha": "e4a1f9c8b7d6e5a4",
            "risk_score": 91.0,
            "uncertainty_range": 4.5,
            "merge_decision": "BLOCK"
        },
        "findings": [
            {
                "id": "find-sql-1",
                "rule_id": "semgrep.python.sqli.raw-query-formatting",
                "source": "semgrep",
                "severity": "CRITICAL",
                "is_verified": True,
                "confidence": 1.0,
                "file_path": "app/auth/login.py",
                "start_line": 42,
                "title": "SQL Injection in Legacy User Authentication Query",
                "suggested_tests": [
                    {"command": "pytest tests/test_login.py", "description": "Verify SQL escaping", "framework": "pytest"}
                ]
            },
            {
                "id": "find-sql-2",
                "duplicate_of": "find-sql-1",
                "rule_id": "bandit.B608",
                "source": "bandit",
                "severity": "CRITICAL",
                "is_verified": True,
                "confidence": 1.0,
                "file_path": "app/auth/login.py",
                "start_line": 42,
                "title": "Hardcoded SQL Query Concatenation (B608)"
            },
            {
                "id": "find-ai-hypo-1",
                "rule_id": "ai.hypothesis.session-hijacking",
                "source": "ai_hypothesis",
                "severity": "HIGH",
                "is_verified": False,
                "confidence": 0.76,
                "file_path": "app/auth/login.py",
                "start_line": 52,
                "title": "Hypothesized Session Privilege Escalation in Legacy Normalization"
            }
        ],
        "impact": {
            "nodes": [
                {"id": "app/auth/login.py::login", "data": {"label": "login", "is_changed": True, "is_sensitive": True, "sensitive_category": "auth"}},
                {"id": "app/auth/permissions.py::is_admin", "data": {"label": "is_admin", "is_changed": False, "is_sensitive": True, "sensitive_category": "auth"}},
                {"id": "services/payments.py::payments.refund", "data": {"label": "payments.refund", "is_changed": False, "is_sensitive": True, "sensitive_category": "payment"}}
            ],
            "edges": [
                {"id": "e-1", "source": "app/auth/login.py::login", "target": "app/auth/permissions.py::is_admin"},
                {"id": "e-2", "source": "app/auth/permissions.py::is_admin", "target": "services/payments.py::payments.refund"}
            ],
            "affected_modules": ["app/auth/login.py", "app/auth/permissions.py", "services/payments.py"],
            "sensitive_touchpoints": ["login (auth)", "is_admin (auth)", "payments.refund (payment)"]
        }
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Test Import
        resp = await ac.post("/api/import", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["status"] == "success"
        assert data["pr_number"] == 42
        assert data["findings_count"] == 2  # Deduped from 3 to 2
        assert data["merged_duplicates_count"] == 1

        # Test Overview Stats
        stats_resp = await ac.get("/api/v1/overview/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["scanned_prs_count"] >= 4
        assert stats["policy_gating_blocks"] >= 2

        # Test Scan Detail
        scan_id = data["scan_id"]
        scan_resp = await ac.get(f"/api/v1/scans/{scan_id}")
        assert scan_resp.status_code == 200
        scan_data = scan_resp.json()
        assert scan_data["risk_score"] == 91.0
        assert scan_data["merge_decision"] == "BLOCK"
        assert len(scan_data["findings"]) == 2

        # Verify AI hypothesis is marked unverified
        ai_finding = next(f for f in scan_data["findings"] if f["source"] == "ai_hypothesis")
        assert ai_finding["is_verified"] is False
        assert ai_finding["confidence"] == 0.76

        # Verify SQL injection finding is verified and has merged evidence
        sql_finding = next(f for f in scan_data["findings"] if f["id"] == "find-sql-1")
        assert sql_finding["is_verified"] is True
        assert len(sql_finding["evidence_refs"]) >= 1

        # Test Idempotent Re-Import
        reimport_resp = await ac.post("/api/import", json=payload)
        assert reimport_resp.status_code == 200
        assert reimport_resp.json()["pr_number"] == 42
