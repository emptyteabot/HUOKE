#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "sales" / "leadpulse_llm_verified_all_latest_verified.csv"
DEFAULT_PREFIX = PROJECT_ROOT / "sales" / "leadpulse_llm_verified_today_queue"
DEFAULT_FRONTEND_JSON = PROJECT_ROOT / "frontend-b2b" / "data" / "self_outreach" / "multi_industry_customer_queue.json"
LEGACY_QUEUE_CSV = PROJECT_ROOT / "sales" / "leadpulse_multi_industry_customer_queue.csv"
LEGACY_QUEUE_MD = PROJECT_ROOT / "sales" / "leadpulse_multi_industry_customer_queue.md"
LEGACY_TODAY_CSV = PROJECT_ROOT / "sales" / "leadpulse_multi_industry_today_contact.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a deduped, industry-balanced queue from LLM-verified leads.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--output-prefix", default=str(DEFAULT_PREFIX))
    parser.add_argument("--frontend-json", default=str(DEFAULT_FRONTEND_JSON))
    parser.add_argument("--target", type=int, default=10)
    parser.add_argument("--max-per-industry", type=int, default=3)
    parser.add_argument("--min-score", type=int, default=85)
    return parser.parse_args()


def norm(value: object, max_len: int = 400) -> str:
    return " ".join(str(value or "").split())[:max_len]


def score(row: dict[str, str]) -> int:
    try:
        return int(float(row.get("llm_lead_score") or 0))
    except ValueError:
        return 0


def parse_date(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)


def dedupe_key(row: dict[str, str]) -> str:
    author = re.sub(r"^/u/", "", str(row.get("author") or ""), flags=re.I).strip().lower()
    if author:
        return "author:" + author
    url = str(row.get("source_url") or "").strip().lower()
    return "url:" + url


def load_rows(path: Path, min_score: int) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = [row for row in csv.DictReader(handle) if score(row) >= min_score]
    rows.sort(key=lambda row: (score(row), parse_date(row.get("published_at", "")).timestamp()), reverse=True)

    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for row in rows:
        key = dedupe_key(row)
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def select_rows(rows: list[dict[str, str]], target: int, max_per_industry: int) -> list[dict[str, str]]:
    selected: list[dict[str, str]] = []
    selected_keys: set[str] = set()
    industry_counts: Counter[str] = Counter()
    by_industry: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_industry[norm(row.get("industry_label"), 120)].append(row)

    for industry in sorted(by_industry, key=lambda key: score(by_industry[key][0]), reverse=True):
        if len(selected) >= target:
            break
        row = by_industry[industry][0]
        key = dedupe_key(row)
        selected.append(row)
        selected_keys.add(key)
        industry_counts[industry] += 1

    for row in rows:
        if len(selected) >= target:
            break
        industry = norm(row.get("industry_label"), 120)
        key = dedupe_key(row)
        if key in selected_keys or industry_counts[industry] >= max_per_industry:
            continue
        selected.append(row)
        selected_keys.add(key)
        industry_counts[industry] += 1

    return selected[:target]


def priority(row: dict[str, str]) -> str:
    current_score = score(row)
    if current_score >= 90:
        return "P0"
    if current_score >= 87:
        return "P1"
    return "P2"


