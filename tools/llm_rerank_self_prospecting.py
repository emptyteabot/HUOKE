#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "sales" / "leadpulse_self_prospecting_ready_to_contact_latest.csv"
DEFAULT_PREFIX = PROJECT_ROOT / "sales" / "leadpulse_llm_verified_latest"
DEFAULT_BASE_URL = "https://geekspace.cloud/v1"
DEFAULT_MODEL = "gpt-5.5"


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


SYSTEM_PROMPT = """
你是 LeadPulse 的冷酷 B2B 买方线索复核引擎。你的任务不是写好听文案，而是从候选池里砍掉垃圾，只留下可以给 LeadPulse 自己卖线索服务的真实买方。

LeadPulse 卖什么：
- AI 驱动的线索供应商。
- 交付能跟进的公开需求线索、帖子号、来源链接、痛点摘要和安全私信角度。
- 当前渠道：小红书、抖音、X/Twitter、Reddit。
- 当前目标客户：雅思/留学机构、跨境出海服务商、外贸/B2B 制造、B2B SaaS、AI 初创、独立开发者、自动化服务团队、高客单服务商。

必须放行的信号：
- 作者是老板、创始人、负责人、机构/团队、服务商、SaaS/AI/电商/外贸/教育业务经营者。
- 近期明确抱怨：缺客户、线索差、CAC 高、广告/SEO/冷邮件无效、试听/咨询/询盘不转化、销售跟进浪费、找不到第一批用户。
- 帖子是求助、询问、抱怨、找方案、找工具、找服务，不是教程或软广。
- 能合理推断对方会为“更准的可跟进线索”付费。

必须拦截：
- 同行：卖 lead generation、获客工具、AI SDR、名单、爬虫、外呼、增长咨询、广告代投，除非明确在找上游线索。
- 求职、招聘、学生、小白学习、教程号、课程号、纯内容分享、案例复盘、自我宣传、免费资源帖。
- 没有商业身份或没有痛点的泛讨论。
- 太旧、不可联系、只有标题党没有上下文。

输出要求：
- 只输出一个 JSON 对象。
- candidates 数组必须逐条对应输入 id。
- lead_score 0-100；85 以上才算今天能人工私信的强线索。
- first_touch 必须像真人临时写的短句，不能像销售机器人。
- first_touch 禁止出现：高意向、精准获客、脱敏样本、公开平台主动表达需求、是否对口、值不值得聊、LeadPulse、转化率提升、保证成交、微信、价格。
""".strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LLM rerank LeadPulse self-prospecting candidates.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--output-prefix", default=str(DEFAULT_PREFIX))
    parser.add_argument("--limit", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--min-score", type=int, default=85)
    parser.add_argument("--base-url", default=os.getenv("GEEKSPACE_BASE_URL") or os.getenv("OPENAI_BASE_URL") or DEFAULT_BASE_URL)
    parser.add_argument("--model", default=os.getenv("GEEKSPACE_MODEL") or os.getenv("OPENAI_MODEL") or DEFAULT_MODEL)
    parser.add_argument("--api-key-env", default="GEEKSPACE_API_KEY")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--request-timeout", type=float, default=120.0)
    parser.add_argument("--max-retries", type=int, default=1)
    parser.add_argument("--industry-regex", default="", help="Only review rows whose industry_label matches this regex.")
    parser.add_argument("--platform-regex", default="", help="Only review rows whose platform matches this regex.")
    return parser.parse_args()


def norm(value: object, max_len: int = 500) -> str:
    text = " ".join(str(value or "").split())
    return text[:max_len]


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def days_old(value: str) -> int | None:
    dt = parse_date(value)
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).days


def load_rows(path: Path, limit: int, industry_regex: str = "", platform_regex: str = "") -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if industry_regex:
        pattern = re.compile(industry_regex, re.I)
        rows = [row for row in rows if pattern.search(row.get("industry_label", ""))]
    if platform_regex:
        pattern = re.compile(platform_regex, re.I)
        rows = [row for row in rows if pattern.search(row.get("platform", ""))]

    def row_rank(row: dict[str, str]) -> tuple[int, int, int]:
        age = days_old(row.get("published_at", ""))
        freshness = 10_000 if age is None else max(0, 10_000 - age)
        tier = {"A": 3, "B": 2, "C": 1}.get(row.get("quality_tier", ""), 0)
        try:
            score = int(float(row.get("quality_score") or 0))
        except ValueError:
            score = 0
        return (freshness, tier, score)

    rows.sort(key=row_rank, reverse=True)
    return rows[: max(1, limit)]


