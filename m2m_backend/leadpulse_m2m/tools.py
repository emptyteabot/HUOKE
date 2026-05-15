from __future__ import annotations

from typing import Any, Callable

from pydantic import BaseModel

from . import __version__
from .booking import submit_booking
from .calendar import cancel_hold, get_availability, hold_slot
from .config import settings
from .funnel import next_question
from .schemas import (
    AppendContextRequest,
    AvailabilityRequest,
    BookingRequest,
    CancelHoldRequest,
    ContactNormalizeRequest,
    CreateLeadRequest,
    EmptyRequest,
    ExtractBudgetRequest,
    HoldSlotRequest,
    LeadProfile,
    NextQuestionRequest,
    QualifyAndBookRequest,
    ScoringRequest,
)
from .scoring import extract_budget, score_lead


ToolHandler = Callable[[dict[str, Any]], dict[str, Any]]


def _schema(model: type[BaseModel]) -> dict[str, Any]:
    return model.model_json_schema()


def _dump(model: BaseModel | dict[str, Any]) -> dict[str, Any]:
    if isinstance(model, BaseModel):
        return model.model_dump(mode="json", by_alias=True)
    return model


def _tool(name: str, description: str, model: type[BaseModel]) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "inputSchema": _schema(model),
    }


TOOL_DEFINITIONS: list[dict[str, Any]] = [
    _tool("leadpulse.score_lead", "Score a lead and return deterministic fit, budget, and next_action.", ScoringRequest),
    _tool("leadpulse.check_fit", "Compatibility alias for score_lead. Always returns recommendedService.", ScoringRequest),
    _tool("leadpulse.extract_budget", "Extract and normalize budget evidence with strict schema validation.", ExtractBudgetRequest),
    _tool("leadpulse.start_interview", "Start an AI-style dynamic qualification interview.", NextQuestionRequest),
    _tool("leadpulse.next_question", "Generate the next interview question from current answers.", NextQuestionRequest),
    _tool("leadpulse.submit_answer", "Append the latest answer and return the next dynamic question or availability action.", NextQuestionRequest),
    _tool("leadpulse.get_availability", "Return discovery-call availability for qualified leads.", AvailabilityRequest),
    _tool("leadpulse.hold_slot", "Temporarily hold an availability slot for a lead.", HoldSlotRequest),
    _tool("leadpulse.cancel_hold", "Cancel a temporary slot hold.", CancelHoldRequest),
    _tool("leadpulse.book_discovery_call", "Submit a booking. Rejects unqualified leads unless force is true.", BookingRequest),
    _tool("leadpulse.qualify_and_book", "Score, fetch availability, and book the first/preferred slot in one call.", QualifyAndBookRequest),
    _tool("leadpulse.get_pipeline_policy", "Return LeadPulse V2 closed-loop routing policy.", EmptyRequest),
    _tool("leadpulse.get_service_offer", "Return the single retained commercial offer.", EmptyRequest),
    _tool("leadpulse.normalize_contact", "Normalize a contact payload into the LeadPulse lead schema.", ContactNormalizeRequest),
    _tool("leadpulse.create_lead", "Create an in-memory lead envelope for follow-up tool calls.", CreateLeadRequest),
    _tool("leadpulse.append_context", "Append agent context to a lead before rescoring.", AppendContextRequest),
    _tool("leadpulse.health", "Health check for M2M gateway.", EmptyRequest),
    _tool("leadpulse.get_tool_manifest", "Return all 18 exposed MCP tool definitions.", EmptyRequest),
]


def _score(args: dict[str, Any]) -> dict[str, Any]:
    return _dump(score_lead(ScoringRequest.model_validate(args)))


def _extract_budget(args: dict[str, Any]) -> dict[str, Any]:
    request = ExtractBudgetRequest.model_validate(args)
    return _dump(extract_budget(request.text, request.min_budget_usd))


def _next_question(args: dict[str, Any]) -> dict[str, Any]:
    return _dump(next_question(NextQuestionRequest.model_validate(args)))


def _availability(args: dict[str, Any]) -> dict[str, Any]:
    return _dump(get_availability(AvailabilityRequest.model_validate(args)))


def _hold(args: dict[str, Any]) -> dict[str, Any]:
    return hold_slot(HoldSlotRequest.model_validate(args))


