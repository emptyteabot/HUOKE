from __future__ import annotations

from .schemas import AnswerTurn, FunnelQuestion, LeadProfile, NextQuestionRequest, NextQuestionResult, QuestionType, ScoringRequest
from .scoring import score_lead


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

    question = choose_next_question(lead, scoring.missing_fields)
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
