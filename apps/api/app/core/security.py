import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Any
from jose import jwt, JWTError
from app.core.config import settings

ALGORITHM = "HS256"


def verify_github_signature(payload_body: bytes, signature_header: Optional[str], secret: Optional[str] = None) -> bool:
    """
    Verifies that the webhook payload was sent from GitHub using HMAC-SHA256.
    Uses timing-safe comparison to prevent timing attacks.
    """
    if not signature_header:
        return False

    secret_key = secret or settings.GITHUB_WEBHOOK_SECRET
    if not secret_key:
        return False

    if not signature_header.startswith("sha256="):
        return False

    expected_signature = signature_header.split("sha256=")[1]
    mac = hmac.new(
        key=secret_key.encode("utf-8"),
        msg=payload_body,
        digestmod=hashlib.sha256
    )
    computed_signature = mac.hexdigest()

    return hmac.compare_digest(computed_signature, expected_signature)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
