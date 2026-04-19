#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List


ICP_RULES = [
    {
        "id": "saas_founder",
        "title": "出海 SaaS / 独立开发者",
        "patterns": [
            "subreddit:saas",
            "saas",
            "mrr",
            "onboarding",
            "trial",
            "pricing",
            "lead verification",
            "qualified leads",
        ],
        "pitch": "你在做 SaaS 业务。我这边刚抓到一批正在问工具、试用、定价和转化问题的高意图用户。",
    },
    {
        "id": "agency_owner",
        "title": "小型 agency / 服务团队",
        "patterns": [
            "agency",
            "client",
            "clients",
            "digitalmarketing",
            "marketingagency",
            "consultant",
            "service",
            "conversion",
        ],
        "pitch": "你在做服务型业务。我这边刚抓到一批直接暴露获客、转化和客户筛选问题的高意图用户。",
    },
    {
        "id": "consultant_operator",
        "title": "咨询 / 教练 / 高客单知识服务",
        "patterns": [
            "consultant",
            "consulting",
            "coach",
            "coaching",
            "deliverables",
            "discovery",
            "booked calls",
            "client onboarding",
        ],
        "pitch": "你在做咨询或知识服务。我这边刚抓到一批已经在问方案、交付和筛选问题的高意图用户。",
    },
    {
        "id": "small_business",
        "title": "小型商业体 / 本地服务",
        "patterns": [
            "smallbusiness",
            "small business",
            "local business",
            "clinic",
            "conversion",
            "inquiries",
            "sales",
            "customer",
        ],
        "pitch": "你在做小型商业体业务。我这边刚抓到一批公开表达获客和转化痛点的高意图用户。",
    },
]

POSITIVE_TERMS = {
    "lead": 18,
    "leads": 18,
    "client": 18,
    "clients": 18,
    "conversion": 16,
    "qualified": 14,
    "inquiries": 14,
    "onboarding": 12,
    "pricing": 12,
    "trial": 12,
    "sales": 12,
    "customer": 10,
    "consult": 10,
    "consultant": 10,
    "agency": 10,
    "saas": 10,
}

