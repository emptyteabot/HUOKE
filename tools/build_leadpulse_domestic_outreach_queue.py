#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from textwrap import shorten
from urllib.parse import urlsplit, urlunsplit


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SALES_DIR = PROJECT_ROOT / "sales"
OUT_CSV = SALES_DIR / "leadpulse_domestic_outreach_queue.csv"
TODAY_CSV = SALES_DIR / "leadpulse_domestic_today_contact.csv"
OUT_MD = SALES_DIR / "leadpulse_domestic_outreach_queue.md"
FRONTEND_SELF_OUTREACH_JSON = (
    PROJECT_ROOT / "frontend-b2b" / "data" / "self_outreach" / "domestic_outreach_queue.json"
)

SOURCE_FILES = (
    PROJECT_ROOT / "frontend-b2b" / "data" / "leads_snapshot.json",
    PROJECT_ROOT / "data" / "exports" / "high_value_leads_latest.json",
)

FIELDNAMES = [
    "rank",
    "priority",
    "industry_label",
    "quality_score",
    "source",
    "platform",
    "author",
    "profile_url",
    "compose_url",
    "contact_mode",
    "fit_tier",
    "source_url",
    "published_at",
    "title",
    "signal_summary",
    "recommended_offer",
    "first_message",
    "next_action",
]

CURATED_BUYERS = {
    "菁程留学SHINETOUR": {
        "platform": "微博",
        "source_url": "https://m.weibo.cn/status/5212695838328390",
        "industry_label": "留学机构 / 英硕申请",
        "title": "26fall 英国硕士申请内容号",
        "signal_summary": "持续发布 26fall 英国硕士申请时间线、选校、文书和签证内容，有明确获客和咨询承接需求。",
        "recommended_offer": "英国硕士、26fall、英港申请线索包：30-50 条公开需求帖，带原帖、需求摘要、优先级和破冰话术，首轮 999。",
        "fit_tier": "direct_buyer",
    },
    "英国名校留学找KK（领藤甄选）": {
        "platform": "小红书",
        "source_url": "https://www.xiaohongshu.com/explore/68da3eae0000000011016153",
        "industry_label": "留学顾问 / G5 本科",
        "title": "英国 G5 本科申请内容号",
        "signal_summary": "内容聚焦英国 G5、本科申请和高客单规划，适合用高意向公开需求帖承接咨询。",
        "recommended_offer": "G5、本科申请、英本规划线索包：先发 4 条免费样本，匹配后按方向交付 30-50 条，首轮 999。",
        "fit_tier": "direct_buyer",
    },
    "糖糖的海外通关站": {
        "platform": "小红书",
        "source_url": "https://www.xiaohongshu.com/explore/698dacca0000000028022ef3",
        "industry_label": "留学内容号 / QS100 硕士",
        "title": "英国留学 QS100 硕士内容号",
        "signal_summary": "持续发布英国留学、QS100 和硕士申请内容，适合测试英国硕士方向需求线索包。",
        "recommended_offer": "英国硕士、QS100、普通背景学生定位线索包：每条包含来源链接、需求判断和建议开场。",
        "fit_tier": "direct_buyer",
    },
    "Vivi学姐本硕精英留学": {
        "platform": "小红书",
        "source_url": "https://www.xiaohongshu.com/explore/691428f1000000000703767e",
        "industry_label": "留学顾问 / 英本 G5",
        "title": "英国 G5 和国际生本科申请内容号",
        "signal_summary": "账号主打英国 G5、国际生本科申请和成绩规划，有明确咨询转化场景。",
        "recommended_offer": "英本、G5、国际生本科申请线索包：人工清洗 30-50 条，包含破冰话术，首轮 999。",
        "fit_tier": "direct_buyer",
    },
    "留学界的大众点评": {
        "platform": "微博",
        "source_url": "https://m.weibo.cn/status/4779866660540740",
        "industry_label": "留学渠道号 / 机构评价",
        "title": "留学机构评价和推荐账号",
        "signal_summary": "账号定位是留学机构反馈、推荐和评价，既可能是客户，也可能成为样本线索分发渠道。",
        "recommended_offer": "机构需求线索、负面评价监控和合作分发线索包：按国家或项目整理 30-50 条。",
        "fit_tier": "channel_partner",
    },
    "课代表的留学信箱": {
        "platform": "微博",
        "source_url": "https://m.weibo.cn/status/4858543566492502",
        "industry_label": "留学渠道号 / 投稿反馈",
        "title": "留学中介反馈投稿账号",
        "signal_summary": "发布留学中介反馈和学生投稿，适合测试机构口碑、避坑和需求监控方向。",
        "recommended_offer": "机构口碑监控和需求线索包：公开内容筛选加人工清洗，不承诺非公开联系方式。",
        "fit_tier": "channel_partner",
    },
    "留学攻略": {
        "platform": "微博",
        "source_url": "https://m.weibo.cn/status/4824527052212202",
        "industry_label": "留学内容号 / 中介选择",
        "title": "留学中介选择攻略内容号",
        "signal_summary": "发布留学中介选择和避坑内容，可用真实需求帖验证内容选题与机构获客价值。",
        "recommended_offer": "中介推荐、避坑需求和选校定位线索包：每条带原帖、判断和可复制破冰话术。",
        "fit_tier": "channel_partner",
    },
    "offer播报酱": {
        "platform": "微博",
        "source_url": "https://m.weibo.cn/status/5260029508455251",
        "industry_label": "留学社群 / offer 播报",
        "title": "26fall 留学社群和 offer 播报账号",
        "signal_summary": "账号围绕 26fall 留学社群、房源、同届搭子和申请节点运营，可能需要持续需求发现和社群线索分层。",
        "recommended_offer": "26fall 社群线索分层包：按国家、院校、项目阶段整理公开需求信号。",
        "fit_tier": "channel_partner",
    },
}

