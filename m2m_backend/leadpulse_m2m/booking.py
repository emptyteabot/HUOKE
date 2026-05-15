from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .calendar import get_availability
from .config import settings
from .schemas import AvailabilityRequest, AvailabilitySlot, BookingRequest, BookingResult, ScoringRequest
from .scoring import score_lead


def _store_path() -> Path:
    path = Path(settings.booking_store_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _slot_from_request(request: BookingRequest) -> AvailabilitySlot | None:
    if request.start and request.end:
        duration = int((request.end - request.start).total_seconds() / 60)
        return AvailabilitySlot(
            slot_id=request.slot_id or f"lp_slot_manual_{uuid.uuid4().hex[:12]}",
            start=request.start,
            end=request.end,
            timezone=request.timezone,
            duration_minutes=max(15, duration),
        )

    availability = get_availability(AvailabilityRequest(timezone=request.timezone, days=30))
    return next((slot for slot in availability.slots if slot.slot_id == request.slot_id), None)


def submit_booking(request: BookingRequest) -> BookingResult:
    scoring = request.score or score_lead(ScoringRequest(lead=request.lead))
    if not scoring.qualified and not request.force:
        return BookingResult(
            ok=False,
            booking_id=f"lp_reject_{uuid.uuid4().hex[:12]}",
            status="rejected",
            reason="Lead is not qualified for a high-value discovery call.",
            slot=None,
            next_step="Ask the dynamic funnel to collect missing budget, authority, or contact evidence.",
        )

    slot = _slot_from_request(request)
    if slot is None:
        return BookingResult(
            ok=False,
            booking_id=f"lp_reject_{uuid.uuid4().hex[:12]}",
            status="rejected",
            reason="Requested slot is no longer available.",
            slot=None,
            next_step="Fetch availability again and retry with a fresh slot_id.",
        )

    booking_id = f"lp_booking_{uuid.uuid4().hex[:18]}"
    payload = {
        "booking_id": booking_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lead": request.lead.model_dump(mode="json", by_alias=True),
        "slot": slot.model_dump(mode="json", by_alias=True),
        "score": scoring.model_dump(mode="json", by_alias=True),
        "notes": request.notes,
        "source": "leadpulse_m2m",
    }

    with _store_path().open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")

    return BookingResult(
        ok=True,
        booking_id=booking_id,
        status="confirmed",
        reason="Qualified lead locked into a discovery-call slot.",
        slot=slot,
        next_step="Send calendar confirmation and route the lead to the founder/closer queue.",
    )