def _cancel_hold(args: dict[str, Any]) -> dict[str, Any]:
    request = CancelHoldRequest.model_validate(args)
    return cancel_hold(request.hold_id)


def _book(args: dict[str, Any]) -> dict[str, Any]:
    return _dump(submit_booking(BookingRequest.model_validate(args)))


def _qualify_and_book(args: dict[str, Any]) -> dict[str, Any]:
    request = QualifyAndBookRequest.model_validate(args)
    scoring = score_lead(ScoringRequest(lead=request.lead))
    availability = get_availability(request.availability)
    selected = None
    if request.preferred_slot_id:
        selected = next((slot for slot in availability.slots if slot.slot_id == request.preferred_slot_id), None)
    selected = selected or (availability.slots[0] if availability.slots else None)
    if selected is None:
        return {
            "scoring": scoring.model_dump(mode="json", by_alias=True),
            "availability": availability.model_dump(mode="json", by_alias=True),
            "booking": {
                "ok": False,
                "status": "rejected",
                "reason": "No discovery-call slot is currently available.",
            },
        }
    booking = submit_booking(
        BookingRequest(
            lead=request.lead,
            slot_id=selected.slot_id,
            timezone=selected.timezone,
            score=scoring,
            force=request.force,
        )
    )
    return {
        "scoring": scoring.model_dump(mode="json", by_alias=True),
        "availability": availability.model_dump(mode="json", by_alias=True),
        "booking": booking.model_dump(mode="json", by_alias=True),
    }


def _policy(_: dict[str, Any]) -> dict[str, Any]:
    return {
        "pipeline": [
            "dynamic_budget_interview",
            "budget_qualified",
            "fetch_calendar_availability",
            "lock_high_value_discovery_call",
        ],
        "discarded_surfaces": ["generic_templates", "file_uploads", "surveys", "hr_forms", "logic_tree_forms"],
        "minimum_budget_usd": settings.min_budget_usd,
    }


def _offer(_: dict[str, Any]) -> dict[str, Any]:
    return {
        "service": "High-value Discovery Call",
        "positioning": "Invisible M2M intent interception and calendar settlement for qualified leads.",
        "cta": "Book a 30-minute discovery call only after budget and authority pass validation.",
    }


def _normalize_contact(args: dict[str, Any]) -> dict[str, Any]:
    request = ContactNormalizeRequest.model_validate(args)
    return {"contact": request.contact.model_dump(mode="json", by_alias=True)}


def _create_lead(args: dict[str, Any]) -> dict[str, Any]:
    request = CreateLeadRequest.model_validate(args)
    return {"lead": request.lead.model_dump(mode="json", by_alias=True)}


def _append_context(args: dict[str, Any]) -> dict[str, Any]:
    request = AppendContextRequest.model_validate(args)
    context = "\n".join(part for part in [request.lead.context, request.context] if part)
    lead = request.lead.model_copy(update={"context": context})
    return {"lead": lead.model_dump(mode="json", by_alias=True)}


def _health(_: dict[str, Any]) -> dict[str, Any]:
    return {"status": "ok", "service": settings.service_name, "version": __version__}


def _manifest(_: dict[str, Any]) -> dict[str, Any]:
    return {"tools": TOOL_DEFINITIONS, "count": len(TOOL_DEFINITIONS)}


TOOL_HANDLERS: dict[str, ToolHandler] = {
    "leadpulse.score_lead": _score,
    "leadpulse.check_fit": _score,
    "leadpulse.extract_budget": _extract_budget,
    "leadpulse.start_interview": _next_question,
    "leadpulse.next_question": _next_question,
    "leadpulse.submit_answer": _next_question,
    "leadpulse.get_availability": _availability,
    "leadpulse.hold_slot": _hold,
    "leadpulse.cancel_hold": _cancel_hold,
    "leadpulse.book_discovery_call": _book,
    "leadpulse.qualify_and_book": _qualify_and_book,
    "leadpulse.get_pipeline_policy": _policy,
    "leadpulse.get_service_offer": _offer,
    "leadpulse.normalize_contact": _normalize_contact,
    "leadpulse.create_lead": _create_lead,
    "leadpulse.append_context": _append_context,
    "leadpulse.health": _health,
    "leadpulse.get_tool_manifest": _manifest,
}


def execute_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        raise KeyError(f"Unknown tool: {name}")
    return handler(arguments)


def empty_lead() -> LeadProfile:
    return LeadProfile()
