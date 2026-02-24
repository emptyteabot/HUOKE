import argparse
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

import requests

PROJECT_ROOT = Path(__file__).resolve().parent
STREAMLIT_APP_DIR = PROJECT_ROOT / "streamlit-app"
SYNC_HEARTBEAT_PATH = PROJECT_ROOT / "data" / "openclaw" / "sync_heartbeat.json"
if str(STREAMLIT_APP_DIR) not in sys.path:
    sys.path.insert(0, str(STREAMLIT_APP_DIR))

from lead_pack import _normalize_source_rows  # noqa: E402

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


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except Exception:
        return default


def _is_competitor(author: str, content: str) -> bool:
    text = f"{author} {content}".lower()
    return any(k in text for k in COMPETITOR_HINTS)


def _external_id(row: Dict) -> str:
    body = "|".join(
        [
            str(row.get("platform", "")).strip().lower(),
            str(row.get("author", "")).strip().lower(),
            str(row.get("post_url", "")).strip().lower(),
            str(row.get("content", "")).strip().lower()[:80],
        ]
    )
    return hashlib.md5(body.encode("utf-8", errors="ignore")).hexdigest()[:16]


def _get_env(key: str, default: str = "") -> str:
    return (os.getenv(key, default) or "").strip()


def _write_heartbeat(path: Path, payload: Dict) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        merged = {
            "updated_at": datetime.now().isoformat(timespec="seconds"),
            **dict(payload or {}),
        }
        path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        # heartbeat is observability only; never break sync loop
        pass


def _supabase_conf() -> Optional[Dict[str, str]]:
    url = _get_env("SUPABASE_URL")
    key = _get_env("SUPABASE_KEY")
    if not url or not key:
        return None
    return {"url": url.rstrip("/"), "key": key}


def _request(conf: Dict[str, str], method: str, path: str, params=None, json_body=None):
    headers = {
        "apikey": conf["key"],
        "Authorization": f"Bearer {conf['key']}",
        "Content-Type": "application/json",
    }
    url = f"{conf['url']}/rest/v1/{path.lstrip('/')}"
    resp = requests.request(method.upper(), url, params=params, json=json_body, headers=headers, timeout=45)
    if resp.status_code >= 400:
        raise RuntimeError(f"supabase {method} {path} failed: {resp.status_code} {resp.text[:300]}")
    if not resp.text:
        return []
    try:
        return resp.json()
    except Exception:
        return []


def _lookup_user_id(conf: Dict[str, str], user_email: str) -> str:
    target = str(user_email or "").strip().lower()
    if not target:
        raise RuntimeError("user email is empty")

    rows = _request(
        conf,
        "GET",
        "users",
        params={"select": "id,email", "email": f"eq.{target}", "limit": "1"},
    )
    if not rows:
        raise RuntimeError(f"user not found: {target}")
    return str(rows[0].get("id"))


def _existing_external_ids(conf: Dict[str, str], user_id: str) -> Set[str]:
    ids: Set[str] = set()
    rows = _request(conf, "GET", "leads", params={"select": "notes", "user_id": f"eq.{user_id}"})
    for row in rows or []:
        notes = str((row or {}).get("notes", "") or "")
        m = re.search(r"external_id=([a-f0-9]{16})", notes)
        if m:
            ids.add(m.group(1))
    return ids


def _build_lead_payload(user_id: str, row: Dict, ext_id: str) -> Dict:
    platform = str(row.get("platform", "xhs") or "xhs").strip().lower()
    author = str(row.get("author", "Unknown") or "Unknown").strip() or "Unknown"
    content = str(row.get("content", "") or "").strip()
    if len(content) > 1200:
        content = content[:1200] + "..."

    score = max(0, min(100, _safe_int(row.get("score"), 70)))
    keyword = str(row.get("keyword", "") or "").strip()
    author_url = str(row.get("author_url", "") or "").strip()
    post_url = str(row.get("post_url", "") or "").strip()
    source_url = str(row.get("source_url", "") or "").strip()
    collected_at = str(row.get("collected_at", "") or "").strip()

    dm_ready = bool(author_url and "/user/profile/" in author_url.lower())
    intent = "high" if score >= 80 else ("medium" if score >= 60 else "low")

    notes = (
        f"source={platform} | score={score} | intent={intent} | keyword={keyword}\n"
        f"openclaw_sync=1\n"
        f"dm_ready={str(dm_ready).lower()}\n"
        f"post_url={post_url}\n"
        f"author_url={author_url}\n"
        f"source_url={source_url}\n"
        f"collected_at={collected_at}\n"
        f"external_id={ext_id}\n"
        f"{content}"
    )

    return {
        "user_id": user_id,
        "name": author,
        "email": "",
        "phone": str(row.get("contact", "") or "").strip(),
        "status": "new",
        "notes": notes,
    }


