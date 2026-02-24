import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import streamlit as st

try:
    import stripe
except Exception:  # pragma: no cover
    stripe = None

from config import APP_BASE_URL
from database import get_user_subscription, update_user_subscription

PLAN_ORDER = {"free": 0, "pro": 1, "enterprise": 2}
ACTIVE_STATUSES = {"active", "trialing"}


def _env(key: str, default: str = "") -> str:
    return (os.getenv(key, default) or "").strip()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _billing_dir() -> Path:
    return _project_root() / "data" / "billing"


def _mock_sessions_path() -> Path:
    return _billing_dir() / "mock_checkout_sessions.json"


def _ensure_mock_store() -> None:
    p = _mock_sessions_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        p.write_text("[]", encoding="utf-8")


def _load_mock_sessions() -> List[Dict]:
    _ensure_mock_store()
    p = _mock_sessions_path()
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("sessions"), list):
        return payload.get("sessions", [])
    return []


def _save_mock_sessions(sessions: List[Dict]) -> None:
    _ensure_mock_store()
    p = _mock_sessions_path()
    p.write_text(json.dumps(sessions, ensure_ascii=False, indent=2), encoding="utf-8")


def _upsert_mock_session(item: Dict) -> None:
    sessions = _load_mock_sessions()
    out: List[Dict] = []
    replaced = False
    for row in sessions:
        if str(row.get("id")) == str(item.get("id")):
            out.append(dict(item))
            replaced = True
        else:
            out.append(row)
    if not replaced:
        out.append(dict(item))
    _save_mock_sessions(out)


def _get_mock_session(session_id: str) -> Optional[Dict]:
    for row in _load_mock_sessions():
        if str(row.get("id")) == str(session_id):
            return dict(row)
    return None


def app_base_url() -> str:
    explicit = _env("APP_BASE_URL", "")
    if explicit:
        return explicit.rstrip("/")

    try:
        runtime_url = str(getattr(st.context, "url", "") or "").strip()
        if runtime_url:
            return runtime_url.split("?", 1)[0].rstrip("/")
    except Exception:
        pass

    if APP_BASE_URL:
        return str(APP_BASE_URL).rstrip("/")

    return "https://ai-huoke.streamlit.app"


