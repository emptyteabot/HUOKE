#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/LeadPulse}"
APP_DIR="$REPO_ROOT/frontend-b2b"
RUNTIME_DIR="$APP_DIR/runtime-logs"
PID_FILE="$RUNTIME_DIR/next.pid"
DEPLOY_META="$RUNTIME_DIR/fixed_domain_runtime.json"
PORT="${PORT:-3005}"
HOST="${HOST:-127.0.0.1}"

if [ -f "$DEPLOY_META" ]; then
  cat "$DEPLOY_META"
else
  echo "{}"
fi

echo

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  echo "pid=$PID"
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    echo "process=running"
  else
    echo "process=stopped"
  fi
else
  echo "pid=missing"
  echo "process=unknown"
fi

echo
curl -I "http://$HOST:$PORT" || true
