#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="${PUBLIC_SOURCES_VENV:-$REPO_ROOT/.venv-public-sources}"
PYTHON="$VENV_DIR/bin/python"

URL="${URL:-${1:-}}"
SOURCE="${SOURCE:-scrapling}"
SELECTOR="${SELECTOR:-}"
MODE="${MODE:-fetcher}"
MIN_BUDGET_USD="${MIN_BUDGET_USD:-3000}"
LEADPULSE_API_URL="${LEADPULSE_API_URL:-https://leadpulseagi.com}"
LEADPULSE_M2M_API_KEY="${LEADPULSE_M2M_API_KEY:-}"

if [ -z "$URL" ]; then
  echo "URL is required" >&2
  exit 2
fi

if [ ! -x "$PYTHON" ]; then
  echo "Worker venv is missing. Run: bash ops/public_sources/setup_worker_venv.sh" >&2
  exit 2
fi

"$PYTHON" - "$URL" "$SOURCE" "$SELECTOR" "$MODE" "$MIN_BUDGET_USD" "$LEADPULSE_API_URL" "$LEADPULSE_M2M_API_KEY" <<'PY'
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

url, source, selector, mode, min_budget_usd, api, token = sys.argv[1:]
payload = json.dumps(
    {
        "url": url,
        "source": source,
        "selector": selector,
        "mode": mode,
        "min_budget_usd": float(min_budget_usd),
    }
).encode("utf-8")
headers = {"Content-Type": "application/json"}
if token:
    headers["Authorization"] = f"Bearer {token}"

request = urllib.request.Request(
    f"{api.rstrip('/')}/api/v2/sources/scrapling/fetch",
    data=payload,
    headers=headers,
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=60) as response:
        result = json.loads(response.read().decode("utf-8"))
except urllib.error.HTTPError as exc:
    body = exc.read().decode("utf-8", errors="ignore")
    print(f"LeadPulse Scrapling fetch failed: HTTP {exc.code} {body}", file=sys.stderr)
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
    source_item = item.get("item", {})
    scoring = item.get("scoring", {})
    print(f"- score={scoring.get('score')} title={source_item.get('title')} url={source_item.get('url')}")
PY