def _insert_batches(conf: Dict[str, str], rows: List[Dict], batch_size: int = 200) -> int:
    if not rows:
        return 0
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        _request(conf, "POST", "leads", json_body=batch)
        inserted += len(batch)
    return inserted


def run_once(
    user_email: str,
    user_id: str,
    min_score: int,
    max_rows: int,
    exclude_competitors: bool,
    dry_run: bool,
) -> Dict:
    conf = _supabase_conf()
    cloud_enabled = conf is not None

    if cloud_enabled and not user_id:
        user_id = _lookup_user_id(conf, user_email)
    if not user_id:
        user_id = str(user_email or "local-guest").strip().lower() or "local-guest"

    all_rows = _normalize_source_rows(PROJECT_ROOT)
    existing_ids = _existing_external_ids(conf, user_id) if cloud_enabled else set()

    prepared: List[Dict] = []
    skipped_low = 0
    skipped_comp = 0
    skipped_dup = 0

    for row in all_rows:
        score = _safe_int(row.get("score"), 70)
        if score < min_score:
            skipped_low += 1
            continue

        author = str(row.get("author", "") or "")
        content = str(row.get("content", "") or "")
        if exclude_competitors and _is_competitor(author, content):
            skipped_comp += 1
            continue

        ext_id = _external_id(row)
        if ext_id in existing_ids:
            skipped_dup += 1
            continue

        prepared.append(_build_lead_payload(user_id, row, ext_id))
        existing_ids.add(ext_id)

        if len(prepared) >= max_rows:
            break

    inserted = 0
    if cloud_enabled and not dry_run and prepared:
        inserted = _insert_batches(conf, prepared)

    return {
        "user_id": user_id,
        "source_total": len(all_rows),
        "prepared": len(prepared),
        "inserted": inserted,
        "skipped_low_score": skipped_low,
        "skipped_competitor": skipped_comp,
        "skipped_duplicate": skipped_dup,
        "dry_run": dry_run,
        "cloud_enabled": cloud_enabled,
        "mode": "cloud_sync" if cloud_enabled else "local_only",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="OpenClaw local-to-cloud realtime sync")
    parser.add_argument("--user-email", default=_get_env("SYNC_USER_EMAIL"), help="target account email in app users table")
    parser.add_argument("--user-id", default=_get_env("SYNC_USER_ID"), help="target user id (optional, overrides email lookup)")
    parser.add_argument("--min-score", type=int, default=60)
    parser.add_argument("--max-rows", type=int, default=500)
    parser.add_argument("--include-competitors", action="store_true", help="do not exclude competitor-like rows")
    parser.add_argument("--loop", action="store_true", help="run forever")
    parser.add_argument("--interval", type=int, default=20, help="seconds between loops")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--heartbeat-path", default=_get_env("SYNC_HEARTBEAT_PATH"), help="path to sync heartbeat json")
    args = parser.parse_args()

    if not args.user_id and not args.user_email:
        args.user_id = "local-guest"

    heartbeat_path = Path(args.heartbeat_path).expanduser() if args.heartbeat_path else SYNC_HEARTBEAT_PATH
    interval_sec = max(5, int(args.interval))
    loop_count = 0
    error_streak = 0
    last_success_at = ""

    _write_heartbeat(
        heartbeat_path,
        {
            "status": "booting",
            "loop_count": loop_count,
            "interval_sec": interval_sec,
            "last_success_at": last_success_at,
            "last_error": "",
        },
    )

    while True:
        loop_count += 1
        started_at = datetime.now().isoformat(timespec="seconds")
        try:
            result = run_once(
                user_email=args.user_email,
                user_id=args.user_id,
                min_score=max(0, min(100, int(args.min_score))),
                max_rows=max(1, int(args.max_rows)),
                exclude_competitors=not args.include_competitors,
                dry_run=args.dry_run,
            )
            print(result)
            error_streak = 0
            last_success_at = datetime.now().isoformat(timespec="seconds")
            _write_heartbeat(
                heartbeat_path,
                {
                    "status": "ok" if result.get("cloud_enabled") else "local_only",
                    "loop_count": loop_count,
                    "interval_sec": interval_sec,
                    "started_at": started_at,
                    "last_success_at": last_success_at,
                    "last_error": "",
                    "error_streak": error_streak,
                    "last_result": result,
                },
            )
        except Exception as exc:
            err = str(exc)
            print({"error": err})
            error_streak += 1
            _write_heartbeat(
                heartbeat_path,
                {
                    "status": "error",
                    "loop_count": loop_count,
                    "interval_sec": interval_sec,
                    "started_at": started_at,
                    "last_success_at": last_success_at,
                    "last_error": err,
                    "error_streak": error_streak,
                },
            )

        if not args.loop:
            break

        # exponential backoff on consecutive failures (capped)
        sleep_sec = interval_sec if error_streak == 0 else min(interval_sec * (2 ** min(error_streak, 4)), 300)
        time.sleep(max(5, int(sleep_sec)))


if __name__ == "__main__":
    main()