SAMPLE_LEADS = [
    {
        "title": "MFE 选校求助",
        "platform": "小红书",
        "author": "我是咩小弟",
        "source_url": "https://www.xiaohongshu.com/explore/672e5b55000000001b013159",
        "summary": "高意向。已明确专业和申请阶段，适合美研/MFE/商科量化方向顾问切入。",
    },
    {
        "title": "求英港留学中介推荐",
        "platform": "小红书",
        "author": "Danny妈在杭州",
        "source_url": "https://www.xiaohongshu.com/explore/67c562ee000000001201c7e8",
        "summary": "高意向。已经明确在找中介，适合英港申请服务直接承接。",
    },
    {
        "title": "艺术类 PhD 定位求助",
        "platform": "小红书",
        "author": "好好睡觉！！",
        "source_url": "https://www.xiaohongshu.com/explore/69945e39000000001d0254c2",
        "summary": "高意向。痛点集中在定位、导师匹配、文书和研究计划复盘。",
    },
    {
        "title": "求中介真实情况",
        "platform": "小红书",
        "author": "ummmm...",
        "source_url": "https://www.xiaohongshu.com/explore/69991774000000001a02120b",
        "summary": "高意向。用户已经进入机构比较阶段，适合用避坑清单建立信任。",
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean_text(value: object) -> str:
    return " ".join(str(value or "").split())


def clean_author(value: object) -> str:
    author = clean_text(value)
    for pattern in (
        r"\s+20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$",
        r"\s+\d{1,2}-\d{1,2}$",
        r"\s+\d+天前$",
        r"\s+\d+小时前$",
    ):
        author = re.sub(pattern, "", author).strip()
    return author


def platform_label(value: object, author_url: str = "") -> str:
    raw = str(value or "").strip().lower()
    if raw in {"xhs", "小红书", "???"} or "xiaohongshu.com" in author_url:
        return "小红书"
    if raw in {"weibo", "微博"}:
        return "微博"
    if raw in {"zhihu", "知乎"}:
        return "知乎"
    return str(value or "国内平台").strip() or "国内平台"


def strip_tracking_url(value: object) -> str:
    url = clean_text(value)
    if not url.startswith(("http://", "https://")):
        return url
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def load_source_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for path in SOURCE_FILES:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        source_rows = data.get("rows", []) if isinstance(data, dict) else data
        if not isinstance(source_rows, list):
            continue
        for row in source_rows:
            if isinstance(row, dict):
                item = dict(row)
                item["_source_file"] = path.relative_to(PROJECT_ROOT).as_posix()
                rows.append(item)
    return rows


def normalize_source_row(row: dict[str, object]) -> dict[str, str]:
    author_url = strip_tracking_url(row.get("author_url", ""))
    platform = platform_label(row.get("platform", ""), author_url)
    source_url = strip_tracking_url(
        row.get("post_url")
        or row.get("note_url")
        or row.get("link")
        or row.get("source_url")
        or author_url
    )
    return {
        "platform": platform,
        "author": clean_author(row.get("author", "")),
        "profile_url": author_url,
        "source_url": source_url,
        "published_at": clean_text(row.get("collected_at", "")),
        "content": clean_text(row.get("content", "")),
        "quality_score": str(row.get("score", "") or ""),
        "keyword": clean_text(row.get("keyword", "")),
        "source_file": clean_text(row.get("_source_file", "")),
    }


def curated_candidates() -> list[dict[str, str]]:
    by_author: dict[str, dict[str, str]] = {}
    for raw in load_source_rows():
        row = normalize_source_row(raw)
        author = row["author"]
        if author and author not in by_author:
            by_author[author] = row

    candidates: list[dict[str, str]] = []
    for author, meta in CURATED_BUYERS.items():
        observed = by_author.get(author, {})
        platform = observed.get("platform") or meta["platform"]
        source_url = observed.get("source_url") or meta["source_url"]
        candidates.append(
            {
                "author": author,
                "platform": platform,
                "profile_url": observed.get("profile_url", ""),
                "source_url": source_url,
                "published_at": observed.get("published_at", ""),
                "content": observed.get("content", ""),
                "quality_score": observed.get("quality_score", ""),
                "source_file": observed.get("source_file", "curated_first_customer_pack"),
                **meta,
            }
        )
    return candidates


def score_candidate(row: dict[str, str]) -> int:
    score = 78 if row.get("fit_tier") == "direct_buyer" else 58
    blob = f"{row.get('author', '')} {row.get('content', '')} {row.get('signal_summary', '')}"
    if row.get("profile_url"):
        score += 8
    if row.get("platform") == "小红书":
        score += 6
    if row.get("platform") == "微博":
        score += 4
    if any(term in blob for term in ("G5", "QS100", "26fall", "英国", "英港", "硕士", "本科")):
        score += 8
    if any(term in blob for term in ("机构", "顾问", "内容号", "社群", "推荐", "评价", "投稿")):
        score += 6
    if row.get("fit_tier") == "channel_partner":
        score -= 8
    return min(score, 100)


def contact_message(row: dict[str, str]) -> str:
    samples = "、".join(sample["title"] for sample in SAMPLE_LEADS[:3])
    if row.get("fit_tier") == "channel_partner":
        return (
            f"你好，我看到你在{row['platform']}做{row['title']}相关内容。"
            "我这边在做 LeadPulse，用公开平台上的留学需求帖做人工清洗，"
            "把原帖、需求摘要、意向判断和建议破冰话术整理成可交付样本，不碰手机号、微信号或私信数据。\n\n"
            f"我现在有 4 条免费样本，里面包括{samples}。"
            "如果你们有内容选题、机构合作分发，或者想判断这些需求能不能卖给机构客户，"
            "我可以先发样本给你看；方向合适再按国家/项目整理 30-50 条，首轮 999。"
        )
    return (
        f"你好，我看到你在{row['platform']}做{row['title']}相关内容。"
        "我这边在做 LeadPulse，专门从公开平台里筛正在主动表达留学需求的帖子，"
        "比如问中介推荐、选校定位、文书求助、申请复盘这类，不碰手机号、微信号或私信数据。\n\n"
        f"我现在有一小包免费样本，里面包括{samples}。"
        "如果你愿意，我先发 4 条给你判断质量；能用的话，再按你的主做方向人工清洗 30-50 条，"
        "每条带原帖链接、需求摘要、优先级和建议破冰话术，首轮 999，明天交付。"
    )


def render_rows(candidates: list[dict[str, str]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    sorted_candidates = sorted(
        candidates,
        key=lambda candidate: (
            candidate.get("fit_tier") == "direct_buyer",
            score_candidate(candidate),
        ),
        reverse=True,
    )
    for rank, row in enumerate(sorted_candidates, 1):
        score = score_candidate(row)
        priority = "P0" if row.get("fit_tier") == "direct_buyer" else "P1"
        rows.append(
            {
                "rank": str(rank),
                "priority": priority,
                "industry_label": row["industry_label"],
                "quality_score": str(score),
                "source": row.get("source_file") or "domestic_public_sources",
                "platform": row["platform"],
                "author": row["author"],
                "profile_url": row.get("profile_url", ""),
                "compose_url": "",
                "contact_mode": "manual_profile_or_source",
                "fit_tier": row.get("fit_tier", "direct_buyer"),
                "source_url": row["source_url"],
                "published_at": row.get("published_at", ""),
                "title": row["title"],
                "signal_summary": row["signal_summary"],
                "recommended_offer": row["recommended_offer"],
                "first_message": contact_message(row),
                "next_action": (
                    "直客优先：打开来源或主页，核对账号是真实机构/顾问；复制草稿，由你在平台内手动私信。"
                    if row.get("fit_tier") == "direct_buyer"
                    else "渠道观察：只在直客联系完后处理，先判断对方是否适合合作分发或转介绍。"
                ),
            }
        )
    return rows


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_md(path: Path, rows: list[dict[str, str]]) -> None:
    by_industry = Counter(row["industry_label"] for row in rows)
    lines = [
        "# LeadPulse 国内平台手动触达队列",
        "",
        "- 触达对象：人工 curated 的留学机构、留学顾问、留学内容号、渠道号。",
        "- 优先级：P0 是直客；P1 是渠道/媒体/观察名单，不能等同于明确买线索的客户。",
        "- 执行边界：只复制话术和打开公开来源，不自动发送私信，不抓取非公开联系方式。",
        f"- Queue rows: {len(rows)}",
        "",
        "## 触达对象分布",
    ]
    lines.extend(f"- {industry}: {count}" for industry, count in by_industry.most_common())
    lines.extend(["", "## 今日优先联系", ""])
    for row in rows:
        lines.extend(
            [
                f"### {row['rank']}. {row['author']} | {row['priority']} | {row['industry_label']}",
                f"- 平台：{row['platform']}",
                f"- 来源：{row['source_url']}",
                f"- 证据：{row['signal_summary']}",
                f"- 报价方向：{row['recommended_offer']}",
                f"- 私信草稿：{row['first_message']}",
                "",
            ]
        )
    lines.extend(["## 可发给客户看的 4 条免费样本", ""])
    for sample in SAMPLE_LEADS:
        lines.extend(
            [
                f"### {sample['title']}",
                f"- 平台：{sample['platform']}",
                f"- 作者：{sample['author']}",
                f"- 原帖：{sample['source_url']}",
                f"- 判断：{sample['summary']}",
                "",
            ]
        )
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_frontend_json(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    by_industry = Counter(row["industry_label"] for row in rows)
    payload = {
        "generated_at": now_iso(),
        "source_file": "curated_first_customer_pack + observed metadata from frontend-b2b/data/leads_snapshot.json and data/exports/high_value_leads_latest.json",
        "source_rows": len(load_source_rows()),
        "curated_rows": len(rows),
        "strict_ready_rows": sum(1 for row in rows if row.get("fit_tier") == "direct_buyer"),
        "queue_rows": len(rows),
        "manual_send_only": True,
        "market": "domestic_cn",
        "queue_kind": "manual_curated_first_customer_queue",
        "source_note": "这不是从 853 条数据里自动严格筛出的队列，而是人工整理的首批国内触达名单，并用本地公开来源数据补充了来源链接和主页信息。",
        "industry_mix": dict(by_industry.most_common()),
        "sample_leads": SAMPLE_LEADS,
        "rows": rows,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    rows = render_rows(curated_candidates())
    write_csv(OUT_CSV, rows)
    write_csv(TODAY_CSV, rows[:20])
    write_md(OUT_MD, rows)
    write_frontend_json(FRONTEND_SELF_OUTREACH_JSON, rows)

    print(f"queue_rows={len(rows)}")
    print(f"today_rows={min(20, len(rows))}")
    print(f"wrote={OUT_CSV.relative_to(PROJECT_ROOT)}")
    print(f"wrote={TODAY_CSV.relative_to(PROJECT_ROOT)}")
    print(f"wrote={OUT_MD.relative_to(PROJECT_ROOT)}")
    print(f"wrote={FRONTEND_SELF_OUTREACH_JSON.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
