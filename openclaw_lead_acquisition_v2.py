#!/usr/bin/env python3
"""
OpenClaw lead acquisition v2.

Upgrades vs legacy:
- per-video / per-user high-frequency access control
- broader multi-platform input (xhs/douyin/kuaishou/channels/tiktok/bilibili/weibo/zhihu/tieba)
- optional funnel + local RAG scoring for intent confidence and suggested reply
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import sqlite3
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.parse import quote

import openclaw_lead_acquisition as base

try:
    from access_frequency_control import AccessControlConfig, VisitAccessController
except Exception:
    AccessControlConfig = None
    VisitAccessController = None

try:
    from lead_funnel_engine import LeadFunnelEngine
except Exception:
    LeadFunnelEngine = None


DEFAULT_KEYWORDS = list(base.DEFAULT_KEYWORDS)

EXTRA_SOCIAL_PLATFORMS = {
    "kuaishou": lambda kw: f"https://www.kuaishou.com/search/video?searchKey={quote(kw)}",
    "channels": lambda kw: f"https://channels.weixin.qq.com/platform/search?keyword={quote(kw)}",
    "tiktok": lambda kw: f"https://www.tiktok.com/search?q={quote(kw)}",
}

PLATFORM_ALIASES = {
    "小红书": "xhs",
    "xiaohongshu": "xhs",
    "抖音": "douyin",
    "快手": "kuaishou",
    "视频号": "channels",
    "shipinhao": "channels",
    "wechat_channels": "channels",
    "wechat-channels": "channels",
    "b站": "bilibili",
}


@dataclass
class LeadV2:
    platform: str
    keyword: str
    post_url: str
    source_url: str
    author: str
    author_url: str
    content: str
    score: int
    grade: str
    confidence: int
    intent_confidence: int
    funnel_stage: str
    funnel_reason: str
    suggested_reply: str
    collected_at: str
    access_hint: str


def now_ts() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def now_iso() -> str:
    return datetime.now().isoformat()


def normalize_space(text: str) -> str:
    return base.normalize_space(text)


def stage_from_confidence(confidence: int) -> str:
    if confidence >= 85:
        return "hot"
    if confidence >= 70:
        return "warm"
    if confidence >= 55:
        return "nurture"
    return "cold"


def extend_platform_map() -> None:
    for key, fn in EXTRA_SOCIAL_PLATFORMS.items():
        base.SOCIAL_PLATFORMS[key] = fn


def parse_platforms(raw: str) -> List[str]:
    names = [normalize_space(x).lower() for x in str(raw or "").split(",") if normalize_space(x)]
    out: List[str] = []
    for name in names:
        key = PLATFORM_ALIASES.get(name, name)
        if key in base.SOCIAL_PLATFORMS and key not in out:
            out.append(key)
    return out or ["xhs"]


def parse_keywords(raw: str) -> List[str]:
    kws = [normalize_space(x) for x in str(raw or "").split(",") if normalize_space(x)]
    return kws or list(DEFAULT_KEYWORDS)


def filter_post_url(platform: str, url: str) -> bool:
    u = str(url or "").lower()
    if not u:
        return False
    if platform == "xhs":
        return "/explore/" in u
    if platform == "douyin":
        return "/video/" in u or "/note/" in u
    if platform == "kuaishou":
        return "short-video" in u or "/fw/photo/" in u or "v.kuaishou.com" in u
    if platform == "channels":
        return "channels.weixin.qq.com" in u or "finder/video" in u
    if platform == "tiktok":
        return "/video/" in u and "tiktok.com" in u
    if platform == "bilibili":
        return "video" in u or "b23.tv" in u
    if platform == "tieba":
        return "/p/" in u
    if platform == "weibo":
        return "weibo.com" in u or "m.weibo.cn" in u
    if platform == "zhihu":
        return "zhihu.com" in u
    return True


def dedupe_posts(posts: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    for item in posts:
        key = str(item.get("post_url", "")).split("#", 1)[0]
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def is_blocked_page(read_payload: Dict) -> bool:
    title = str(read_payload.get("title", "") or "")
    preview = str(read_payload.get("preview", "") or "")
    text = f"{title} {preview}".lower()
    tokens = [
        "页面不见了",
        "暂时无法浏览",
        "无法浏览",
        "404",
        "page not found",
    ]
    return any(tok in text for tok in tokens)


def leads_from_post(
    post: Dict,
    post_read: Dict,
    funnel_engine: Optional["LeadFunnelEngine"] = None,
    min_confidence: int = 0,
) -> List[LeadV2]:
    comments = post_read.get("comments") or []
    preview = normalize_space(str(post_read.get("preview") or ""))
    if not comments and preview:
        comments = [{"author": "post_author", "author_url": "", "content": preview[:420]}]

    platform = str(post.get("platform", "xhs") or "xhs")
    keyword = str(post.get("keyword", "") or "")
    post_url = str(post_read.get("url") or post.get("post_url", "") or "")
    source_url = str(post.get("search_url", "") or "")

    out: List[LeadV2] = []
    for c in comments:
        if not isinstance(c, dict):
            continue
        author = normalize_space(str(c.get("author", "unknown"))) or "unknown"
        content = normalize_space(str(c.get("content", "")))
        author_url = normalize_space(str(c.get("author_url", "")))

        if len(content) < 8:
            continue
        if base.is_probable_agency(author, content):
            continue

        score = base.score_intent(content)
        if score < 4:
            continue

        grade = base.grade_from_score(score)
        base_conf = base.confidence_from_score(score)
        intent_conf = base_conf
        funnel_stage = stage_from_confidence(base_conf)
        funnel_reason = ""
        suggested_reply = ""

        if funnel_engine is not None:
            try:
                fr = funnel_engine.evaluate(
                    platform=platform,
                    keyword=keyword,
                    author=author,
                    content=content,
                    preview=preview,
                )
                intent_conf = max(0, min(99, int(round(base_conf * 0.45 + int(fr.confidence) * 0.55))))
                funnel_stage = str(fr.stage or funnel_stage)
                funnel_reason = str(fr.reason or "")
                suggested_reply = str(fr.suggested_reply or "")
            except Exception:
                pass

        if intent_conf < max(0, int(min_confidence)):
            continue

        if author_url.startswith("/"):
            author_url = post_url.split("/", 3)[0] + "//" + post_url.split("/", 3)[2] + author_url if post_url.startswith("http") and len(post_url.split("/")) > 2 else author_url

        out.append(
            LeadV2(
                platform=platform,
                keyword=keyword,
                post_url=post_url,
                source_url=source_url,
                author=author,
                author_url=author_url,
                content=content[:420],
                score=score,
                grade=grade,
                confidence=base_conf,
                intent_confidence=intent_conf,
                funnel_stage=funnel_stage,
                funnel_reason=funnel_reason[:180],
                suggested_reply=suggested_reply[:420],
                collected_at=now_iso(),
                access_hint=f"openclaw_human_read|{post_read.get('status', 'unknown')}|funnel:{funnel_stage}",
            )
        )

    return out


def dedupe_leads(leads: Iterable[LeadV2]) -> List[LeadV2]:
    out: List[LeadV2] = []
    seen = set()
    for lead in leads:
        key = hashlib.sha1(f"{lead.platform}|{lead.post_url}|{lead.author}|{lead.content}".encode("utf-8", "ignore")).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append(lead)
    return out


def ensure_leads_table(conn: sqlite3.Connection) -> None:
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT,
            content TEXT,
            author TEXT,
            link TEXT,
            email TEXT,
            wechat TEXT,
            phone TEXT,
            score INTEGER,
            grade TEXT,
            status TEXT DEFAULT 'new',
            collected_at TEXT,
            contacted_at TEXT,
            UNIQUE(platform, link)
        )
        """
    )
    c.execute("PRAGMA table_info(leads)")
    cols = {row[1] for row in c.fetchall()}
    extra = {
        "keyword": "TEXT",
        "source_url": "TEXT",
        "note_url": "TEXT",
        "evidence_text": "TEXT",
        "evidence_image": "TEXT",
        "author_url": "TEXT",
        "access_hint": "TEXT",
        "intent_confidence": "INTEGER",
        "funnel_stage": "TEXT",
        "funnel_reason": "TEXT",
        "suggested_reply": "TEXT",
    }
    for col, ddl in extra.items():
        if col not in cols:
            c.execute(f"ALTER TABLE leads ADD COLUMN {col} {ddl}")
    conn.commit()


