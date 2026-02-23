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

HIGH_INTENT_KEYWORDS = [
    "求推荐",
    "求助",
    "请问",
    "怎么办",
    "怎么选",
    "选校",
    "申请",
    "文书",
    "中介",
    "offer",
    "雅思",
    "托福",
    "预算",
    "费用",
    "签证",
    "gpa",
    "deadline",
    "ddl",
    "跨专业",
]

TARGET_LEAD_HINTS = [
    "求推荐",
    "求助",
    "请问",
    "急",
    "纠结",
    "预算",
    "选校",
    "申请",
    "文书",
    "中介",
    "offer",
    "雅思",
    "托福",
    "gpa",
    "签证",
]

MOJIBAKE_TOKENS = ["�", "?"]


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


def _text_quality_score(text: str) -> int:
    if not text:
        return -10**9
    cjk_count = len(re.findall(r"[\u4e00-\u9fff]", text))
    bad_count = sum(text.count(t) for t in MOJIBAKE_TOKENS)
    return cjk_count * 4 - bad_count * 6 + min(len(text), 500) // 20


def _repair_mojibake(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""

    best = raw
    best_score = _text_quality_score(raw)

    for enc in ("gb18030", "gbk"):
        try:
            candidate = raw.encode(enc, errors="ignore").decode("utf-8", errors="ignore").strip()
        except Exception:
            continue
        score = _text_quality_score(candidate)
        if candidate and score > best_score + 2:
            best = candidate
            best_score = score

    return best


def _normalize_platform(platform: str, post_url: str, source_url: str) -> str:
    p = _repair_mojibake(platform).lower()
    merged = f"{p} {post_url.lower()} {source_url.lower()}"
    if "xiaohongshu" in merged or "xhs" in merged or "\u5c0f\u7ea2\u4e66" in merged:
        return "xhs"
    if "weibo" in merged or "\u5fae\u535a" in merged:
        return "weibo"
    if "douyin" in merged or "\u6296\u97f3" in merged:
        return "douyin"
    if "zhihu" in merged or "\u77e5\u4e4e" in merged:
        return "zhihu"
    if "bilibili" in merged or "b\u7ad9" in merged:
        return "bilibili"
    if "tieba" in merged or "\u8d34\u5427" in merged:
        return "tieba"
    if "douban" in merged or "\u8c46\u74e3" in merged:
        return "douban"
    return p or "unknown"


def _intent_signal(content: str, keyword: str) -> Tuple[int, str]:
    text = f"{keyword} {content}".lower()
    hit = 0
    for kw in HIGH_INTENT_KEYWORDS:
        if kw.lower() in text:
            hit += 1

    if hit >= 3:
        return 18, "high"
    if hit >= 1:
        return 8, "medium"
    return 0, "low"


def _is_target_lead(author: str, content: str, intent_level: str, competitor: bool) -> bool:
    if competitor:
        return False
    if intent_level in {"high", "medium"}:
        return True
    text = f"{author} {content}".lower()
    return sum(1 for k in TARGET_LEAD_HINTS if k in text) >= 2


def _extract_json_rows(obj) -> List[Dict]:
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for key in ["data", "leads", "items", "records", "rows"]:
            val = obj.get(key)
            if isinstance(val, list):
                return val
        if obj:
            return [obj]
    return []


def _parse_uploaded_lead_files(uploaded_files) -> Tuple[pd.DataFrame, List[str]]:
    if not uploaded_files:
        return pd.DataFrame(), []

    frames: List[pd.DataFrame] = []
    names: List[str] = []

    for up in uploaded_files:
        name = getattr(up, "name", "uploaded")
        raw = up.getvalue()
        suffix = Path(name).suffix.lower()

        df = pd.DataFrame()
        if suffix == ".csv":
            for enc in ["utf-8", "utf-8-sig", "gbk", "gb18030"]:
                try:
                    df = pd.read_csv(io.BytesIO(raw), encoding=enc)
                    break
                except Exception:
                    continue
        elif suffix == ".json":
            try:
                obj = json.loads(raw.decode("utf-8", errors="ignore"))
                df = pd.DataFrame(_extract_json_rows(obj))
            except Exception:
                df = pd.DataFrame()
        elif suffix in {".txt", ".md"}:
            txt = raw.decode("utf-8", errors="ignore").strip()
            if txt:
                lines = [x.strip() for x in txt.splitlines() if x.strip()]
                rows = []
                for ln in lines[:1200]:
                    rows.append({"content": ln, "platform": "xhs", "author": "unknown"})
                df = pd.DataFrame(rows)

        if df.empty:
            continue

        df = df.fillna("")
        df["__source_file"] = name
        frames.append(df)
        names.append(name)

    if not frames:
        return pd.DataFrame(), []

    return pd.concat(frames, ignore_index=True), names

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
            obj = None
            raw_json = fp.read_bytes()
            for enc in ["utf-8", "utf-8-sig", "gbk", "gb18030"]:
                try:
                    obj = json.loads(raw_json.decode(enc, errors="ignore"))
                    break
                except Exception:
                    continue
            df = pd.DataFrame(_extract_json_rows(obj))

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
        post_url = _safe_str(row, ["note_url", "post_url", "link", "url"])
        source_url = _safe_str(row, ["source_url", "search_url", "origin_url"])

        platform_raw = _safe_str(row, ["platform", "source"]) or "xhs"
        platform = _normalize_platform(platform_raw, post_url, source_url)
        keyword = _repair_mojibake(_safe_str(row, ["keyword", "query"]))
        author = _repair_mojibake(_safe_str(row, ["author", "name", "nickname", "user"])) or "Unknown"
        author_url = _safe_str(row, ["author_url", "profile_url", "user_url"])

        evidence_text = _repair_mojibake(_safe_str(row, ["evidence_text"]))
        content = _repair_mojibake(_safe_str(row, ["content", "text", "comment", "title"]))
        if not content:
            content = evidence_text

        contact = _repair_mojibake(_safe_str(row, ["phone", "wechat", "contact", "email"]))
        access_hint = _repair_mojibake(_safe_str(row, ["access_hint", "dm_hint", "profile_state"]))
        base_score = _safe_int(row.get("score"), default=_safe_int(row.get("confidence"), default=70))
        grade = _repair_mojibake(_safe_str(row, ["grade"]))
        collected_at = _safe_str(row, ["collected_at", "created_at", "timestamp"])
        source_file = _safe_str(row, ["__source_file"])

        dm_ready = False
        author_url_l = author_url.lower()
        access_hint_l = access_hint.lower()
        if "personal_profile_ready" in access_hint_l:
            dm_ready = True
        if "/user/profile/" in author_url_l:
            dm_ready = True

        intent_bonus, intent_level = _intent_signal(f"{content} {evidence_text}", keyword)
        competitor = _is_competitor(author, f"{content} {keyword}")
        score = min(100, max(0, base_score + intent_bonus + (10 if dm_ready else 0)))
        target = _is_target_lead(author, f"{content} {keyword}", intent_level, competitor)

        body = f"{platform}|{author}|{post_url}|{content[:80]}"
        external_id = hashlib.md5(body.encode("utf-8", errors="ignore")).hexdigest()[:16]

        rows.append(
            {
                "platform": platform,
                "keyword": keyword,
                "author": author,
                "author_url": author_url,
                "content": content,
                "evidence_text": evidence_text,
                "post_url": post_url,
                "source_url": source_url,
                "contact": contact,
                "score": score,
                "base_score": base_score,
                "intent_level": intent_level,
                "is_target": target,
                "dm_ready": dm_ready,
                "access_hint": access_hint,
                "grade": grade,
                "collected_at": collected_at,
                "source_file": source_file,
                "is_competitor": competitor,
                "external_id": external_id,
            }
        )

    out = pd.DataFrame(rows)
    out = out.drop_duplicates(subset=["external_id"])
    if "collected_at" in out.columns:
        out = out.sort_values(by=["score", "collected_at"], ascending=[False, False])
    else:
        out = out.sort_values(by=["score"], ascending=False)
    return out

def _sync_openclaw_leads(
    user_id: str,
    min_score: int,
    exclude_competitors: bool,
    limit: int = 300,
    normalized: Optional[pd.DataFrame] = None,
    files: Optional[List[str]] = None,
    only_target: bool = False,
    selected_platforms: Optional[List[str]] = None,
) -> Dict:
    if normalized is None:
        raw, files = _load_external_sources()
        normalized = _normalize_external_df(raw)

    files = files or []
    selected_platforms = [x.strip().lower() for x in (selected_platforms or []) if str(x).strip()]

    if normalized is None or normalized.empty:
        return {
            "files": files,
            "total": 0,
            "imported": 0,
            "skipped_competitor": 0,
            "skipped_score": 0,
            "skipped_duplicate": 0,
            "skipped_non_target": 0,
            "skipped_platform": 0,
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
    skipped_non_target = 0
    skipped_platform = 0

    for row in normalized.head(limit).to_dict(orient="records"):
        row_platform = str(row.get("platform", "")).strip().lower()
        if selected_platforms and row_platform not in selected_platforms:
            skipped_platform += 1
            continue
        if int(row.get("score", 0)) < min_score:
            skipped_score += 1
            continue
        if exclude_competitors and bool(row.get("is_competitor")):
            skipped_competitor += 1
            continue
        if only_target and not bool(row.get("is_target", False)):
            skipped_non_target += 1
            continue
        if row.get("external_id") in existing_ids:
            skipped_duplicate += 1
            continue

        content = str(row.get("content", "") or "").strip()
        if len(content) > 1200:
            content = content[:1200] + "..."

        notes = (
            f"source={row.get('platform', '')} | score={row.get('score', 0)} | intent={row.get('intent_level', 'low')} | keyword={row.get('keyword', '')}\n"
            f"dm_ready={row.get('dm_ready', False)} | access_hint={row.get('access_hint', '')}\n"
            f"post_url={row.get('post_url', '')}\n"
            f"author_url={row.get('author_url', '')}\n"
            f"source_url={row.get('source_url', '')}\n"
            f"collected_at={row.get('collected_at', '')}\n"
            f"external_id={row.get('external_id', '')}\n"
            f"{content}"
        )

        add_lead(
            {
                "user_id": user_id,
                "name": row.get("author", "Unknown"),
                "email": "",
                "phone": row.get("contact", ""),
                "status": "new",
                "notes": notes,
            }
        )
        existing_ids.add(row.get("external_id"))
        imported += 1

    return {
        "files": files,
        "total": int(len(normalized)),
        "imported": imported,
        "skipped_competitor": skipped_competitor,
        "skipped_score": skipped_score,
        "skipped_duplicate": skipped_duplicate,
        "skipped_non_target": skipped_non_target,
        "skipped_platform": skipped_platform,
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
    st.caption("OpenClaw reads social posts/comments. This page filters high-intent non-competitor leads and syncs them into your Lead Pool.")

    uploaded_files = st.file_uploader(
        "Upload OpenClaw/partner lead files (csv/json/txt/md)",
        type=["csv", "json", "txt", "md"],
        accept_multiple_files=True,
        key="oc_uploads",
    )

    raw_df, source_files = _load_external_sources()
    upload_df, upload_files = _parse_uploaded_lead_files(uploaded_files)

    frames: List[pd.DataFrame] = []
    if not raw_df.empty:
        frames.append(raw_df)
    if not upload_df.empty:
        frames.append(upload_df)

    if frames:
        combined_raw = pd.concat(frames, ignore_index=True)
        norm_df = _normalize_external_df(combined_raw)
    else:
        norm_df = pd.DataFrame()

    source_files = list(dict.fromkeys(source_files + upload_files))

    if norm_df.empty:
        st.warning("No lead data detected. Run OpenClaw first or upload lead files above.")
        with st.expander("Expected artifact paths"):
            st.code(
                "data/openclaw/openclaw_leads_latest.csv\n"
                "data/openclaw/openclaw_leads_latest.json\n"
                "data/exports/high_value_leads_latest.csv\n"
                "data/exports/high_value_leads_latest.json"
            )
        return

    platform_options = sorted([p for p in norm_df["platform"].dropna().astype(str).unique().tolist() if p])
    default_platforms = platform_options[:]

    with st.container(border=True):
        c1, c2, c3, c4, c5 = st.columns([1.5, 1, 1, 1, 1.2])
        selected_platforms = c1.multiselect("Platforms", platform_options, default=default_platforms, key="oc_platforms")
        min_score = c2.slider("Min intent score", 0, 100, 65, key="oc_min_score")
        only_target = c3.checkbox("Only target leads", value=True, key="oc_only_target")
        exclude_comp = c4.checkbox("Exclude competitors", value=True, key="oc_exclude_comp")
        import_limit = c5.slider("Max rows per sync", 20, 2000, 400, step=20, key="oc_import_limit")
        text_filter = st.text_input("Keyword filter (author/content/keyword)", key="oc_text_filter").strip().lower()

    view_df = norm_df.copy()
    if selected_platforms:
        view_df = view_df[view_df["platform"].isin(selected_platforms)]
    if exclude_comp:
        view_df = view_df[~view_df["is_competitor"]]
    if only_target:
        view_df = view_df[view_df["is_target"]]
    view_df = view_df[view_df["score"] >= min_score]

    if text_filter:
        mask = (
            view_df["author"].astype(str).str.lower().str.contains(text_filter, na=False)
            | view_df["content"].astype(str).str.lower().str.contains(text_filter, na=False)
            | view_df["keyword"].astype(str).str.lower().str.contains(text_filter, na=False)
        )
        view_df = view_df[mask]

    raw_total = int(len(norm_df))
    filtered_total = int(len(view_df))
    target_count = int(view_df["is_target"].sum()) if not view_df.empty and "is_target" in view_df else 0
    dm_ready_count = int(view_df["dm_ready"].sum()) if not view_df.empty and "dm_ready" in view_df else 0

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Raw leads", raw_total)
    m2.metric("After filters", filtered_total)
    m3.metric("Target leads", target_count)
    m4.metric("DM-ready", dm_ready_count)

    if source_files:
        st.caption("Data sources: " + ", ".join(source_files))

    st.markdown("---")
    if st.button("Sync filtered leads into Lead Pool", type="primary", use_container_width=True, key="sync_openclaw"):
        result = _sync_openclaw_leads(
            user_id=user["id"],
            min_score=min_score,
            exclude_competitors=exclude_comp,
            limit=import_limit,
            normalized=view_df,
            files=source_files,
            only_target=only_target,
            selected_platforms=selected_platforms,
        )
        st.success(f"Imported: {result['imported']} / {result['total']}")
        st.info(
            "Skipped -> "
            f"platform: {result['skipped_platform']}, "
            f"competitor: {result['skipped_competitor']}, "
            f"low-score: {result['skipped_score']}, "
            f"non-target: {result['skipped_non_target']}, "
            f"duplicate: {result['skipped_duplicate']}"
        )

    if view_df.empty:
        st.warning("No leads pass current filters. Try lowering score threshold or disabling filters.")
    else:
        st.markdown(f"### Filtered leads: {len(view_df)}")
        table_cols = [
            "platform",
            "keyword",
            "author",
            "score",
            "intent_level",
            "dm_ready",
            "is_target",
            "is_competitor",
            "access_hint",
            "author_url",
            "post_url",
            "content",
            "source_file",
        ]
        table_cols = [c for c in table_cols if c in view_df.columns]
        st.dataframe(view_df[table_cols].head(import_limit), use_container_width=True, hide_index=True)

        with st.expander("Top text evidence for outreach", expanded=False):
            for row in view_df.head(30).to_dict(orient="records"):
                url = row.get("author_url") or row.get("post_url") or row.get("source_url") or ""
                snippet = str(row.get("content", "") or "").replace("\n", " ").strip()
                if len(snippet) > 220:
                    snippet = snippet[:220] + "..."
                st.markdown(f"- [{row.get('platform', '')}] {row.get('author', 'Unknown')} | score {row.get('score', 0)} | {url}")
                if snippet:
                    st.caption(snippet)

    st.markdown("---")
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
