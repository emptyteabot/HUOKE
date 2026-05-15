import base64
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives import serialization

from leadpulse_m2m import billing as billing_module
from leadpulse_m2m.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_billing_store(tmp_path, monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    fake_settings = SimpleNamespace(
        site_url="https://leadpulseagi.com",
        service_name="LeadPulse M2M Acquisition Gateway",
        min_budget_usd=3000.0,
        default_timezone="Asia/Shanghai",
        discovery_duration_minutes=30,
        booking_store_path=str(tmp_path / "bookings.jsonl"),
        billing_store_path=str(tmp_path / "billing.sqlite"),
        booking_webhook_url="",
        api_key="",
        free_trial_credits=60,
        noise_charge_credits=1,
        high_value_charge_credits=50,
        refund_credits=50,
        alipay_app_id="test-app-id",
        alipay_public_key=public_pem,
        alipay_app_private_key=private_pem,
        alipay_notify_url="https://leadpulseagi.com/api/v1/alipay/notify",
        alipay_return_url="https://leadpulseagi.com/api/v1/alipay/callback",
        alipay_order_subject="LeadPulse LP Coin Recharge",
    )

    monkeypatch.setattr(billing_module, "settings", fake_settings)
    yield


def sign_alipay_fields(fields: dict[str, str]) -> str:
    content = billing_module._canonical_content(fields, {"sign", "sign_type"})
    signature = billing_module._private_key().sign(
        content.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode("ascii")


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


def test_alipay_notify_invalid_signature_returns_fail():
    response = client.post(
        "/api/v1/alipay/notify",
        data={
            "out_trade_no": "lp_order_missing",
            "trade_status": "TRADE_SUCCESS",
            "total_amount": "99.00",
            "sign": "bad-signature",
        },
    )
    assert response.status_code == 200
    assert response.text == "fail"


def test_alipay_notify_signed_amount_mismatch_does_not_credit_wallet():
    created = client.post(
        "/api/v2/billing/orders",
        json={"user_id": "alipay_mismatch_test", "package_id": "icebreaker"},
    )
    assert created.status_code == 200
    order = created.json()["order"]
    assert order["price_cny"] == "99"

    fields = {
        "app_id": "test-app-id",
        "charset": "utf-8",
        "sign_type": "RSA2",
        "trade_no": "202605150001",
        "out_trade_no": order["order_id"],
        "trade_status": "TRADE_SUCCESS",
        "total_amount": "0.01",
    }
    fields["sign"] = sign_alipay_fields(fields)

    notify = client.post("/api/v1/alipay/notify", data=fields)
    assert notify.status_code == 200
    assert notify.text == "fail"

    wallet = client.get("/api/v2/billing/wallet", params={"user_id": "alipay_mismatch_test"})
    assert wallet.status_code == 200
    assert wallet.json()["wallet"]["credits"] == 60


def test_alipay_notify_signed_success_is_idempotent_recharge():
    created = client.post(
        "/api/v2/billing/orders",
        json={"user_id": "alipay_success_test", "package_id": "icebreaker"},
    )
    assert created.status_code == 200
    order = created.json()["order"]
    assert order["pay_url"].startswith("https://openapi.alipay.com/gateway.do?")

    fields = {
        "app_id": "test-app-id",
        "charset": "utf-8",
        "sign_type": "RSA2",
        "trade_no": "202605150002",
        "out_trade_no": order["order_id"],
        "trade_status": "TRADE_SUCCESS",
        "total_amount": "99.00",
    }
    fields["sign"] = sign_alipay_fields(fields)

    first = client.post("/api/v1/alipay/notify", data=fields)
    second = client.post("/api/v1/alipay/notify", data=fields)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.text == "success"
    assert second.text == "success"

    wallet = client.get("/api/v2/billing/wallet", params={"user_id": "alipay_success_test"})
    assert wallet.status_code == 200
    assert wallet.json()["wallet"]["credits"] == 160
