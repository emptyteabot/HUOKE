"""Central app configuration loaded from environment variables."""

import os

# ==================== Core ====================
APP_NAME = os.getenv("APP_NAME", "GuestSeek")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://ai-huoke.streamlit.app")

# ==================== Supabase ====================
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# ==================== OpenAI ====================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ==================== Email ====================
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@example.com")
FROM_NAME = os.getenv("FROM_NAME", APP_NAME)

# ==================== Auth ====================
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-jwt-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))

# ==================== Billing (Stripe) ====================
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_PRO = os.getenv("STRIPE_PRICE_PRO", "")
STRIPE_PRICE_ENTERPRISE = os.getenv("STRIPE_PRICE_ENTERPRISE", "")
PRICE_LABEL_PRO = os.getenv("PRICE_LABEL_PRO", "¥1999 / month")
PRICE_LABEL_ENTERPRISE = os.getenv("PRICE_LABEL_ENTERPRISE", "¥5999 / month")

# ==================== Feature Flags ====================
ENABLE_EMAIL_SENDING = os.getenv("ENABLE_EMAIL_SENDING", "true").lower() == "true"
ENABLE_EMAIL_TRACKING = os.getenv("ENABLE_EMAIL_TRACKING", "true").lower() == "true"
ENABLE_WORKFLOWS = os.getenv("ENABLE_WORKFLOWS", "true").lower() == "true"
ENABLE_PLATFORM_SCRAPER = os.getenv("ENABLE_PLATFORM_SCRAPER", "true").lower() == "true"
ENABLE_ANALYTICS = os.getenv("ENABLE_ANALYTICS", "true").lower() == "true"

# ==================== Plan Limits ====================
FREE_PLAN_LIMITS = {
    "max_leads": int(os.getenv("FREE_MAX_LEADS", "50")),
    "max_emails_per_month": int(os.getenv("FREE_MAX_EMAILS", "100")),
    "max_workflows": int(os.getenv("FREE_MAX_WORKFLOWS", "3")),
}

PRO_PLAN_LIMITS = {
    "max_leads": int(os.getenv("PRO_MAX_LEADS", "500")),
    "max_emails_per_month": int(os.getenv("PRO_MAX_EMAILS", "2000")),
    "max_workflows": int(os.getenv("PRO_MAX_WORKFLOWS", "10")),
}

ENTERPRISE_PLAN_LIMITS = {
    "max_leads": int(os.getenv("ENT_MAX_LEADS", "-1")),
    "max_emails_per_month": int(os.getenv("ENT_MAX_EMAILS", "-1")),
    "max_workflows": int(os.getenv("ENT_MAX_WORKFLOWS", "-1")),
}


def get_config(key, default=None):
    return globals().get(key, default)


def is_feature_enabled(feature_name: str) -> bool:
    return globals().get(f"ENABLE_{feature_name.upper()}", False)