def build_payload(rows: list[dict[str, str]]) -> dict[str, Any]:
    candidates = []
    for index, row in enumerate(rows, 1):
        candidates.append(
            {
                "id": str(index),
                "quality_tier": row.get("quality_tier", ""),
                "heuristic_score": row.get("quality_score", ""),
                "industry": row.get("industry_label", ""),
                "platform": row.get("platform", ""),
                "author": row.get("author", ""),
                "published_at": row.get("published_at", ""),
                "source_url": row.get("source_url", ""),
                "title": norm(row.get("title", ""), 260),
                "evidence": norm(row.get("evidence", ""), 1200),
                "fit_reason": norm(row.get("fit_reason", ""), 500),
                "risk_flags": row.get("risk_flags", ""),
            }
        )
    return {
        "current_time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "task": "Rerank these candidates for LeadPulse's own customer acquisition. Keep only real buyers/operators who might buy high-quality lead delivery.",
        "output_schema": {
            "candidates": [
                {
                    "id": "string",
                    "is_target_buyer": "boolean",
                    "lead_score": "integer 0-100",
                    "buyer_type": "string",
                    "pain_point": "string",
                    "evidence_strength": "none|weak|medium|strong",
                    "recency_ok": "boolean",
                    "sample_angle": "string",
                    "first_touch": "string",
                    "reject_reason": "string",
                    "should_contact_today": "boolean",
                }
            ]
        },
        "candidates": candidates,
    }


def extract_json(text: str) -> dict[str, Any]:
    raw = str(text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = re.sub(r"^json\s*", "", raw, flags=re.I).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        raw = raw[start : end + 1]
    obj = json.loads(raw)
    if not isinstance(obj, dict):
        raise ValueError("LLM output must be a JSON object")
    return obj


def client_from_args(args: argparse.Namespace) -> OpenAI:
    api_key = os.getenv(args.api_key_env) or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(f"Missing {args.api_key_env} or OPENAI_API_KEY")
    return OpenAI(
        api_key=api_key,
        base_url=args.base_url.rstrip("/"),
        timeout=args.request_timeout,
        max_retries=args.max_retries,
    )


def llm_batch(client: OpenAI, args: argparse.Namespace, rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    response = client.chat.completions.create(
        model=args.model,
        temperature=0.15,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(build_payload(rows), ensure_ascii=False)},
        ],
    )
    content = response.choices[0].message.content or ""
    payload = extract_json(content)
    decisions = payload.get("candidates", [])
    if not isinstance(decisions, list):
        raise ValueError("LLM JSON missing candidates list")
    return [item for item in decisions if isinstance(item, dict)]


def reject_decision(row_id: str, reason: str) -> dict[str, Any]:
    return {
        "id": row_id,
        "is_target_buyer": False,
        "lead_score": 0,
        "buyer_type": "",
        "pain_point": "",
        "evidence_strength": "none",
        "recency_ok": False,
        "sample_angle": "",
        "first_touch": "",
        "reject_reason": reason[:260],
        "should_contact_today": False,
    }


def run_batch(args: argparse.Namespace, batch_number: int, batch: list[dict[str, str]]) -> tuple[int, list[dict[str, Any]]]:
    client = client_from_args(args)
    last_error = ""
    attempts = max(1, int(args.max_retries) + 1)
    for attempt in range(1, attempts + 1):
        try:
            return batch_number, merge(batch, llm_batch(client, args, batch))
        except Exception as exc:  # noqa: BLE001
            last_error = f"{type(exc).__name__}: {exc}"
            if attempt < attempts:
                time.sleep(min(8, 2 * attempt))

    if len(batch) > 1:
        recovered: list[dict[str, Any]] = []
        for row in batch:
            try:
                recovered.extend(merge([row], llm_batch(client, args, [row])))
            except Exception as exc:  # noqa: BLE001
                recovered.extend(merge([row], [reject_decision("1", f"LLM error after split: {type(exc).__name__}: {exc}")]))
        return batch_number, recovered

    return batch_number, merge(batch, [reject_decision("1", f"LLM error: {last_error}")])


