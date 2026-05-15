from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


StrictModelConfig = ConfigDict(extra="forbid", str_strip_whitespace=True, populate_by_name=True)


class Currency(str, Enum):
    usd = "USD"
    cny = "CNY"
    eur = "EUR"
    gbp = "GBP"
    unknown = "UNKNOWN"


class LeadContact(BaseModel):
    model_config = StrictModelConfig

    name: str = Field(default="", max_length=120)
    email: str = Field(default="", max_length=254)
    company: str = Field(default="", max_length=160)
    phone: str = Field(default="", max_length=80)
    timezone: str = Field(default="Asia/Shanghai", max_length=80)
    source: str = Field(default="mcp_agent", max_length=80)
    external_id: str = Field(default="", max_length=160)


class AnswerTurn(BaseModel):
    model_config = StrictModelConfig

    question_id: str = Field(default="", max_length=80)
    question: str = Field(default="", max_length=500)
    answer: str = Field(min_length=1, max_length=4000)
    answered_at: datetime | None = None


class LeadProfile(BaseModel):
    model_config = StrictModelConfig

    contact: LeadContact = Field(default_factory=LeadContact)
    segment: str = Field(default="high_value_service", max_length=80)
    context: str = Field(default="", max_length=8000)
    pain_points: list[str] = Field(default_factory=list, max_length=12)
    answers: list[AnswerTurn] = Field(default_factory=list, max_length=30)
    declared_budget: str = Field(default="", max_length=240)
    desired_outcome: str = Field(default="", max_length=800)
    urgency: str = Field(default="", max_length=240)
    decision_role: str = Field(default="", max_length=240)


class BudgetEvidence(BaseModel):
    model_config = StrictModelConfig

    raw_text: str = Field(default="", max_length=500)
    amount: float | None = Field(default=None, ge=0)
    currency: Currency = Currency.unknown
    normalized_usd: float | None = Field(default=None, ge=0)
    confidence: float = Field(ge=0, le=1)


class BudgetDecision(BaseModel):
    model_config = StrictModelConfig

    threshold_usd: float = Field(ge=0)
    qualified: bool
    evidence: BudgetEvidence
    reason: str = Field(min_length=1, max_length=500)


class ScoreBreakdown(BaseModel):
    model_config = StrictModelConfig

    budget: int = Field(ge=0, le=40)
    intent: int = Field(ge=0, le=20)
    authority: int = Field(ge=0, le=15)
    urgency: int = Field(ge=0, le=15)
    friction: int = Field(ge=-20, le=0)

    @property
    def total(self) -> int:
        return self.budget + self.intent + self.authority + self.urgency + self.friction


