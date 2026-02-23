import io
from typing import Dict, List

import pandas as pd
import streamlit as st

from auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    init_session_state,
    login_user,
    logout_user,
    verify_password,
)
from billing import (
    has_required_plan,
    process_checkout_query,
    refresh_subscription_in_session,
    render_billing_page,
    render_paywall,
)
from database import (
    add_lead,
    create_user,
    get_leads,
    get_stats,
    get_user_by_email,
    init_supabase,
    update_lead,
)


st.set_page_config(
    page_title="GuestSeek - Study Abroad Lead Engine",
    page_icon="*",
    layout="wide",
)


def _db_ready() -> bool:
    try:
        return init_supabase()
    except Exception:
        return False


def _user_payload(user: Dict) -> Dict:
    return {
        "id": user.get("id", ""),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "company": user.get("company", ""),
        "plan": user.get("plan", "free"),
        "subscription_status": user.get("subscription_status", "inactive"),
        "stripe_customer_id": user.get("stripe_customer_id", ""),
        "stripe_subscription_id": user.get("stripe_subscription_id", ""),
        "current_period_end": user.get("current_period_end"),
    }


def render_login_register() -> None:
    st.title("Study-Abroad AI Lead Gen SaaS")
    st.caption("Acquire qualified student leads and charge B2B subscriptions")

    login_tab, register_tab = st.tabs(["Login", "Register"])

    with login_tab:
        with st.form("login_form", clear_on_submit=False):
            email = st.text_input("Email", key="login_email")
            password = st.text_input("Password", type="password", key="login_password")
            submitted = st.form_submit_button("Sign in", use_container_width=True, type="primary")

        if submitted:
            if not email or not password:
                st.error("Email and password are required.")
                return
            user = get_user_by_email(email.strip().lower())
            if not user:
                st.error("Account not found.")
                return
            if not verify_password(password, user.get("password_hash", "")):
                st.error("Invalid password.")
                return

            token = create_access_token({"sub": user["id"], "email": user["email"]})
            login_user(_user_payload(user), token)
            st.success("Signed in.")
            st.rerun()

    with register_tab:
        with st.form("register_form", clear_on_submit=False):
            name = st.text_input("Name", key="reg_name")
            company = st.text_input("Institution", key="reg_company")
            email = st.text_input("Email", key="reg_email")
            password = st.text_input("Password", type="password", key="reg_password")
            password_confirm = st.text_input("Confirm password", type="password", key="reg_password_confirm")
            submitted = st.form_submit_button("Create account", use_container_width=True)

        if submitted:
            if not all([name, company, email, password, password_confirm]):
                st.error("All fields are required.")
                return
            if password != password_confirm:
                st.error("Passwords do not match.")
                return
            if len(password) < 8:
                st.error("Password must be at least 8 characters.")
                return

            existing = get_user_by_email(email.strip().lower())
            if existing:
                st.error("This email is already registered.")
                return

            create_user(
                {
                    "name": name.strip(),
                    "company": company.strip(),
                    "email": email.strip().lower(),
                    "password_hash": get_password_hash(password),
                    "plan": "free",
                    "subscription_status": "inactive",
                }
            )
            st.success("Account created. Please sign in.")


def render_overview(user: Dict) -> None:
    st.markdown("## Overview")

    user = refresh_subscription_in_session(user)
    stats = get_stats(user.get("id"))

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Plan", (user.get("plan") or "free").upper())
    with c2:
        st.metric("Subscription", user.get("subscription_status") or "inactive")
    with c3:
        st.metric("Total Leads", stats.get("total_leads", 0))
    with c4:
        st.metric("Emails Sent", stats.get("total_emails", 0))

    st.markdown("---")
    st.write("Focus this product on study-abroad vertical lead acquisition:")
    st.write("1. Capture social signals from comments/posts.")
    st.write("2. Score purchase intent and keep only high-intent leads.")
    st.write("3. Generate personalized outreach and handoff to SDR.")
    st.write("4. Track funnel conversion and CAC/ROI by channel.")


def _safe_value(row: Dict, keys: List[str]) -> str:
    for key in keys:
        val = row.get(key)
        if val is not None and str(val).strip() != "":
            return str(val).strip()
    return ""


