from __future__ import annotations

import json
from typing import Any

import requests
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .config import settings
from .schemas import AnswerTurn, FunnelQuestion, LeadProfile, NextQuestionRequest, NextQuestionResult, QuestionType, ScoringRequest
from .scoring import score_lead


StrictModelConfig = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LlmQuestionDraft(BaseModel):
    model_config = StrictModelConfig

    id: str = Field(min_length=1, max_length=80)
    type: QuestionType
    prompt: str = Field(min_length=1, max_length=400)
    intent: str = Field(min_length=1, max_length=160)
    required: bool = True
    options: list[str] = Field(default_factory=list, max_length=8)


QUESTION_BANK: dict[str, FunnelQuestion] = {
    "budget": FunnelQuestion(
        id="budget",
        type=QuestionType.money,
        prompt="What monthly budget can you commit if the system can produce qualified discovery calls?",
        intent="determine hard budget and reject low-value traffic",
        required=True,
    ),
    "decision_role": FunnelQuestion(
        id="decision_role",
        type=QuestionType.choice,
        prompt="Are you the budget owner or the person who can approve this discovery call?",
        intent="confirm authority",
        required=True,
        options=["I approve the budget", "I influence the decision", "I am researching for someone else"],
    ),
    "desired_outcome": FunnelQuestion(
        id="desired_outcome",
        type=QuestionType.text,
        prompt="What outcome do you need from LeadPulse in the next 30 days?",
        intent="identify concrete business intent",
        required=True,
    ),
    "urgency": FunnelQuestion(
        id="urgency",
        type=QuestionType.choice,
        prompt="How soon do you need the first qualified discovery call booked?",
        intent="measure urgency",
        required=True,
        options=["This week", "This month", "No fixed timeline"],
    ),
    "contact": FunnelQuestion(
        id="contact",
        type=QuestionType.contact,
        prompt="What email or phone should we use to lock the discovery call?",
        intent="collect a booking route for qualified leads",
        required=True,
    ),
}


def _json_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["id", "type", "prompt", "intent", "required", "options"],
        "properties": {
            "id": {"type": "string", "maxLength": 80},
            "type": {"type": "string", "enum": ["text", "money", "choice", "contact"]},
            "prompt": {"type": "string", "maxLength": 400},
            "intent": {"type": "string", "maxLength": 160},
            "required": {"type": "boolean"},
            "options": {
                "type": "array",
                "maxItems": 8,
                "items": {"type": "string", "maxLength": 120},
            },
        },
    }


def _lead_summary(lead: LeadProfile, missing_fields: list[str]) -> dict[str, Any]:
    return {
        "segment": lead.segment,
        "context": lead.context[-1600:],
        "declared_budget": lead.declared_budget,
        "desired_outcome": lead.desired_outcome,
        "urgency": lead.urgency,
        "decision_role": lead.decision_role,
        "answers": [
            {
                "question_id": turn.question_id,
                "question": turn.question,
                "answer": turn.answer[-800:],
            }
            for turn in lead.answers[-8:]
        ],
        "missing_fields": missing_fields,
    }


def _extract_json(text: str) -> dict[str, Any]:
    raw = str(text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        raw = raw[start : end + 1]
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("LLM question output must be a JSON object")
    return parsed


def _llm_next_question(lead: LeadProfile, missing_fields: list[str]) -> FunnelQuestion | None:
    if not settings.llm_api_key:
        return None

    fallback = choose_next_question(lead, missing_fields)
    target = fallback.id if fallback is not None else (missing_fields[0] if missing_fields else "desired_outcome")
    system = (
        "You are LeadPulse's AI Funnel interviewer. Generate exactly one next question for a B2B lead. "
        "The business goal is: budget qualification -> qualified budget -> availability -> discovery call. "
        "Do not ask generic survey questions. Do not mention internal schemas, MCP, Pydantic, or scoring. "
        "Return only valid JSON matching the schema."
    )
    user = {
        "language": "zh-CN",
        "target_missing_field": target,
        "allowed_question_types": ["text", "money", "choice", "contact"],
        "lead": _lead_summary(lead, missing_fields),
        "schema": _json_schema(),
    }

    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    try:
        response = requests.post(
            url,
            headers={
                "authorization": f"Bearer {settings.llm_api_key}",
                "content-type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
                ],
            },
            timeout=settings.llm_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        draft = LlmQuestionDraft.model_validate(_extract_json(content))
        return FunnelQuestion.model_validate(draft.model_dump(mode="json"))
    except (KeyError, ValueError, requests.RequestException, ValidationError, json.JSONDecodeError):
        return None


def _with_last_answer(lead: LeadProfile, last_answer: str) -> LeadProfile:
    if not last_answer.strip():
        return lead
    turns = list(lead.answers)
    turns.append(
        AnswerTurn(
            question_id="agent_followup",
            question="External agent follow-up answer",
            answer=last_answer.strip(),
        )
    )
    return lead.model_copy(update={"answers": turns})


def choose_next_question(lead: LeadProfile, missing_fields: list[str]) -> FunnelQuestion | None:
    answered_ids = {turn.question_id for turn in lead.answers if turn.question_id}
    for field in missing_fields:
        if field in QUESTION_BANK and field not in answered_ids:
            return QUESTION_BANK[field]

    # If a field was answered but still failed validation, ask a sharper version.
    if "budget" in missing_fields:
        return QUESTION_BANK["budget"].model_copy(
            update={
                "id": "budget_clarify",
                "prompt": "Please give a concrete monthly budget number and currency, for example USD 5000 or RMB 50000.",
            }
        )
    if "contact" in missing_fields:
        return QUESTION_BANK["contact"]
    return None


def next_question(request: NextQuestionRequest) -> NextQuestionResult:
    lead = _with_last_answer(request.lead, request.last_answer)
    scoring = score_lead(ScoringRequest(lead=lead, agent_id=request.agent_id, min_budget_usd=request.min_budget_usd))

    question = _llm_next_question(lead, scoring.missing_fields) or choose_next_question(lead, scoring.missing_fields)
    ready_for_availability = scoring.next_action in {"show_availability", "book_discovery_call"}
    ready_for_booking = scoring.qualified

    if question is not None and not ready_for_booking:
        required_next_action = "answer_question"
    elif ready_for_booking:
        required_next_action = "fetch_availability"
    elif scoring.next_action == "reject_or_nurture":
        required_next_action = "reject_or_nurture"
    else:
        required_next_action = "answer_question"
        question = question or QUESTION_BANK["desired_outcome"]

    return NextQuestionResult(
        question=question,
        scoring=scoring,
        ready_for_availability=ready_for_availability,
        ready_for_booking=ready_for_booking,
        required_next_action=required_next_action,
    )
