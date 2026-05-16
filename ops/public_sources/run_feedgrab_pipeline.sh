#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${PUBLIC_SOURCES_VENV:-$REPO_ROOT/.venv-public-sources}"
PYTHON="$VENV_DIR/bin/python"
FEEDGRAB="$VENV_DIR/bin/feedgrab"

PIPELINE="${PIPELINE:-}"
QUERY="${QUERY:-}"
LIMIT="${LIMIT:-25}"
X_DAYS="${X_DAYS:-1}"
X_MIN_FAVES="${X_MIN_FAVES:-0}"
X_SORT="${X_SORT:-latest}"
REDDIT_SORT="${REDDIT_SORT:-new}"
REDDIT_LIMIT="${REDDIT_LIMIT:-25}"
XHS_SORT="${XHS_SORT:-latest}"
XHS_LIMIT="${XHS_LIMIT:-${LIMIT:-50}}"
LEADPULSE_API_URL="${LEADPULSE_API_URL:-https://leadpulseagi.com}"
LEADPULSE_M2M_API_KEY="${LEADPULSE_M2M_API_KEY:-}"
MIN_BUDGET_USD="${MIN_BUDGET_USD:-3000}"
MAX_RESULTS="${MAX_RESULTS:-10}"
WORKER_STATE_DIR="${WORKER_STATE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/leadpulse-public-sources}"

POSITIONAL_ARGS=("$@")
if [ -z "${PIPELINE:-}" ] && [ "${#POSITIONAL_ARGS[@]}" -gt 0 ]; then
  PIPELINE="${POSITIONAL_ARGS[0]}"
  POSITIONAL_ARGS=("${POSITIONAL_ARGS[@]:1}")
fi
if [ -z "${QUERY:-}" ] && [ -z "${FEEDGRAB_TARGET:-}" ] && [ "${#POSITIONAL_ARGS[@]}" -gt 0 ]; then
  QUERY="${POSITIONAL_ARGS[0]}"
  POSITIONAL_ARGS=("${POSITIONAL_ARGS[@]:1}")
fi
EXTRA_ARGS=("${POSITIONAL_ARGS[@]}")

if [ -z "${PIPELINE:-}" ]; then
  echo "PIPELINE is required: x, reddit, or xhs" >&2
  exit 2
fi

if [ ! -x "$FEEDGRAB" ] || [ ! -x "$PYTHON" ]; then
  echo "Worker venv is missing. Run: bash ops/public_sources/setup_worker_venv.sh" >&2
  exit 2
fi

RUN_ID="$(date -u '+%Y%m%dT%H%M%SZ')"
OUTPUT_DIR="${OUTPUT_DIR:-$WORKER_STATE_DIR/feedgrab/${PIPELINE:-manual}/$RUN_ID}"
mkdir -p "$OUTPUT_DIR"

feedgrab_target_for_pipeline() {
  case "$PIPELINE" in
    x|twitter)
      if [ -z "$QUERY" ]; then
        echo "QUERY is required for x pipeline unless FEEDGRAB_TARGET is set" >&2
        exit 2
      fi
      echo "x-so"
      ;;
    reddit)
      if [ -z "$QUERY" ]; then
        echo "QUERY is required for reddit pipeline unless FEEDGRAB_TARGET is set" >&2
        exit 2
      fi
      echo "reddit-sub"
      ;;
    xhs|xiaohongshu)
      if [ -n "${FEEDGRAB_TARGET:-}" ]; then
        echo "$FEEDGRAB_TARGET"
      else
        echo "xhs-so"
      fi
      ;;
    *)
      echo "Unsupported PIPELINE: $PIPELINE" >&2
      exit 2
      ;;
  esac
}

TARGET="${FEEDGRAB_TARGET:-$(feedgrab_target_for_pipeline)}"
STDOUT_FILE="$OUTPUT_DIR/feedgrab_stdout.md"

