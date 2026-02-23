import math
import re
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

import pandas as pd

CONVERTED_STATUSES = {"converted", "signed"}
QUALIFIED_STATUSES = {"qualified", "converted", "signed"}
ACTIVE_EMAIL_STATUSES = {"sent", "opened", "clicked", "replied"}


def parse_note_meta(notes: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not notes:
        return out

    for line in str(notes).splitlines():
        line = line.strip()
        if not line:
            continue
        if "|" in line:
            pieces = [x.strip() for x in line.split("|") if x.strip()]
        else:
            pieces = [line]

        for piece in pieces:
            if "=" not in piece:
                continue
            k, v = piece.split("=", 1)
            out[k.strip().lower()] = v.strip()
    return out


def _safe_int(text: Optional[str], default: int = 0) -> int:
    if text is None:
        return default
    s = str(text).strip()
    if not s:
        return default
    m = re.findall(r"\d+", s)
    if not m:
        return default
    try:
        return int(m[0])
    except Exception:
        return default


def extract_channel_from_lead(lead: Dict) -> str:
    meta = parse_note_meta(str(lead.get("notes", "")))
    channel = meta.get("source", "") or meta.get("platform", "")
    channel = str(channel).strip().lower()
    if channel:
        return channel
    return "unknown"


def extract_intent_score(lead: Dict) -> int:
    meta = parse_note_meta(str(lead.get("notes", "")))
    return _safe_int(meta.get("score"), 0)


def extract_dm_ready(lead: Dict) -> bool:
    meta = parse_note_meta(str(lead.get("notes", "")))
    dm = str(meta.get("dm_ready", "")).strip().lower()
    if dm in {"true", "1", "yes"}:
        return True
    notes = str(lead.get("notes", "")).lower()
    return "author_url=" in notes and "/user/profile/" in notes


def build_channel_metrics(
    leads: List[Dict],
    channel_costs: Optional[Dict[str, float]] = None,
    avg_contract_value: float = 15000.0,
) -> pd.DataFrame:
    channel_costs = channel_costs or {}
    buckets: Dict[str, Dict] = defaultdict(
        lambda: {
            "channel": "unknown",
            "leads": 0,
            "qualified": 0,
            "converted": 0,
            "dm_ready": 0,
            "intent_sum": 0,
            "intent_count": 0,
            "acquisition_cost": 0.0,
            "revenue": 0.0,
        }
    )

    for lead in leads:
        channel = extract_channel_from_lead(lead)
        b = buckets[channel]
        b["channel"] = channel
        b["leads"] += 1

        status = str(lead.get("status", "")).strip().lower()
        if status in QUALIFIED_STATUSES:
            b["qualified"] += 1
        if status in CONVERTED_STATUSES:
            b["converted"] += 1

        if extract_dm_ready(lead):
            b["dm_ready"] += 1

        score = extract_intent_score(lead)
        if score > 0:
            b["intent_sum"] += score
            b["intent_count"] += 1

    rows = []
    for channel, b in buckets.items():
        cost_per_lead = float(channel_costs.get(channel, 40.0))
        acquisition_cost = b["leads"] * cost_per_lead
        revenue = b["converted"] * float(avg_contract_value)
        roi = ((revenue - acquisition_cost) / acquisition_cost * 100) if acquisition_cost > 0 else 0.0
        conv_rate = (b["converted"] / b["leads"] * 100) if b["leads"] > 0 else 0.0
        qual_rate = (b["qualified"] / b["leads"] * 100) if b["leads"] > 0 else 0.0
        dm_rate = (b["dm_ready"] / b["leads"] * 100) if b["leads"] > 0 else 0.0
        cac = (acquisition_cost / b["converted"]) if b["converted"] > 0 else None
        avg_intent = (b["intent_sum"] / b["intent_count"]) if b["intent_count"] > 0 else 0.0

        rows.append(
            {
                "channel": channel,
                "leads": b["leads"],
                "qualified": b["qualified"],
                "converted": b["converted"],
                "qualified_rate_pct": round(qual_rate, 2),
                "conversion_rate_pct": round(conv_rate, 2),
                "dm_ready_rate_pct": round(dm_rate, 2),
                "avg_intent_score": round(avg_intent, 2),
                "acquisition_cost": round(acquisition_cost, 2),
                "revenue": round(revenue, 2),
                "net_profit": round(revenue - acquisition_cost, 2),
                "roi_pct": round(roi, 2),
                "cac": round(cac, 2) if cac is not None else None,
            }
        )

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df = df.sort_values(by=["roi_pct", "conversion_rate_pct"], ascending=[False, False])
    return df


def build_funnel(leads: List[Dict]) -> pd.DataFrame:
    total = len(leads)
    contacted = 0
    qualified = 0
    converted = 0

    for lead in leads:
        status = str(lead.get("status", "")).strip().lower()
        if status in {"contacted", "qualified", "converted", "signed"}:
            contacted += 1
        if status in QUALIFIED_STATUSES:
            qualified += 1
        if status in CONVERTED_STATUSES:
            converted += 1

    rows = [
        {"stage": "captured", "count": total, "rate_from_top_pct": 100.0 if total else 0.0},
        {"stage": "contacted", "count": contacted, "rate_from_top_pct": (contacted / total * 100) if total else 0.0},
        {"stage": "qualified", "count": qualified, "rate_from_top_pct": (qualified / total * 100) if total else 0.0},
        {"stage": "converted", "count": converted, "rate_from_top_pct": (converted / total * 100) if total else 0.0},
    ]
    return pd.DataFrame(rows)


def extract_variant(email: Dict) -> Optional[str]:
    subject = str(email.get("subject", "") or "")
    body = str(email.get("body", "") or "")
    text = f"{subject} {body}"

    patterns = [
        r"\[AB:([A-Za-z0-9_-]{1,12})\]",
        r"\[VARIANT:([A-Za-z0-9_-]{1,12})\]",
        r"variant=([A-Za-z0-9_-]{1,12})",
    ]
    for pat in patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return None


def build_ab_variant_stats(emails: List[Dict]) -> pd.DataFrame:
    buckets: Dict[str, Dict] = defaultdict(
        lambda: {
            "variant": "",
            "sent": 0,
            "opened": 0,
            "clicked": 0,
        }
    )

    for email in emails:
        v = extract_variant(email)
        if not v:
            continue

        b = buckets[v]
        b["variant"] = v
        status = str(email.get("status", "")).strip().lower()
        if status in ACTIVE_EMAIL_STATUSES or email.get("sent_at") or email.get("created_at"):
            b["sent"] += 1

        if email.get("opened_at"):
            b["opened"] += 1
        if email.get("clicked_at"):
            b["clicked"] += 1

    rows = []
    for v, b in buckets.items():
        sent = b["sent"]
        open_rate = (b["opened"] / sent * 100) if sent else 0.0
        click_rate = (b["clicked"] / sent * 100) if sent else 0.0
        rows.append(
            {
                "variant": v,
                "sent": sent,
                "opened": b["opened"],
                "clicked": b["clicked"],
                "open_rate_pct": round(open_rate, 2),
                "click_rate_pct": round(click_rate, 2),
            }
        )

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df = df.sort_values(by=["sent", "click_rate_pct"], ascending=[False, False])
    return df


def z_test_proportions(success_a: int, total_a: int, success_b: int, total_b: int) -> Dict[str, float]:
    if total_a <= 0 or total_b <= 0:
        return {"z": 0.0, "p_value": 1.0, "diff_pct": 0.0}

    p1 = success_a / total_a
    p2 = success_b / total_b
    pooled = (success_a + success_b) / (total_a + total_b)
    se = math.sqrt(max(pooled * (1.0 - pooled) * (1.0 / total_a + 1.0 / total_b), 1e-12))
    z = (p1 - p2) / se
    p_value = math.erfc(abs(z) / math.sqrt(2.0))
    return {"z": z, "p_value": p_value, "diff_pct": (p1 - p2) * 100}


def build_ab_significance(ab_df: pd.DataFrame, metric: str = "clicked") -> Dict[str, Optional[float]]:
    if ab_df.empty or len(ab_df) < 2:
        return {
            "variant_a": None,
            "variant_b": None,
            "p_value": None,
            "z": None,
            "diff_pct": None,
            "significant": False,
        }

    metric = metric if metric in {"clicked", "opened"} else "clicked"
    top = ab_df.sort_values(by=["sent"], ascending=False).head(2)
    a = top.iloc[0]
    b = top.iloc[1]
    test = z_test_proportions(int(a[metric]), int(a["sent"]), int(b[metric]), int(b["sent"]))

    return {
        "variant_a": str(a["variant"]),
        "variant_b": str(b["variant"]),
        "p_value": round(float(test["p_value"]), 6),
        "z": round(float(test["z"]), 4),
        "diff_pct": round(float(test["diff_pct"]), 2),
        "significant": bool(test["p_value"] < 0.05),
    }
