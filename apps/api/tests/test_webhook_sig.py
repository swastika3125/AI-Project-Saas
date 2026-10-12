import hmac
import hashlib
from app.core.security import verify_github_signature


def test_valid_webhook_signature():
    secret = "my-test-webhook-secret-123"
    payload = b'{"action": "opened", "pull_request": {"number": 42}}'

    # Compute valid signature
    mac = hmac.new(secret.encode("utf-8"), msg=payload, digestmod=hashlib.sha256)
    valid_header = f"sha256={mac.hexdigest()}"

    assert verify_github_signature(payload, valid_header, secret=secret) is True


def test_invalid_webhook_signature():
    secret = "my-test-webhook-secret-123"
    payload = b'{"action": "opened"}'

    # Bad signature
    invalid_header = "sha256=0000000000000000000000000000000000000000000000000000000000000000"
    assert verify_github_signature(payload, invalid_header, secret=secret) is False


def test_tampered_payload_rejected():
    secret = "my-test-webhook-secret-123"
    original_payload = b'{"action": "opened"}'
    tampered_payload = b'{"action": "opened", "admin": true}'

    mac = hmac.new(secret.encode("utf-8"), msg=original_payload, digestmod=hashlib.sha256)
    valid_header_for_original = f"sha256={mac.hexdigest()}"

    # Verifying tampered payload with original's signature must fail
    assert verify_github_signature(tampered_payload, valid_header_for_original, secret=secret) is False
