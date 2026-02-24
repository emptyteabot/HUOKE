import base64
import csv
import io
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import (
        Attachment,
        Disposition,
        FileContent,
        FileName,
        FileType,
        Mail,
    )
except Exception:  # pragma: no cover
    SendGridAPIClient = None
    Attachment = None
    Disposition = None
    FileContent = None
    FileName = None
    FileType = None
    Mail = None

from config import FROM_EMAIL, FROM_NAME, SENDGRID_API_KEY

COMPETITOR_HINTS = [
    "留学机构",
    "留学中介",
    "顾问工作室",
    "欢迎咨询",
    "私信我",
    "加v",
    "微信咨询",
    "服务报价",
    "代办",
    "机构直营",
]

TEXT_KEYS = ["content", "text", "comment", "title", "evidence_text"]


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _root(project_root: Optional[Path] = None) -> Path:
    if project_root:
        return Path(project_root)
    return Path(__file__).resolve().parents[2]


def _orders_path(project_root: Optional[Path] = None) -> Path:
    return _root(project_root) / "data" / "lead_packs" / "orders.json"


def _output_dir(project_root: Optional[Path] = None) -> Path:
    return _root(project_root) / "data" / "lead_packs" / "outputs"


def _ensure_paths(project_root: Optional[Path] = None) -> None:
    op = _orders_path(project_root)
    od = _output_dir(project_root)
    op.parent.mkdir(parents=True, exist_ok=True)
    od.mkdir(parents=True, exist_ok=True)
    if not op.exists():
        op.write_text("[]", encoding="utf-8")


def _load_orders(project_root: Optional[Path] = None) -> List[Dict]:
    _ensure_paths(project_root)
    p = _orders_path(project_root)
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        data = []
    if not isinstance(data, list):
        return []
    return data


def _save_orders(orders: List[Dict], project_root: Optional[Path] = None) -> None:
    _ensure_paths(project_root)
    p = _orders_path(project_root)
    p.write_text(json.dumps(orders, ensure_ascii=False, indent=2), encoding="utf-8")


