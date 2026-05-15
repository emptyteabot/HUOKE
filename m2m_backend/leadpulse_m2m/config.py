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
    booking_webhook_url: str = _env("LEADPULSE_BOOKING_WEBHOOK_URL", "")
    api_key: str = _env("LEADPULSE_M2M_API_KEY", "")


settings = Settings()
