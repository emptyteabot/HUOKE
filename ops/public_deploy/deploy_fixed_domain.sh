#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/LeadPulse}"
BRANCH="${BRANCH:-main}"
APP_DIR="$REPO_ROOT/frontend-b2b"
RUNTIME_DIR="$APP_DIR/runtime-logs"
PORT="${PORT:-3005}"
HOST="${HOST:-127.0.0.1}"
NEXT_STDOUT="$RUNTIME_DIR/next_stdout.log"
NEXT_STDERR="$RUNTIME_DIR/next_stderr.log"
PID_FILE="$RUNTIME_DIR/next.pid"
DEPLOY_META="$RUNTIME_DIR/fixed_domain_runtime.json"

mkdir -p "$RUNTIME_DIR"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Repo not found: $REPO_ROOT" >&2
  exit 1
fi

cd "$REPO_ROOT"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR"
npm ci
npm run build

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" || true
    sleep 2
  fi
fi

pkill -f "next start --hostname $HOST --port $PORT" || true
sleep 2

nohup npm run start -- --hostname "$HOST" --port "$PORT" >"$NEXT_STDOUT" 2>"$NEXT_STDERR" &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

for _ in $(seq 1 20); do
  if curl -fsS "http://$HOST:$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://$HOST:$PORT" >/dev/null 2>&1; then
  echo "Next.js failed to start on $HOST:$PORT" >&2
  exit 1
fi

COMMIT_SHA="$(git rev-parse HEAD)"
BUILD_TIME="$(date '+%Y-%m-%d %H:%M:%S')"

cat > "$DEPLOY_META" <<EOF
{
  "branch": "$BRANCH",
  "commit": "$COMMIT_SHA",
  "port": $PORT,
  "host": "$HOST",
  "pid": $NEW_PID,
  "deployed_at": "$BUILD_TIME"
}
EOF

echo "LeadPulse fixed domain deploy complete"
echo "commit=$COMMIT_SHA"
echo "pid=$NEW_PID"
echo "port=$PORT"