class ScoringRequest(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile
    agent_id: str = Field(default="", max_length=160)
    min_budget_usd: float | None = Field(default=None, ge=0)


class ScoringResult(BaseModel):
    model_config = StrictModelConfig

    qualified: bool
    score: int = Field(ge=0, le=100)
    grade: Literal["S", "A", "B", "C", "D"]
    budget: BudgetDecision
    recommended_service: str = Field(alias="recommendedService", min_length=1, max_length=160)
    next_action: Literal["ask_next_question", "show_availability", "book_discovery_call", "reject_or_nurture"]
    reasons: list[str] = Field(min_length=1, max_length=12)
    missing_fields: list[str] = Field(default_factory=list, max_length=8)


class QuestionType(str, Enum):
    text = "text"
    money = "money"
    choice = "choice"
    contact = "contact"


class FunnelQuestion(BaseModel):
    model_config = StrictModelConfig

    id: str = Field(min_length=1, max_length=80)
    type: QuestionType
    prompt: str = Field(min_length=1, max_length=400)
    intent: str = Field(min_length=1, max_length=160)
    required: bool = True
    options: list[str] = Field(default_factory=list, max_length=8)


class NextQuestionRequest(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile
    last_answer: str = Field(default="", max_length=4000)
    agent_id: str = Field(default="", max_length=160)
    min_budget_usd: float | None = Field(default=None, ge=0)


class NextQuestionResult(BaseModel):
    model_config = StrictModelConfig

    question: FunnelQuestion | None
    scoring: ScoringResult
    ready_for_availability: bool
    ready_for_booking: bool
    required_next_action: Literal["answer_question", "fetch_availability", "submit_booking", "reject_or_nurture"]

    @model_validator(mode="after")
    def _consistent_action(self) -> "NextQuestionResult":
        if self.required_next_action == "answer_question" and self.question is None:
            raise ValueError("question is required when the next action is answer_question")
        if self.ready_for_booking and not self.ready_for_availability:
            raise ValueError("booking readiness implies availability readiness")
        return self


class AvailabilityRequest(BaseModel):
    model_config = StrictModelConfig

    timezone: str = Field(default="Asia/Shanghai", max_length=80)
    days: int = Field(default=7, ge=1, le=30)
    duration_minutes: int = Field(default=30, ge=15, le=120)
    min_start_hour: int = Field(default=9, ge=0, le=23)
    max_start_hour: int = Field(default=18, ge=1, le=23)

    @model_validator(mode="after")
    def _valid_hours(self) -> "AvailabilityRequest":
        if self.max_start_hour <= self.min_start_hour:
            raise ValueError("max_start_hour must be greater than min_start_hour")
        return self


class AvailabilitySlot(BaseModel):
    model_config = StrictModelConfig

    slot_id: str = Field(min_length=1, max_length=160)
    start: datetime
    end: datetime
    timezone: str = Field(min_length=1, max_length=80)
    duration_minutes: int = Field(ge=15, le=120)


class AvailabilityResult(BaseModel):
    model_config = StrictModelConfig

    timezone: str = Field(min_length=1, max_length=80)
    slots: list[AvailabilitySlot] = Field(default_factory=list, max_length=80)
    policy: str = Field(min_length=1, max_length=500)


class BookingRequest(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile
    slot_id: str = Field(default="", max_length=160)
    start: datetime | None = None
    end: datetime | None = None
    timezone: str = Field(default="Asia/Shanghai", max_length=80)
    score: ScoringResult | None = None
    force: bool = False
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def _has_time(self) -> "BookingRequest":
        if not self.slot_id and (self.start is None or self.end is None):
            raise ValueError("slot_id or explicit start/end is required")
        return self


class BookingResult(BaseModel):
    model_config = StrictModelConfig

    ok: bool
    booking_id: str = Field(min_length=1, max_length=160)
    status: Literal["confirmed", "rejected"]
    reason: str = Field(min_length=1, max_length=500)
    slot: AvailabilitySlot | None
    next_step: str = Field(min_length=1, max_length=500)


class QualifyAndBookRequest(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile
    availability: AvailabilityRequest = Field(default_factory=AvailabilityRequest)
    preferred_slot_id: str = Field(default="", max_length=160)
    force: bool = False


class ToolCallRequest(BaseModel):
    model_config = StrictModelConfig

    name: str = Field(min_length=1, max_length=120)
    arguments: dict[str, Any] = Field(default_factory=dict)


class JsonRpcRequest(BaseModel):
    model_config = StrictModelConfig

    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int | None = None
    method: str = Field(min_length=1, max_length=120)
    params: dict[str, Any] = Field(default_factory=dict)


class JsonRpcError(BaseModel):
    model_config = StrictModelConfig

    code: int
    message: str
    data: Any | None = None


class JsonRpcResponse(BaseModel):
    model_config = StrictModelConfig

    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int | None = None
    result: Any | None = None
    error: JsonRpcError | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> "JsonRpcResponse":
        if (self.result is None) == (self.error is None):
            raise ValueError("exactly one of result or error is required")
        return self


class HealthResult(BaseModel):
    model_config = StrictModelConfig

    status: Literal["ok"]
    service: str
    version: str


class ContactNormalizeRequest(BaseModel):
    model_config = StrictModelConfig

    contact: LeadContact


class AppendContextRequest(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile
    context: str = Field(min_length=1, max_length=4000)


class HoldSlotRequest(BaseModel):
    model_config = StrictModelConfig

    slot_id: str = Field(min_length=1, max_length=160)
    lead: LeadProfile


class CancelHoldRequest(BaseModel):
    model_config = StrictModelConfig

    hold_id: str = Field(min_length=1, max_length=160)


class EmptyRequest(BaseModel):
    model_config = StrictModelConfig


class CreateLeadRequest(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile


class ExtractBudgetRequest(BaseModel):
    model_config = StrictModelConfig

    text: str = Field(min_length=1, max_length=8000)
    min_budget_usd: float | None = Field(default=None, ge=0)


class TextResult(BaseModel):
    model_config = StrictModelConfig

    text: str


class LeadEnvelope(BaseModel):
    model_config = StrictModelConfig

    lead: LeadProfile

    @field_validator("lead")
    @classmethod
    def _lead_has_signal(cls, lead: LeadProfile) -> LeadProfile:
        haystack = " ".join(
            [
                lead.context,
                lead.declared_budget,
                lead.desired_outcome,
                lead.urgency,
                lead.decision_role,
                " ".join(turn.answer for turn in lead.answers),
            ]
        )
        if not haystack.strip():
            raise ValueError("lead must include context, answers, or declared budget")
        return lead