def create_lead_pack_order(
    user_id: str,
    request_text: str,
    region: str,
    role: str,
    industry: str,
    quantity: int,
    delivery_email: str,
    package_price_usd: int = 50,
    payment_status: str = "unpaid",
    project_root: Optional[Path] = None,
) -> Dict:
    orders = _load_orders(project_root)

    order = {
        "id": f"lp_{uuid.uuid4().hex[:12]}",
        "user_id": str(user_id),
        "request_text": str(request_text or "").strip(),
        "region": str(region or "").strip(),
        "role": str(role or "").strip(),
        "industry": str(industry or "").strip(),
        "quantity": int(max(50, min(2000, int(quantity or 500)))),
        "package_price_usd": int(package_price_usd),
        "delivery_email": str(delivery_email or "").strip(),
        "payment_status": str(payment_status or "unpaid").strip().lower(),
        "status": "queued",
        "rows_exported": 0,
        "csv_path": "",
        "delivery_status": "pending",
        "delivery_error": "",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    orders.append(order)
    _save_orders(orders, project_root)
    return order


def list_lead_pack_orders(user_id: Optional[str] = None, project_root: Optional[Path] = None) -> List[Dict]:
    orders = _load_orders(project_root)
    if user_id:
        orders = [o for o in orders if str(o.get("user_id")) == str(user_id)]
    orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return orders


def get_lead_pack_order(order_id: str, project_root: Optional[Path] = None) -> Optional[Dict]:
    for order in _load_orders(project_root):
        if str(order.get("id")) == str(order_id):
            return order
    return None


def update_lead_pack_order(order_id: str, updates: Dict, project_root: Optional[Path] = None) -> Optional[Dict]:
    orders = _load_orders(project_root)
    out = None
    for order in orders:
        if str(order.get("id")) != str(order_id):
            continue
        order.update(dict(updates or {}))
        order["updated_at"] = _now_iso()
        out = dict(order)
        break
    if out is None:
        return None
    _save_orders(orders, project_root)
    return out


def mark_lead_pack_paid(order_id: str, project_root: Optional[Path] = None) -> Optional[Dict]:
    return update_lead_pack_order(order_id, {"payment_status": "paid"}, project_root)


def _safe_str(row: Dict, keys: List[str]) -> str:
    for key in keys:
        val = row.get(key)
        if val is None:
            continue
        text = str(val).strip()
        if text:
            return text
    return ""


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except Exception:
        return default


def _repair_mojibake(text: str) -> str:
    raw = str(text or "").strip()
    if not raw:
        return ""

    best = raw
    for enc in ("gb18030", "gbk"):
        try:
            candidate = raw.encode(enc, errors="ignore").decode("utf-8", errors="ignore").strip()
        except Exception:
            continue
        if candidate and candidate.count("?") < best.count("?"):
            best = candidate
    return best


def _normalize_platform(platform: str, post_url: str, source_url: str) -> str:
    p = _repair_mojibake(platform).lower()
    merged = f"{p} {str(post_url).lower()} {str(source_url).lower()}"
    if "xiaohongshu" in merged or "xhs" in merged or "\u5c0f\u7ea2\u4e66" in merged:
        return "xhs"
    if "weibo" in merged or "\u5fae\u535a" in merged:
        return "weibo"
    if "zhihu" in merged or "\u77e5\u4e4e" in merged:
        return "zhihu"
    if "douyin" in merged or "\u6296\u97f3" in merged:
        return "douyin"
    return p or "xhs"


def _extract_json_rows(obj) -> List[Dict]:
    rows: List[Dict] = []

    def walk(node):
        if isinstance(node, dict):
            looks_like_row = any(k in node for k in ("content", "text", "comment", "title", "author", "name", "platform"))
            if looks_like_row:
                rows.append(node)
            for val in node.values():
                walk(val)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(obj)
    return rows


def _read_csv_any(path: Path) -> List[Dict]:
    raw = path.read_bytes()
    for enc in ("utf-8", "utf-8-sig", "gbk", "gb18030"):
        try:
            text = raw.decode(enc)
            return list(csv.DictReader(io.StringIO(text)))
        except Exception:
            continue
    return []


def _latest(base: Path, pattern: str) -> Optional[Path]:
    files = sorted(base.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def _candidate_files(project_root: Optional[Path] = None) -> List[Path]:
    root = _root(project_root)
    openclaw_dir = root / "data" / "openclaw"
    exports_dir = root / "data" / "exports"

    out = []

    openclaw_csv = openclaw_dir / "openclaw_leads_latest.csv"
    openclaw_json = openclaw_dir / "openclaw_leads_latest.json"
    if openclaw_csv.exists():
        out.append(openclaw_csv)
    elif openclaw_json.exists():
        out.append(openclaw_json)

    latest_fixed_csv = exports_dir / "high_value_leads_latest.csv"
    latest_fixed_json = exports_dir / "high_value_leads_latest.json"
    if latest_fixed_csv.exists():
        out.append(latest_fixed_csv)
    elif latest_fixed_json.exists():
        out.append(latest_fixed_json)

    latest_csv = _latest(exports_dir, "high_value_leads_*.csv")
    latest_json = _latest(exports_dir, "high_value_leads_*.json")
    if latest_csv:
        out.append(latest_csv)
    elif latest_json:
        out.append(latest_json)

    seen = set()
    uniq = []
    for p in out:
        if not p.exists():
            continue
        rp = str(p.resolve())
        if rp in seen:
            continue
        seen.add(rp)
        uniq.append(p)
    return uniq


def _normalize_source_rows(project_root: Optional[Path] = None) -> List[Dict]:
    rows: List[Dict] = []

    for fp in _candidate_files(project_root):
        loaded: List[Dict] = []
        if fp.suffix.lower() == ".csv":
            loaded = _read_csv_any(fp)
        else:
            raw = fp.read_bytes()
            obj = None
            for enc in ("utf-8", "utf-8-sig", "gbk", "gb18030"):
                try:
                    obj = json.loads(raw.decode(enc, errors="ignore"))
                    break
                except Exception:
                    continue
            loaded = _extract_json_rows(obj)

        for row in loaded:
            platform_raw = _safe_str(row, ["platform", "source"]) or "xhs"
            author = _repair_mojibake(_safe_str(row, ["author", "name", "nickname", "user"])) or "unknown"
            content = _repair_mojibake(_safe_str(row, TEXT_KEYS))
            keyword = _repair_mojibake(_safe_str(row, ["keyword", "query"]))
            contact = _repair_mojibake(_safe_str(row, ["phone", "wechat", "contact", "email"]))
            author_url = _safe_str(row, ["author_url", "profile_url", "user_url"])
            post_url = _safe_str(row, ["note_url", "post_url", "url", "link"])
            source_url = _safe_str(row, ["source_url", "search_url", "origin_url"])
            platform = _normalize_platform(platform_raw, post_url, source_url)
            score = _safe_int(row.get("score"), _safe_int(row.get("confidence"), 65))
            collected_at = _safe_str(row, ["collected_at", "created_at", "timestamp"])

            text_blob = " ".join([platform, author, content, keyword, contact]).lower()
            rows.append(
                {
                    "platform": platform,
                    "author": author,
                    "content": content,
                    "keyword": keyword,
                    "contact": contact,
                    "author_url": author_url,
                    "post_url": post_url,
                    "source_url": source_url,
                    "score": max(0, min(100, score)),
                    "collected_at": collected_at,
                    "source_file": fp.name,
                    "search_blob": text_blob,
                }
            )

    return rows


def _tokenize(text: str) -> List[str]:
    if not text:
        return []
    raw_tokens = re.split(r"[\s,;|/\\:()\[\]{}<>\-]+", text.lower())
    out = []
    for tok in raw_tokens:
        tok = tok.strip()
        if len(tok) < 2:
            continue
        out.append(tok)
    return out


def _is_competitor(author: str, content: str) -> bool:
    text = f"{author} {content}".lower()
    return any(k in text for k in COMPETITOR_HINTS)


def build_lead_pack_rows(order: Dict, project_root: Optional[Path] = None) -> List[Dict]:
    all_rows = _normalize_source_rows(project_root)
    if not all_rows:
        return []

    query = " ".join(
        [
            str(order.get("request_text", "")),
            str(order.get("region", "")),
            str(order.get("role", "")),
            str(order.get("industry", "")),
        ]
    ).strip()
    tokens = _tokenize(query)
    quantity = int(order.get("quantity", 500) or 500)

    ranked: List[Dict] = []
    for row in all_rows:
        if _is_competitor(str(row.get("author", "")), str(row.get("content", ""))):
            continue

        blob = str(row.get("search_blob", ""))
        match_score = 0
        if tokens:
            for tok in tokens:
                if tok in blob:
                    match_score += 1
            if match_score == 0:
                continue

        score = int(row.get("score", 60) or 60)
        rank_score = score + match_score * 12
        if row.get("author_url"):
            rank_score += 8
        if row.get("contact"):
            rank_score += 5

        out = dict(row)
        out["match_score"] = match_score
        out["rank_score"] = rank_score
        ranked.append(out)

    ranked.sort(key=lambda x: (x.get("rank_score", 0), x.get("score", 0)), reverse=True)

    dedup = set()
    result = []
    for row in ranked:
        key = "|".join(
            [
                str(row.get("author", "")).strip().lower(),
                str(row.get("post_url", "")).strip().lower(),
                str(row.get("content", "")).strip().lower()[:120],
            ]
        )
        if key in dedup:
            continue
        dedup.add(key)
        result.append(row)
        if len(result) >= max(50, min(2000, quantity)):
            break

    return result


def export_order_csv(order_id: str, rows: List[Dict], project_root: Optional[Path] = None) -> Path:
    _ensure_paths(project_root)
    out = _output_dir(project_root) / f"{order_id}.csv"

    fields = [
        "platform",
        "author",
        "score",
        "match_score",
        "keyword",
        "contact",
        "author_url",
        "post_url",
        "source_url",
        "collected_at",
        "source_file",
        "content",
    ]

    with out.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            payload = {k: row.get(k, "") for k in fields}
            writer.writerow(payload)

    return out


def _send_csv_via_sendgrid(to_email: str, order_id: str, request_text: str, csv_path: Path) -> Dict:
    if not SENDGRID_API_KEY or not FROM_EMAIL:
        return {"ok": False, "error": "SENDGRID_API_KEY or FROM_EMAIL missing"}

    if SendGridAPIClient is None or Mail is None:
        return {"ok": False, "error": "sendgrid package not available"}

    file_bytes = csv_path.read_bytes()
    encoded = base64.b64encode(file_bytes).decode("ascii")

    subject = f"Your Lead Pack is ready ({order_id})"
    body = (
        "Your order has been completed.\n\n"
        f"Order ID: {order_id}\n"
        f"Request: {request_text}\n"
        f"Rows: {sum(1 for _ in open(csv_path, 'r', encoding='utf-8-sig')) - 1}\n\n"
        "CSV is attached to this email."
    )

    message = Mail(
        from_email=(FROM_EMAIL, FROM_NAME or "LeadPulse"),
        to_emails=to_email,
        subject=subject,
        plain_text_content=body,
    )

    attachment = Attachment()
    attachment.file_content = FileContent(encoded)
    attachment.file_type = FileType("text/csv")
    attachment.file_name = FileName(csv_path.name)
    attachment.disposition = Disposition("attachment")
    message.attachment = attachment

    sg = SendGridAPIClient(SENDGRID_API_KEY)
    resp = sg.send(message)
    return {"ok": True, "status_code": resp.status_code}


def process_lead_pack_order(order_id: str, project_root: Optional[Path] = None, force: bool = False) -> Dict:
    order = get_lead_pack_order(order_id, project_root)
    if not order:
        raise RuntimeError(f"order not found: {order_id}")

    if not force and str(order.get("payment_status", "")).lower() != "paid":
        raise RuntimeError("order is unpaid")

    update_lead_pack_order(order_id, {"status": "running", "delivery_error": ""}, project_root)

    rows = build_lead_pack_rows(order, project_root)
    csv_path = export_order_csv(order_id, rows, project_root)

    update_lead_pack_order(
        order_id,
        {
            "status": "completed",
            "rows_exported": len(rows),
            "csv_path": str(csv_path),
        },
        project_root,
    )

    delivery = _send_csv_via_sendgrid(
        to_email=str(order.get("delivery_email", "")).strip(),
        order_id=order_id,
        request_text=str(order.get("request_text", "")).strip(),
        csv_path=csv_path,
    )

    if delivery.get("ok"):
        updated = update_lead_pack_order(order_id, {"delivery_status": "sent", "status": "delivered"}, project_root)
        return updated or get_lead_pack_order(order_id, project_root) or {}

    updated = update_lead_pack_order(
        order_id,
        {
            "delivery_status": "failed",
            "delivery_error": str(delivery.get("error", "unknown email error")),
        },
        project_root,
    )
    return updated or get_lead_pack_order(order_id, project_root) or {}


def process_queued_orders(max_jobs: int = 1, project_root: Optional[Path] = None) -> List[Dict]:
    orders = _load_orders(project_root)
    queued = [
        o
        for o in orders
        if str(o.get("payment_status", "")).lower() == "paid"
        and str(o.get("status", "")).lower() in {"queued", "retry"}
    ]
    queued.sort(key=lambda x: x.get("created_at", ""))

    out = []
    for order in queued[: max(1, int(max_jobs or 1))]:
        try:
            out.append(process_lead_pack_order(str(order.get("id")), project_root=project_root))
        except Exception as exc:
            fail = update_lead_pack_order(
                str(order.get("id")),
                {"status": "failed", "delivery_status": "failed", "delivery_error": str(exc)},
                project_root,
            )
            out.append(fail or {"id": order.get("id"), "status": "failed", "delivery_error": str(exc)})
    return out
