from typing import Tuple, Optional

SENSITIVE_PATTERNS = {
    "auth": [
        "login", "logout", "auth", "authenticate", "authorize", "token", "jwt",
        "permission", "role", "session", "credential", "password", "oauth",
        "verify_signature", "get_current_user", "require_admin"
    ],
    "payment": [
        "payment", "stripe", "charge", "refund", "invoice", "checkout", "billing",
        "wallet", "payout", "card", "transaction", "amount", "subscription"
    ],
    "crypto": [
        "encrypt", "decrypt", "hash", "cipher", "secret", "private_key", "hmac",
        "sign", "key_exchange", "nonce", "salt"
    ],
    "data_access": [
        "raw_sql", "execute_sql", "cursor", "drop", "truncate", "bulk_delete",
        "export_users", "pii", "ssn", "gdpr"
    ]
}


def classify_sensitivity(symbol_name: str, file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Determines if a function, class, or module touches critical security/business domains.
    Returns:
        (is_sensitive: bool, category: Optional[str])
    """
    clean_symbol = symbol_name.lower()
    clean_path = file_path.lower()

    for category, keywords in SENSITIVE_PATTERNS.items():
        if any(kw in clean_symbol for kw in keywords) or any(kw in clean_path for kw in keywords):
            return True, category

    return False, None
