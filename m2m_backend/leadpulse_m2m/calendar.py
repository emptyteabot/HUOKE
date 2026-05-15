from __future__ import annotations

import hashlib
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from .config import settings
from .schemas import AvailabilityRequest, AvailabilityResult, AvailabilitySlot, HoldSlotRequest


def _tz(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo(settings.default_timezone)


def _slot_id(start: datetime, duration_minutes: int) -> str:
    digest = hashlib.sha1(f"{start.isoformat()}:{duration_minutes}".encode("utf-8")).hexdigest()[:14]
    return f"lp_slot_{digest}"


def get_availability(request: AvailabilityRequest) -> AvailabilityResult:
    tz = _tz(request.timezone)
    now = datetime.now(tz)
    slots: list[AvailabilitySlot] = []

    cursor_date = now.date()
    for day_offset in range(request.days):
        current_date = cursor_date + timedelta(days=day_offset)
        if current_date.weekday() >= 5:
            continue

        for hour in range(request.min_start_hour, request.max_start_hour):
            start = datetime.combine(current_date, time(hour=hour), tzinfo=tz)
            if start <= now + timedelta(hours=2):
                continue
            end = start + timedelta(minutes=request.duration_minutes)
            slots.append(
                AvailabilitySlot(
                    slot_id=_slot_id(start, request.duration_minutes),
                    start=start,
                    end=end,
                    timezone=str(tz.key),
                    duration_minutes=request.duration_minutes,
                )
            )
            if len(slots) >= 18:
                return AvailabilityResult(
                    timezone=str(tz.key),
                    slots=slots,
                    policy="Only qualified leads receive discovery-call inventory. Slots are first-come, first-served.",
                )

    return AvailabilityResult(
        timezone=str(tz.key),
        slots=slots,
        policy="Only qualified leads receive discovery-call inventory. Slots are first-come, first-served.",
    )


def hold_slot(request: HoldSlotRequest) -> dict[str, str]:
    digest = hashlib.sha1(f"{request.slot_id}:{request.lead.contact.email}:{request.lead.contact.phone}".encode("utf-8")).hexdigest()[:16]
    return {
        "hold_id": f"lp_hold_{digest}",
        "slot_id": request.slot_id,
        "status": "held",
        "expires_in_seconds": "900",
    }


def cancel_hold(hold_id: str) -> dict[str, str]:
    return {"hold_id": hold_id, "status": "cancelled"}
