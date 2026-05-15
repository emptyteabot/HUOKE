#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/LeadPulse}"
BRANCH="${BRANCH:-main}"
APP_DIR="$REPO_ROOT/frontend-b2b"
M2M_DIR="$REPO_ROOT/m2m_backend"
RUNTIME_DIR="$APP_DIR/runtime-logs"
PORT="${PORT:-3005}"
HOST="${HOST:-127.0.0.1}"
M2M_PORT="${M2M_PORT:-8008}"
M2M_HOST="${M2M_HOST:-127.0.0.1}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
M2M_VENV="${M2M_VENV:-$REPO_ROOT/.venv-m2m}"
NEXT_STDOUT="$RUNTIME_DIR/next_stdout.log"
NEXT_STDERR="$RUNTIME_DIR/next_stderr.log"
M2M_STDOUT="$RUNTIME_DIR/m2m_stdout.log"
M2M_STDERR="$RUNTIME_DIR/m2m_stderr.log"
PID_FILE="$RUNTIME_DIR/next.pid"
M2M_PID_FILE="$RUNTIME_DIR/m2m.pid"
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

if [ ! -d "$M2M_DIR" ]; then
  echo "M2M backend not found: $M2M_DIR" >&2
  exit 1
fi

if [ ! -d "$M2M_VENV" ]; then
  "$PYTHON_BIN" -m venv "$M2M_VENV"
fi

"$M2M_VENV/bin/python" -m pip install --upgrade pip
"$M2M_VENV/bin/pip" install -r "$M2M_DIR/requirements.txt"

if [ -f "$M2M_PID_FILE" ]; then
  OLD_M2M_PID="$(cat "$M2M_PID_FILE" 2>/dev/null || true)"
  if [ -n "${OLD_M2M_PID:-}" ] && kill -0 "$OLD_M2M_PID" 2>/dev/null; then
    kill "$OLD_M2M_PID" || true
    sleep 2
  fi
fi

pkill -f "uvicorn leadpulse_m2m.main:app --host $M2M_HOST --port $M2M_PORT" || true
sleep 2

export LEADPULSE_SITE_URL="${LEADPULSE_SITE_URL:-https://leadpulseagi.com}"
export LEADPULSE_M2M_BACKEND_URL="${LEADPULSE_M2M_BACKEND_URL:-http://$M2M_HOST:$M2M_PORT}"

cd "$M2M_DIR"
nohup "$M2M_VENV/bin/python" -m uvicorn leadpulse_m2m.main:app --host "$M2M_HOST" --port "$M2M_PORT" >"$M2M_STDOUT" 2>"$M2M_STDERR" &
NEW_M2M_PID=$!
echo "$NEW_M2M_PID" > "$M2M_PID_FILE"

for _ in $(seq 1 20); do
  if curl -fsS "http://$M2M_HOST:$M2M_PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://$M2M_HOST:$M2M_PORT/health" >/dev/null 2>&1; then
  echo "M2M backend failed to start on $M2M_HOST:$M2M_PORT" >&2
  exit 1
fi

cd "$APP_DIR"

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
  "m2m_port": $M2M_PORT,
  "m2m_host": "$M2M_HOST",
  "pid": $NEW_PID,
  "m2m_pid": $NEW_M2M_PID,
  "deployed_at": "$BUILD_TIME"
}
EOF

echo "LeadPulse fixed domain deploy complete"
echo "commit=$COMMIT_SHA"
echo "pid=$NEW_PID"
echo "m2m_pid=$NEW_M2M_PID"
echo "port=$PORT"
echo "m2m_port=$M2M_PORT"