def write_to_db(db_path: Path, leads: List[LeadV2]) -> int:
    conn = sqlite3.connect(str(db_path))
    ensure_leads_table(conn)
    c = conn.cursor()
    inserted = 0

    for lead in leads:
        digest = hashlib.sha1(f"{lead.post_url}|{lead.author}|{lead.content}".encode("utf-8", "ignore")).hexdigest()[:12]
        link = f"{lead.source_url or lead.post_url}#oc{digest}"
        c.execute(
            """
            INSERT OR IGNORE INTO leads
            (platform, content, author, link, email, wechat, phone, score, grade, collected_at,
             keyword, source_url, note_url, evidence_text, evidence_image, author_url, access_hint,
             intent_confidence, funnel_stage, funnel_reason, suggested_reply)
            VALUES (?, ?, ?, ?, '', '', '', ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
            """,
            (
                lead.platform,
                lead.content,
                lead.author,
                link,
                lead.score,
                lead.grade,
                lead.collected_at,
                lead.keyword,
                lead.source_url,
                lead.post_url,
                lead.content[:280],
                lead.author_url,
                lead.access_hint,
                int(lead.intent_confidence),
                lead.funnel_stage,
                lead.funnel_reason,
                lead.suggested_reply,
            ),
        )
        if c.rowcount > 0:
            inserted += 1

    conn.commit()
    conn.close()
    return inserted


