import hashlib
import io
import json
import re
from datetime import datetime
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
    get_emails,
    get_leads,
    get_stats,
    get_user_by_email,
    init_supabase,
    save_email,
    update_lead,
)
from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from services.analytics_engine import (
    build_ab_significance,
    build_ab_variant_stats,
    build_channel_metrics,
    build_funnel,
    extract_channel_from_lead,
)
from services.sdr_agent import (
    append_handoff_event,
    detect_handoff,
    estimate_conversion_probability,
    generate_agent_reply,
    generate_outreach_copy,
    trigger_handoff_webhook,
)


st.set_page_config(
    page_title="GuestSeek - AI Study Abroad Lead SaaS",
    page_icon="*",
    layout="wide",
)

st.markdown(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  --gs-bg: #f4f8ff;
  --gs-text: #0b1220;
  --gs-border: #d8e3f0;
  --gs-accent: #4f8cff;
  --gs-accent-2: #25d0ce;
}

html, body, [class*="stApp"] {
  font-family: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--gs-text);
  background:
    radial-gradient(circle at 12% 0%, rgba(126, 87, 194, .12) 0%, transparent 34%),
    radial-gradient(circle at 90% 10%, rgba(37, 208, 206, .15) 0%, transparent 32%),
    radial-gradient(circle at 45% 85%, rgba(79, 140, 255, .10) 0%, transparent 36%),
    var(--gs-bg);
}

[data-testid="stSidebar"],
[data-testid="collapsedControl"] {
  display: none !important;
}

div.block-container {
  max-width: 1220px;
  padding-top: .85rem;
  padding-bottom: 2rem;
}

.gs-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--gs-border);
  border-radius: 16px;
  padding: 12px 16px;
  background: linear-gradient(120deg, rgba(79,140,255,.09) 0%, rgba(37,208,206,.10) 38%, #ffffff 100%);
  box-shadow: 0 8px 24px rgba(30, 41, 59, .07);
  margin-bottom: 10px;
}

.gs-topbar-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: .2px;
}

.gs-topbar-sub {
  font-size: 12px;
  color: #475569;
}

.gs-topbar-meta {
  font-size: 12px;
  color: #334155;
  text-align: right;
}

