from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from leadpulse_m2m import billing as billing_module
from leadpulse_m2m import funnel as funnel_module
from leadpulse_m2m import source_state as source_state_module
from leadpulse_m2m.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_billing_store(tmp_path, monkeypatch):
    fake_settings = SimpleNamespace(
        site_url="https://leadpulseagi.com",
        service_name="LeadPulse M2M Acquisition Gateway",
        min_budget_usd=3000.0,
        default_timezone="Asia/Shanghai",
        discovery_duration_minutes=30,
        booking_store_path=str(tmp_path / "bookings.jsonl"),
        billing_store_path=str(tmp_path / "billing.sqlite"),
        source_state_store_path=str(tmp_path / "source_state.sqlite"),
        booking_webhook_url="",
        api_key="",
        free_trial_credits=60,
        noise_charge_credits=1,
        high_value_charge_credits=50,
        refund_credits=50,
        xunhu_app_id="test-app-id",
        xunhu_app_secret="test-secret",
        xunhu_gateway_url="https://pay.example.test/payment/do.html",
        xunhu_notify_url="https://leadpulseagi.com/api/v1/xunhupay/notify",
        xunhu_return_url="https://leadpulseagi.com/api/v1/xunhupay/callback",
        xunhu_order_title="LeadPulse 算力积分充值",
    )

    monkeypatch.setattr(billing_module, "settings", fake_settings)
    monkeypatch.setattr(source_state_module, "settings", fake_settings)

    class FakePayResponse:
        def __init__(self, payload: dict[str, str]):
            self.payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self.payload

    def fake_post(url, data=None, timeout=None, **_kwargs):
        assert url == fake_settings.xunhu_gateway_url
        assert timeout == 12
        assert data["hash"] == billing_module.xunhu_sign(data, fake_settings.xunhu_app_secret)
        assert data["notify_url"] == fake_settings.xunhu_notify_url
        assert data["return_url"] == fake_settings.xunhu_return_url
        return FakePayResponse({"errcode": "0", "url": f"https://pay.example.test/{data['trade_order_id']}"})

    monkeypatch.setattr(billing_module.requests, "post", fake_post)
    yield


def sign_xunhu_fields(fields: dict[str, str]) -> str:
    return billing_module.xunhu_sign(fields, "test-secret")


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