def render_leads(user: Dict) -> None:
    st.markdown("## Lead Pool")

    with st.form("add_lead_form", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)
        with c1:
            name = st.text_input("Name", key="lead_name")
            email = st.text_input("Email", key="lead_email")
        with c2:
            phone = st.text_input("Phone / WeChat", key="lead_phone")
            status = st.selectbox("Status", ["new", "contacted", "qualified", "converted", "lost"], key="lead_status")
        with c3:
            source = st.text_input("Source", value="xiaohongshu", key="lead_source")
            score = st.slider("Intent score", min_value=0, max_value=100, value=70, key="lead_score")

        notes = st.text_area("Notes", height=110, key="lead_notes")
        submit = st.form_submit_button("Add lead", type="primary", use_container_width=True)

    if submit:
        if not name.strip():
            st.error("Lead name is required.")
        else:
            payload = {
                "user_id": user["id"],
                "name": name.strip(),
                "email": email.strip(),
                "phone": phone.strip(),
                "status": status,
                "notes": f"source={source.strip()} | score={score}\n{notes.strip()}",
            }
            try:
                add_lead(payload)
                st.success("Lead added.")
                st.rerun()
            except Exception as exc:
                st.error(f"Add lead failed: {exc}")

    leads = get_leads(user.get("id"))
    if not leads:
        st.info("No leads yet.")
        return

    st.markdown(f"### {len(leads)} leads")
    df = pd.DataFrame(leads)
    columns = [c for c in ["name", "email", "phone", "status", "created_at", "notes"] if c in df.columns]
    st.dataframe(df[columns], use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### Quick status update")

    lead_map = {f"{x.get('name', 'Unknown')} | {x.get('email', '')}": x for x in leads}
    selected_label = st.selectbox("Select lead", list(lead_map.keys()), key="lead_pick")
    selected = lead_map[selected_label]
    new_status = st.selectbox("New status", ["new", "contacted", "qualified", "converted", "lost"], key="lead_new_status")

    if st.button("Update status", key="update_status", use_container_width=True):
        ok = update_lead(selected["id"], {"status": new_status})
        if ok:
            st.success("Status updated.")
            st.rerun()
        else:
            st.error("Status update failed.")


def render_acquisition(user: Dict) -> None:
    st.markdown("## Acquisition Ingestion")
    st.caption("Import social comments/posts as sales-ready leads")

    with st.expander("Single lead capture", expanded=True):
        with st.form("single_capture", clear_on_submit=True):
            content = st.text_area("Comment or post text", key="single_content")
            author = st.text_input("Author", key="single_author")
            contact = st.text_input("Contact hint", key="single_contact")
            score = st.slider("Intent confidence", 0, 100, 75, key="single_score")
            submit_single = st.form_submit_button("Save lead", use_container_width=True, type="primary")

        if submit_single:
            if not author.strip() and not content.strip():
                st.error("Author or content is required.")
            else:
                payload = {
                    "user_id": user["id"],
                    "name": author.strip() or "Unknown social user",
                    "email": "",
                    "phone": contact.strip(),
                    "status": "new",
                    "notes": f"source=social_comment | score={score}\n{content.strip()}",
                }
                try:
                    add_lead(payload)
                    st.success("Lead captured.")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Save failed: {exc}")

    st.markdown("---")
    st.markdown("### CSV bulk import")
    uploaded = st.file_uploader("Upload CSV", type=["csv"], key="bulk_csv")

    if uploaded is not None:
        raw_bytes = uploaded.getvalue()
        df = None
        for enc in ["utf-8", "gbk", "utf-8-sig"]:
            try:
                df = pd.read_csv(io.BytesIO(raw_bytes), encoding=enc)
                break
            except Exception:
                continue

        if df is None:
            st.error("Could not parse CSV. Try utf-8 or gbk encoded file.")
            return

        st.write("Detected columns:", ", ".join(df.columns.astype(str).tolist()))
        st.dataframe(df.head(15), use_container_width=True, hide_index=True)

        if st.button("Import CSV into lead pool", key="import_csv", type="primary", use_container_width=True):
            ok_count = 0
            fail_count = 0

            for row in df.fillna("").to_dict(orient="records"):
                name = _safe_value(row, ["name", "author", "user", "nickname"])
                email = _safe_value(row, ["email", "mail"])
                phone = _safe_value(row, ["phone", "wechat", "contact"])
                content = _safe_value(row, ["content", "comment", "text", "post", "title"])
                source = _safe_value(row, ["platform", "source"])
                score = _safe_value(row, ["score", "intent_score", "confidence"]) or "70"

                lead = {
                    "user_id": user["id"],
                    "name": name or "Unknown social user",
                    "email": email,
                    "phone": phone,
                    "status": "new",
                    "notes": f"source={source or 'import'} | score={score}\n{content}",
                }

                try:
                    add_lead(lead)
                    ok_count += 1
                except Exception:
                    fail_count += 1

            st.success(f"Imported leads: {ok_count}")
            if fail_count:
                st.warning(f"Failed rows: {fail_count}")


def main() -> None:
    init_session_state()

    if not _db_ready():
        st.error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY.")
        st.stop()

    user = get_current_user()
    if not user:
        render_login_register()
        st.stop()

    try:
        process_checkout_query(user)
    except Exception as exc:
        st.error(f"Checkout sync error: {exc}")

    user = refresh_subscription_in_session(get_current_user() or user)

    with st.sidebar:
        st.markdown("## GuestSeek")
        st.caption("B2B SaaS for study-abroad institutions")
        st.write(f"Account: {user.get('email', '-')}")
        st.write(f"Plan: {(user.get('plan') or 'free').upper()} | {user.get('subscription_status') or 'inactive'}")

        page = st.radio(
            "Workspace",
            ["Overview", "Leads", "Acquisition", "Billing", "Logout"],
            key="workspace_nav",
        )

    if page == "Logout":
        logout_user()
        st.rerun()

    if page in {"Leads", "Acquisition"} and not has_required_plan(user, minimum="pro"):
        render_paywall(minimum_plan="pro")
        st.stop()

    if page == "Overview":
        render_overview(user)
    elif page == "Leads":
        render_leads(user)
    elif page == "Acquisition":
        render_acquisition(user)
    elif page == "Billing":
        render_billing_page()


if __name__ == "__main__":
    main()
