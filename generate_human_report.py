#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate human-readable lead reports from latest OpenClaw output.

Outputs:
- data/reports/leads_dashboard_latest.html
- data/reports/leads_dashboard_<timestamp>.html
- data/reports/leads_report_latest.md
- data/reports/leads_report_<timestamp>.md
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Dict, Iterable, List

NOISE_MARKERS = [
    "当前笔记暂时无法浏览",
    "暂时无法浏览",
    "无法浏览",
    "无法查看",
    "请打开小红书app扫码查看",
    "共 0 条评论",
    "展开",
]

STUDY_HINTS = [
    "留学",
    "申请",
    "中介",
    "机构",
    "文书",
    "选校",
    "签证",
    "雅思",
    "托福",
    "英国",
    "香港",
    "美国",
    "澳洲",
    "加拿大",
    "新加坡",
]

INTENT_HINTS = [
    "求推荐",
    "求助",
    "请问",
    "有没有",
    "怎么选",
    "怎么办",
    "预算",
    "费用",
    "避雷",
    "急",
    "来不及",
]

AGENCY_HINTS = [
    "机构",
    "中介",
    "顾问",
    "工作室",
    "官方",
    "咨询",
    "教育",
    "学长",
    "学姐",
    "老师",
]

AGENCY_CTA_HINTS = [
    "私信我",
    "加微信",
    "加v",
    "欢迎咨询",
    "服务报价",
    "套餐",
    "保录",
    "代办",
    "点击主页",
]


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


def clean_author(author: str) -> str:
    a = normalize_space(author)
    if not a:
        return ""
    a = re.sub(r"\s+(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$", "", a).strip()
    a = re.sub(r"\s+\d+\s*天前$", "", a).strip()
    a = re.sub(r"\s+\d+\s*小时前$", "", a).strip()
    return a


def is_noise_text(text: str) -> bool:
    t = normalize_space(text)
    if len(t) < 8:
        return True
    t_low = t.lower()
    if any(x in t_low for x in NOISE_MARKERS):
        return True
    if re.fullmatch(r"[?？�\.\s]+", t):
        return True
    return False


def looks_like_agency(author: str, content: str) -> bool:
    a = clean_author(author).lower()
    c = normalize_space(content).lower()
    if a in {"", "unknown", "匿名", "none", "null"}:
        return True
    if any(k in a for k in AGENCY_HINTS):
        return True
    if any(k in c for k in AGENCY_CTA_HINTS):
        return True
    return False


def has_buyer_signal(content: str) -> bool:
    t = normalize_space(content)
    if len(t) < 8:
        return False
    study_hits = sum(1 for k in STUDY_HINTS if k in t)
    intent_hits = sum(1 for k in INTENT_HINTS if k in t)
    question_like = any(x in t for x in ("?", "？", "请问", "怎么", "如何", "有没有"))
    if study_hits >= 1 and (intent_hits >= 1 or question_like):
        return True
    return False