def merge(rows: list[dict[str, str]], decisions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {str(item.get("id")): item for item in decisions}
    out = []
    for index, row in enumerate(rows, 1):
        decision = by_id.get(str(index), {})
        score = int(decision.get("lead_score") or 0)
        merged = {
            **row,
            "llm_is_target_buyer": bool(decision.get("is_target_buyer")),
            "llm_lead_score": score,
            "llm_buyer_type": norm(decision.get("buyer_type", ""), 160),
            "llm_pain_point": norm(decision.get("pain_point", ""), 260),
            "llm_evidence_strength": norm(decision.get("evidence_strength", ""), 40),
            "llm_recency_ok": bool(decision.get("recency_ok")),
            "llm_sample_angle": norm(decision.get("sample_angle", ""), 260),
            "llm_first_touch": norm(decision.get("first_touch", ""), 260),
            "llm_reject_reason": norm(decision.get("reject_reason", ""), 260),
            "llm_should_contact_today": bool(decision.get("should_contact_today")),
        }
        out.append(merged)
    out.sort(key=lambda item: int(item.get("llm_lead_score") or 0), reverse=True)
    return out


def write_outputs(prefix: Path, rows: list[dict[str, Any]], min_score: int) -> None:
    prefix.parent.mkdir(parents=True, exist_ok=True)
    all_jsonl = prefix.with_suffix(".jsonl")
    verified_csv = prefix.with_name(prefix.name + "_verified.csv")
    verified_md = prefix.with_name(prefix.name + "_verified.md")
    verified = [
        row
        for row in rows
        if row.get("llm_is_target_buyer")
        and row.get("llm_should_contact_today")
        and int(row.get("llm_lead_score") or 0) >= min_score
    ]

    with all_jsonl.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    fields = [
        "llm_lead_score",
        "llm_buyer_type",
        "industry_label",
        "platform",
        "author",
        "published_at",
        "source_url",
        "title",
        "llm_pain_point",
        "llm_sample_angle",
        "llm_first_touch",
        "llm_reject_reason",
    ]
    with verified_csv.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in verified:
            writer.writerow({field: row.get(field, "") for field in fields})

    lines = [
        "# LeadPulse LLM-verified fresh prospects",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        f"- Reviewed by LLM: {len(rows)}",
        f"- Contact-today threshold: {min_score}",
        f"- Verified contact-today rows: {len(verified)}",
        "",
    ]
    for idx, row in enumerate(verified[:40], 1):
        lines.extend(
            [
                f"## {idx}. {row.get('llm_lead_score')} | {row.get('llm_buyer_type')} | {row.get('author')}",
                f"- Industry: {row.get('industry_label')}",
                f"- Published: {row.get('published_at')}",
                f"- URL: {row.get('source_url')}",
                f"- Title: {row.get('title')}",
                f"- Pain: {row.get('llm_pain_point')}",
                f"- Sample angle: {row.get('llm_sample_angle')}",
                f"- First touch: {row.get('llm_first_touch')}",
                "",
            ]
        )
    verified_md.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

    print(json.dumps(
        {
            "reviewed": len(rows),
            "verified": len(verified),
            "jsonl": str(all_jsonl),
            "csv": str(verified_csv),
            "md": str(verified_md),
        },
        ensure_ascii=False,
        indent=2,
    ))


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    rows = load_rows(input_path, args.limit, args.industry_regex, args.platform_regex)
    merged_rows: list[dict[str, Any]] = []
    batches = [
        rows[start : start + max(1, args.batch_size)]
        for start in range(0, len(rows), max(1, args.batch_size))
    ]
    done = 0
    if max(1, args.workers) == 1:
        for batch_number, batch in enumerate(batches):
            _, merged = run_batch(args, batch_number, batch)
            merged_rows.extend(merged)
            done += len(batch)
            print(f"llm_batch_done={done}/{len(rows)}", flush=True)
    else:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futures = {
                executor.submit(run_batch, args, batch_number, batch): batch
                for batch_number, batch in enumerate(batches)
            }
            for future in as_completed(futures):
                batch = futures[future]
                try:
                    _, merged = future.result()
                except Exception as exc:  # noqa: BLE001
                    merged = [
                        {**row, **merge([row], [reject_decision("1", f"worker error: {type(exc).__name__}: {exc}")])[0]}
                        for row in batch
                    ]
                merged_rows.extend(merged)
                done += len(batch)
                print(f"llm_batch_done={done}/{len(rows)}", flush=True)
    merged_rows.sort(key=lambda item: int(item.get("llm_lead_score") or 0), reverse=True)
    write_outputs(Path(args.output_prefix), merged_rows, args.min_score)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
