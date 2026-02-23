import json
import math
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

import requests

HIGH_INTENT_REPLY_HINTS = {
    "价格": 14,
    "报价": 14,
    "多少钱": 15,
    "签约": 18,
    "合同": 18,
    "付款": 20,
    "分期": 12,
    "退款": 10,
    "什么时候": 8,
    "今天": 8,
    "马上": 10,
    "电话": 10,
    "微信": 8,
    "安排": 8,
    "面谈": 12,
}

NEGATIVE_HINTS = {
    "再看看": -8,
    "先不": -12,
    "算了": -14,
    "没预算": -16,
    "太贵": -14,
    "不需要": -18,
}

HIGH_TICKET_HINTS = {"合同", "付款", "价格", "报价", "保录", "退款", "分期", "法务"}


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def extract_intent_from_notes(notes: str) -> int:
    text = str(notes or "")
    m = re.search(r"score=(\d{1,3})", text)
    if not m:
        return 0
    return max(0, min(100, _safe_int(m.group(1), 0)))


def estimate_conversion_probability(lead: Dict, inbound_text: str = "") -> int:
    base = extract_intent_from_notes(str(lead.get("notes", "")))
    if base <= 0:
        status = str(lead.get("status", "")).lower().strip()
        if status == "qualified":
            base = 68
        elif status == "contacted":
            base = 52
        elif status in {"converted", "signed"}:
            base = 95
        else:
            base = 40

    score = float(base)
    text = str(inbound_text or "").lower()

    for kw, w in HIGH_INTENT_REPLY_HINTS.items():
        if kw in text:
            score += w
    for kw, w in NEGATIVE_HINTS.items():
        if kw in text:
            score += w

    if lead.get("phone"):
        score += 4
    if lead.get("email"):
        score += 2

    return int(max(1, min(99, round(score))))


def detect_handoff(probability: int, inbound_text: str, threshold: int = 75) -> Tuple[bool, str]:
    text = str(inbound_text or "")
    t_low = text.lower()

    for kw in HIGH_TICKET_HINTS:
        if kw in text or kw.lower() in t_low:
            return True, f"high_ticket_keyword:{kw}"

    if probability >= threshold:
        return True, f"probability>={threshold}"

    return False, "auto_agent_safe"


def _fallback_outreach(lead: Dict, angle: str, cta: str, variant: str) -> Dict[str, str]:
    name = str(lead.get("name", "同学")).strip() or "同学"
    notes = str(lead.get("notes", ""))
    short = notes[:120].replace("\n", " ").strip()
    subject = f"[AB:{variant}] {name}，你这条留学问题可以先3步排雷"
    message = (
        f"{name}你好，我看了你最近的讨论内容，判断你现在最关键是{angle}。\n"
        "我给你准备了一个极简动作：\n"
        "1) 10分钟确认国家/专业可行性\n"
        "2) 当天给你一版时间线和预算表\n"
        "3) 明确是否值得投入中介服务\n"
        f"如果你愿意，我现在就可以{cta}。\n"
        f"(线索摘要: {short})"
    )
    return {"subject": subject, "message": message, "mode": "fallback"}


def generate_outreach_copy(
    lead: Dict,
    angle: str,
    cta: str,
    variant: str,
    tone: str,
    openai_api_key: str = "",
    openai_base_url: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini",
) -> Dict[str, str]:
    if not openai_api_key:
        return _fallback_outreach(lead, angle, cta, variant)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=openai_api_key, base_url=openai_base_url)
        prompt = (
            "你是留学机构的顶级SDR。基于潜客信息，生成1条私信。"
            "要求：短、痛点直击、可执行CTA、禁止空话。"
            "输出JSON: {\"subject\":\"...\",\"message\":\"...\"}."
        )
        payload = {
            "lead": {
                "name": lead.get("name", ""),
                "notes": str(lead.get("notes", ""))[:600],
                "status": lead.get("status", "new"),
                "phone": lead.get("phone", ""),
                "email": lead.get("email", ""),
            },
            "constraints": {
                "tone": tone,
                "angle": angle,
                "cta": cta,
                "variant": variant,
                "max_chars": 220,
            },
        }

        resp = client.chat.completions.create(
            model=model,
            temperature=0.5,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
        )
        txt = resp.choices[0].message.content or ""
        m = re.search(r"\{[\s\S]*\}", txt)
        if m:
            obj = json.loads(m.group(0))
            subject = str(obj.get("subject", "")).strip()
            message = str(obj.get("message", "")).strip()
            if subject and message:
                if f"[AB:{variant}]" not in subject:
                    subject = f"[AB:{variant}] " + subject
                return {"subject": subject, "message": message, "mode": model}

        # fallback if model returned non-json
        return _fallback_outreach(lead, angle, cta, variant)
    except Exception:
        return _fallback_outreach(lead, angle, cta, variant)


def generate_agent_reply(lead: Dict, inbound_text: str, probability: int) -> str:
    name = str(lead.get("name", "同学")).strip() or "同学"
    if probability >= 80:
        return (
            f"{name}你好，你这个问题我已经标记为高优先级。"
            "我先帮你锁定方案边界，5分钟内安排顾问给你一对一确认报价和时间线。"
        )
    if probability >= 60:
        return (
            f"{name}你好，我先给你一个快速判断："
            "先确认国家/专业/预算三项，再决定是否进入正式申请服务。"
            "如果你同意，我现在发你一份极简评估清单。"
        )
    return (
        f"{name}你好，收到你的问题。"
        "我先给你基础解答和资料清单，你看完后我们再决定是否进入顾问深聊。"
    )


def append_handoff_event(project_root: Path, event: Dict) -> str:
    event_dir = project_root / "data" / "sdr"
    event_dir.mkdir(parents=True, exist_ok=True)
    fp = event_dir / "handoff_events.jsonl"

    row = dict(event)
    row["created_at"] = datetime.now().isoformat()
    with fp.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return str(fp)


def trigger_handoff_webhook(webhook_url: str, payload: Dict, timeout: int = 12) -> Tuple[bool, str]:
    url = str(webhook_url or "").strip()
    if not url:
        return False, "empty_webhook"

    try:
        r = requests.post(url, json=payload, timeout=timeout)
        ok = 200 <= r.status_code < 300
        return ok, f"status={r.status_code}"
    except Exception as exc:
        return False, f"error={exc}"