def plan_catalog() -> Dict[str, Dict[str, str]]:
    return {
        "pro": {
            "name": "Pro",
            "price_label": _env("PRICE_LABEL_PRO", "CNY 1999 / month"),
            "description": "单团队自动化获客与触达",
            "price_id": _env("STRIPE_PRICE_PRO"),
        },
        "enterprise": {
            "name": "Enterprise",
            "price_label": _env("PRICE_LABEL_ENTERPRISE", "CNY 5999 / month"),
            "description": "多账号、多渠道和 API 能力",
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


def _plan_stripe_ready(target_plan: str) -> bool:
    target_plan = (target_plan or "").strip().lower()
    if not target_plan:
        return False
    plans = plan_catalog()
    if target_plan not in plans:
        return False
    has_secret = bool(_env("STRIPE_SECRET_KEY"))
    has_price = bool(plans[target_plan].get("price_id"))
    return stripe is not None and has_secret and has_price


def billing_mode(target_plan: str = "") -> str:
    target_plan = (target_plan or "").strip().lower()
    if target_plan:
        return "stripe" if _plan_stripe_ready(target_plan) else "mock"

    plans = plan_catalog()
    has_secret = bool(_env("STRIPE_SECRET_KEY"))
    has_all_prices = all(bool(plans[p].get("price_id")) for p in plans)
    if stripe is not None and has_secret and has_all_prices:
        return "stripe"
    return "mock"


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


def _create_mock_checkout_session(user: Dict, target_plan: str, reason: str = "") -> str:
    if not user or not user.get("id") or not user.get("email"):
        raise RuntimeError("请先登录后再开通套餐")

    session_id = f"mock_{uuid.uuid4().hex[:16]}"
    payload = {
        "id": session_id,
        "mode": "mock",
        "status": "open",
        "user_id": str(user.get("id")),
        "user_email": str(user.get("email", "")).strip().lower(),
        "plan": str(target_plan or "pro").lower(),
        "reason": reason or "mock_fallback",
        "created_at": _now_iso(),
        "activated_at": "",
    }
    _upsert_mock_session(payload)
    return f"{app_base_url()}/?page=billing&checkout=success&session_id={session_id}"


def create_checkout_session(user: Dict, target_plan: str) -> str:
    target_plan = (target_plan or "").lower().strip()
    plans = plan_catalog()
    if target_plan not in plans:
        raise RuntimeError("不支持的套餐")

    if not user or not user.get("id") or not user.get("email"):
        raise RuntimeError("请先登录后再开通套餐")

    if billing_mode(target_plan) != "stripe":
        return _create_mock_checkout_session(user, target_plan, reason="stripe_not_ready")

    try:
        stripe_client = _get_stripe_client()
        base = app_base_url()
        success_url = f"{base}/?page=billing&checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{base}/?page=billing&checkout=cancel"

        session = stripe_client.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            customer_email=user["email"],
            client_reference_id=str(user["id"]),
            line_items=[{"price": plans[target_plan]["price_id"], "quantity": 1}],
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
    except Exception as exc:
        return _create_mock_checkout_session(user, target_plan, reason=f"stripe_error:{exc}")


def create_customer_portal_session(user: Dict) -> str:
    if not user or not user.get("id"):
        raise RuntimeError("请先登录")

    current = refresh_subscription_in_session(user)
    if billing_mode() != "stripe":
        return f"{app_base_url()}/?page=billing&portal=mock"

    customer_id = current.get("stripe_customer_id")
    if not customer_id:
        return f"{app_base_url()}/?page=billing&portal=mock"

    try:
        stripe_client = _get_stripe_client()
        session = stripe_client.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{app_base_url()}/?page=billing",
        )
        return session.url
    except Exception:
        return f"{app_base_url()}/?page=billing&portal=mock"


def _session_customer_email(session) -> str:
    details = session.get("customer_details") or {}
    email = details.get("email")
    if email:
        return str(email).strip().lower()
    return ""


def _activate_mock_checkout_session(user: Dict, session_id: str) -> Tuple[bool, str]:
    session = _get_mock_session(session_id)
    if not session:
        return False, "未找到本地结账会话"

    expected_user = str(session.get("user_id", "")).strip()
    if expected_user and expected_user != str(user.get("id")):
        return False, "结账会话与当前账号不匹配"

    expected_email = str(session.get("user_email", "")).strip().lower()
    actual_email = str(user.get("email", "")).strip().lower()
    if expected_email and actual_email and expected_email != actual_email:
        return False, "结账邮箱与当前账号不一致"

    plan = str(session.get("plan") or "pro").strip().lower()
    period_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    updated = update_user_subscription(
        user_id=str(user["id"]),
        plan=plan,
        subscription_status="active",
        stripe_customer_id="",
        stripe_subscription_id="",
        checkout_session_id=session_id,
        current_period_end=period_end,
    )
    if not updated:
        return False, "订阅状态写入失败，请检查数据库配置"

    session["status"] = "completed"
    session["activated_at"] = _now_iso()
    _upsert_mock_session(session)

    refresh_subscription_in_session(user)
    return True, f"订阅已激活（模拟模式）：{plan}"


def activate_checkout_session(user: Dict, session_id: str) -> Tuple[bool, str]:
    if not user or not user.get("id") or not user.get("email"):
        return False, "请先登录"
    if not session_id:
        return False, "缺少 session_id"

    if str(session_id).startswith("mock_"):
        return _activate_mock_checkout_session(user, session_id)

    if billing_mode() != "stripe":
        return False, "当前未启用 Stripe，无法校验该会话"

    stripe_client = _get_stripe_client()

    try:
        session = stripe_client.checkout.Session.retrieve(
            session_id,
            expand=["subscription"],
        )
    except Exception as exc:
        return False, f"Stripe 会话读取失败: {exc}"

    if str(session.get("mode")) != "subscription":
        return False, "该会话不是订阅类型"

    expected_email = str(user.get("email", "")).strip().lower()
    actual_email = _session_customer_email(session)
    if actual_email and expected_email and actual_email != expected_email:
        return False, "结账邮箱与当前账号不一致"

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
        return False, "订阅状态写入失败，请先执行数据库迁移"

    refresh_subscription_in_session(user)
    return True, f"订阅已激活：{plan}（{status}）"


def process_checkout_query(user: Optional[Dict]) -> None:
    portal_state = str(st.query_params.get("portal", "")).strip().lower()
    if portal_state == "mock":
        st.info("当前为模拟订阅模式：未配置 Stripe Portal。")
        st.query_params.clear()
        return

    checkout_state = str(st.query_params.get("checkout", "")).strip().lower()
    if not checkout_state:
        return

    if checkout_state == "cancel":
        st.info("已取消支付")
        st.query_params.clear()
        return

    if checkout_state != "success":
        return

    if not user or not user.get("id"):
        st.warning("请先登录，再刷新页面")
        return

    session_id = str(st.query_params.get("session_id", "")).strip()
    if not session_id:
        st.error("缺少 checkout session_id")
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
        st.error(f"支付回调校验失败: {exc}")

    st.session_state[key] = True
    st.query_params.clear()


def render_paywall(minimum_plan: str = "pro") -> None:
    st.warning("当前账号未开通付费套餐，请先升级。")
    if st.button("前往订阅页", key="paywall_go_billing", use_container_width=True):
        st.session_state.current_page = "billing"
        st.rerun()


def render_billing_page() -> None:
    st.markdown("## 订阅与计费")

    try:
        from auth import get_current_user
    except Exception:
        get_current_user = None

    user = get_current_user() if get_current_user else st.session_state.get("user")
    if not user:
        st.info("请先登录/注册，再开通套餐。")
        return

    user = refresh_subscription_in_session(user)
    process_checkout_query(user)
    user = refresh_subscription_in_session(user)

    sub_status = normalize_user_subscription(user)
    plans = plan_catalog()
    mode = billing_mode()

    if mode == "mock":
        st.info("当前运行在模拟订阅模式（Mock Billing）：无需 Stripe 配置也可完整走通下单和开通流程。")
    else:
        st.success("当前运行在 Stripe 实付模式。")

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("当前套餐", sub_status.get("plan", "free").upper())
    with col2:
        st.metric("状态", sub_status.get("subscription_status", "inactive"))
    with col3:
        st.metric("到期时间", (sub_status.get("current_period_end") or "-")[:19])

    st.markdown("---")

    p1, p2 = st.columns(2)

    with p1:
        st.markdown(f"### {plans['pro']['name']}")
        st.write(plans["pro"]["price_label"])
        st.caption(plans["pro"]["description"])
        st.caption(f"支付模式: {billing_mode('pro')}")
        if st.button("开通 Pro", key="sub_pro", use_container_width=True, type="primary"):
            try:
                checkout_url = create_checkout_session(user, "pro")
                if "session_id=mock_" in checkout_url:
                    st.link_button("进入模拟结账并激活", checkout_url, use_container_width=True)
                else:
                    st.link_button("前往 Stripe Checkout", checkout_url, use_container_width=True)
            except Exception as exc:
                st.error(f"创建结账会话失败: {exc}")

    with p2:
        st.markdown(f"### {plans['enterprise']['name']}")
        st.write(plans["enterprise"]["price_label"])
        st.caption(plans["enterprise"]["description"])
        st.caption(f"支付模式: {billing_mode('enterprise')}")
        if st.button("开通 Enterprise", key="sub_enterprise", use_container_width=True):
            try:
                checkout_url = create_checkout_session(user, "enterprise")
                if "session_id=mock_" in checkout_url:
                    st.link_button("进入模拟结账并激活", checkout_url, use_container_width=True)
                else:
                    st.link_button("前往 Stripe Checkout", checkout_url, use_container_width=True)
            except Exception as exc:
                st.error(f"创建结账会话失败: {exc}")

    if sub_status.get("plan") != "free":
        st.markdown("---")
        if st.button("管理订阅", key="stripe_portal", use_container_width=True):
            try:
                portal_url = create_customer_portal_session(user)
                if "portal=mock" in portal_url:
                    st.info("当前为模拟模式，没有 Stripe Portal。你可以直接在本页切换套餐。")
                else:
                    st.link_button("打开 Stripe Portal", portal_url, use_container_width=True)
            except Exception as exc:
                st.error(f"打开订阅管理失败: {exc}")