(
  cd "$OUTPUT_DIR"
  case "$PIPELINE:$TARGET" in
    x:x-so|twitter:x-so)
      if [ -z "$QUERY" ]; then
        echo "QUERY is required for x-so mode" >&2
        exit 2
      fi
      "$FEEDGRAB" x-so "$QUERY" --days "$X_DAYS" --min-faves "$X_MIN_FAVES" --sort "$X_SORT" --save "${EXTRA_ARGS[@]}" > "$STDOUT_FILE"
      ;;
    reddit:reddit-sub)
      if [ -z "$QUERY" ]; then
        echo "QUERY is required for reddit-sub mode" >&2
        exit 2
      fi
      "$FEEDGRAB" reddit-sub "$QUERY" --sort "$REDDIT_SORT" --limit "$REDDIT_LIMIT" "${EXTRA_ARGS[@]}" > "$STDOUT_FILE"
      ;;
    xhs:xhs-so|xiaohongshu:xhs-so)
      if [ -z "$QUERY" ]; then
        echo "QUERY is required for xhs-so mode" >&2
        exit 2
      fi
      "$FEEDGRAB" xhs-so "$QUERY" --sort "$XHS_SORT" --limit "$XHS_LIMIT" --save "${EXTRA_ARGS[@]}" > "$STDOUT_FILE"
      ;;
    *)
      "$FEEDGRAB" "$TARGET" "${EXTRA_ARGS[@]}" > "$STDOUT_FILE"
      ;;
  esac
)

if [ ! -s "$STDOUT_FILE" ]; then
  rm -f "$STDOUT_FILE"
fi

"$PYTHON" - "$OUTPUT_DIR" "$LEADPULSE_API_URL" "$MIN_BUDGET_USD" "$MAX_RESULTS" "$LEADPULSE_M2M_API_KEY" <<'PY'
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

root = Path(sys.argv[1])
api = sys.argv[2].rstrip("/")
min_budget_usd = float(sys.argv[3])
max_results = int(sys.argv[4])
token = sys.argv[5]

paths = [
    path
    for path in sorted(root.rglob("*.md"), key=lambda path: path.stat().st_mtime, reverse=True)
    if path.name != "feedgrab_stdout.md"
][:50]
if not paths:
    stdout = root / "feedgrab_stdout.md"
    if stdout.exists() and stdout.is_file():
        paths = [stdout]

documents = []
for path in paths:
    text = path.read_text(encoding="utf-8", errors="ignore").strip()
    if text:
        documents.append({"source": "feedgrab", "markdown": text})

if not documents:
    print(f"No Markdown output found in {root}")
    raise SystemExit(0)

payload = json.dumps(
    {
        "documents": documents,
        "min_budget_usd": min_budget_usd,
        "max_results": max_results,
    }
).encode("utf-8")
headers = {"Content-Type": "application/json"}
if token:
    headers["Authorization"] = f"Bearer {token}"

request = urllib.request.Request(
    f"{api}/api/v2/sources/feedgrab/ingest",
    data=payload,
    headers=headers,
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=60) as response:
        result = json.loads(response.read().decode("utf-8"))
except urllib.error.HTTPError as exc:
    body = exc.read().decode("utf-8", errors="ignore")
    print(f"LeadPulse ingest failed: HTTP {exc.code} {body}", file=sys.stderr)
    raise SystemExit(1)

print(
    "received={received} scored={scored} qualified={qualified} meeting_ready={meeting_ready}".format(
        received=result.get("received", 0),
        scored=result.get("scored", 0),
        qualified=result.get("qualified_signal_count", 0),
        meeting_ready=result.get("meeting_ready_count", 0),
    )
)
for item in result.get("qualified_meetings", []):
    source = item.get("item", {})
    scoring = item.get("scoring", {})
    print(f"- score={scoring.get('score')} title={source.get('title')} url={source.get('url')}")
PY
