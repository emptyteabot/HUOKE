#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = PROJECT_ROOT / "frontend-b2b"
APP_DATA = APP_ROOT / "data"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat(timespec="seconds")


def norm(value: object) -> str:
    return " ".join(str(value or "").split()).strip()


def load_rows(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        return []
    return [row for row in rows if isinstance(row, dict)]


def account_id(row: dict[str, Any]) -> str:
    base = "|".join(
        [
            norm(row.get("author", "")),
            norm(row.get("post_url", "")),
            norm(row.get("keyword", "")),
        ]
    )
    return hashlib.sha1(base.encode("utf-8", "ignore")).hexdigest()[:12]


def priority_label(score: int) -> str:
    if score >= 292:
        return "S"
    if score >= 276:
        return "A"
    if score >= 258:
        return "B"
    return "C"


def primary_channel(row: dict[str, Any]) -> str:
    platform = norm(row.get("platform", "")).lower()
    if platform == "reddit":
        return "Reddit 私信 / 评论"
    if platform == "x":
        return "X 私信"
    return "手动触达"


def recommended_offer(row: dict[str, Any]) -> str:
    score = int(row.get("weighted_score", 0) or 0)
    icp = norm(row.get("icp_title", ""))
    if score >= 290:
        return "先发样本，正向回复后优先推代跑版"
    if "SaaS" in icp or "独立开发者" in icp:
        return "先发样本，后续优先推软件版"
    return "先发样本，再看适合软件版还是代跑版"


def sequence_for(row: dict[str, Any], offer: str) -> list[dict[str, Any]]:
    author = norm(row.get("author", "")) or "你好"
    evidence = norm(row.get("evidence_snippet", ""))[:90]
    opener = (
        f"{author}，你好。看到你最近在聊：{evidence}。"
        " 我这边整理了一批公开平台里正在问价格、推荐、怎么选的人，"
        "如果你愿意，我先发你一张样本截图。"
    )
    followup = (
        "补一句，如果你现在最缺的是更像样的客户名单，"
        "我可以先按你这个方向整理一版样本给你看。"
    )
    close = (
        f"如果你觉得样本方向对，我们再继续聊下一步。当前建议：{offer}。"
    )
    return [
        {"step": 1, "day_offset": 0, "channel": "私信", "message": opener},
        {"step": 2, "day_offset": 1, "channel": "私信", "message": followup},
        {"step": 3, "day_offset": 2, "channel": "私信", "message": close},
    ]


def content_backlog(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    topics = [
        {
            "content_id": "lp-self-use-001",
            "title": "为什么服务团队总觉得流量不少，却迟迟拿不到客户",
            "hook": "很多人不是没流量，而是没抓住已经在问问题的人。",
            "angle": "讲清“问价格、问推荐、问怎么选”的人为什么比普通浏览更值钱。",
            "cta": "先看一轮样本，方向对了再继续。",
            "proof_source": [norm(rows[0].get("post_url", ""))] if rows else [],
            "priority": 96,
        },
        {
            "content_id": "lp-self-use-002",
            "title": "为什么一上来买很多工具，最后反而什么都没跑起来",
            "hook": "工具越多，不代表客户越多。",
            "angle": "强调冷启动阶段先做小闭环，而不是先拼技术栈。",
            "cta": "先拿样本，再决定自己做还是代跑。",
            "proof_source": [norm(rows[1].get("post_url", ""))] if len(rows) > 1 else [],
            "priority": 88,
        },
        {
            "content_id": "lp-self-use-003",
            "title": "如果你现在最缺客户，第一步应该看哪里",
            "hook": "不要先猜你该发什么内容，先去看别人已经在问什么。",
            "angle": "解释公开平台里的问题表达如何变成线索入口。",
            "cta": "先看 5 条左右真实样本。",
            "proof_source": [norm(rows[2].get("post_url", ""))] if len(rows) > 2 else [],
            "priority": 82,
        },
    ]
    return topics


def build_accounts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    accounts = []
    for row in rows:
        score = int(row.get("weighted_score", 0) or 0)
        offer = recommended_offer(row)
        accounts.append(
            {
                "account_id": account_id(row),
                "company_name": norm(row.get("author", "")) or "unknown",
                "segment": norm(row.get("icp_title", "")),
                "priority": priority_label(score),
                "blended_score": score,
                "next_action": "先发样本截图，若有兴趣，再继续报价或约沟通。",
                "primary_channel": primary_channel(row),
                "pain_statement": norm(row.get("evidence_snippet", "")),
                "status": "queued",
                "recommended_offer": offer,
                "founder_name": norm(row.get("author", "")),
            }
        )
    return accounts


def build_queue(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    queue = []
    for index, row in enumerate(rows, start=1):
        score = int(row.get("weighted_score", 0) or 0)
        offer = recommended_offer(row)
        queue.append(
            {
                "queue_id": f"lp-self-{index:03d}",
                "account_id": account_id(row),
                "company_name": norm(row.get("author", "")) or "unknown",
                "priority": priority_label(score),
                "channel": primary_channel(row),
                "recommended_offer": offer,
                "scheduled_at": (now_utc() + timedelta(minutes=index * 12)).isoformat(timespec="seconds"),
                "status": "ready",
                "sequence": sequence_for(row, offer),
            }
        )
    return queue


def build_summary(accounts: list[dict[str, Any]], queue: list[dict[str, Any]], backlog: list[dict[str, Any]]) -> dict[str, Any]:
    priority_counts = Counter(item["priority"] for item in accounts)
    status_counts = Counter(item["status"] for item in accounts)
    top_accounts = [
        {
            "account_id": item["account_id"],
            "company_name": item["company_name"],
            "segment": item["segment"],
            "priority": item["priority"],
            "blended_score": item["blended_score"],
            "next_action": item["next_action"],
        }
        for item in sorted(accounts, key=lambda row: row["blended_score"], reverse=True)[:6]
    ]
    return {
        "generated_at": now_iso(),
        "total_accounts": len(accounts),
        "queued_accounts": len(queue),
        "content_backlog_items": len(backlog),
        "priority_counts": dict(priority_counts),
        "status_counts": dict(status_counts),
        "top_accounts": top_accounts,
    }


def build_report(rows: list[dict[str, Any]], accounts: list[dict[str, Any]]) -> str:
    top = accounts[:8]
    lines = [
        "# LeadPulse 自用闭环战报",
        "",
        f"- 生成时间：{now_iso()}",
        f"- 当前目标池：{len(accounts)}",
        f"- 当前可外联：{len(accounts)}",
        "- 当前策略：先用免费样本起手，拿到兴趣后再决定推软件版还是代跑版。",
        "",
        "## 当前最值得先打的目标",
    ]
    for item in top:
        lines.append(
            f"- {item['company_name']} | {item['segment']} | {item['priority']} | {item['blended_score']} | {item['next_action']}"
        )

    lines.extend(
        [
            "",
            "## 接下来 24 小时",
            "- 先处理前 30 个优先目标。",
            "- 优先发样本，不先讲大而全功能。",
            "- 记录谁回、谁不回、谁愿意继续看。",
            "",
            "## 复盘原则",
            "- 如果前 30 条明显没反应，先改话术和样本，再打下一轮。",
            "- 如果有人愿意继续聊，优先整理那个垂类的更深一轮名单。",
        ]
    )
    return "\n".join(lines)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_text(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run LeadPulse self-use loop")
    parser.add_argument("--input", default=str(Path.home() / "Desktop" / "LeadPulse_coldstart_100_latest.json"))
    parser.add_argument("--top-n", type=int, default=60)
    parser.add_argument("--workbench-top-n", type=int, default=30)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rows = load_rows(Path(args.input))
    rows = [row for row in rows if norm(row.get("author", "")).lower() != "unknown"]
    rows.sort(key=lambda item: int(item.get("weighted_score", 0) or 0), reverse=True)
    rows = rows[: max(1, int(args.top_n))]

    accounts = build_accounts(rows)
    queue = build_queue(rows)
    backlog = content_backlog(rows)
    summary = build_summary(accounts, queue, backlog)
    report = build_report(rows, accounts)

    self_growth_dir = APP_DATA / "self_growth"
    report_dir = APP_DATA / "reports"
    live_dir = APP_DATA / "live_targets"

    write_json(self_growth_dir / "summary.json", summary)
    write_json(self_growth_dir / "accounts.json", accounts)
    write_json(self_growth_dir / "outreach_queue.json", queue)
    write_json(self_growth_dir / "content_backlog.json", backlog)
    write_text(report_dir / "leadpulse_self_growth_report.md", report)
    write_json(
        live_dir / "leadpulse_real_targets_latest.json",
        [
            {
                "name": item["company_name"],
                "segment": item["segment"],
                "channel": item["primary_channel"],
                "priority": item["priority"],
                "score": item["blended_score"],
                "url": norm(row.get("post_url", "")),
                "source_type": "coldstart_pool",
                "found_at": now_iso(),
                "reason": norm(row.get("evidence_snippet", "")),
                "pain_fit": norm(row.get("keyword", "")),
                "next_action": item["next_action"],
                "query": norm(row.get("keyword", "")),
            }
            for item, row in zip(accounts[:50], rows[:50])
        ],
    )

    # Rebuild the local manual workbench from the refreshed coldstart data.
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "tools" / "build_leadpulse_manual_workbench.py"), "--top-n", str(max(1, int(args.workbench_top_n)))],
        cwd=str(PROJECT_ROOT),
        check=True,
    )

    print(
        json.dumps(
            {
                "ok": True,
                "generated_at": now_iso(),
                "accounts": len(accounts),
                "queue": len(queue),
                "backlog": len(backlog),
                "summary": str(self_growth_dir / "summary.json"),
                "accounts_path": str(self_growth_dir / "accounts.json"),
                "queue_path": str(self_growth_dir / "outreach_queue.json"),
                "backlog_path": str(self_growth_dir / "content_backlog.json"),
                "report_path": str(report_dir / "leadpulse_self_growth_report.md"),
                "live_targets_path": str(live_dir / "leadpulse_real_targets_latest.json"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
