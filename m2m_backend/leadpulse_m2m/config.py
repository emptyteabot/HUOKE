from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return default if value is None or value.strip() == "" else value.strip()


def _env_float(name: str, default: float) -> float:
    raw = _env(name, str(default))
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = _env(name, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    site_url: str = _env("LEADPULSE_SITE_URL", "https://leadpulseagi.com").rstrip("/")
    service_name: str = _env("LEADPULSE_M2M_NAME", "LeadPulse M2M Acquisition Gateway")
    min_budget_usd: float = _env_float("LEADPULSE_MIN_BUDGET_USD", 3000.0)
    default_timezone: str = _env("LEADPULSE_DISCOVERY_TIMEZONE", "Asia/Shanghai")
    discovery_duration_minutes: int = _env_int("LEADPULSE_DISCOVERY_DURATION_MINUTES", 30)
    booking_store_path: str = _env("LEADPULSE_BOOKING_STORE", "../data/m2m_bookings.jsonl")
    billing_store_path: str = _env("LEADPULSE_BILLING_STORE", "../data/m2m_billing.sqlite")
    booking_webhook_url: str = _env("LEADPULSE_BOOKING_WEBHOOK_URL", "")
    api_key: str = _env("LEADPULSE_M2M_API_KEY", "")
    free_trial_credits: int = _env_int("LEADPULSE_FREE_TRIAL_CREDITS", 60)
    noise_charge_credits: int = _env_int("LEADPULSE_NOISE_CHARGE_CREDITS", 1)
    high_value_charge_credits: int = _env_int("LEADPULSE_HIGH_VALUE_CHARGE_CREDITS", 50)
    refund_credits: int = _env_int("LEADPULSE_REFUND_CREDITS", 50)
    xunhu_app_id: str = _env("LEADPULSE_XUNHU_APP_ID", "")
    xunhu_app_secret: str = _env("LEADPULSE_XUNHU_APP_SECRET", "")
    xunhu_gateway_url: str = _env("LEADPULSE_XUNHU_GATEWAY_URL", "https://api.xunhupay.com/payment/do.html")
    xunhu_notify_url: str = _env("LEADPULSE_XUNHU_NOTIFY_URL", f"{site_url}/api/v1/xunhupay/notify")
    xunhu_return_url: str = _env("LEADPULSE_XUNHU_RETURN_URL", f"{site_url}/pay?payment=return")
    xunhu_order_title: str = _env("LEADPULSE_XUNHU_ORDER_TITLE", "LeadPulse 算力积分充值")
    llm_api_key: str = _env("LEADPULSE_LLM_API_KEY", _env("OPENAI_API_KEY", ""))
    llm_base_url: str = _env("LEADPULSE_LLM_BASE_URL", "https://api.openai.com/v1")
    llm_model: str = _env("LEADPULSE_LLM_MODEL", "gpt-4.1-mini")
    llm_timeout_seconds: int = _env_int("LEADPULSE_LLM_TIMEOUT_SECONDS", 12)


settings = Settings()
