"""Central app configuration from environment variables and Streamlit secrets."""

import os
from typing import Any

try:
    import streamlit as st
except Exception:  # pragma: no cover
    st = None


def _secrets_lookup(key: str) -> str:
    if st is None:
        return ""

    key_lower = key.lower()

    try:
        if key in st.secrets:
            return str(st.secrets[key]).strip()
        if key_lower in st.secrets:
            return str(st.secrets[key_lower]).strip()
    except Exception:
        return ""

    # Common nested sections in secrets.toml
    for section in ("default", "app", "supabase", "stripe", "sendgrid", "openai"):
        try:
            block = st.secrets.get(section)
        except Exception:
            block = None
        if isinstance(block, dict):
            if key in block:
                return str(block[key]).strip()
            if key_lower in block:
                return str(block[key_lower]).strip()

    return ""


def _read_setting(key: str, default: str = "") -> str:
    env_val = os.getenv(key, "").strip()
    if env_val:
        return env_val

    sec_val = _secrets_lookup(key)
    if sec_val:
        return sec_val

    return default


def _read_bool(key: str, default: bool) -> bool:
    raw = _read_setting(key, "true" if default else "false").lower()
    return raw in {"1", "true", "yes", "on"}


def _read_int(key: str, default: int) -> int:
    raw = _read_setting(key, str(default))
    try:
        return int(raw)
    except Exception:
        return default


# ==================== Core ====================
APP_NAME = _read_setting("APP_NAME", "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce")
APP_VERSION = _read_setting("APP_VERSION", "1.0.0")
APP_BASE_URL = _read_setting("APP_BASE_URL", "https://ai-huoke.streamlit.app")
APP_LOCALE = _read_setting("APP_LOCALE", "zh-CN")
ENABLE_NEXT_REDIRECT = _read_bool("ENABLE_NEXT_REDIRECT", False)
NEXT_APP_URL = _read_setting("NEXT_APP_URL", "")
NEXT_APP_CN_URL = _read_setting("NEXT_APP_CN_URL", "")
NEXT_REDIRECT_DELAY_MS = _read_int("NEXT_REDIRECT_DELAY_MS", 1200)

# ==================== Access ====================
ENABLE_GUEST_AUTOLOGIN = _read_bool("ENABLE_GUEST_AUTOLOGIN", True)
GUEST_ACCOUNT_EMAIL = _read_setting("GUEST_ACCOUNT_EMAIL", "guest@ai-huoke.local").strip().lower()
GUEST_ACCOUNT_NAME = _read_setting("GUEST_ACCOUNT_NAME", "访客账号")
GUEST_ACCOUNT_COMPANY = _read_setting("GUEST_ACCOUNT_COMPANY", "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce")

# ==================== Supabase ====================
SUPABASE_URL = _read_setting("SUPABASE_URL", "")
SUPABASE_KEY = _read_setting("SUPABASE_KEY", "")

# ==================== OpenAI ====================
OPENAI_API_KEY = _read_setting("OPENAI_API_KEY", "")
OPENAI_BASE_URL = _read_setting("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = _read_setting("OPENAI_MODEL", "gpt-4o-mini")

# ==================== Email ====================
SENDGRID_API_KEY = _read_setting("SENDGRID_API_KEY", "")
FROM_EMAIL = _read_setting("FROM_EMAIL", "noreply@example.com")
FROM_NAME = _read_setting("FROM_NAME", APP_NAME)

# ==================== Auth ====================
JWT_SECRET = _read_setting("JWT_SECRET", "change-this-jwt-secret")
JWT_ALGORITHM = _read_setting("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = _read_int("JWT_EXPIRE_MINUTES", 10080)

# ==================== Billing (Stripe) ====================
STRIPE_SECRET_KEY = _read_setting("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = _read_setting("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = _read_setting("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_PRO = _read_setting("STRIPE_PRICE_PRO", "")
STRIPE_PRICE_ENTERPRISE = _read_setting("STRIPE_PRICE_ENTERPRISE", "")
PRICE_LABEL_PRO = _read_setting("PRICE_LABEL_PRO", "CNY 1999 / month")
PRICE_LABEL_ENTERPRISE = _read_setting("PRICE_LABEL_ENTERPRISE", "CNY 5999 / month")

# ==================== Feature Flags ====================
ENABLE_EMAIL_SENDING = _read_bool("ENABLE_EMAIL_SENDING", True)
ENABLE_EMAIL_TRACKING = _read_bool("ENABLE_EMAIL_TRACKING", True)
ENABLE_WORKFLOWS = _read_bool("ENABLE_WORKFLOWS", True)
ENABLE_PLATFORM_SCRAPER = _read_bool("ENABLE_PLATFORM_SCRAPER", True)
ENABLE_ANALYTICS = _read_bool("ENABLE_ANALYTICS", True)

# ==================== Plan Limits ====================
FREE_PLAN_LIMITS = {
    "max_leads": _read_int("FREE_MAX_LEADS", 50),
    "max_emails_per_month": _read_int("FREE_MAX_EMAILS", 100),
    "max_workflows": _read_int("FREE_MAX_WORKFLOWS", 3),
}

PRO_PLAN_LIMITS = {
    "max_leads": _read_int("PRO_MAX_LEADS", 500),
    "max_emails_per_month": _read_int("PRO_MAX_EMAILS", 2000),
    "max_workflows": _read_int("PRO_MAX_WORKFLOWS", 10),
}

ENTERPRISE_PLAN_LIMITS = {
    "max_leads": _read_int("ENT_MAX_LEADS", -1),
    "max_emails_per_month": _read_int("ENT_MAX_EMAILS", -1),
    "max_workflows": _read_int("ENT_MAX_WORKFLOWS", -1),
}


def get_config(key: str, default: Any = None):
    return globals().get(key, default)


def is_feature_enabled(feature_name: str) -> bool:
    return bool(globals().get(f"ENABLE_{feature_name.upper()}", False))


