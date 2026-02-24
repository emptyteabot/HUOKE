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
from config import (
    ENABLE_GUEST_AUTOLOGIN,
    GUEST_ACCOUNT_COMPANY,
    GUEST_ACCOUNT_EMAIL,
    GUEST_ACCOUNT_NAME,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
)
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
from lead_pack import (
    create_lead_pack_order,
    list_lead_pack_orders,
    mark_lead_pack_paid,
    process_lead_pack_order,
    process_queued_orders,
)


st.set_page_config(
    page_title="留学获客引擎 | 线索Pulse SaaS",
    page_icon="*",
    layout="wide",
)

st.markdown(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');

:root {
  --gs-bg: #eef5ff;
  --gs-bg-soft: #f8fbff;
  --gs-text: #091226;
  --gs-muted: #4a5e80;
  --gs-border: #cfddf5;
  --gs-accent: #147df5;
  --gs-accent-2: #16c3c2;
  --gs-accent-3: #ffb24c;
}

html, body, [class*="stApp"] {
  font-family: 'Manrope', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--gs-text);
  background:
    radial-gradient(1200px 420px at 8% -10%, rgba(20,125,245,.22), transparent 58%),
    radial-gradient(1000px 450px at 95% 0%, rgba(22,195,194,.20), transparent 58%),
    radial-gradient(820px 300px at 50% 100%, rgba(255,178,76,.16), transparent 62%),
    linear-gradient(180deg, var(--gs-bg) 0%, var(--gs-bg-soft) 100%);
}

[data-testid="stSidebar"],
[data-testid="collapsedControl"] {
  display: none !important;
}

header[data-testid="stHeader"] {
  height: 0 !important;
  min-height: 0 !important;
  background: transparent !important;
}

[data-testid="stToolbar"],
[data-testid="stDecoration"],
[data-testid="stStatusWidget"],
#MainMenu,
footer {
  visibility: hidden !important;
  height: 0 !important;
  position: fixed !important;
}

div.block-container {
  max-width: 1260px;
  padding-top: 3.2rem;
  padding-bottom: 2.4rem;
}

@media (max-width: 900px) {
  div.block-container {
    padding-top: 3.8rem;
    padding-left: .7rem;
    padding-right: .7rem;
  }
}

.gs-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--gs-border);
  border-radius: 18px;
  padding: 13px 16px;
  background: linear-gradient(120deg, rgba(20,125,245,.12) 0%, rgba(22,195,194,.12) 42%, rgba(255,178,76,.10) 100%);
  box-shadow: 0 14px 30px rgba(15, 35, 70, .08);
  margin-bottom: 10px;
}

.gs-topbar-title {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: .2px;
}

.gs-topbar-sub {
  font-size: 12px;
  color: var(--gs-muted);
}

.gs-topbar-meta {
  font-size: 12px;
  color: #314869;
  text-align: right;
}

.gs-hero {
  border: 1px solid var(--gs-border);
  border-radius: 20px;
  padding: 20px;
  background: linear-gradient(116deg, rgba(20,125,245,.15) 0%, rgba(22,195,194,.12) 46%, rgba(255,178,76,.12) 100%);
  box-shadow: 0 18px 30px rgba(20, 45, 91, .11);
}

.gs-subhero {
  border: 1px solid #dbe7fa;
  border-radius: 16px;
  padding: 14px 16px;
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 22px rgba(14, 34, 67, .06);
}

.gs-chip {
  display: inline-block;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #bed6f8;
  background: #edf5ff;
  margin-right: 6px;
  color: #18498e;
}

.gs-type {
  font-family: 'IBM Plex Mono', monospace;
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  border-right: 2px solid #1d6cd8;
  width: 0;
  animation: typing 2.4s steps(48, end) forwards, blink 1s step-end infinite;
}

@keyframes typing { from { width: 0; } to { width: 100%; } }
@keyframes blink { 50% { border-color: transparent; } }
@keyframes riseIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }

[data-testid="stMetricValue"] {
  font-family: 'IBM Plex Mono', monospace;
}

.gs-panel {
  border: 1px solid #d5e4f9;
  border-radius: 16px;
  padding: 14px 14px 12px 14px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 10px 22px rgba(14, 34, 67, .06);
  animation: riseIn .35s ease;
}

.gs-card {
  border: 1px solid #d5e4f9;
  border-radius: 14px;
  padding: 12px;
  background: rgba(255,255,255,.92);
}

.gs-panel h4 {
  margin: 0 0 6px 0;
  font-size: 15px;
}

.gs-muted {
  color: var(--gs-muted);
  font-size: 12px;
}

.gs-step {
  border: 1px solid #d5e4f9;
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(255,255,255,.92);
  margin-bottom: 8px;
}

