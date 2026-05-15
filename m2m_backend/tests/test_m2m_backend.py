from fastapi.testclient import TestClient

from leadpulse_m2m.main import app


client = TestClient(app)


def qualified_lead_payload():
    return {
        "lead": {
            "contact": {
                "name": "Alex Chen",
                "email": "alex@example.com",
                "company": "Acme AI",
                "timezone": "Asia/Shanghai",
            },
            "context": "Founder needs qualified B2B leads and wants to book a call this week.",
            "declared_budget": "Monthly budget USD 8000",
            "desired_outcome": "Book high intent discovery calls",
            "urgency": "this week",
            "decision_role": "founder, I approve the budget",
            "answers": [
                {
                    "question_id": "budget",
                    "question": "Budget?",
                    "answer": "USD 8000 monthly budget",
                }
            ],
        }
    }


def test_well_known_exposes_eighteen_tools():
    response = client.get("/.well-known/mcp.json")
    assert response.status_code == 200
    payload = response.json()
    assert payload["protocolVersion"] == "2025-11-25"
    assert len(payload["tools"]) == 18
    assert payload["endpoints"]["scoring"].endswith("/api/v2/scoring")


def test_scoring_has_recommended_service_alias():
    response = client.post("/api/v2/scoring", json=qualified_lead_payload())
    assert response.status_code == 200
    payload = response.json()
    assert payload["qualified"] is True
    assert payload["recommendedService"] == "High-value Discovery Call"
    assert payload["budget"]["qualified"] is True


def test_dynamic_funnel_returns_question_for_missing_budget():
    response = client.post(
        "/api/v2/funnel/next-question",
        json={
            "lead": {
                "contact": {"name": "Visitor"},
                "context": "I need more qualified leads and want a call.",
            }
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["required_next_action"] == "answer_question"
    assert payload["question"]["id"] == "budget"


def test_mcp_tools_call_check_fit():
    response = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "leadpulse.check_fit",
                "arguments": qualified_lead_payload(),
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()
    structured = payload["result"]["structuredContent"]
    assert structured["qualified"] is True
    assert structured["recommendedService"] == "High-value Discovery Call"


def test_booking_rejects_unqualified_without_force():
    response = client.post(
        "/api/v2/booking",
        json={
            "lead": {
                "contact": {"name": "Low Budget", "email": "low@example.com"},
                "context": "I only want a cheap free tool.",
                "declared_budget": "no budget",
            },
            "start": "2026-05-20T10:00:00+08:00",
            "end": "2026-05-20T10:30:00+08:00",
            "timezone": "Asia/Shanghai",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