def write_outputs(out_dir: Path, posts: List[Dict], reads: List[Dict], leads: List[LeadV2], control_stats: Dict) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = now_ts()

    raw_path = out_dir / f"openclaw_reads_{ts}.json"
    lead_json = out_dir / f"openclaw_leads_{ts}.json"
    lead_csv = out_dir / f"openclaw_leads_{ts}.csv"
    lead_md = out_dir / f"openclaw_leads_{ts}.md"

    raw_path.write_text(
        json.dumps(
            {
                "generated_at": now_iso(),
                "post_count": len(posts),
                "read_count": len(reads),
                "posts": posts,
                "reads": reads,
                "control_stats": control_stats,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    lead_json.write_text(
        json.dumps(
            {
                "generated_at": now_iso(),
                "lead_count": len(leads),
                "control_stats": control_stats,
                "leads": [x.__dict__ for x in leads],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    with lead_csv.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "platform",
                "keyword",
                "post_url",
                "source_url",
                "author",
                "author_url",
                "content",
                "score",
                "grade",
                "confidence",
                "intent_confidence",
                "funnel_stage",
                "funnel_reason",
                "suggested_reply",
                "collected_at",
                "access_hint",
            ],
        )
        writer.writeheader()
        for row in leads:
            writer.writerow(row.__dict__)

    lines = [
        "# OpenClaw 获客线索报告(v2)",
        "",
        f"- 生成时间: {now_iso()}",
        f"- 读取帖子数: {len(posts)}",
        f"- 产出线索数: {len(leads)}",
        f"- 高频控制(视频): allowed={control_stats.get('video_allowed', 0)} blocked={control_stats.get('video_blocked', 0)}",
        f"- 高频控制(用户): allowed={control_stats.get('user_allowed', 0)} blocked={control_stats.get('user_blocked', 0)}",
        "",
        "## Top 30 线索",
        "|平台|关键词|作者|意向分|置信度|漏斗阶段|等级|内容片段|帖子链接|",
        "|---|---|---|---:|---:|---|---|---|---|",
    ]

    top = sorted(leads, key=lambda x: (x.intent_confidence, x.score), reverse=True)[:30]
    for lead in top:
        snippet = lead.content.replace("|", " ")
        if len(snippet) > 64:
            snippet = snippet[:64] + "..."
        lines.append(
            f"|{lead.platform}|{lead.keyword}|{lead.author}|{lead.score}|{lead.intent_confidence}|{lead.funnel_stage}|{lead.grade}|{snippet}|[打开]({lead.post_url})|"
        )
    lead_md.write_text("\n".join(lines), encoding="utf-8-sig")

    latest_json = out_dir / "openclaw_leads_latest.json"
    latest_csv = out_dir / "openclaw_leads_latest.csv"
    latest_md = out_dir / "openclaw_leads_latest.md"
    # Keep last non-empty "latest" snapshot to avoid blanking the web UI on a temporary scrape miss.
    if leads:
        latest_json.write_text(lead_json.read_text(encoding="utf-8"), encoding="utf-8")
        latest_csv.write_text(lead_csv.read_text(encoding="utf-8"), encoding="utf-8")
        latest_md.write_text(lead_md.read_text(encoding="utf-8"), encoding="utf-8")

    return {
        "raw": str(raw_path),
        "json": str(lead_json),
        "csv": str(lead_csv),
        "md": str(lead_md),
        "json_latest": str(latest_json),
        "csv_latest": str(latest_csv),
        "md_latest": str(latest_md),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="OpenClaw social acquisition v2")
    parser.add_argument(
        "--platforms",
        default="xhs,douyin,kuaishou,channels,tiktok,bilibili,weibo,zhihu,tieba",
        help="Comma list: xhs,douyin,kuaishou,channels,tiktok,bilibili,weibo,zhihu,tieba",
    )
    parser.add_argument("--keywords", default=",".join(DEFAULT_KEYWORDS), help="Comma-separated keywords")
    parser.add_argument("--max-posts-per-keyword", type=int, default=6)
    parser.add_argument("--max-comments-per-post", type=int, default=24)
    parser.add_argument("--browser-profile", default="openclaw")
    parser.add_argument("--db", default="leads.db")
    parser.add_argument("--out-dir", default="data/openclaw")
    parser.add_argument("--no-db", action="store_true")

    parser.add_argument("--disable-access-control", action="store_true")
    parser.add_argument("--access-db", default="data/openclaw/access_control.db")
    parser.add_argument("--video-cooldown-minutes", type=int, default=240)
    parser.add_argument("--user-cooldown-minutes", type=int, default=120)
    parser.add_argument("--access-max-entries", type=int, default=120000)
    parser.add_argument("--access-sweep-every", type=int, default=400)

    parser.add_argument("--enable-funnel-agent", action="store_true")
    parser.add_argument("--knowledge-dir", default="data/knowledge")
    parser.add_argument("--funnel-min-confidence", type=int, default=58)
    parser.add_argument(
        "--platform-timeout-sec",
        type=int,
        default=420,
        help="Soft timeout per platform; skip remaining keywords/posts on that platform when reached",
    )
    parser.add_argument(
        "--global-timeout-sec",
        type=int,
        default=2400,
        help="Soft timeout for whole run; stop remaining platforms when reached",
    )

    args = parser.parse_args()

    extend_platform_map()

    platforms = parse_platforms(args.platforms)
    keywords = parse_keywords(args.keywords)

    browser = base.OpenClawBrowser(browser_profile=args.browser_profile)

    access_ctrl = None
    if (not args.disable_access_control) and (VisitAccessController is not None) and (AccessControlConfig is not None):
        cfg = AccessControlConfig(
            video_cooldown_sec=max(60, int(args.video_cooldown_minutes) * 60),
            user_cooldown_sec=max(60, int(args.user_cooldown_minutes) * 60),
            max_entries=max(2000, int(args.access_max_entries)),
            sweep_every=max(50, int(args.access_sweep_every)),
        )
        access_ctrl = VisitAccessController(Path(args.access_db), cfg)

    funnel_engine = None
    if args.enable_funnel_agent and LeadFunnelEngine is not None:
        funnel_engine = LeadFunnelEngine(vertical="study_abroad", knowledge_dir=args.knowledge_dir)

    try:
        browser.start()
    except Exception as e:
        print(f"[ERR] OpenClaw browser start failed: {e}")
        return 1

    all_posts: List[Dict] = []
    all_reads: List[Dict] = []
    all_leads: List[LeadV2] = []

    skipped_video_cd = 0
    skipped_user_cd = 0
    skipped_platform_timeout = 0
    skipped_global_timeout = 0
    blocked_pages = 0

    run_started = time.monotonic()
    global_soft_timeout = max(120, int(args.global_timeout_sec))
    platform_soft_timeout = max(60, int(args.platform_timeout_sec))
    stop_all = False

    for platform in platforms:
        platform_started = time.monotonic()
        if time.monotonic() - run_started > global_soft_timeout:
            stop_all = True
            skipped_global_timeout += 1
            print(f"[WARN] global timeout reached before platform={platform}, stopping remaining platforms")
            break

        for kw in keywords:
            if time.monotonic() - run_started > global_soft_timeout:
                stop_all = True
                skipped_global_timeout += 1
                print(f"[WARN] global timeout reached at platform={platform}, kw={kw}; stopping run")
                break
            if time.monotonic() - platform_started > platform_soft_timeout:
                skipped_platform_timeout += 1
                print(f"[WARN] platform timeout reached platform={platform}; skipping remaining keywords")
                break

            try:
                posts = base.collect_posts_for_keyword(browser, platform, kw, args.max_posts_per_keyword)
            except Exception as e:
                print(f"[WARN] search failed platform={platform} kw={kw}: {e}")
                continue

            posts = [x for x in posts if filter_post_url(platform, str(x.get("post_url", "")))]
            posts = dedupe_posts(posts)

            for post in posts:
                if time.monotonic() - run_started > global_soft_timeout:
                    stop_all = True
                    skipped_global_timeout += 1
                    print(f"[WARN] global timeout reached during post loop platform={platform}, kw={kw}")
                    break
                if time.monotonic() - platform_started > platform_soft_timeout:
                    skipped_platform_timeout += 1
                    print(f"[WARN] platform timeout reached during post loop platform={platform}, kw={kw}")
                    break

                if access_ctrl is not None:
                    ok_video, _ = access_ctrl.should_visit_video(platform, post.get("post_url", ""))
                    if not ok_video:
                        skipped_video_cd += 1
                        continue

                all_posts.append(post)
                try:
                    read = base.read_post_comments(browser, post, args.max_comments_per_post)
                except Exception as e:
                    read = {
                        "title": "",
                        "url": post.get("post_url", ""),
                        "preview": "",
                        "comments": [],
                        "status": f"read_failed:{e.__class__.__name__}",
                    }
                all_reads.append({"post": post, "read": read})

                if is_blocked_page(read):
                    blocked_pages += 1
                    continue

                leads = leads_from_post(
                    post,
                    read,
                    funnel_engine=funnel_engine,
                    min_confidence=args.funnel_min_confidence if funnel_engine is not None else 0,
                )

                if access_ctrl is not None:
                    for lead in leads:
                        ok_user, _ = access_ctrl.should_touch_user(lead.platform, lead.author, lead.author_url)
                        if not ok_user:
                            skipped_user_cd += 1
                            continue
                        all_leads.append(lead)
                else:
                    all_leads.extend(leads)

                time.sleep(random.uniform(0.5, 1.3))

            if stop_all:
                break
        if stop_all:
            break

    all_leads = dedupe_leads(all_leads)

    control_stats = access_ctrl.snapshot() if access_ctrl is not None else {}
    control_stats["skipped_video_cooldown"] = skipped_video_cd
    control_stats["skipped_user_cooldown"] = skipped_user_cd
    control_stats["skipped_platform_timeout"] = skipped_platform_timeout
    control_stats["skipped_global_timeout"] = skipped_global_timeout
    control_stats["blocked_pages"] = blocked_pages
    control_stats["global_timeout_sec"] = global_soft_timeout
    control_stats["platform_timeout_sec"] = platform_soft_timeout

    if access_ctrl is not None:
        access_ctrl.close()

    artifacts = write_outputs(Path(args.out_dir), all_posts, all_reads, all_leads, control_stats=control_stats)

    inserted = 0
    if not args.no_db:
        inserted = write_to_db(Path(args.db), all_leads)

    grades = {"S": 0, "A": 0, "B": 0, "C": 0}
    for lead in all_leads:
        grades[lead.grade] = grades.get(lead.grade, 0) + 1

    print("[OPENCLAW-LEAD-V2] done")
    print(f"  platforms         : {','.join(platforms)}")
    print(f"  keywords          : {len(keywords)}")
    print(f"  posts_read        : {len(all_posts)}")
    print(f"  leads_total       : {len(all_leads)}")
    print(f"  grade S/A/B/C     : {grades.get('S',0)}/{grades.get('A',0)}/{grades.get('B',0)}/{grades.get('C',0)}")
    print(f"  skipped(video_cd) : {skipped_video_cd}")
    print(f"  skipped(user_cd)  : {skipped_user_cd}")
    print(f"  skipped(platform_timeout): {skipped_platform_timeout}")
    print(f"  skipped(global_timeout)  : {skipped_global_timeout}")
    print(f"  blocked_pages      : {blocked_pages}")
    print(f"  funnel_agent      : {'on' if funnel_engine is not None else 'off'}")
    print(f"  db_inserted       : {inserted}")
    print(f"  artifacts         : {artifacts['json']} | {artifacts['csv']} | {artifacts['md']}")
    print(f"  latest            : {artifacts['json_latest']} | {artifacts['csv_latest']} | {artifacts['md_latest']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