NEGATIVE_TERMS = {
    "hiring": -25,
    "for hire": -25,
    "job": -18,
    "resume": -18,
    "astrologer": -40,
    "religion": -20,
    "fantasy": -18,
    "dating": -30,
    "muslim": -8,
    "game": -16,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def norm(value: object) -> str:
    return " ".join(str(value or "").split()).strip()


def read_csv_rows(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def icp_match(blob: str) -> Dict | None:
    best = None
    best_hits = 0
    for rule in ICP_RULES:
      hits = sum(1 for pattern in rule["patterns"] if pattern in blob)
      if hits > best_hits:
          best_hits = hits
          best = rule
    return best if best_hits >= 2 else None


def rank_row(row: Dict, source: str) -> Dict | None:
    content = norm(row.get("content", "") or row.get("snippet", ""))
    keyword = norm(row.get("keyword", "") or row.get("label", ""))
    post_url = norm(row.get("post_url", ""))
    author = norm(row.get("author", "") or row.get("handle", "") or row.get("name", ""))
    if not post_url or not content:
        return None

    blob = f"{keyword} {content}".lower()
    rule = icp_match(blob)
    if not rule:
        return None

    score = int(float(norm(row.get("score", "0")) or 0))
    confidence = int(float(norm(row.get("confidence", row.get("label_score", "0"))) or 0))
    intent_confidence = int(float(norm(row.get("intent_confidence", row.get("label_score", "0"))) or 0))
    weighted = score * 7 + confidence + intent_confidence
    weighted += sum(weight for term, weight in POSITIVE_TERMS.items() if term in blob)
    weighted += sum(weight for term, weight in NEGATIVE_TERMS.items() if term in blob)
    if "?" in content:
        weighted += 10
    if len(content) >= 120:
        weighted += 8
    if "recommend" in blob or "which" in blob or "how" in blob:
        weighted += 8
    if weighted < 70:
        return None

    evidence = content[:180].replace("\n", " ")
    opener = (
        f"{rule['pitch']} 已先剔除明显噪声样本。"
        "我切了一张样本图，如果你想拿这批名单做私信转化，回我，我把样本发你。"
    )
    return {
        "source": source,
        "icp_id": rule["id"],
        "icp_title": rule["title"],
        "weighted_score": weighted,
        "author": author or "unknown",
        "keyword": keyword,
        "post_url": post_url,
        "author_url": norm(row.get("author_url", row.get("profile_url", ""))),
        "evidence_snippet": evidence,
        "outreach_script": opener,
        "platform": norm(row.get("platform", "reddit")) or "reddit",
        "collected_at": norm(row.get("collected_at", "")),
    }


def dedupe_best(rows: List[Dict]) -> List[Dict]:
    best: Dict[str, Dict] = {}
    for row in rows:
        key = row["post_url"].split("?", 1)[0]
        prev = best.get(key)
        if prev is None or row["weighted_score"] > prev["weighted_score"]:
            best[key] = row
    return list(best.values())


def build_markdown(rows: List[Dict]) -> str:
    by_icp: Dict[str, int] = {}
    for row in rows:
        by_icp[row["icp_title"]] = by_icp.get(row["icp_title"], 0) + 1

    lines = [
        "# LeadPulse 冷启动 100 条 ICP 外呼包",
        "",
        f"- 生成时间：{now_iso()}",
        f"- 线索数量：{len(rows)}",
        "- 目标：先卖样本和 DFY，再决定是否把客户推到 Pro 软件版。",
        "",
        "## ICP 分布",
    ]
    for title, count in sorted(by_icp.items(), key=lambda item: item[1], reverse=True):
        lines.append(f"- {title}: {count}")

    lines.extend(
        [
            "",
            "## 默认破冰模板",
            "",
            "你在做 [具体垂直领域] 业务。我的系统刚抓到一批公开表达“求推荐 / 怎么做 / 找谁做 / 如何转化”问题的高意图用户，已先剔除明显噪声样本。我切了一张样本图，如果你想拿这批名单做私信转化，回我，我把样本发你。",
            "",
            "## Top 20 样本",
            "",
        ]
    )

    for index, row in enumerate(rows[:20], start=1):
        lines.extend(
            [
                f"### {index}. {row['icp_title']}",
                f"- 平台: {row['platform']}",
                f"- 线索: {row['post_url']}",
                f"- 证据: {row['evidence_snippet']}",
                f"- 破冰: {row['outreach_script']}",
                "",
            ]
        )

    return "\n".join(lines)


def write_csv(path: Path, rows: List[Dict]) -> None:
    fieldnames = [
        "source",
        "icp_id",
        "icp_title",
        "weighted_score",
        "platform",
        "author",
        "keyword",
        "post_url",
        "author_url",
        "evidence_snippet",
        "outreach_script",
        "collected_at",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build LeadPulse coldstart outreach pack")
    parser.add_argument("--top-n", type=int, default=100)
    parser.add_argument("--desktop", default=str(Path.home() / "Desktop"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    desktop = Path(args.desktop)

    source_rows: List[Dict] = []
    line_a_rows = read_csv_rows(project_root / "data" / "openclaw_iso" / "line_a" / "openclaw_leads_latest.csv")
    for row in line_a_rows:
        ranked = rank_row(row, "openclaw_iso_line_a")
        if ranked:
            source_rows.append(ranked)

    hunter_rows_path = project_root / "data" / "openclaw" / "bd_hunter" / "bd_hunter_latest.json"
    if hunter_rows_path.exists():
        obj = json.loads(hunter_rows_path.read_text(encoding="utf-8", errors="ignore") or "{}")
        for row in obj.get("rows", []) if isinstance(obj, dict) else []:
            ranked = rank_row(row, "bd_hunter_latest")
            if ranked:
                source_rows.append(ranked)

    rows = dedupe_best(source_rows)
    rows.sort(key=lambda item: item["weighted_score"], reverse=True)
    rows = rows[: max(1, int(args.top_n))]

    csv_path = desktop / "LeadPulse_coldstart_100_latest.csv"
    json_path = desktop / "LeadPulse_coldstart_100_latest.json"
    md_path = desktop / "LeadPulse_coldstart_100_latest.md"

    write_csv(csv_path, rows)
    json_path.write_text(json.dumps({"generated_at": now_iso(), "count": len(rows), "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    md_path.write_text(build_markdown(rows), encoding="utf-8")

    print(
        json.dumps(
            {
                "generated_at": now_iso(),
                "count": len(rows),
                "csv": str(csv_path),
                "json": str(json_path),
                "markdown": str(md_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
