#!/usr/bin/env python3
"""
Run OpenClaw acquisition every 12h (default), then generate reports and sync.

Usage:
  python tools/openclaw_halfday_scheduler.py --loop
  python tools/openclaw_halfday_scheduler.py --once --platforms xhs --xhs-sort-mode both
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List


PROJECT_ROOT = Path(__file__).resolve().parents[1]
HEARTBEAT_PATH = PROJECT_ROOT / "data" / "openclaw" / "openclaw_scheduler_heartbeat.json"

DEFAULT_PLATFORMS = "xhs"
DEFAULT_KEYWORDS = [
    "留学中介推荐",
    "英国留学申请",
    "美国研究生",
    "留学文书求助",
    "留学预算费用",
]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def write_heartbeat(payload: Dict) -> None:
    HEARTBEAT_PATH.parent.mkdir(parents=True, exist_ok=True)
    merged = {
        "updated_at": now_iso(),
        **dict(payload or {}),
    }
    HEARTBEAT_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")


def run_cmd(cmd: List[str], timeout: int) -> Dict:
    started = now_iso()
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=timeout,
        )
        ok = proc.returncode == 0
        return {
            "ok": ok,
            "started_at": started,
            "finished_at": now_iso(),
            "returncode": proc.returncode,
            "stdout_tail": (proc.stdout or "")[-2000:],
            "stderr_tail": (proc.stderr or "")[-2000:],
            "cmd": cmd,
        }
    except Exception as exc:
        return {
            "ok": False,
            "started_at": started,
            "finished_at": now_iso(),
            "returncode": -1,
            "stdout_tail": "",
            "stderr_tail": str(exc),
            "cmd": cmd,
        }


def build_acquire_cmd(args) -> List[str]:
    keywords = args.keywords or ",".join(DEFAULT_KEYWORDS)
    cmd = [
        sys.executable,
        str(PROJECT_ROOT / "openclaw_lead_acquisition_v2.py"),
        "--platforms",
        args.platforms,
        "--keywords",
        keywords,
        "--xhs-sort-mode",
        args.xhs_sort_mode,
        "--max-posts-per-keyword",
        str(args.max_posts_per_keyword),
        "--max-comments-per-post",
        str(args.max_comments_per_post),
        "--browser-profile",
        args.browser_profile,
        "--db",
        args.db,
        "--out-dir",
        args.out_dir,
        "--access-db",
        args.access_db,
        "--video-cooldown-minutes",
        str(args.video_cooldown_minutes),
        "--user-cooldown-minutes",
        str(args.user_cooldown_minutes),
        "--access-max-entries",
        str(args.access_max_entries),
        "--access-sweep-every",
        str(args.access_sweep_every),
        "--knowledge-dir",
        args.knowledge_dir,
        "--funnel-min-confidence",
        str(args.funnel_min_confidence),
        "--platform-timeout-sec",
        str(args.platform_timeout_sec),
        "--global-timeout-sec",
        str(args.global_timeout_sec),
    ]

    if args.disable_access_control:
        cmd.append("--disable-access-control")
    if args.enable_funnel_agent:
        cmd.append("--enable-funnel-agent")
    return cmd


def build_report_cmd(args) -> List[str]:
    cmd = [
        sys.executable,
        str(PROJECT_ROOT / "generate_human_report.py"),
        "--project-root",
        str(PROJECT_ROOT),
        "--platform",
        args.report_platform,
        "--top-n",
        str(args.report_top_n),
    ]
    if args.report_include_search_card:
        cmd.append("--include-search-card")
    return cmd


def build_sync_cmd(args) -> List[str]:
    cmd = [
        sys.executable,
        str(PROJECT_ROOT / "openclaw_realtime_sync.py"),
        "--min-score",
        str(args.sync_min_score),
        "--max-rows",
        str(args.sync_max_rows),
    ]

    if args.sync_user_id:
        cmd.extend(["--user-id", args.sync_user_id])
    elif args.sync_user_email:
        cmd.extend(["--user-email", args.sync_user_email])

    return cmd


def run_once(args) -> Dict:
    acquire = run_cmd(build_acquire_cmd(args), timeout=max(300, int(args.acquire_timeout_sec)))

    report = {
        "ok": False,
        "skipped": True,
        "reason": "report_disabled",
    }
    if args.run_report:
        report = run_cmd(build_report_cmd(args), timeout=max(60, int(args.report_timeout_sec)))

    sync = {
        "ok": False,
        "skipped": True,
        "reason": "sync_disabled",
    }
    if args.enable_sync:
        sync = run_cmd(build_sync_cmd(args), timeout=max(120, int(args.sync_timeout_sec)))

    status = "ok" if acquire.get("ok") and (not args.run_report or report.get("ok")) and (not args.enable_sync or sync.get("ok")) else "error"
    return {
        "status": status,
        "acquire": acquire,
        "report": report,
        "sync": sync,
    }


def parse_args():
    parser = argparse.ArgumentParser(description="OpenClaw half-day scheduler")
    parser.add_argument("--platforms", default=DEFAULT_PLATFORMS)
    parser.add_argument("--keywords", default="")
    parser.add_argument("--xhs-sort-mode", default="both", choices=["latest", "hot", "both"])
    parser.add_argument("--max-posts-per-keyword", type=int, default=6)
    parser.add_argument("--max-comments-per-post", type=int, default=30)
    parser.add_argument("--browser-profile", default="openclaw")
    parser.add_argument("--db", default="leads.db")
    parser.add_argument("--out-dir", default="data/openclaw")

    parser.add_argument("--disable-access-control", action="store_true")
    parser.add_argument("--access-db", default="data/openclaw/access_control.db")
    parser.add_argument("--video-cooldown-minutes", type=int, default=240)
    parser.add_argument("--user-cooldown-minutes", type=int, default=120)
    parser.add_argument("--access-max-entries", type=int, default=120000)
    parser.add_argument("--access-sweep-every", type=int, default=400)

    parser.add_argument("--enable-funnel-agent", action="store_true")
    parser.add_argument("--knowledge-dir", default="data/knowledge")
    parser.add_argument("--funnel-min-confidence", type=int, default=50)
    parser.add_argument("--platform-timeout-sec", type=int, default=900)
    parser.add_argument("--global-timeout-sec", type=int, default=1800)

    parser.add_argument("--run-report", action="store_true")
    parser.add_argument("--report-platform", default="xhs", choices=["xhs", "all"])
    parser.add_argument("--report-top-n", type=int, default=30)
    parser.add_argument("--report-include-search-card", action="store_true")

    parser.add_argument("--enable-sync", action="store_true")
    parser.add_argument("--sync-user-email", default=os.getenv("SYNC_USER_EMAIL", ""))
    parser.add_argument("--sync-user-id", default=os.getenv("SYNC_USER_ID", ""))
    parser.add_argument("--sync-min-score", type=int, default=60)
    parser.add_argument("--sync-max-rows", type=int, default=900)

    parser.add_argument("--acquire-timeout-sec", type=int, default=3600)
    parser.add_argument("--report-timeout-sec", type=int, default=180)
    parser.add_argument("--sync-timeout-sec", type=int, default=300)

    parser.add_argument("--interval-hours", type=float, default=12.0)
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--once", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.once:
        args.loop = False

    if args.enable_sync and not args.sync_user_email and not args.sync_user_id:
        print("[WARN] enable_sync=true but no sync user set; sync will run as local-guest")

    cycle = 0
    interval_sec = max(300, int(float(args.interval_hours) * 3600))

    write_heartbeat(
        {
            "status": "booting",
            "interval_hours": float(args.interval_hours),
            "loop": bool(args.loop),
            "last_result": {},
            "next_run_at": now_iso(),
            "cycle": cycle,
        }
    )

    while True:
        cycle += 1
        started_at = now_iso()
        result = run_once(args)

        next_run = datetime.now() + timedelta(seconds=interval_sec)
        hb = {
            "status": result.get("status", "unknown"),
            "cycle": cycle,
            "started_at": started_at,
            "finished_at": now_iso(),
            "interval_hours": float(args.interval_hours),
            "next_run_at": next_run.isoformat(timespec="seconds"),
            "last_result": result,
        }
        write_heartbeat(hb)

        print(json.dumps(hb, ensure_ascii=False, indent=2))

        if not args.loop:
            break
        time.sleep(interval_sec)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
