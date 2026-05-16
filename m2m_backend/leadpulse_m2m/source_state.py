from __future__ import annotations

import hashlib
import re
import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import settings


_DB_LOCK = threading.RLock()
_SPACE_RE = re.compile(r"\s+")
_KEY_METADATA_FIELDS = (
    "id",
    "post_id",
    "tweet_id",
    "note_id",
    "comment_id",
    "thread_id",
    "submission_id",
    "video_id",
    "external_id",
    "url",
    "link",
)


@dataclass(frozen=True)
class ClaimedSourceItem:
    key: str
    item: Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db_path() -> Path:
    path = Path(settings.source_state_store_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS source_items (
            item_key TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            source TEXT NOT NULL,
            external_id TEXT NOT NULL DEFAULT '',
            url TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL DEFAULT '',
            author TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'queued',
            seen_count INTEGER NOT NULL DEFAULT 1,
            first_seen_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            scored_at TEXT NOT NULL DEFAULT '',
            score INTEGER,
            qualified_signal INTEGER,
            meeting_ready INTEGER,
            charge_event TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS source_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_key TEXT NOT NULL UNIQUE,
            provider TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            queued_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(item_key) REFERENCES source_items(item_key)
        );

        CREATE INDEX IF NOT EXISTS idx_source_items_status ON source_items(status, last_seen_at);
        CREATE INDEX IF NOT EXISTS idx_source_items_source ON source_items(source, last_seen_at);
        CREATE INDEX IF NOT EXISTS idx_source_queue_status ON source_queue(status, queued_at);
        """
    )


def source_item_key(item: Any) -> str:
    source = _clean_key_part(getattr(item, "source", "") or "unknown")
    metadata = getattr(item, "metadata", {}) or {}
    for field in _KEY_METADATA_FIELDS:
        value = metadata.get(field)
        if value:
            return f"{source}:{field}:{_hashable(value)}"

    url = getattr(item, "url", "") or ""
    if url:
        return f"{source}:url:{_hashable(url)}"

    title = getattr(item, "title", "") or ""
    author = getattr(item, "author", "") or ""
    body = getattr(item, "body", "") or ""
    fingerprint = _hashable("\n".join([source, title, author, body[:2000]]))
    return f"{source}:content:{fingerprint}"


def claim_source_items(provider: str, items: list[Any]) -> tuple[list[ClaimedSourceItem], int]:
    claimed: list[ClaimedSourceItem] = []
    deduped = 0
    now = _now_iso()

    with _DB_LOCK, _connect() as conn:
        _ensure_schema(conn)
        for item in items:
            item_key = source_item_key(item)
            external_id = _external_id(item)
            row = conn.execute(
                """
                INSERT OR IGNORE INTO source_items (
                    item_key, provider, source, external_id, url, title, author,
                    status, seen_count, first_seen_at, last_seen_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 1, ?, ?)
                """,
                (
                    item_key,
                    provider,
                    str(getattr(item, "source", "") or "")[:80],
                    external_id[:500],
                    str(getattr(item, "url", "") or "")[:2000],
                    str(getattr(item, "title", "") or "")[:240],
                    str(getattr(item, "author", "") or "")[:160],
                    now,
                    now,
                ),
            )
            if row.rowcount == 1:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO source_queue (item_key, provider, status, queued_at, updated_at)
                    VALUES (?, ?, 'queued', ?, ?)
                    """,
                    (item_key, provider, now, now),
                )
                claimed.append(ClaimedSourceItem(key=item_key, item=item))
            else:
                deduped += 1
                conn.execute(
                    """
                    UPDATE source_items
                    SET seen_count = seen_count + 1,
                        last_seen_at = ?
                    WHERE item_key = ?
                    """,
                    (now, item_key),
                )
        conn.commit()

    return claimed, deduped


def mark_source_item_scored(
    item_key: str,
    *,
    score: int,
    qualified_signal: bool,
    meeting_ready: bool,
    charge_event: str,
) -> None:
    now = _now_iso()
    with _DB_LOCK, _connect() as conn:
        _ensure_schema(conn)
        conn.execute(
            """
            UPDATE source_items
            SET status = 'scored',
                scored_at = ?,
                score = ?,
                qualified_signal = ?,
                meeting_ready = ?,
                charge_event = ?,
                last_seen_at = ?
            WHERE item_key = ?
            """,
            (now, int(score), int(qualified_signal), int(meeting_ready), str(charge_event), now, item_key),
        )
        conn.execute(
            """
            UPDATE source_queue
            SET status = 'done',
                updated_at = ?
            WHERE item_key = ?
            """,
            (now, item_key),
        )
        conn.commit()


def _external_id(item: Any) -> str:
    metadata = getattr(item, "metadata", {}) or {}
    for field in _KEY_METADATA_FIELDS:
        value = metadata.get(field)
        if value:
            return str(value)
    return str(getattr(item, "url", "") or getattr(item, "title", "") or "")


def _hashable(value: Any) -> str:
    compact = _SPACE_RE.sub(" ", str(value or "").strip().lower())
    return hashlib.sha256(compact.encode("utf-8")).hexdigest()


def _clean_key_part(value: str) -> str:
    compact = _SPACE_RE.sub("-", str(value or "").strip().lower())
    safe = "".join(ch for ch in compact if ch.isalnum() or ch in {"-", "_", "."})
    return safe[:80] or "unknown"
