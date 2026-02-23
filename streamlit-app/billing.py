import os
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

import streamlit as st

try:
    import stripe
except Exception:  # pragma: no cover
    stripe = None

from database import get_user_subscription, update_user_subscription

PLAN_ORDER = {"free": 0, "pro": 1, "enterprise": 2}
ACTIVE_STATUSES = {"active", "trialing"}


def _env(key: str, default: str = "") -> str:
    return (os.getenv(key, default) or "").strip()


def app_base_url() -> str:
    return _env("APP_BASE_URL", "https://ai-huoke.streamlit.app").rstrip("/")


def plan_catalog() -> Dict[str, Dict[str, str]]:
    return {
        "pro": {
            "name": "Pro",
            "price_label": _env("PRICE_LABEL_PRO", "¥1999 / month"),
            "description": "Single team lead generation and outreach automation",
            "price_id": _env("STRIPE_PRICE_PRO"),
        },
        "enterprise": {
            "name": "Enterprise",
            "price_label": _env("PRICE_LABEL_ENTERPRISE", "¥5999 / month"),
            "description": "Multi-account, API access, and priority support",
            "price_id": _env("STRIPE_PRICE_ENTERPRISE"),
        },
    }


def _get_stripe_client():
    if stripe is None:
        raise RuntimeError("stripe SDK not installed")

    secret_key = _env("STRIPE_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("STRIPE_SECRET_KEY missing")

    stripe.api_key = secret_key
    return stripe


def normalize_user_subscription(user: Optional[Dict]) -> Dict:
    fallback = {
        "plan": "free",
        "subscription_status": "inactive",
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
        "checkout_session_id": "",
        "current_period_end": None,
    }
    if not user:
        return fallback
    out = fallback.copy()
    out.update({k: user.get(k, v) for k, v in fallback.items()})
    out["plan"] = (out.get("plan") or "free").lower()
    out["subscription_status"] = (out.get("subscription_status") or "inactive").lower()
    return out


def refresh_subscription_in_session(user: Optional[Dict]) -> Dict:
    normalized = normalize_user_subscription(user)
    if not user or not user.get("id"):
        return normalized

    latest = get_user_subscription(user["id"])
    merged = dict(user)
    merged.update(latest)
    merged["plan"] = (merged.get("plan") or "free").lower()
    merged["subscription_status"] = (merged.get("subscription_status") or "inactive").lower()
    st.session_state.user = merged
    return merged


def is_active_subscription(user: Optional[Dict]) -> bool:
    u = normalize_user_subscription(user)
    return u["plan"] != "free" and u["subscription_status"] in ACTIVE_STATUSES


def has_required_plan(user: Optional[Dict], minimum: str = "pro") -> bool:
    u = normalize_user_subscription(user)
    if u["subscription_status"] not in ACTIVE_STATUSES:
        return False
    return PLAN_ORDER.get(u["plan"], 0) >= PLAN_ORDER.get(minimum, 1)


def create_checkout_session(user: Dict, target_plan: str) -> str:
    target_plan = (target_plan or "").lower().strip()
    plans = plan_catalog()
    if target_plan not in plans:
        raise RuntimeError("Unsupported plan")

    price_id = plans[target_plan]["price_id"]
    if not price_id:
        raise RuntimeError(f"Missing Stripe price id for plan: {target_plan}")

    if not user or not user.get("id") or not user.get("email"):
        raise RuntimeError("Please login before checkout")

    stripe_client = _get_stripe_client()

    base = app_base_url()
    success_url = f"{base}/?page=billing&checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base}/?page=billing&checkout=cancel"

    session = stripe_client.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        customer_email=user["email"],
        client_reference_id=str(user["id"]),
        line_items=[{"price": price_id, "quantity": 1}],
        allow_promotion_codes=True,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": str(user["id"]),
            "plan": target_plan,
            "source": "streamlit-app",
        },
    )
    return session.url


def create_customer_portal_session(user: Dict) -> str:
    if not user or not user.get("id"):
        raise RuntimeError("Please login first")

    current = refresh_subscription_in_session(user)
    customer_id = current.get("stripe_customer_id")
    if not customer_id:
        raise RuntimeError("No Stripe customer id on account yet")

    stripe_client = _get_stripe_client()
    session = stripe_client.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{app_base_url()}/?page=billing",
    )
    return session.url


def _session_customer_email(session) -> str:
    details = session.get("customer_details") or {}
    email = details.get("email")
    if email:
        return str(email).strip().lower()
    return ""


