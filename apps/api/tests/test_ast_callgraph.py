from app.services.analyzer.ast_parser import parse_python_module
from app.services.analyzer.call_graph import CallGraphBuilder
from app.services.analyzer.sensitive import classify_sensitivity


SAMPLE_PYTHON_CODE = """
def authenticate_user(token: str):
    user_id = decode_token(token)
    return get_user_record(user_id)

def decode_token(raw: str):
    return "user_123"

def get_user_record(uid: str):
    return {"id": uid, "role": "user"}
"""


def test_ast_parsing_and_call_extraction():
    summary = parse_python_module("app/auth.py", SAMPLE_PYTHON_CODE)
    assert len(summary.functions) == 3
    assert "authenticate_user" in summary.functions
    auth_fn = summary.functions["authenticate_user"]
    assert "decode_token" in auth_fn.calls
    assert "get_user_record" in auth_fn.calls


def test_call_graph_construction():
    builder = CallGraphBuilder()
    files = {"app/auth.py": SAMPLE_PYTHON_CODE}
    graph = builder.build_graph("scan-test-1", files)

    assert len(graph.nodes) >= 3
    assert len(graph.edges) >= 2
    # Check that authenticate_user connects to decode_token
    edge_sources = [e.source for e in graph.edges]
    assert any("authenticate_user" in s for s in edge_sources)


def test_sensitive_classification():
    is_sens, cat = classify_sensitivity("authenticate_token", "app/auth/tokens.py")
    assert is_sens is True
    assert cat == "auth"

    is_pay, cat_pay = classify_sensitivity("charge_customer_card", "app/billing.py")
    assert is_pay is True
    assert cat_pay == "payment"

    is_safe, _ = classify_sensitivity("render_navbar", "app/ui/header.py")
    assert is_safe is False