def safe_int(value, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except Exception:
        return default


def canonical_post_url(url: str) -> str:
    return normalize_space(url).split("#", 1)[0].split("?", 1)[0]


def load_openclaw_rows(project_root: Path) -> List[Dict]:
    openclaw_dir = project_root / "data" / "openclaw"
    latest_json = openclaw_dir / "openclaw_leads_latest.json"
    latest_csv = openclaw_dir / "openclaw_leads_latest.csv"

    rows: List[Dict] = []
    if latest_json.exists():
        try:
            obj = json.loads(latest_json.read_text(encoding="utf-8", errors="ignore"))
            if isinstance(obj, dict) and isinstance(obj.get("leads"), list):
                rows.extend([x for x in obj["leads"] if isinstance(x, dict)])
        except Exception:
            pass

    if (not rows) and latest_csv.exists():
        try:
            with latest_csv.open("r", encoding="utf-8-sig", newline="") as f:
                rows.extend(list(csv.DictReader(f)))
        except Exception:
            pass

    return rows


def filter_rows(rows: Iterable[Dict], platform: str, include_search_card: bool) -> List[Dict]:
    out: List[Dict] = []
    seen = set()

    for raw in rows:
        row = dict(raw or {})
        p = normalize_space(row.get("platform", "")).lower()
        if platform == "xhs" and p not in {"xhs", "xiaohongshu", "小红书"}:
            continue

        author = clean_author(row.get("author", ""))
        content = normalize_space(row.get("content", ""))
        author_url = normalize_space(row.get("author_url", ""))
        post_url = normalize_space(row.get("post_url", ""))
        source_url = normalize_space(row.get("source_url", ""))
        keyword = normalize_space(row.get("keyword", ""))
        access_hint = normalize_space(row.get("access_hint", ""))

        if (not include_search_card) and author.lower() == "search_card":
            continue
        if is_noise_text(content):
            continue
        if looks_like_agency(author, content):
            continue
        if not has_buyer_signal(content):
            continue
        if "/user/profile/" not in author_url.lower():
            continue

        key = (
            canonical_post_url(post_url).lower(),
            author.lower(),
            content.lower()[:140],
        )
        if key in seen:
            continue
        seen.add(key)

        row["platform"] = p or "xhs"
        row["author"] = author or "unknown"
        row["content"] = content
        row["author_url"] = author_url
        row["post_url"] = post_url
        row["source_url"] = source_url
        row["keyword"] = keyword
        row["access_hint"] = access_hint
        row["score"] = safe_int(row.get("score"), 0)
        row["intent_confidence"] = safe_int(row.get("intent_confidence"), safe_int(row.get("confidence"), row["score"]))
        row["grade"] = normalize_space(row.get("grade", "")).upper() or ("A" if row["score"] >= 7 else "B")
        row["collected_at"] = normalize_space(row.get("collected_at", ""))
        out.append(row)

    out.sort(
        key=lambda x: (
            safe_int(x.get("intent_confidence"), 0),
            safe_int(x.get("score"), 0),
            normalize_space(x.get("collected_at", "")),
        ),
        reverse=True,
    )
    return out


def build_report_payload(raw_rows: List[Dict], rows: List[Dict], platform: str) -> Dict:
    grade_counter = Counter((normalize_space(r.get("grade", "")).upper() or "C") for r in rows)
    dm_ready = sum(1 for r in rows if "/user/profile/" in normalize_space(r.get("author_url", "")).lower())
    verifiable = sum(1 for r in rows if normalize_space(r.get("post_url", "")) and normalize_space(r.get("source_url", "")))
    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "platform": platform,
        "raw_total": len(raw_rows),
        "total": len(rows),
        "grade_counts": {
            "S": grade_counter.get("S", 0),
            "A": grade_counter.get("A", 0),
            "B": grade_counter.get("B", 0),
            "C": grade_counter.get("C", 0),
        },
        "dm_ready": dm_ready,
        "verifiable": verifiable,
    }


def render_markdown(payload: Dict, rows: List[Dict], top_n: int) -> str:
    gc = payload["grade_counts"]
    lines = [
        "# LeadPulse 人话报告",
        "",
        f"- 生成时间: {payload['generated_at']}",
        f"- 数据范围: {payload['platform'].upper()}",
        f"- 范围原始总量: {payload['raw_total']}",
        f"- 过滤后总线索: {payload['total']}",
        f"- S/A/B/C: {gc['S']}/{gc['A']}/{gc['B']}/{gc['C']}",
        f"- 可私信个人主页: {payload['dm_ready']}",
        f"- 有来源/文字证据: {payload['verifiable']}",
        "",
        f"## 高价值线索 Top {top_n}",
        "|等级|分数|作者|私信主页|关键词|内容|帖子|采集时间|",
        "|---|---:|---|---|---|---|---|---|",
    ]

    for row in rows[: max(1, top_n)]:
        content = escape(normalize_space(row.get("content", "")).replace("|", " "))
        if len(content) > 88:
            content = content[:88] + "..."
        author = escape(normalize_space(row.get("author", "")).replace("|", " "))
        author_url = normalize_space(row.get("author_url", ""))
        post_url = normalize_space(row.get("post_url", ""))
        keyword = escape(normalize_space(row.get("keyword", "")).replace("|", " "))
        collected_at = escape(normalize_space(row.get("collected_at", "")))
        dm_cell = f"[私信]({author_url})" if author_url else "-"
        post_cell = f"[打开]({post_url})" if post_url else "-"
        lines.append(
            f"|{row.get('grade','')}|{safe_int(row.get('intent_confidence', row.get('score', 0)))}|{author}|{dm_cell}|{keyword}|{content}|{post_cell}|{collected_at}|"
        )
    return "\n".join(lines)