.gs-step.ok { border-color: #9fdccf; background: rgba(224, 255, 248, .70); }
.gs-step.warn { border-color: #ffd08f; background: rgba(255, 245, 221, .78); }
.gs-step.todo { border-color: #d5e4f9; background: rgba(255,255,255,.92); }

.gs-kicker {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #476690;
}

.stButton > button {
  border-radius: 12px;
  border: 1px solid #c5d9f5;
  background: linear-gradient(180deg, #ffffff, #edf5ff);
}

.stButton > button[kind="primary"] {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #147df5 0%, #16c3c2 62%, #f5b34f 100%);
  box-shadow: 0 10px 22px rgba(21, 89, 181, .28);
}

div[role="radiogroup"] {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

div[role="radiogroup"] label {
  border: 1px solid #c8daf6;
  border-radius: 999px;
  padding: 4px 11px;
  background: rgba(255,255,255,.84);
}

div[role="radiogroup"] label:has(input:checked) {
  border-color: #6aa6ee;
  background: rgba(223, 238, 255, .86);
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

MOJIBAKE_TOKENS = ["�", "锟"]
MOJIBAKE_GLYPHS = ['锛', '馃', '鐣', '寰', '鎴', '涓', '鍙', '澦', '鐢', '鏄', '€', '鈥']
INSTITUTIONAL_AUTHOR_HINTS = [
    "中介",
    "机构",
    "顾问",
    "工作室",
    "教育",
    "老师",
    "留学咨询",
    "留学服务",
    "官方",
    "播报",
]
DIRECT_SELL_HINTS = ["私信", "加v", "微信", "咨询", "报价", "套餐", "保录", "代办", "服务"]
否ISE_AUTHORS = {"search_card", "unknown", "匿名", "none", "null"}
SYNC_HEARTBEAT_PATH = OPENCLAW_DIR / "sync_heartbeat.json"


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


def _auto_login_guest_user() -> bool:
    if not ENABLE_GUEST_AUTOLOGIN:
        return False

    email = str(GUEST_ACCOUNT_EMAIL or "").strip().lower()
    if not email:
        return False

    try:
        user = get_user_by_email(email)
        if not user:
            create_user(
                {
                    "name": str(GUEST_ACCOUNT_NAME or "guest_user"),
                    "company": str(GUEST_ACCOUNT_COMPANY or "线索Pulse"),
                    "email": email,
                    "password_hash": get_password_hash("guest-pass-2026"),
                    "plan": "enterprise",
                    "subscription_status": "active",
                }
            )
            user = get_user_by_email(email)
    except Exception:
        return False

    if not user:
        return False

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    login_user(_user_payload(user), token)
    return True



def _force_session_guest_login() -> Dict:
    user = {
        "id": "local-guest",
        "email": str(GUEST_ACCOUNT_EMAIL or "guest@ai-huoke.local").strip().lower(),
        "name": str(GUEST_ACCOUNT_NAME or "\u8bbf\u5ba2\u8d26\u53f7"),
        "company": str(GUEST_ACCOUNT_COMPANY or "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce"),
        "plan": "enterprise",
        "subscription_status": "active",
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
        "current_period_end": None,
    }
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    login_user(_user_payload(user), token)
    return user

def _scoped_user_id(user: Optional[Dict]) -> Optional[str]:
    if not user:
        return None
    return user.get("id")


def _bootstrap_user_leads_if_needed(user: Optional[Dict]) -> None:
    """One-time session bootstrap: import existing OpenClaw artifacts for the current user."""
    user_id = _scoped_user_id(user)
    if not user_id:
        return

    guard_key = f"_user_bootstrap_done_{user_id}"
    if st.session_state.get(guard_key):
        return

    try:
        existing = get_leads(user_id)
        if len(existing) >= 1:
            st.session_state[guard_key] = True
            return

        raw, files = _load_external_sources()
        norm = _normalize_external_df(raw)
        if norm.empty:
            st.session_state[guard_key] = True
            return

        _sync_openclaw_leads(
            user_id=user_id,
            min_score=65,
            exclude_competitors=True,
            limit=2000,
            normalized=norm,
            files=files,
            only_target=True,
            selected_platforms=[],
        )
    finally:
        st.session_state[guard_key] = True


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


def _is_noise_author(author: str) -> bool:
    author_l = str(author or "").strip().lower()
    if not author_l:
        return True
    if author_l in 否ISE_AUTHORS:
        return True
    return False


def _is_competitor(author: str, content: str) -> bool:
    author_l = str(author or "").strip().lower()
    text = f"{author} {content}".lower()

    if _is_noise_author(author_l):
        return True

    if any(kw.lower() in text for kw in COMPETITOR_KEYWORDS):
        return True

    if any(hint in author_l for hint in INSTITUTIONAL_AUTHOR_HINTS):
        return True

    sales_hits = sum(1 for x in DIRECT_SELL_HINTS if x in text)
    if sales_hits >= 2:
        return True

    return False

def _text_quality_score(text: str) -> int:
    if not text:
        return -10**9
    cjk_count = len(re.findall(r"[\u4e00-\u9fff]", text))
    bad_count = sum(text.count(t) for t in MOJIBAKE_TOKENS)
    return cjk_count * 4 - bad_count * 6 + min(len(text), 500) // 20


def _garble_ratio(text: str) -> float:
    raw = str(text or "")
    if not raw:
        return 0.0
    hits = sum(raw.count(tok) for tok in MOJIBAKE_GLYPHS)
    return hits / max(len(raw), 1)

def _repair_mojibake(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""

    best = raw
    best_score = _text_quality_score(raw)
    raw_garble = _garble_ratio(raw)

    transforms = [("gb18030", "utf-8"), ("gbk", "utf-8"), ("latin1", "utf-8")]
    for src_enc, dst_enc in transforms:
        try:
            candidate = raw.encode(src_enc, errors="ignore").decode(dst_enc, errors="ignore").strip()
        except Exception:
            continue

        if not candidate:
            continue

        score = _text_quality_score(candidate)
        cand_garble = _garble_ratio(candidate)
        if score > best_score + 2:
            best = candidate
            best_score = score
            continue

        if raw_garble >= 0.015 and cand_garble <= raw_garble * 0.6 and score >= best_score - 4:
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
    if competitor or _is_noise_author(author):
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

    candidates: List[Path] = []

    openclaw_csv = OPENCLAW_DIR / "openclaw_leads_latest.csv"
    openclaw_json = OPENCLAW_DIR / "openclaw_leads_latest.json"
    if openclaw_csv.exists():
        candidates.append(openclaw_csv)
    elif openclaw_json.exists():
        candidates.append(openclaw_json)

    latest_fixed_csv = EXPORTS_DIR / "high_value_leads_latest.csv"
    latest_fixed_json = EXPORTS_DIR / "high_value_leads_latest.json"
    if latest_fixed_csv.exists():
        candidates.append(latest_fixed_csv)
    elif latest_fixed_json.exists():
        candidates.append(latest_fixed_json)

    latest_csv = _latest_file(EXPORTS_DIR, "high_value_leads_*.csv")
    latest_json = _latest_file(EXPORTS_DIR, "high_value_leads_*.json")
    if latest_csv:
        candidates.append(latest_csv)
    elif latest_json:
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


def _load_sync_heartbeat() -> Dict:
    if not SYNC_HEARTBEAT_PATH.exists():
        return {}

    try:
        raw = SYNC_HEARTBEAT_PATH.read_text(encoding="utf-8")
        data = json.loads(raw or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _parse_note_meta(notes: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for line in str(notes or "").splitlines():
        line = line.strip()
        if not line:
            continue
        pieces = [x.strip() for x in line.split("|") if x.strip()] if "|" in line else [line]
        for piece in pieces:
            if "=" not in piece:
                continue
            k, v = piece.split("=", 1)
            out[k.strip().lower()] = v.strip()
    return out


def _extract_note_content(notes: str, meta_keys: Optional[set] = None) -> str:
    meta_keys = meta_keys or set()
    body: List[str] = []
    for line in str(notes or "").splitlines():
        raw = line.strip()
        if not raw:
            continue

        parsed_meta = False
        pieces = [x.strip() for x in raw.split("|") if x.strip()] if "|" in raw else [raw]
        for piece in pieces:
            if "=" not in piece:
                continue
            k = piece.split("=", 1)[0].strip().lower()
            if k in meta_keys:
                parsed_meta = True

        if not parsed_meta and "=" not in raw:
            body.append(raw)

    return " ".join(body).strip()


def _load_remote_openclaw_sources(user_id: Optional[str]) -> Tuple[pd.DataFrame, List[str]]:
    if not user_id:
        return pd.DataFrame(), []

    try:
        leads = get_leads(user_id)
    except Exception:
        return pd.DataFrame(), []

    if not leads:
        return pd.DataFrame(), []

    meta_keys = {
        "source",
        "platform",
        "score",
        "intent",
        "keyword",
        "dm_ready",
        "access_hint",
        "post_url",
        "author_url",
        "source_url",
        "collected_at",
        "external_id",
        "openclaw_sync",
    }

    rows: List[Dict] = []
    for lead in leads:
        notes = str(lead.get("notes", "") or "")
        if not notes:
            continue

        meta = _parse_note_meta(notes)
        if not (
            meta.get("openclaw_sync") == "1"
            or meta.get("external_id")
            or meta.get("post_url")
            or meta.get("author_url")
        ):
            continue

        content = _extract_note_content(notes, meta_keys=meta_keys)
        if not content:
            content = notes[-280:]

        rows.append(
            {
                "platform": meta.get("source") or meta.get("platform") or "xhs",
                "keyword": meta.get("keyword", ""),
                "author": str(lead.get("name", "Unknown") or "Unknown"),
                "author_url": meta.get("author_url", ""),
                "content": content,
                "evidence_text": "",
                "post_url": meta.get("post_url", ""),
                "source_url": meta.get("source_url", ""),
                "contact": str(lead.get("phone", "") or ""),
                "score": _safe_int(meta.get("score"), default=70),
                "confidence": _safe_int(meta.get("score"), default=70),
                "grade": "",
                "collected_at": meta.get("collected_at") or str(lead.get("created_at", "") or ""),
                "access_hint": meta.get("access_hint", ""),
                "external_id": meta.get("external_id", ""),
                "__source_file": "supabase_synced",
            }
        )

    if not rows:
        return pd.DataFrame(), []

    return pd.DataFrame(rows).fillna(""), ["supabase_synced"]


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
        noise_author = _is_noise_author(author)
        score = min(100, max(0, base_score + intent_bonus + (10 if dm_ready else 0) - (12 if noise_author else 0)))
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
                "is_noise_author": noise_author,
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
            f"openclaw_sync=1\n"
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



def _collect_acquisition_dataset(user: Dict, uploaded_files=None) -> Tuple[pd.DataFrame, List[str]]:
    raw_df, source_files = _load_external_sources()
    remote_df, remote_files = _load_remote_openclaw_sources(_scoped_user_id(user))
    upload_df, upload_files = _parse_uploaded_lead_files(uploaded_files)

    frames: List[pd.DataFrame] = []
    for frame in [raw_df, remote_df, upload_df]:
        if frame is not None and not frame.empty:
            frames.append(frame)

    source_files = list(dict.fromkeys(source_files + remote_files + upload_files))
    if not frames:
        return pd.DataFrame(), source_files

    combined_raw = pd.concat(frames, ignore_index=True)
    return _normalize_external_df(combined_raw), source_files


def _build_mission_plan(objective: str, hb: Dict, target_rows: int, dm_rows: int) -> List[str]:
    mission = (objective or '').strip() or '留学赛道高意向潜客规模化增长'
    hb_status = str((hb or {}).get('status', 'unknown')).lower()

    sync_line = '保持 OpenClaw + 本地管道持续抓取' if hb_status in {'ok', 'local_only'} else '先修复采集链路，再扩大抓取量'
    filter_line = f'按意向分和机构排除规则收敛至 {max(80, target_rows)} 条高质量线索'
    dm_line = f'优先处理 {max(20, dm_rows)} 条可直接私信主页线索，执行千人千面破冰'

    return [
        f'任务目标：{mission}',
        sync_line,
        filter_line,
        dm_line,
        '把高置信度线索推入线索池并触发 AI SDR，按转化概率自动分流人工接管',
        '每24小时复盘渠道ROI与文案A/B显著性，砍掉负ROI分支',
    ]


def render_command_center(user: Dict) -> None:
    user = refresh_subscription_in_session(user)
    leads = get_leads(_scoped_user_id(user))
    emails = get_emails(_scoped_user_id(user))
    orders = list_lead_pack_orders(str(user.get('id', '')), project_root=PROJECT_ROOT)
    hb = _load_sync_heartbeat()
    norm_df, source_files = _collect_acquisition_dataset(user)

    target_df = norm_df.copy()
    if not target_df.empty:
        if 'is_competitor' in target_df.columns:
            target_df = target_df[~target_df['is_competitor']]
        if 'is_target' in target_df.columns:
            target_df = target_df[target_df['is_target']]
        if 'score' in target_df.columns:
            target_df = target_df[target_df['score'] >= 65]

    dm_df = target_df.copy()
    if not dm_df.empty:
        if 'dm_ready' in dm_df.columns:
            dm_df = dm_df[dm_df['dm_ready'] == True]
        if 'author_url' in dm_df.columns:
            dm_df = dm_df[dm_df['author_url'].astype(str).str.strip() != '']

    delivered_orders = sum(1 for x in orders if str(x.get('status', '')).lower() in {'delivered', 'completed'})
    running_orders = sum(1 for x in orders if str(x.get('status', '')).lower() in {'queued', 'running', 'retry'})
    competitor_rows = int(norm_df['is_competitor'].sum()) if (not norm_df.empty and 'is_competitor' in norm_df.columns) else 0

    if 'mission_objective' not in st.session_state:
        st.session_state['mission_objective'] = '在留学赛道持续获取高意向个人客户，优先私信可直达主页'

    if 'mission_plan' not in st.session_state:
        st.session_state['mission_plan'] = []

    st.markdown('## 作战中枢')
    st.markdown(
        '''
<div class="gs-hero">
  <div class="gs-chip">Manus化工作流</div>
  <div class="gs-chip">留学垂直</div>
  <div class="gs-chip">结果交付</div>
  <h3 style="margin:.65rem 0 .2rem 0;">AI 获客作战台</h3>
  <div class="gs-type" style="max-width:920px;">目标输入 -> 全网采集 -> 意图筛选 -> AI触达 -> 线索包交付 -> ROI归因</div>
</div>
''',
        unsafe_allow_html=True,
    )

    with st.container(border=True):
        with st.form('mission_center_form', clear_on_submit=False):
            objective = st.text_area(
                '增长目标（系统将自动生成执行路径）',
                value=st.session_state.get('mission_objective', ''),
                height=90,
                key='mission_objective_input',
            )
            c1, c2, c3, c4 = st.columns(4)
            mission_min_score = c1.slider('最低意向分', 50, 95, 70, key='mission_min_score')
            mission_limit = c2.slider('本轮导入上限', 50, 1200, 300, step=50, key='mission_limit')
            mission_only_target = c3.checkbox('仅目标潜客', value=True, key='mission_only_target')
            mission_exclude_comp = c4.checkbox('排除机构号', value=True, key='mission_exclude_comp')
            submitted = st.form_submit_button('生成执行计划', type='primary', use_container_width=True)

        if submitted:
            st.session_state['mission_objective'] = objective.strip()
            st.session_state['mission_plan'] = _build_mission_plan(
                objective=objective,
                hb=hb,
                target_rows=int(len(target_df)),
                dm_rows=int(len(dm_df)),
            )

    plan = st.session_state.get('mission_plan') or _build_mission_plan(
        objective=st.session_state.get('mission_objective', ''),
        hb=hb,
        target_rows=int(len(target_df)),
        dm_rows=int(len(dm_df)),
    )

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric('抓取总量', int(len(norm_df)))
    c2.metric('高意向候选', int(len(target_df)))
    c3.metric('可直私信', int(len(dm_df)))
    c4.metric('线索池总量', int(len(leads)))
    c5.metric('触达事件', int(len(emails)))
    c6.metric('已交付订单', int(delivered_orders))

    sync_status = str(hb.get('status', 'unknown')).lower() if hb else 'unknown'
    step_defs = [
        ('01 数据采集', f'状态: {sync_status} | 数据源: {len(source_files)}'),
        ('02 去噪筛选', f'候选: {len(target_df)} | 机构排除: {competitor_rows}'),
        ('03 线索入库', f'线索池累计: {len(leads)}'),
        ('04 AI触达', f'触达事件: {len(emails)}'),
        ('05 结果交付', f'进行中: {running_orders} | 已交付: {delivered_orders}'),
    ]

    st.markdown('### 执行流水线')
    for idx, (title, desc) in enumerate(step_defs):
        css = 'todo'
        if idx == 0 and len(norm_df) > 0:
            css = 'ok'
        elif idx == 1 and len(target_df) > 0:
            css = 'ok'
        elif idx == 2 and len(leads) > 0:
            css = 'ok'
        elif idx == 3 and len(emails) > 0:
            css = 'ok'
        elif idx == 4 and delivered_orders > 0:
            css = 'ok'
        elif idx == 0 and sync_status in {'error', 'unknown'}:
            css = 'warn'
        st.markdown(f'<div class="gs-step {css}"><b>{title}</b><div class="gs-muted">{desc}</div></div>', unsafe_allow_html=True)

    st.markdown('### 本轮计划')
    for i, line in enumerate(plan, 1):
        st.markdown(f'{i}. {line}')

    action1, action2, action3, action4 = st.columns(4)
    if action1.button('一键同步线索到线索池', type='primary', use_container_width=True, key='mission_sync_now'):
        if norm_df.empty:
            st.warning('当前没有可同步线索，请先保证采集产出。')
        else:
            result = _sync_openclaw_leads(
                user_id=user['id'],
                min_score=int(st.session_state.get('mission_min_score', 70)),
                exclude_competitors=bool(st.session_state.get('mission_exclude_comp', True)),
                limit=int(st.session_state.get('mission_limit', 300)),
                normalized=norm_df,
                files=source_files,
                only_target=bool(st.session_state.get('mission_only_target', True)),
                selected_platforms=[],
            )
            st.success(f"同步完成: {result['imported']} / {result['total']}")
            st.rerun()

    if action2.button('进入获客雷达', use_container_width=True, key='go_acq_center'):
        st.session_state['workspace_nav_top'] = '获客'
        st.rerun()
    if action3.button('进入AI销售', use_container_width=True, key='go_sdr_center'):
        st.session_state['workspace_nav_top'] = 'AI销售'
        st.rerun()
    if action4.button('进入线索包交付', use_container_width=True, key='go_pack_center'):
        st.session_state['workspace_nav_top'] = '线索包'
        st.rerun()

    st.markdown('### 高优先级可私信线索')
    if dm_df.empty:
        st.info('当前还没有可直接私信的高质量线索。先跑采集并放宽关键词。')
    else:
        dm_cols = ['platform', 'author', 'score', 'keyword', 'author_url', 'post_url', 'content']
        dm_cols = [c for c in dm_cols if c in dm_df.columns]
        st.dataframe(dm_df[dm_cols].head(80), use_container_width=True, hide_index=True)

def render_login_register() -> None:
    st.title("留学获客引擎")
    st.caption("生产工作台：账号 + 获客 + 触达 + 订阅")

    login_tab, register_tab = st.tabs(["登录", "注册"])

    with login_tab:
        with st.form("login_form", clear_on_submit=False):
            email = st.text_input("邮箱", key="login_email", placeholder="you@company.com")
            password = st.text_input("密码", type="password", key="login_password")
            submitted = st.form_submit_button("登录", use_container_width=True, type="primary")

        if submitted:
            if not email or not password:
                st.error("邮箱和密码不能为空。")
                return

            user = get_user_by_email(email.strip().lower())
            if not user:
                st.error("账号不存在，请先注册。")
                return
            if not verify_password(password, user.get("password_hash", "")):
                st.error("密码错误。")
                return

            token = create_access_token({"sub": user["id"], "email": user["email"]})
            login_user(_user_payload(user), token)
            st.success("登录成功。")
            st.rerun()

    with register_tab:
        with st.form("register_form", clear_on_submit=False):
            name = st.text_input("姓名", key="reg_name")
            company = st.text_input("公司", key="reg_company")
            email = st.text_input("邮箱", key="reg_email")
            password = st.text_input("密码", type="password", key="reg_password")
            password_confirm = st.text_input("确认密码", type="password", key="reg_password_confirm")
            submitted = st.form_submit_button("创建账号", use_container_width=True)

        if submitted:
            if not all([name, company, email, password, password_confirm]):
                st.error("所有字段都必填。")
                return
            if password != password_confirm:
                st.error("两次密码不一致。")
                return
            if len(password) < 8:
                st.error("密码长度至少 8 位。")
                return

            email_norm = email.strip().lower()
            existing = get_user_by_email(email_norm)
            if existing:
                st.error("该邮箱已注册，请直接登录。")
                return

            user_id = create_user(
                {
                    "name": name.strip(),
                    "company": company.strip(),
                    "email": email_norm,
                    "password_hash": get_password_hash(password),
                    "plan": "free",
                    "subscription_status": "inactive",
                }
            )

            user = get_user_by_email(email_norm) or {
                "id": user_id,
                "name": name.strip(),
                "company": company.strip(),
                "email": email_norm,
                "plan": "free",
                "subscription_status": "inactive",
                "stripe_customer_id": "",
                "stripe_subscription_id": "",
                "current_period_end": None,
            }
            token = create_access_token({"sub": user["id"], "email": user["email"]})
            login_user(_user_payload(user), token)
            st.success("账号创建成功，已自动登录。")
            st.rerun()


def render_lead_pack(user: Dict) -> None:
    st.markdown("## 线索包订单")
    st.caption("$50 / 500 条线索：提交需求 -> 队列处理 -> 导出 CSV -> 邮件交付。")

    with st.container(border=True):
        with st.form("lead_pack_form", clear_on_submit=False):
            request_text = st.text_input(
                "你需要什么类型的线索？",
                placeholder="示例：新加坡 SaaS 创始人，对留学规划有需求",
            )
            c1, c2, c3 = st.columns(3)
            region = c1.text_input("地区", value="Singapore")
            role = c2.text_input("角色", value="Founder")
            industry = c3.text_input("行业", value="SaaS")

            c4, c5, c6 = st.columns(3)
            quantity = c4.number_input("线索数量", min_value=100, max_value=2000, value=500, step=50)
            delivery_email = c5.text_input("交付邮箱", value=str(user.get("email", "")))
            mark_paid = c6.checkbox("标记为已支付（运营模式）", value=True)

            process_now = st.checkbox("提交后立即执行该订单", value=False)
            submit = st.form_submit_button("创建线索包订单", use_container_width=True, type="primary")

        if submit:
            if not request_text.strip():
                st.error("请填写线索需求描述。")
            elif "@" not in delivery_email:
                st.error("请填写有效的交付邮箱。")
            else:
                order = create_lead_pack_order(
                    user_id=str(user.get("id", "")),
                    request_text=request_text.strip(),
                    region=region.strip(),
                    role=role.strip(),
                    industry=industry.strip(),
                    quantity=int(quantity),
                    delivery_email=delivery_email.strip(),
                    package_price_usd=50,
                    payment_status="paid" if mark_paid else "unpaid",
                    project_root=PROJECT_ROOT,
                )

                if mark_paid:
                    mark_lead_pack_paid(order["id"], project_root=PROJECT_ROOT)

                st.success(f"订单已创建: {order['id']}")

                if process_now and mark_paid:
                    try:
                        done = process_lead_pack_order(order["id"], project_root=PROJECT_ROOT)
                        st.success(
                            f"订单已处理 rows={done.get('rows_exported', 0)}, delivery={done.get('delivery_status', 'pending')}"
                        )
                        if done.get("csv_path"):
                            st.code(done.get("csv_path"))
                    except Exception as exc:
                        st.error(f"处理失败: {exc}")

    st.markdown("---")
    orders = list_lead_pack_orders(str(user.get("id", "")), project_root=PROJECT_ROOT)
    if not orders:
        st.info("暂无线索包订单。")
        return

    st.markdown(f"### 你的订单: {len(orders)}")
    table = []
    for o in orders:
        table.append(
            {
                "order_id": o.get("id"),
                "status": o.get("status"),
                "payment": o.get("payment_status"),
                "delivery": o.get("delivery_status"),
                "rows": o.get("rows_exported", 0),
                "email": o.get("delivery_email", ""),
                "created_at": o.get("created_at", ""),
            }
        )
    st.dataframe(pd.DataFrame(table), use_container_width=True, hide_index=True)

    selected_order_id = st.selectbox("选择订单", [o.get("id") for o in orders], key="lp_selected_order")
    selected_order = next((o for o in orders if o.get("id") == selected_order_id), None)

    c1, c2, c3 = st.columns(3)
    if c1.button("标记为已支付", key="lp_mark_paid_btn", use_container_width=True):
        mark_lead_pack_paid(selected_order_id, project_root=PROJECT_ROOT)
        st.success("支付状态已更新为 paid。")
        st.rerun()

    if c2.button("处理当前订单", key="lp_process_one_btn", use_container_width=True):
        try:
            done = process_lead_pack_order(selected_order_id, project_root=PROJECT_ROOT)
            st.success(
                f"已完成 rows={done.get('rows_exported', 0)}, delivery={done.get('delivery_status', 'pending')}"
            )
            if done.get("csv_path"):
                st.code(done.get("csv_path"))
            if done.get("delivery_error"):
                st.warning(done.get("delivery_error"))
            st.rerun()
        except Exception as exc:
            st.error(f"处理失败: {exc}")

    if c3.button("处理队列（最多3个）", key="lp_process_queue_btn", use_container_width=True):
        results = process_queued_orders(max_jobs=3, project_root=PROJECT_ROOT)
        st.success(f"队列已处理: {len(results)}")
        if results:
            st.dataframe(pd.DataFrame(results), use_container_width=True, hide_index=True)
        st.rerun()

    if selected_order:
        st.markdown("---")
        st.markdown(f"**订单详情**: `{selected_order.get('id', '')}`")
        if selected_order.get("csv_path"):
            st.code(selected_order.get("csv_path"))
        if selected_order.get("delivery_error"):
            st.warning(selected_order.get("delivery_error"))



def render_overview(user: Dict) -> None:
    user = refresh_subscription_in_session(user)
    stats = get_stats(_scoped_user_id(user))

    st.markdown("## 总览")
    st.markdown(
        """
<div class="gs-hero">
  <div class="gs-chip">结果优先</div>
  <div class="gs-chip">留学垂直</div>
  <div class="gs-chip">B2B SaaS</div>
  <h3 style="margin:.65rem 0 .2rem 0;">留学AI获客引擎</h3>
  <div class="gs-type" style="max-width:900px;">提交需求 -> 抓取 -> 筛选 -> Export CSV -> 交付</div>
</div>
""",
        unsafe_allow_html=True,
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("套餐", (user.get("plan") or "free").upper())
    c2.metric("订阅", user.get("subscription_status") or "inactive")
    c3.metric("线索总数", stats.get("total_leads", 0))
    c4.metric("触达事件", stats.get("total_emails", 0))

    st.markdown("---")
    st.markdown("1. 通过 **线索包** 售卖固定结果包")
    st.markdown("2. 在 **获客** 页面筛选社媒线索")
    st.markdown("3. 使用 **AI SDR** 生成触达文案与回复建议")
    st.markdown("4. 在 **数据分析** 优化 ROI 与 A/B 效果")


def render_leads(user: Dict) -> None:
    st.markdown("## 线索池")

    status_labels = {
        "new": "新线索",
        "contacted": "已联系",
        "qualified": "高意向",
        "converted": "已转化",
        "lost": "已流失",
    }
    status_keys = list(status_labels.keys())

    with st.form("add_lead_form", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)
        with c1:
            name = st.text_input("姓名", key="lead_name")
            email = st.text_input("邮箱", key="lead_email")
        with c2:
            phone = st.text_input("联系方式(phone/wechat)", key="lead_phone")
            status = st.selectbox(
                "状态",
                status_keys,
                format_func=lambda x: status_labels.get(x, x),
                key="lead_status",
            )
        with c3:
            source = st.text_input("来源", value="xhs", key="lead_source")
            score = st.slider("意向分", min_value=0, max_value=100, value=70, key="lead_score")

        notes = st.text_area("备注", height=110, key="lead_notes")
        submit = st.form_submit_button("保存线索", type="primary", use_container_width=True)

    if submit:
        if not name.strip():
            st.error("线索姓名不能为空。")
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
                st.success("线索已保存。")
                st.rerun()
            except Exception as exc:
                st.error(f"保存失败: {exc}")

    leads = get_leads(_scoped_user_id(user))
    if not leads:
        st.info("暂无线索，请先在获客页同步。")
        return

    st.markdown(f"### 线索总数: {len(leads)}")
    df = pd.DataFrame(leads)
    if "status" in df.columns:
        df["status"] = df["status"].map(lambda x: status_labels.get(str(x), str(x)))

    rename_map = {
        "name": "姓名",
        "email": "邮箱",
        "phone": "联系方式",
        "status": "状态",
        "created_at": "创建时间",
        "notes": "备注",
    }
    cols = [c for c in ["name", "email", "phone", "status", "created_at", "notes"] if c in df.columns]
    st.dataframe(df[cols].rename(columns=rename_map), use_container_width=True, hide_index=True)

    st.markdown("---")
    lead_map = {f"{x.get('name', '未知')} | {x.get('email', '')}": x for x in leads}
    selected_label = st.selectbox("选择线索", list(lead_map.keys()), key="lead_pick")
    selected = lead_map[selected_label]
    new_status = st.selectbox(
        "新状态",
        status_keys,
        format_func=lambda x: status_labels.get(x, x),
        key="lead_new_status",
    )

    if st.button("更新状态", key="update_status", use_container_width=True):
        ok = update_lead(selected["id"], {"status": new_status})
        if ok:
            st.success("线索状态已更新。")
            st.rerun()
        else:
            st.error("状态更新失败。")


def render_acquisition(user: Dict) -> None:
    st.markdown("## 获客（OpenClaw）")
    st.caption("读取社交媒体帖子/评论，筛出真实潜客，排除机构号，并同步到线索池。")

    hb = _load_sync_heartbeat()
    if hb:
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("同步状态", str(hb.get("status", "-")).upper())
        c2.metric("循环次数", str(hb.get("loop_count", "-")))
        c3.metric("最近成功", str(hb.get("last_success_at", "-") or "-"))
        c4.metric("错误连击", str(hb.get("error_streak", 0)))
        if hb.get("last_error"):
            st.warning(f"同步异常：{hb.get('last_error')}")

    uploaded_files = st.file_uploader(
        "上传线索文件(csv/json/txt/md)",
        type=["csv", "json", "txt", "md"],
        accept_multiple_files=True,
        key="oc_uploads",
    )

    norm_df, source_files = _collect_acquisition_dataset(user, uploaded_files=uploaded_files)

    if norm_df.empty:
        st.warning("未检测到线索数据。请先运行 OpenClaw 或上传文件。")
        with st.expander("预期文件路径"):
            st.code(
                "data/openclaw/openclaw_leads_latest.csv\n"
                "data/openclaw/openclaw_leads_latest.json\n"
                "data/exports/high_value_leads_latest.csv\n"
                "data/exports/high_value_leads_latest.json"
            )
        st.caption("本地到云端实时同步命令: python openclaw_realtime_sync.py --user-email YOUR_LOGIN_EMAIL --loop")
        return

    platform_options = sorted([p for p in norm_df["platform"].dropna().astype(str).unique().tolist() if p])
    default_platforms = platform_options[:]

    with st.container(border=True):
        c1, c2, c3, c4, c5 = st.columns([1.5, 1, 1, 1, 1.2])
        selected_platforms = c1.multiselect("平台", platform_options, default=default_platforms, key="oc_platforms")
        min_score = c2.slider("最低意向分", 0, 100, 65, key="oc_min_score")
        only_target = c3.checkbox("仅保留目标潜客", value=True, key="oc_only_target")
        exclude_comp = c4.checkbox("排除机构/竞品", value=True, key="oc_exclude_comp")
        import_limit = c5.slider("单次同步上限", 20, 2000, 400, step=20, key="oc_import_limit")
        text_filter = st.text_input("关键词过滤(\u4f5c\u8005/\u5185\u5bb9/\u5173\u952e\u8bcd)", key="oc_text_filter").strip().lower()

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
    m1.metric("原始线索", raw_total)
    m2.metric("筛选后", filtered_total)
    m3.metric("目标潜客", target_count)
    m4.metric("DM可直联", dm_ready_count)

    if source_files:
        st.caption("数据来源: " + ", ".join(source_files))

    st.markdown("---")
    if st.button("同步筛选线索到线索池", type="primary", use_container_width=True, key="sync_openclaw"):
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
        st.success(f"已导入: {result['imported']} / {result['total']}")
        st.info(
            "已跳过: "
            f"平台: {result['skipped_platform']}, "
            f"机构/竞品: {result['skipped_competitor']}, "
            f"低分: {result['skipped_score']}, "
            f"非目标: {result['skipped_non_target']}, "
            f"重复: {result['skipped_duplicate']}"
        )

    if view_df.empty:
        st.warning("当前筛选条件下没有线索。请降低阈值或放宽筛选。")
    else:
        st.markdown(f"### 筛选后线索: {len(view_df)}")
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

        dm_df = view_df.copy()
        if "dm_ready" in dm_df.columns:
            dm_df = dm_df[dm_df["dm_ready"] == True]
        if "is_competitor" in dm_df.columns:
            dm_df = dm_df[~dm_df["is_competitor"]]
        if "author_url" in dm_df.columns:
            dm_df = dm_df[dm_df["author_url"].astype(str).str.strip() != ""]

        if not dm_df.empty:
            st.markdown(f"### 可直接私信主页: {len(dm_df)}")
            dm_cols = ["platform", "author", "score", "keyword", "author_url", "post_url", "content"]
            dm_cols = [c for c in dm_cols if c in dm_df.columns]
            st.dataframe(dm_df[dm_cols].head(import_limit), use_container_width=True, hide_index=True)

        with st.expander("线索证据文本", expanded=False):
            for row in view_df.head(30).to_dict(orient="records"):
                url = row.get("author_url") or row.get("post_url") or row.get("source_url") or ""
                snippet = str(row.get("content", "") or "").replace("\n", " ").strip()
                if len(snippet) > 220:
                    snippet = snippet[:220] + "..."
                st.markdown(f"- [{row.get('platform', '')}] {row.get('author', 'Unknown')} | score {row.get('score', 0)} | {url}")
                if snippet:
                    st.caption(snippet)

    st.markdown("---")
    with st.expander("单条线索录入", expanded=False):
        with st.form("single_capture", clear_on_submit=True):
            content = st.text_area("评论/帖子文本", key="single_content")
            author = st.text_input("作者", key="single_author")
            contact = st.text_input("联系方式提示", key="single_contact")
            score = st.slider("意向置信度", 0, 100, 75, key="single_score")
            submit_single = st.form_submit_button("保存线索", use_container_width=True, type="primary")

        if submit_single:
            if not author.strip() and not content.strip():
                st.error("作者或内容至少填一项。")
            else:
                payload = {
                    "user_id": user["id"],
                    "name": author.strip() or "社交平台用户",
                    "email": "",
                    "phone": contact.strip(),
                    "status": "new",
                    "notes": f"source=social_comment | score={score}\n{content.strip()}",
                }
                try:
                    add_lead(payload)
                    st.success("线索已保存。")
                    st.rerun()
                except Exception as exc:
                    st.error(f"保存失败: {exc}")


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
    st.markdown("## 数据分析")
    st.caption("渠道 ROI + CAC 归因 + 文案 A/B 显著性")

    leads = get_leads(_scoped_user_id(user))
    emails = get_emails(_scoped_user_id(user))

    if not leads:
        st.info("暂无线索，请先在获客页同步。")
        return

    channels = sorted(set(extract_channel_from_lead(x) for x in leads))
    if not channels:
        channels = ["unknown"]

    with st.container(border=True):
        c1, c2 = st.columns(2)
        avg_contract_value = c1.number_input("平均客单价（CNY）", min_value=1000.0, value=15000.0, step=1000.0)
        positive_metric = c2.selectbox("A/B 正向指标", ["clicked", "opened"], index=0)

        st.markdown("**渠道 CAC 假设（每条线索成本）**")
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
        st.warning("暂无渠道指标数据。")
        return

    total_cost = float(channel_df["acquisition_cost"].sum())
    total_revenue = float(channel_df["revenue"].sum())
    total_profit = float(channel_df["net_profit"].sum())
    roi = (total_profit / total_cost * 100) if total_cost > 0 else 0.0

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("线索量", len(leads))
    m2.metric("预计成本", f"CNY {total_cost:,.0f}")
    m3.metric("预计收入", f"CNY {total_revenue:,.0f}")
    m4.metric("ROI", f"{roi:.1f}%")

    st.markdown("---")
    st.markdown("### 渠道 ROI / CAC")
    st.dataframe(channel_df, use_container_width=True, hide_index=True)

    chart_df = channel_df[["channel", "roi_pct", "conversion_rate_pct", "dm_ready_rate_pct"]].set_index("channel")
    st.bar_chart(chart_df, height=260)

    st.markdown("### 转化漏斗")
    st.dataframe(funnel_df, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### 文案 A/B 测试")
    ab_df = build_ab_variant_stats(emails)
    if ab_df.empty:
        st.info("还没有 A/B 打标触达记录，请先在 AI 销售页保存事件。")
    else:
        st.dataframe(ab_df, use_container_width=True, hide_index=True)
        sig = build_ab_significance(ab_df, metric=positive_metric)
        if sig.get("variant_a"):
            line = (
                f"{sig['variant_a']} vs {sig['variant_b']} | "
                f"delta={sig['diff_pct']}% | p={sig['p_value']} | z={sig['z']}"
            )
            if sig.get("significant"):
                st.success("达到统计显著：" + line)
            else:
                st.warning("暂未达到显著：" + line)

    with st.expander("手动记录 A/B 事件", expanded=False):
        label_map = _lead_label_map(leads)
        labels = list(label_map.keys())
        with st.form("ab_event_form", clear_on_submit=True):
            lead_label = st.selectbox("线索", labels, key="ab_lead") if labels else None
            variant = st.selectbox("版本", ["A", "B", "C"], key="ab_variant")
            outcome = st.selectbox("结果", ["sent", "opened", "clicked"], key="ab_outcome")
            subject = st.text_input("标题", value="Outreach experiment", key="ab_subject")
            body = st.text_area("正文", value="variant test", key="ab_body", height=80)
            ok = st.form_submit_button("保存 A/B 事件", use_container_width=True)

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
            st.success("A/B 事件已保存。")
            st.rerun()


def render_sdr_agent(user: Dict) -> None:
    st.markdown("## AI 销售")
    st.caption("个性化触达生成 + 自动分诊 + 高价值强制转人工")

    leads = get_leads(_scoped_user_id(user))
    if not leads:
        st.info("当前没有线索，请先新增或同步。")
        return

    if "sdr_webhook_url" not in st.session_state:
        st.session_state["sdr_webhook_url"] = ""

    with st.container(border=True):
        c1, c2 = st.columns([1, 2])
        handoff_threshold = c1.slider("人工接管阈值", 50, 95, 75, key="sdr_threshold")
        st.session_state["sdr_webhook_url"] = c2.text_input(
            "紧急接管 Webhook（可选）",
            value=st.session_state.get("sdr_webhook_url", ""),
            key="sdr_webhook",
            placeholder="https://example.com/webhook",
        )

    tab1, tab2 = st.tabs(["触达文案", "回复分诊"])

    with tab1:
        lead_map = _lead_label_map(leads)
        labels = list(lead_map.keys())
        selected_label = st.selectbox("目标线索", labels, key="sdr_target")
        lead = lead_map[selected_label]

        c1, c2, c3 = st.columns(3)
        variant = c1.selectbox("提示词版本", ["A", "B", "C"], key="sdr_variant")
        tone = c2.selectbox("语气风格", ["professional", "direct", "warm", "consultative"], key="sdr_tone")
        angle = c3.selectbox(
            "痛点角度",
            ["timeline risk", "budget fit", "school selection", "essay quality", "visa uncertainty"],
            key="sdr_angle",
        )
        cta = st.text_input("行动指令", value="预约10分钟评估沟通", key="sdr_cta")

        if st.button("生成个性化触达文案", type="primary", use_container_width=True, key="sdr_gen"):
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
            st.markdown(f"**标题**: {copy.get('subject', '')}")
            st.markdown(f"<div class='gs-type'>{copy.get('message', '')}</div>", unsafe_allow_html=True)
            st.caption(f"生成模式：{copy.get('mode', 'fallback')}")
            st.markdown("</div>", unsafe_allow_html=True)

            c_log, c_out = st.columns([1.2, 1])
            event_outcome = c_out.selectbox("记录结果", ["sent", "opened", "clicked"], key="sdr_event_outcome")
            if c_log.button("保存触达事件", use_container_width=True, key="sdr_save_event"):
                _record_ab_email_event(
                    user_id=user["id"],
                    lead_id=lead.get("id"),
                    variant=variant,
                    subject=copy.get("subject", "Outreach"),
                    body=copy.get("message", ""),
                    outcome=event_outcome,
                )
                st.success("触达事件已记录到 A/B 分析。")

    with tab2:
        lead_map = _lead_label_map(leads)
        labels = list(lead_map.keys())
        triage_label = st.selectbox("线索", labels, key="triage_lead")
        lead = lead_map[triage_label]
        inbound = st.text_area(
            "客户回复/评论内容",
            height=140,
            key="triage_text",
            placeholder="粘贴客户回复文本",
        )

        if st.button("分析并生成回复", type="primary", use_container_width=True, key="triage_btn"):
            probability = estimate_conversion_probability(lead, inbound)
            handoff, reason = detect_handoff(probability, inbound, threshold=handoff_threshold)
            reply = generate_agent_reply(lead, inbound, probability)

            p1, p2, p3 = st.columns(3)
            p1.metric("转化概率", f"{probability}%")
            p2.metric("转人工", "是" if handoff else "否")
            p3.metric("阈值", f"{handoff_threshold}%")

            st.markdown("### AI建议回复")
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
                st.error(f"触发强制转人工：{reason}")
                st.caption(f"转人工 log: {log_path}")

                webhook = st.session_state.get("sdr_webhook_url", "")
                ok, msg = trigger_handoff_webhook(webhook, event)
                if webhook:
                    if ok:
                        st.success(f"Webhook 已送达（{msg}）")
                    else:
                        st.warning(f"Webhook 失败（{msg}）")

                # high-probability leads are moved to qualified for human follow-up queue
                update_lead(lead["id"], {"status": "qualified"})
            else:
                st.success("由 AI 代理自动处理，无需转人工。")


def main() -> None:
    init_session_state()

    db_ok = _db_ready()
    if not db_ok:
        st.warning("\u4e91\u6570\u636e\u5e93\u672a\u8fde\u63a5\uff0c\u5df2\u5207\u6362\u5230\u672c\u5730\u6a21\u5f0f\u3002")

    user = get_current_user()
    if not user and _auto_login_guest_user():
        user = get_current_user()
    if not user and ENABLE_GUEST_AUTOLOGIN:
        user = _force_session_guest_login()
    if not user:
        render_login_register()
        st.stop()

    try:
        process_checkout_query(user)
    except Exception as exc:
        st.error(f"Checkout sync error: {exc}")

    user = refresh_subscription_in_session(get_current_user() or user)
    try:
        _bootstrap_user_leads_if_needed(user)
    except Exception as exc:
        st.warning(f"\u7ebf\u7d22\u52a0\u8f7d\u5df2\u964d\u7ea7\u5230\u672c\u5730\u6a21\u5f0f\uff1a{exc}")

    st.markdown(
        f"""
<div class="gs-topbar">
  <div>
    <div class="gs-topbar-title">留学获客引擎 | Manus级 AI 作战台</div>
    <div class="gs-topbar-sub">卖结果：目标输入 -> 自动执行 -> 线索交付 -> 复盘优化</div>
  </div>
  <div class="gs-topbar-meta">账号: {user.get('email', '-')}<br/>套餐: {(user.get('plan') or 'free').upper()} / {user.get('subscription_status') or 'inactive'}</div>
</div>
""",
        unsafe_allow_html=True,
    )

    page = st.radio(
        "导航",
        ["作战中枢", "线索包", "总览", "获客", "AI销售", "数据分析", "线索池", "订阅", "退出登录"],
        horizontal=True,
        label_visibility="collapsed",
        key="workspace_nav_top",
    )

    if page == "退出登录":
        logout_user()
        st.rerun()

    if page in {"作战中枢", "线索池", "获客", "AI销售", "数据分析"} and not has_required_plan(user, minimum="pro"):
        st.info("当前为试用模式。升级 Pro 可开启完整自动化和更高额度。")

    if page == "作战中枢":
        render_command_center(user)
    elif page == "线索包":
        render_lead_pack(user)
    elif page == "总览":
        render_overview(user)
    elif page == "获客":
        render_acquisition(user)
    elif page == "AI销售":
        render_sdr_agent(user)
    elif page == "数据分析":
        render_analytics(user)
    elif page == "线索池":
        render_leads(user)
    elif page == "订阅":
        render_billing_page()


if __name__ == "__main__":
    main()

