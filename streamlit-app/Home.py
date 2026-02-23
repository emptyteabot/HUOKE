import hashlib
import io
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

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
    page_title="GuestSeek - AI Study Abroad Lead SaaS",
    page_icon="*",
    layout="wide",
)

st.markdown(
    """
<style>
div.block-container {max-width: 1180px; padding-top: 1rem;}
.gs-card {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px 16px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.gs-hero {
    border: 1px solid #cbd5e1;
    border-radius: 16px;
    padding: 16px;
    background: radial-gradient(circle at 0% 0%, #eff6ff 0%, #ffffff 50%);
}
</style>
""",
    unsafe_allow_html=True,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OPENCLAW_DIR = PROJECT_ROOT / "data" / "openclaw"
EXPORTS_DIR = PROJECT_ROOT / "data" / "exports"

COMPETITOR_KEYWORDS = [
    "留学机构",
    "留学中介",
    "留学顾问",
    "工作室",
    "欢迎咨询",
    "私信我",
    "加v",
    "微信咨询",
    "服务报价",
    "申请服务",
    "代办",
]


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


def _safe_str(row: Dict, keys: List[str]) -> str:
    for key in keys:
        val = row.get(key)
        if val is None:
            continue
        text = str(val).strip()
        if text and text.lower() != "nan":
            return text
    return ""


def _safe_int(value, default: int = 0) -> int:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    if text.upper() in {"S", "A", "B", "C"}:
        return {"S": 92, "A": 78, "B": 64, "C": 48}[text.upper()]
    m = re.findall(r"\d+", text)
    if not m:
        return default
    try:
        return int(m[0])
    except Exception:
        return default


def _is_competitor(author: str, content: str) -> bool:
    text = f"{author} {content}".lower()
    return any(kw.lower() in text for kw in COMPETITOR_KEYWORDS)


def _read_csv_any(path: Path) -> pd.DataFrame:
    raw = path.read_bytes()
    for enc in ["utf-8", "utf-8-sig", "gbk", "gb18030"]:
        try:
            return pd.read_csv(io.BytesIO(raw), encoding=enc)
        except Exception:
            continue
    return pd.DataFrame()


def _latest_file(base: Path, pattern: str) -> Optional[Path]:
    files = sorted(base.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def _load_external_sources() -> Tuple[pd.DataFrame, List[str]]:
    frames: List[pd.DataFrame] = []
    used_files: List[str] = []

    candidates: List[Path] = [
        OPENCLAW_DIR / "openclaw_leads_latest.csv",
        OPENCLAW_DIR / "openclaw_leads_latest.json",
        EXPORTS_DIR / "high_value_leads_latest.csv",
        EXPORTS_DIR / "high_value_leads_latest.json",
    ]

    latest_csv = _latest_file(EXPORTS_DIR, "high_value_leads_*.csv")
    latest_json = _latest_file(EXPORTS_DIR, "high_value_leads_*.json")
    if latest_csv:
        candidates.append(latest_csv)
    if latest_json:
        candidates.append(latest_json)

    seen = set()
    for fp in candidates:
        if not fp.exists():
            continue
        fpr = str(fp.resolve())
        if fpr in seen:
            continue
        seen.add(fpr)

        if fp.suffix.lower() == ".csv":
            df = _read_csv_any(fp)
        else:
            try:
                obj = json.loads(fp.read_text(encoding="utf-8"))
                if isinstance(obj, dict):
                    obj = obj.get("data", [])
                df = pd.DataFrame(obj if isinstance(obj, list) else [])
            except Exception:
                df = pd.DataFrame()

        if df.empty:
            continue

        df = df.fillna("")
        df["__source_file"] = fp.name
        frames.append(df)
        used_files.append(fp.name)

    if not frames:
        return pd.DataFrame(), []

    return pd.concat(frames, ignore_index=True), used_files


def _normalize_external_df(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()

    rows: List[Dict] = []
    for row in df.to_dict(orient="records"):
        platform = _safe_str(row, ["platform", "source"]) or "xhs"
        keyword = _safe_str(row, ["keyword", "query"])
        author = _safe_str(row, ["author", "name", "nickname", "user"]) or "Unknown"
        author_url = _safe_str(row, ["author_url", "profile_url", "user_url"])
        content = _safe_str(row, ["content", "text", "comment", "evidence_text", "title"])
        post_url = _safe_str(row, ["note_url", "post_url", "link", "url"])
        source_url = _safe_str(row, ["source_url", "search_url", "origin_url"])
        contact = _safe_str(row, ["phone", "wechat", "contact", "email"])
        score = _safe_int(row.get("score"), default=_safe_int(row.get("confidence"), default=70))
        grade = _safe_str(row, ["grade"])
        collected_at = _safe_str(row, ["collected_at", "created_at", "timestamp"])
        source_file = _safe_str(row, ["__source_file"])

        body = f"{platform}|{author}|{post_url}|{content[:60]}"
        external_id = hashlib.md5(body.encode("utf-8", errors="ignore")).hexdigest()[:16]

        rows.append(
            {
                "platform": platform,
                "keyword": keyword,
                "author": author,
                "author_url": author_url,
                "content": content,
                "post_url": post_url,
                "source_url": source_url,
                "contact": contact,
                "score": score,
                "grade": grade,
                "collected_at": collected_at,
                "source_file": source_file,
                "is_competitor": _is_competitor(author, content),
                "external_id": external_id,
            }
        )

    out = pd.DataFrame(rows)
    out = out.drop_duplicates(subset=["external_id"])
    out = out.sort_values(by=["score"], ascending=False)
    return out


def _sync_openclaw_leads(user_id: str, min_score: int, exclude_competitors: bool, limit: int = 300) -> Dict:
    raw, files = _load_external_sources()
    normalized = _normalize_external_df(raw)

    if normalized.empty:
        return {
            "files": files,
            "total": 0,
            "imported": 0,
            "skipped_competitor": 0,
            "skipped_score": 0,
            "skipped_duplicate": 0,
        }

    existing = get_leads(user_id)
    existing_ids = set()
    for ld in existing:
        notes = str(ld.get("notes", ""))
        m = re.search(r"external_id=([a-f0-9]{16})", notes)
        if m:
            existing_ids.add(m.group(1))

    imported = 0
    skipped_competitor = 0
    skipped_score = 0
    skipped_duplicate = 0

    for row in normalized.head(limit).to_dict(orient="records"):
        if row["score"] < min_score:
            skipped_score += 1
            continue
        if exclude_competitors and bool(row["is_competitor"]):
            skipped_competitor += 1
            continue
        if row["external_id"] in existing_ids:
            skipped_duplicate += 1
            continue

        notes = (
            f"source={row['platform']} | score={row['score']} | keyword={row['keyword']}\n"
            f"post_url={row['post_url']}\n"
            f"author_url={row['author_url']}\n"
            f"source_url={row['source_url']}\n"
            f"collected_at={row['collected_at']}\n"
            f"external_id={row['external_id']}\n"
            f"{row['content']}"
        )

        add_lead(
            {
                "user_id": user_id,
                "name": row["author"],
                "email": "",
                "phone": row["contact"],
                "status": "new",
                "notes": notes,
            }
        )
        existing_ids.add(row["external_id"])
        imported += 1

    return {
        "files": files,
        "total": int(len(normalized)),
        "imported": imported,
        "skipped_competitor": skipped_competitor,
        "skipped_score": skipped_score,
        "skipped_duplicate": skipped_duplicate,
    }


def render_login_register() -> None:
    st.title("Study-Abroad AI Lead Gen SaaS")
    st.caption("OpenClaw for prospecting + SaaS for conversion and subscription")

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
    user = refresh_subscription_in_session(user)
    stats = get_stats(user.get("id"))

    st.markdown("## Product Command Center")
    st.markdown(
        """
<div class="gs-hero">
  <h3 style="margin:0;">AI获客主链路</h3>
  <p style="margin:.4rem 0 0 0;">OpenClaw负责第一步找潜客，SaaS负责筛选、沉淀、触达与转化。</p>
</div>
""",
        unsafe_allow_html=True,
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Plan", (user.get("plan") or "free").upper())
    c2.metric("Subscription", user.get("subscription_status") or "inactive")
    c3.metric("Leads", stats.get("total_leads", 0))
    c4.metric("Emails", stats.get("total_emails", 0))

    st.markdown("---")
    st.markdown("1. OpenClaw browsing comments/posts -> collect prospects")
    st.markdown("2. Filter competitors/institutions + score intent")
    st.markdown("3. Add to lead pool and trigger outreach workflow")
    st.markdown("4. Track funnel and upsell paid subscription")


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
            source = st.text_input("Source", value="xhs", key="lead_source")
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
    cols = [c for c in ["name", "email", "phone", "status", "created_at", "notes"] if c in df.columns]
    st.dataframe(df[cols], use_container_width=True, hide_index=True)

    st.markdown("---")
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
    st.markdown("## OpenClaw Prospecting (Step 1)")
    st.caption("Use OpenClaw to read social posts/comments. This page ingests and filters those leads.")

    raw_df, source_files = _load_external_sources()
    norm_df = _normalize_external_df(raw_df)

    with st.container(border=True):
        c1, c2, c3 = st.columns(3)
        exclude_comp = c1.checkbox("Exclude competitor institutions", value=True, key="oc_exclude_comp")
        min_score = c2.slider("Min intent score", 0, 100, 60, key="oc_min_score")
        import_limit = c3.slider("Max rows per sync", 20, 1000, 300, step=20, key="oc_import_limit")

        if st.button("Sync latest OpenClaw leads into Lead Pool", type="primary", use_container_width=True, key="sync_openclaw"):
            result = _sync_openclaw_leads(
                user_id=user["id"],
                min_score=min_score,
                exclude_competitors=exclude_comp,
                limit=import_limit,
            )
            st.success(f"Imported: {result['imported']} / {result['total']}")
            st.info(
                f"Skipped -> competitor: {result['skipped_competitor']}, low-score: {result['skipped_score']}, duplicate: {result['skipped_duplicate']}"
            )
            if result["files"]:
                st.caption("Data sources: " + ", ".join(result["files"]))

    st.markdown("---")
    if norm_df.empty:
        st.warning("No local OpenClaw/export lead files detected. Run OpenClaw acquisition first or upload CSV below.")
    else:
        st.markdown(f"### External leads detected: {len(norm_df)}")
        if source_files:
            st.caption("Detected files: " + ", ".join(source_files))
        view_cols = [
            "platform",
            "keyword",
            "author",
            "score",
            "is_competitor",
            "post_url",
            "author_url",
            "content",
            "source_file",
        ]
        st.dataframe(norm_df[view_cols].head(120), use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### Manual / CSV fallback import")

    with st.expander("Single lead capture", expanded=False):
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

    uploaded = st.file_uploader("Upload CSV", type=["csv"], key="bulk_csv")
    if uploaded is not None:
        raw_bytes = uploaded.getvalue()
        df = None
        for enc in ["utf-8", "utf-8-sig", "gbk", "gb18030"]:
            try:
                df = pd.read_csv(io.BytesIO(raw_bytes), encoding=enc)
                break
            except Exception:
                continue

        if df is None:
            st.error("Could not parse CSV. Try utf-8/gbk file.")
            return

        st.write("Detected columns:", ", ".join(df.columns.astype(str).tolist()))
        st.dataframe(df.head(20), use_container_width=True, hide_index=True)

        if st.button("Import CSV into lead pool", key="import_csv", type="primary", use_container_width=True):
            ok_count = 0
            fail_count = 0
            for row in df.fillna("").to_dict(orient="records"):
                name = _safe_str(row, ["name", "author", "user", "nickname"]) or "Unknown social user"
                content = _safe_str(row, ["content", "comment", "text", "post", "title"])
                source = _safe_str(row, ["platform", "source"]) or "import"
                score = _safe_int(row.get("score"), default=_safe_int(row.get("intent_score"), 70))
                lead = {
                    "user_id": user["id"],
                    "name": name,
                    "email": _safe_str(row, ["email", "mail"]),
                    "phone": _safe_str(row, ["phone", "wechat", "contact"]),
                    "status": "new",
                    "notes": f"source={source} | score={score}\n{content}",
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
        st.error("Database initialization failed.")
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
        st.caption("Study-abroad vertical B2B SaaS")
        st.write(f"Account: {user.get('email', '-')}")
        st.write(f"Plan: {(user.get('plan') or 'free').upper()} | {user.get('subscription_status') or 'inactive'}")

        page = st.radio(
            "Workspace",
            ["Overview", "Acquisition", "Leads", "Billing", "Logout"],
            key="workspace_nav",
        )

    if page == "Logout":
        logout_user()
        st.rerun()

    # Soft paywall: allow usage in trial mode, keep billing upgrade path.
    if page in {"Leads", "Acquisition"} and not has_required_plan(user, minimum="pro"):
        st.info("Trial mode active. Upgrade to Pro for full automation and larger quotas.")

    if page == "Overview":
        render_overview(user)
    elif page == "Acquisition":
        render_acquisition(user)
    elif page == "Leads":
        render_leads(user)
    elif page == "Billing":
        render_billing_page()


if __name__ == "__main__":
    main()