.gs-hero {
  border: 1px solid var(--gs-border);
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(115deg, rgba(79,140,255,.11) 0%, rgba(37,208,206,.09) 45%, #ffffff 100%);
  box-shadow: 0 12px 26px rgba(30, 64, 175, .08);
}

.gs-chip {
  display: inline-block;
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid #c9ddff;
  background: #eef4ff;
  margin-right: 6px;
  color: #234a90;
}

.gs-type {
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  border-right: 2px solid var(--gs-accent);
  width: 0;
  animation: typing 2.2s steps(42, end) forwards, blink 1s step-end infinite;
}

@keyframes typing { from { width: 0; } to { width: 100%; } }
@keyframes blink { 50% { border-color: transparent; } }

[data-testid="stMetricValue"] {
  font-family: 'JetBrains Mono', monospace;
}

.stButton > button {
  border-radius: 12px;
  border: 1px solid #c7dcff;
  background: linear-gradient(180deg, #ffffff, #eef5ff);
}

.stButton > button[kind="primary"] {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #4f8cff 0%, #25d0ce 85%);
}

div[role="radiogroup"] {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

div[role="radiogroup"] label {
  border: 1px solid #cfe0ff;
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(255,255,255,.8);
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


def _demo_user_payload() -> Dict:
    return {
        "id": "demo-user",
        "email": "demo@guestseek.ai",
        "name": "Demo User",
        "company": "GuestSeek Demo",
        "plan": "pro",
        "subscription_status": "active",
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
        "current_period_end": None,
    }


def _login_demo_user() -> None:
    demo = _demo_user_payload()


def _is_demo_user(user: Optional[Dict]) -> bool:
    return bool(user and str(user.get("id", "")).strip() == "demo-user")


def _scoped_user_id(user: Optional[Dict]) -> Optional[str]:
    if _is_demo_user(user):
        return None
    if not user:
        return None
    return user.get("id")


def _bootstrap_demo_leads_if_needed(user: Optional[Dict]) -> None:
    if not _is_demo_user(user):
        return
    if st.session_state.get("_demo_bootstrap_done"):
        return

    try:
        existing_all = get_leads(None)
        if len(existing_all) >= 200:
            st.session_state["_demo_bootstrap_done"] = True
            return

        raw, files = _load_external_sources()
        norm = _normalize_external_df(raw)
        if norm.empty:
            st.session_state["_demo_bootstrap_done"] = True
            return

        _sync_openclaw_leads(
            user_id="demo-user",
            min_score=0,
            exclude_competitors=False,
            limit=2000,
            normalized=norm,
            files=files,
            only_target=False,
            selected_platforms=[],
        )
    finally:
        st.session_state["_demo_bootstrap_done"] = True
    token = create_access_token({"sub": demo["id"], "email": demo["email"]})
    login_user(demo, token)


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

    with st.container(border=True):
        st.markdown("### Quick Demo Access")
        st.caption("Skip account creation and enter a ready-to-use demo workspace.")
        if st.button("Enter Demo Workspace (No Login)", type="primary", use_container_width=True, key="demo_login_btn"):
            _login_demo_user()
            st.rerun()

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
    stats = get_stats(_scoped_user_id(user))

    st.markdown("## AI ??")
    st.markdown(
        """
<div class="gs-hero">
  <div class="gs-chip">AI Lead Gen</div>
  <div class="gs-chip">Study Abroad Vertical</div>
  <div class="gs-chip">B2B SaaS</div>
  <h3 style="margin:.65rem 0 .2rem 0;">GuestSeek Revenue Engine</h3>
  <div class="gs-type" style="max-width:900px;">OpenClaw 实时采集 -> AI 识别高意向 -> 千人千面触达 -> 统计归因迭代</div>
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
    st.markdown("1. OpenClaw 读取评论与帖子，持续发现潜在客户")
    st.markdown("2. 自动排除同业机构并计算购买意向分")
    st.markdown("3. 同步入线索池，触发个性化触达工作流")
    st.markdown("4. 统计转化漏斗与ROI，持续优化获客路径")


def render_leads(user: Dict) -> None:
    st.markdown("## ???")

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

    leads = get_leads(_scoped_user_id(user))
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
    st.markdown("## 潜客采集（OpenClaw）")
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


def _lead_label_map(leads: List[Dict]) -> Dict[str, Dict]:
    labels: Dict[str, Dict] = {}
    for x in leads:
        channel = extract_channel_from_lead(x)
        label = f"{x.get('name', 'Unknown')} | {channel} | {x.get('status', 'new')}"
        labels[label] = x
    return labels


def _record_ab_email_event(
    user_id: str,
    lead_id: Optional[str],
    variant: str,
    subject: str,
    body: str,
    outcome: str,
) -> str:
    now = datetime.now().isoformat()
    payload = {
        "user_id": user_id,
        "lead_id": lead_id,
        "subject": f"[AB:{variant}] {subject}".strip(),
        "body": body,
        "status": "sent",
        "sent_at": now,
    }

    if outcome in {"opened", "clicked"}:
        payload["status"] = "opened"
        payload["opened_at"] = now
    if outcome == "clicked":
        payload["status"] = "clicked"
        payload["clicked_at"] = now

    return save_email(payload)


def render_analytics(user: Dict) -> None:
    st.markdown("## 数据归因实验室")
    st.caption("Channel ROI + CAC attribution + A/B significance for outreach prompts")

    leads = get_leads(_scoped_user_id(user))
    emails = get_emails(_scoped_user_id(user))

    if not leads:
        st.info("No leads yet. Import leads in Acquisition first.")
        return

    channels = sorted(set(extract_channel_from_lead(x) for x in leads))
    if not channels:
        channels = ["unknown"]

    with st.container(border=True):
        c1, c2 = st.columns(2)
        avg_contract_value = c1.number_input("Avg contract value (CNY)", min_value=1000.0, value=15000.0, step=1000.0)
        positive_metric = c2.selectbox("A/B positive metric", ["clicked", "opened"], index=0)

        st.markdown("**Channel CAC assumptions (CNY per lead)**")
        cols = st.columns(min(4, max(1, len(channels))))
        cost_map: Dict[str, float] = {}
        default_by_channel = {
            "xhs": 35.0,
            "weibo": 28.0,
            "zhihu": 30.0,
            "douyin": 36.0,
            "bilibili": 32.0,
            "unknown": 40.0,
        }
        for idx, channel in enumerate(channels):
            default_cost = default_by_channel.get(channel, 40.0)
            cost_map[channel] = cols[idx % len(cols)].number_input(
                f"{channel}", min_value=1.0, value=float(default_cost), step=1.0, key=f"cac_{channel}"
            )

    channel_df = build_channel_metrics(leads, channel_costs=cost_map, avg_contract_value=float(avg_contract_value))
    funnel_df = build_funnel(leads)

    if channel_df.empty:
        st.warning("No channel metrics available yet.")
        return

    total_cost = float(channel_df["acquisition_cost"].sum())
    total_revenue = float(channel_df["revenue"].sum())
    total_profit = float(channel_df["net_profit"].sum())
    roi = (total_profit / total_cost * 100) if total_cost > 0 else 0.0

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Leads", len(leads))
    m2.metric("Estimated Cost", f"?{total_cost:,.0f}")
    m3.metric("Estimated Revenue", f"?{total_revenue:,.0f}")
    m4.metric("ROI", f"{roi:.1f}%")

    st.markdown("---")
    st.markdown("### Channel ROI / CAC")
    st.dataframe(channel_df, use_container_width=True, hide_index=True)

    chart_df = channel_df[["channel", "roi_pct", "conversion_rate_pct", "dm_ready_rate_pct"]].set_index("channel")
    st.bar_chart(chart_df, height=260)

    st.markdown("### Funnel")
    st.dataframe(funnel_df, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### Prompt A/B Testing")
    ab_df = build_ab_variant_stats(emails)
    if ab_df.empty:
        st.info("No A/B-tagged outreach yet. Save outreach with variants in AI SDR page.")
    else:
        st.dataframe(ab_df, use_container_width=True, hide_index=True)
        sig = build_ab_significance(ab_df, metric=positive_metric)
        if sig.get("variant_a"):
            line = (
                f"{sig['variant_a']} vs {sig['variant_b']} | "
                f"delta={sig['diff_pct']}% | p={sig['p_value']} | z={sig['z']}"
            )
            if sig.get("significant"):
                st.success("Statistically significant: " + line)
            else:
                st.warning("Not significant yet: " + line)

    with st.expander("Manual A/B event logger", expanded=False):
        label_map = _lead_label_map(leads)
        labels = list(label_map.keys())
        with st.form("ab_event_form", clear_on_submit=True):
            lead_label = st.selectbox("Lead", labels, key="ab_lead") if labels else None
            variant = st.selectbox("Variant", ["A", "B", "C"], key="ab_variant")
            outcome = st.selectbox("Outcome", ["sent", "opened", "clicked"], key="ab_outcome")
            subject = st.text_input("Subject", value="Outreach experiment", key="ab_subject")
            body = st.text_area("Body", value="variant test", key="ab_body", height=80)
            ok = st.form_submit_button("Save A/B event", use_container_width=True)

        if ok and lead_label:
            lead = label_map[lead_label]
            _record_ab_email_event(
                user_id=user["id"],
                lead_id=lead.get("id"),
                variant=variant,
                subject=subject,
                body=body,
                outcome=outcome,
            )
            st.success("A/B event saved.")
            st.rerun()


def render_sdr_agent(user: Dict) -> None:
    st.markdown("## AI 触达工作台")
    st.caption("Personalized outreach generation + auto triage + forced human handoff")

    leads = get_leads(_scoped_user_id(user))
    if not leads:
        st.info("No leads available. Add or sync leads first.")
        return

    if "sdr_webhook_url" not in st.session_state:
        st.session_state["sdr_webhook_url"] = ""

    with st.container(border=True):
        c1, c2 = st.columns([1, 2])
        handoff_threshold = c1.slider("Human handoff threshold", 50, 95, 75, key="sdr_threshold")
        st.session_state["sdr_webhook_url"] = c2.text_input(
            "Webhook for urgent handoff (optional)",
            value=st.session_state.get("sdr_webhook_url", ""),
            key="sdr_webhook",
            placeholder="https://example.com/webhook",
        )

    tab1, tab2 = st.tabs(["Outreach Composer", "Inbound Triage"])

    with tab1:
        lead_map = _lead_label_map(leads)
        labels = list(lead_map.keys())
        selected_label = st.selectbox("Target lead", labels, key="sdr_target")
        lead = lead_map[selected_label]

        c1, c2, c3 = st.columns(3)
        variant = c1.selectbox("Prompt variant", ["A", "B", "C"], key="sdr_variant")
        tone = c2.selectbox("Tone", ["professional", "direct", "warm", "consultative"], key="sdr_tone")
        angle = c3.selectbox("Pain-point angle", ["timeline risk", "budget fit", "school selection", "essay quality", "visa uncertainty"], key="sdr_angle")
        cta = st.text_input("CTA", value="book a 10-min feasibility call", key="sdr_cta")

        if st.button("Generate personalized outreach", type="primary", use_container_width=True, key="sdr_gen"):
            copy = generate_outreach_copy(
                lead=lead,
                angle=angle,
                cta=cta,
                variant=variant,
                tone=tone,
                openai_api_key=OPENAI_API_KEY,
                openai_base_url=OPENAI_BASE_URL,
                model=OPENAI_MODEL,
            )
            st.session_state["sdr_last_copy"] = copy

        copy = st.session_state.get("sdr_last_copy")
        if copy:
            st.markdown("<div class='gs-card'>", unsafe_allow_html=True)
            st.markdown(f"**Subject**: {copy.get('subject', '')}")
            st.markdown(f"<div class='gs-type'>{copy.get('message', '')}</div>", unsafe_allow_html=True)
            st.caption(f"Generated by: {copy.get('mode', 'fallback')}")
            st.markdown("</div>", unsafe_allow_html=True)

            c_log, c_out = st.columns([1.2, 1])
            event_outcome = c_out.selectbox("Log outcome", ["sent", "opened", "clicked"], key="sdr_event_outcome")
            if c_log.button("Save outreach event", use_container_width=True, key="sdr_save_event"):
                _record_ab_email_event(
                    user_id=user["id"],
                    lead_id=lead.get("id"),
                    variant=variant,
                    subject=copy.get("subject", "Outreach"),
                    body=copy.get("message", ""),
                    outcome=event_outcome,
                )
                st.success("Outreach event logged for A/B analytics.")

    with tab2:
        lead_map = _lead_label_map(leads)
        labels = list(lead_map.keys())
        triage_label = st.selectbox("Lead", labels, key="triage_lead")
        lead = lead_map[triage_label]
        inbound = st.text_area(
            "Inbound message / comment",
            height=140,
            key="triage_text",
            placeholder="Paste client reply text here",
        )

        if st.button("Analyze and draft reply", type="primary", use_container_width=True, key="triage_btn"):
            probability = estimate_conversion_probability(lead, inbound)
            handoff, reason = detect_handoff(probability, inbound, threshold=handoff_threshold)
            reply = generate_agent_reply(lead, inbound, probability)

            p1, p2, p3 = st.columns(3)
            p1.metric("Conversion probability", f"{probability}%")
            p2.metric("Handoff", "YES" if handoff else "NO")
            p3.metric("Threshold", f"{handoff_threshold}%")

            st.markdown("### Suggested AI reply")
            st.code(reply)

            event = {
                "user_id": user.get("id"),
                "lead_id": lead.get("id"),
                "lead_name": lead.get("name"),
                "probability": probability,
                "handoff": handoff,
                "reason": reason,
                "inbound": inbound,
                "reply": reply,
            }

            if handoff:
                log_path = append_handoff_event(PROJECT_ROOT, event)
                st.error(f"Forced handoff triggered: {reason}")
                st.caption(f"Handoff log: {log_path}")

                webhook = st.session_state.get("sdr_webhook_url", "")
                ok, msg = trigger_handoff_webhook(webhook, event)
                if webhook:
                    if ok:
                        st.success(f"Webhook delivered ({msg})")
                    else:
                        st.warning(f"Webhook failed ({msg})")

                # high-probability leads are moved to qualified for human follow-up queue
                update_lead(lead["id"], {"status": "qualified"})
            else:
                st.success("Handled by AI agent boundary. No handoff needed.")


def main() -> None:
    init_session_state()

    if not _db_ready():
        st.error("Database initialization failed.")
        st.stop()

    user = get_current_user()
    if not user:
        try:
            qp = st.query_params
            demo_flag = str(qp.get("demo", "1")).strip().lower()
            auth_flag = str(qp.get("auth", "0")).strip().lower()
        except Exception:
            demo_flag = "1"
            auth_flag = "0"

        # Default behavior: auto-enter demo workspace.
        # Use ?auth=1 when you need explicit login/register UI.
        if auth_flag not in {"1", "true", "yes"} and demo_flag in {"1", "true", "yes"}:
            _login_demo_user()
            user = get_current_user()

    if not user:
        render_login_register()
        st.stop()

    try:
        process_checkout_query(user)
    except Exception as exc:
        st.error(f"Checkout sync error: {exc}")

    user = refresh_subscription_in_session(get_current_user() or user)
    _bootstrap_demo_leads_if_needed(user)
    st.markdown(
        f"""
<div class="gs-topbar">
  <div>
    <div class="gs-topbar-title">GuestSeek ? 留学赛道 AI 获客 SaaS</div>
    <div class="gs-topbar-sub">Gemini 渐变 + 打字机 + 硅谷 AI 初创风</div>
  </div>
  <div class="gs-topbar-meta">账号：{user.get('email', '-')}<br/>套餐：{(user.get('plan') or 'free').upper()} / {user.get('subscription_status') or 'inactive'}</div>
</div>
""",
        unsafe_allow_html=True,
    )

    page = st.radio(
        "导航",
        ["AI橱窗", "潜客采集", "AI触达", "数据归因", "线索池", "订阅", "退出登录"],
        horizontal=True,
        label_visibility="collapsed",
        key="workspace_nav_top",
    )

    if page == "退出登录":
        logout_user()
        st.rerun()

    # Soft paywall: allow usage in trial mode, keep billing upgrade path.
    if page in {"线索池", "潜客采集", "AI触达", "数据归因"} and not has_required_plan(user, minimum="pro"):
        st.info("试用模式已开启。升级到 Pro 可使用完整自动化能力和更高配额。")

    if page == "AI橱窗":
        render_overview(user)
    elif page == "潜客采集":
        render_acquisition(user)
    elif page == "AI触达":
        render_sdr_agent(user)
    elif page == "数据归因":
        render_analytics(user)
    elif page == "线索池":
        render_leads(user)
    elif page == "订阅":
        render_billing_page()


if __name__ == "__main__":
    main()