def render_html(payload: Dict, rows: List[Dict], top_n: int) -> str:
    gc = payload["grade_counts"]
    items = []
    for row in rows[: max(1, top_n)]:
        content = escape(normalize_space(row.get("content", "")))
        if len(content) > 140:
            content = content[:140] + "..."
        author = escape(normalize_space(row.get("author", "")))
        keyword = escape(normalize_space(row.get("keyword", "")))
        author_url = normalize_space(row.get("author_url", ""))
        post_url = normalize_space(row.get("post_url", ""))
        items.append(
            "<tr>"
            f"<td>{escape(str(row.get('grade', '')))}</td>"
            f"<td>{safe_int(row.get('intent_confidence', row.get('score', 0)))}</td>"
            f"<td>{author}</td>"
            f"<td>{keyword}</td>"
            f"<td>{content}</td>"
            f"<td>{('<a href=\"' + escape(author_url) + '\" target=\"_blank\">私信主页</a>') if author_url else '-'}</td>"
            f"<td>{('<a href=\"' + escape(post_url) + '\" target=\"_blank\">帖子</a>') if post_url else '-'}</td>"
            "</tr>"
        )

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LeadPulse 报告</title>
  <style>
    body {{ font-family: "PingFang SC","Microsoft YaHei",sans-serif; margin: 24px; color: #1f2937; }}
    h1 {{ margin: 0 0 12px; }}
    .meta {{ display: grid; grid-template-columns: repeat(3,minmax(180px,1fr)); gap: 10px; margin: 18px 0 22px; }}
    .card {{ border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #fff; }}
    .label {{ color: #6b7280; font-size: 12px; }}
    .value {{ font-size: 18px; font-weight: 700; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th, td {{ border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }}
    th {{ background: #f9fafb; position: sticky; top: 0; }}
  </style>
</head>
<body>
  <h1>LeadPulse 人话报告</h1>
  <div>生成时间：{escape(payload["generated_at"])} ｜ 数据范围：{escape(payload["platform"].upper())}</div>
  <div class="meta">
    <div class="card"><div class="label">原始总量</div><div class="value">{payload["raw_total"]}</div></div>
    <div class="card"><div class="label">过滤后线索</div><div class="value">{payload["total"]}</div></div>
    <div class="card"><div class="label">可私信主页</div><div class="value">{payload["dm_ready"]}</div></div>
    <div class="card"><div class="label">S/A/B/C</div><div class="value">{gc["S"]}/{gc["A"]}/{gc["B"]}/{gc["C"]}</div></div>
    <div class="card"><div class="label">有证据链</div><div class="value">{payload["verifiable"]}</div></div>
    <div class="card"><div class="label">Top 行数</div><div class="value">{max(1, top_n)}</div></div>
  </div>
  <table>
    <thead>
      <tr><th>等级</th><th>意向分</th><th>作者</th><th>关键词</th><th>内容</th><th>主页</th><th>帖子</th></tr>
    </thead>
    <tbody>
      {''.join(items)}
    </tbody>
  </table>
</body>
</html>"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate human report from OpenClaw leads")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--platform", default="xhs", choices=["xhs", "all"])
    parser.add_argument("--top-n", type=int, default=30)
    parser.add_argument("--include-search-card", action="store_true")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    reports_dir = root / "data" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    raw_rows = load_openclaw_rows(root)
    rows = filter_rows(raw_rows, platform=args.platform, include_search_card=args.include_search_card)
    payload = build_report_payload(raw_rows, rows, platform=args.platform)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    md_latest = reports_dir / "leads_report_latest.md"
    md_cycle = reports_dir / f"leads_report_{ts}.md"
    html_latest = reports_dir / "leads_dashboard_latest.html"
    html_cycle = reports_dir / f"leads_dashboard_{ts}.html"

    md_text = render_markdown(payload, rows, top_n=max(1, int(args.top_n)))
    html_text = render_html(payload, rows, top_n=max(1, int(args.top_n)))

    md_latest.write_text(md_text, encoding="utf-8-sig")
    md_cycle.write_text(md_text, encoding="utf-8-sig")
    html_latest.write_text(html_text, encoding="utf-8")
    html_cycle.write_text(html_text, encoding="utf-8")

    print("[REPORT] generated")
    print(f"  html_latest : {html_latest.relative_to(root)}")
    print(f"  html_cycle  : {html_cycle.relative_to(root)}")
    print(f"  md_latest   : {md_latest.relative_to(root)}")
    print(f"  md_cycle    : {md_cycle.relative_to(root)}")
    print(f"  raw_total   : {payload['raw_total']}")
    print(f"  total       : {payload['total']}")
    print(f"  SA          : {payload['grade_counts']['S'] + payload['grade_counts']['A']}")
    print(f"  dm_ready    : {payload['dm_ready']}")
    print(f"  verifiable  : {payload['verifiable']}")


if __name__ == "__main__":
    main()