def test_dynamic_funnel_can_use_llm_question_with_schema_validation(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '{"id":"ai_budget_probe","type":"money",'
                                '"prompt":"如果 LeadPulse 本月能交付高意向商机，你能投入多少预算？",'
                                '"intent":"确认本月可投入预算","required":true,"options":[]}'
                            )
                        }
                    }
                ]
            }

    def fake_post(*args, **kwargs):
        return FakeResponse()

    monkeypatch.setattr(
        funnel_module,
        "settings",
        SimpleNamespace(
            llm_api_key="test-key",
            llm_base_url="https://llm.example/v1",
            llm_model="test-model",
            llm_timeout_seconds=1,
        ),
    )
    monkeypatch.setattr(funnel_module.requests, "post", fake_post)

    response = client.post(
        "/api/v2/funnel/next-question",
        json={
            "lead": {
                "contact": {"name": "Visitor"},
                "context": "我想找更精准的销售线索。",
            }
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["question"]["id"] == "ai_budget_probe"
    assert payload["question"]["type"] == "money"


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


def test_billing_wallet_grants_free_trial_credits():
    response = client.get("/api/v2/billing/wallet", params={"user_id": "trial_user_test"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["wallet"]["credits"] == 60
    assert payload["wallet"]["free_trial_credits_granted"] is True
    assert payload["free_trial_credits"] == 60


def test_billing_packages_are_credit_packs_not_subscriptions():
    response = client.get("/api/v2/billing/packages")
    assert response.status_code == 200
    packages = {item["package_id"]: item for item in response.json()["packages"]}
    assert packages["trial"]["credits"] == 60
    assert packages["trial"]["requires_payment"] is False
    assert packages["icebreaker"]["price_cny"] == "99"
    assert packages["icebreaker"]["credits"] == 100
    assert packages["standard"]["price_cny"] == "499"
    assert packages["standard"]["credits"] == 550
    assert packages["enterprise"]["price_cny"] == "1999"
    assert packages["enterprise"]["credits"] == 2500


def test_billing_asymmetric_charges_and_refund():
    user_id = "charge_user_test"
    response = client.get("/api/v2/billing/wallet", params={"user_id": user_id})
    assert response.status_code == 200
    assert response.json()["wallet"]["credits"] == 60

    noise = client.post(
        "/api/v2/billing/charge",
        json={"user_id": user_id, "event_type": "noise", "reference_id": "noise-1"},
    )
    assert noise.status_code == 200
    assert noise.json()["delta"] == -1
    assert noise.json()["wallet"]["credits"] == 59

    high_value = client.post(
        "/api/v2/billing/charge",
        json={"user_id": user_id, "event_type": "high_value", "reference_id": "lead-1"},
    )
    assert high_value.status_code == 200
    assert high_value.json()["delta"] == -50
    assert high_value.json()["wallet"]["credits"] == 9

    refund = client.post(
        "/api/v2/billing/charge",
        json={"user_id": user_id, "event_type": "refund", "reference_id": "lead-1-invalid"},
    )
    assert refund.status_code == 200
    assert refund.json()["delta"] == 50
    assert refund.json()["wallet"]["credits"] == 59


def test_billing_insufficient_credits_fails():
    response = client.post(
        "/api/v2/billing/charge",
        json={"user_id": "low_balance_test", "event_type": "high_value", "credits": 61},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "insufficient_credits"


def test_recharge_order_requires_valid_contact_email():
    response = client.post(
        "/api/v2/billing/orders",
        json={"user_id": "missing_email_test", "package_id": "icebreaker", "contact_email": ""},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "valid_contact_email_required"


def test_xunhupay_notify_invalid_signature_returns_fail():
    response = client.post(
        "/api/v1/xunhupay/notify",
        data={
            "appid": "test-app-id",
            "trade_order_id": "lp_order_missing",
            "status": "OD",
            "total_fee": "99.00",
            "hash": "bad-signature",
        },
    )
    assert response.status_code == 200
    assert response.text == "fail"


def test_xunhupay_notify_signed_amount_mismatch_does_not_credit_wallet():
    created = client.post(
        "/api/v2/billing/orders",
        json={"user_id": "xunhu_mismatch_test", "package_id": "icebreaker", "contact_email": "buyer@example.com"},
    )
    assert created.status_code == 200
    order = created.json()["order"]
    assert order["price_cny"] == "99"

    fields = {
        "appid": "test-app-id",
        "transaction_id": "202605150001",
        "trade_order_id": order["order_id"],
        "status": "OD",
        "total_fee": "0.01",
    }
    fields["hash"] = sign_xunhu_fields(fields)

    notify = client.post("/api/v1/xunhupay/notify", data=fields)
    assert notify.status_code == 200
    assert notify.text == "fail"

    wallet = client.get("/api/v2/billing/wallet", params={"user_id": "xunhu_mismatch_test"})
    assert wallet.status_code == 200
    assert wallet.json()["wallet"]["credits"] == 60


def test_xunhupay_notify_signed_success_is_idempotent_recharge():
    created = client.post(
        "/api/v2/billing/orders",
        json={"user_id": "xunhu_success_test", "package_id": "icebreaker", "contact_email": "buyer@example.com"},
    )
    assert created.status_code == 200
    order = created.json()["order"]
    assert order["pay_url"].startswith("https://pay.example.test/")

    fields = {
        "appid": "test-app-id",
        "transaction_id": "202605150002",
        "trade_order_id": order["order_id"],
        "status": "OD",
        "total_fee": "99.00",
    }
    fields["hash"] = sign_xunhu_fields(fields)

    first = client.post("/api/v1/xunhupay/notify", data=fields)
    second = client.post("/api/v1/xunhupay/notify", data=fields)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.text == "success"
    assert second.text == "success"

    wallet = client.get("/api/v2/billing/wallet", params={"user_id": "xunhu_success_test"})
    assert wallet.status_code == 200
    assert wallet.json()["wallet"]["credits"] == 160


def test_legacy_alipay_notify_path_accepts_xunhupay_callback():
    created = client.post(
        "/api/v2/billing/orders",
        json={"user_id": "legacy_xunhu_test", "package_id": "icebreaker", "contact_email": "buyer@example.com"},
    )
    assert created.status_code == 200
    order = created.json()["order"]

    fields = {
        "appid": "test-app-id",
        "transaction_id": "202605150003",
        "trade_order_id": order["order_id"],
        "status": "OD",
        "total_fee": "99.00",
    }
    fields["hash"] = sign_xunhu_fields(fields)

    notify = client.post("/api/v1/alipay/notify", data=fields)
    assert notify.status_code == 200
    assert notify.text == "success"


def test_xunhupay_callback_redirects_to_pay_return():
    response = client.get("/api/v1/xunhupay/callback", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == "https://leadpulseagi.com/pay?payment=return"


def test_source_providers_expose_feedgrab_and_scrapling():
    response = client.get("/api/v2/sources/providers")
    assert response.status_code == 200
    providers = response.json()["providers"]
    assert providers["feedgrab"]["status"] == "ready"
    assert providers["feedgrab"]["ingest_endpoint"] == "/api/v2/sources/feedgrab/ingest"
    assert "xiaohongshu" in providers["feedgrab"]["supported_sources"]
    assert providers["feedgrab"]["xhs_modes"]["browser_login"] == "CHROME_CDP_LOGIN=true feedgrab login xhs"
    assert providers["scrapling"]["fetch_endpoint"] == "/api/v2/sources/scrapling/fetch"


def test_feedgrab_markdown_ingest_scores_qualified_meeting_signal():
    markdown = """---
title: Looking for a SaaS lead generation agency
source: reddit
url: https://reddit.example.test/r/SaaS/comments/lead-001
author: founder_ops
created_at: 2026-05-16T09:30:00Z
company: RemoteOps AI
---

# Looking for a SaaS lead generation agency

I am the founder and decision maker at RemoteOps AI. We need a partner this week
to build a predictable B2B lead generation pipeline for our outbound team.
Monthly budget is USD 8500 if the agency can deliver qualified meetings.
Email me at founder@example.com.
"""

    response = client.post(
        "/api/v2/sources/feedgrab/ingest",
        json={"documents": [{"markdown": markdown}], "min_budget_usd": 3000, "max_results": 5},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "feedgrab"
    assert payload["received"] == 1
    assert payload["qualified_signal_count"] == 1
    assert payload["meeting_ready_count"] == 1
    result = payload["qualified_meetings"][0]
    assert result["charge_event"] == "high_value"
    assert result["scoring"]["qualified"] is True
    assert result["lead"]["contact"]["email"] == "founder@example.com"
    assert result["lead"]["contact"]["company"] == "RemoteOps AI"


def test_feedgrab_markdown_ingest_dedupes_same_post_before_scoring():
    markdown = """---
title: Need outbound partner with qualified meetings
source: reddit
url: https://reddit.example.test/r/SaaS/comments/dedupe-001
author: founder_ops
created_at: 2026-05-16T10:30:00Z
company: DedupeOps AI
---

# Need outbound partner with qualified meetings

Founder here. Budget USD 9000 this month. We need qualified meetings, not random names.
Email me at buyer@example.com.
"""

    first = client.post(
        "/api/v2/sources/feedgrab/ingest",
        json={"documents": [{"markdown": markdown}], "min_budget_usd": 3000, "max_results": 5},
    )
    second = client.post(
        "/api/v2/sources/feedgrab/ingest",
        json={"documents": [{"markdown": markdown}], "min_budget_usd": 3000, "max_results": 5},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    first_payload = first.json()
    second_payload = second.json()
    assert first_payload["received"] == 1
    assert first_payload["queued"] == 1
    assert first_payload["deduped"] == 0
    assert first_payload["scored"] == 1
    assert first_payload["qualified_signal_count"] == 1
    assert second_payload["received"] == 1
    assert second_payload["queued"] == 0
    assert second_payload["deduped"] == 1
    assert second_payload["scored"] == 0
    assert second_payload["qualified_signal_count"] == 0
    assert second_payload["results"] == []


def test_public_source_batch_ranks_high_budget_above_noise():
    response = client.post(
        "/api/v2/sources/score",
        json={
            "min_budget_usd": 3000,
            "max_results": 3,
            "items": [
                {
                    "source": "hackernews",
                    "url": "https://news.example.test/item/1",
                    "title": "Need enterprise analytics vendor",
                    "body": (
                        "Founder here. We need to buy a B2B analytics SaaS this week. "
                        "Budget USD 12000 and I approve the spend. Email ceo@example.com."
                    ),
                },
                {
                    "source": "reddit",
                    "title": "Free tools for student project",
                    "body": "Student research only, no budget, maybe later.",
                },
                {
                    "source": "twitter",
                    "title": "Looking for cheap scraper",
                    "body": "Looking for a free or cheap tool, no budget.",
                },
            ],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["received"] == 3
    assert payload["qualified_signal_count"] == 1
    assert payload["results"][0]["item"]["source"] == "hackernews"
    assert payload["results"][0]["charge_event"] == "high_value"
    assert payload["results"][1]["charge_event"] == "noise"


def test_scrapling_fetch_endpoint_degrades_when_optional_dependency_missing():
    response = client.post(
        "/api/v2/sources/scrapling/fetch",
        json={"url": "https://example.com/thread", "mode": "fetcher", "min_budget_usd": 3000},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "scrapling"
    assert payload["results"][0]["charge_event"] == "noise"
    assert "Install with" in payload["results"][0]["item"]["body"]