def to_queue_row(row: dict[str, str], rank: int) -> dict[str, Any]:
    author = norm(row.get("author"), 120)
    profile_url = row.get("author_url") or ""
    if not profile_url and author.startswith("/u/"):
        profile_url = "https://www.reddit.com/user/" + author.removeprefix("/u/")
    current_score = score(row)
    pain_point = norm(row.get("llm_pain_point"), 500)
    sample_angle = norm(row.get("llm_sample_angle"), 500)
    first_touch = norm(row.get("llm_first_touch"), 500)
    return {
        "rank": rank,
        "priority": priority(row),
        "llm_lead_score": current_score,
        "quality_score": current_score,
        "source": norm(row.get("source") or "llm_verified", 80),
        "industry_label": norm(row.get("industry_label"), 120),
        "buyer_type": norm(row.get("llm_buyer_type"), 180),
        "platform": norm(row.get("platform"), 80),
        "author": author,
        "profile_url": profile_url,
        "compose_url": "",
        "contact_mode": "manual_public_source",
        "fit_tier": "llm_verified_customer",
        "source_url": norm(row.get("source_url"), 500),
        "published_at": norm(row.get("published_at"), 80),
        "title": norm(row.get("title"), 260),
        "pain_point": pain_point,
        "signal_summary": pain_point,
        "sample_angle": sample_angle,
        "recommended_offer": sample_angle,
        "first_touch": first_touch,
        "first_message": first_touch,
        "next_action": "Open the source, verify recent context, rerun the copy gate if replying, then manually send at low frequency.",
    }


def write_outputs(prefix: Path, frontend_json: Path, source_path: Path, selected: list[dict[str, str]], all_rows: list[dict[str, str]]) -> None:
    prefix.parent.mkdir(parents=True, exist_ok=True)
    frontend_json.parent.mkdir(parents=True, exist_ok=True)
    rows = [to_queue_row(row, idx + 1) for idx, row in enumerate(selected)]
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = {
        "generated_at": generated_at,
        "source_file": str(source_path.relative_to(PROJECT_ROOT)) if source_path.is_relative_to(PROJECT_ROOT) else str(source_path),
        "source_rows": len(all_rows),
        "strict_ready_rows": len(all_rows),
        "queue_rows": len(rows),
        "manual_send_only": True,
        "requires_live_context_gate_before_send": True,
        "market": "multi_industry",
        "queue_kind": "llm_verified_today_queue",
        "source_note": "Built from LLM-verified LeadPulse self-prospecting results. This queue is deduped, industry-balanced, and intended for manual, low-frequency outreach only.",
        "industry_mix": dict(Counter(row["industry_label"] for row in rows)),
        "platform_mix": dict(Counter(row["platform"] for row in rows)),
        "rows": rows,
    }

    json_path = prefix.with_suffix(".json")
    csv_path = prefix.with_suffix(".csv")
    md_path = prefix.with_suffix(".md")

    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    frontend_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fields = list(rows[0].keys()) if rows else []
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    for legacy_csv in (LEGACY_QUEUE_CSV, LEGACY_TODAY_CSV):
        with legacy_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

    lines = [
        "# LeadPulse LLM Verified Today Queue",
        "",
        f"- Generated at: {generated_at}",
        f"- LLM-verified source rows: {len(all_rows)}",
        f"- Queue rows: {len(rows)}",
        "- Rule: verify live context and run copy gate before sending.",
        "",
    ]
    for row in rows:
        lines.extend(
            [
                f"## {row['rank']}. {row['priority']} | {row['llm_lead_score']} | {row['buyer_type']} | {row['author']}",
                f"- Industry: {row['industry_label']}",
                f"- Published: {row['published_at']}",
                f"- URL: {row['source_url']}",
                f"- Title: {row['title']}",
                f"- Pain: {row['pain_point']}",
                f"- Sample angle: {row['sample_angle']}",
                f"- First touch: {row['first_touch']}",
                "",
            ]
        )
    md_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    LEGACY_QUEUE_MD.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(json.dumps({"queue_rows": len(rows), "json": str(json_path), "csv": str(csv_path), "md": str(md_path), "frontend_json": str(frontend_json)}, ensure_ascii=False, indent=2))


def main() -> int:
    args = parse_args()
    source_path = Path(args.input)
    rows = load_rows(source_path, args.min_score)
    selected = select_rows(rows, args.target, args.max_per_industry)
    write_outputs(Path(args.output_prefix), Path(args.frontend_json), source_path, selected, rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