def activate_checkout_session(user: Dict, session_id: str) -> Tuple[bool, str]:
    if not user or not user.get("id") or not user.get("email"):
        return False, "Please login first"
    if not session_id:
        return False, "Missing session_id"

    stripe_client = _get_stripe_client()

    session = stripe_client.checkout.Session.retrieve(
        session_id,
        expand=["subscription"],
    )

    if str(session.get("mode")) != "subscription":
        return False, "Checkout session is not a subscription"

    expected_email = str(user.get("email", "")).strip().lower()
    actual_email = _session_customer_email(session)
    if actual_email and expected_email and actual_email != expected_email:
        return False, "Checkout email mismatch"

    plan = ((session.get("metadata") or {}).get("plan") or "pro").lower()

    sub_obj = session.get("subscription")
    if isinstance(sub_obj, str):
        sub_obj = stripe_client.Subscription.retrieve(sub_obj)

    status = str((sub_obj or {}).get("status") or "inactive").lower()
    current_period_end = (sub_obj or {}).get("current_period_end")
    current_period_end_iso = None
    if current_period_end:
        current_period_end_iso = datetime.fromtimestamp(int(current_period_end), tz=timezone.utc).isoformat()

    updated = update_user_subscription(
        user_id=str(user["id"]),
        plan=plan,
        subscription_status=status,
        stripe_customer_id=session.get("customer") or "",
        stripe_subscription_id=(sub_obj or {}).get("id") or "",
        checkout_session_id=session.get("id") or session_id,
        current_period_end=current_period_end_iso,
    )

    if not updated:
        return False, "Failed to persist subscription. Please run SQL migration first."

    refresh_subscription_in_session(user)
    return True, f"Subscription activated: {plan} ({status})"


def process_checkout_query(user: Optional[Dict]) -> None:
    checkout_state = str(st.query_params.get("checkout", "")).strip().lower()
    if not checkout_state:
        return

    if checkout_state == "cancel":
        st.info("Checkout canceled")
        st.query_params.clear()
        return

    if checkout_state != "success":
        return

    if not user or not user.get("id"):
        st.warning("Please login first, then refresh this page")
        return

    session_id = str(st.query_params.get("session_id", "")).strip()
    if not session_id:
        st.error("Missing checkout session id")
        return

    key = f"checkout_processed_{session_id}"
    if st.session_state.get(key):
        return

    try:
        ok, msg = activate_checkout_session(user, session_id)
        if ok:
            st.success(msg)
        else:
            st.error(msg)
    except Exception as exc:
        st.error(f"Checkout verification failed: {exc}")

    st.session_state[key] = True
    st.query_params.clear()


def render_paywall(minimum_plan: str = "pro") -> None:
    st.warning("Your account is not on a paid subscription. Upgrade to continue.")
    if st.button("Go to Billing", key="paywall_go_billing", use_container_width=True):
        st.session_state.current_page = "billing"
        st.rerun()


def render_billing_page() -> None:
    st.markdown("## Billing & Subscription")

    try:
        from auth import get_current_user
    except Exception:
        get_current_user = None

    user = get_current_user() if get_current_user else st.session_state.get("user")
    if not user:
        st.info("Please login/register first, then subscribe.")
        return

    user = refresh_subscription_in_session(user)
    process_checkout_query(user)
    user = refresh_subscription_in_session(user)

    sub_status = normalize_user_subscription(user)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Current plan", sub_status.get("plan", "free").upper())
    with col2:
        st.metric("Status", sub_status.get("subscription_status", "inactive"))
    with col3:
        st.metric("Period end", (sub_status.get("current_period_end") or "-")[:19])

    st.markdown("---")

    plans = plan_catalog()
    p1, p2 = st.columns(2)

    with p1:
        st.markdown(f"### {plans['pro']['name']}")
        st.write(plans['pro']['price_label'])
        st.caption(plans['pro']['description'])
        if st.button("Subscribe Pro", key="sub_pro", use_container_width=True, type="primary"):
            try:
                checkout_url = create_checkout_session(user, "pro")
                st.link_button("Open Stripe Checkout", checkout_url, use_container_width=True)
            except Exception as exc:
                st.error(f"Create checkout failed: {exc}")

    with p2:
        st.markdown(f"### {plans['enterprise']['name']}")
        st.write(plans['enterprise']['price_label'])
        st.caption(plans['enterprise']['description'])
        if st.button("Subscribe Enterprise", key="sub_enterprise", use_container_width=True):
            try:
                checkout_url = create_checkout_session(user, "enterprise")
                st.link_button("Open Stripe Checkout", checkout_url, use_container_width=True)
            except Exception as exc:
                st.error(f"Create checkout failed: {exc}")

    if sub_status.get("stripe_customer_id"):
        st.markdown("---")
        if st.button("Manage Subscription (Stripe Portal)", key="stripe_portal", use_container_width=True):
            try:
                portal_url = create_customer_portal_session(user)
                st.link_button("Open Billing Portal", portal_url, use_container_width=True)
            except Exception as exc:
                st.error(f"Create portal failed: {exc}")
