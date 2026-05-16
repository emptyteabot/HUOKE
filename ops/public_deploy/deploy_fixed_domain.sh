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

stop_pid_tree() {
  local pid="${1:-}"
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  pkill -TERM -P "$pid" 2>/dev/null || true
  kill "$pid" 2>/dev/null || true
  sleep 2

  pkill -KILL -P "$pid" 2>/dev/null || true
  kill -KILL "$pid" 2>/dev/null || true
}

port_listener_pids() {
  local port="$1"
  ss -ltnp 2>/dev/null | awk -v port=":$port" '$4 ~ port { print $0 }' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u
}

stop_port_listeners() {
  local port="$1"
  local pid cwd cmd pids
  pids="$(port_listener_pids "$port")"

  for pid in $pids; do
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"

    if [[ "$cwd" == "$APP_DIR"* || "$cwd" == /opt/leadpulse/frontend-b2b* || "$cmd" == *"next-server"* || "$cmd" == *"next start"* ]]; then
      stop_pid_tree "$pid"
    else
      echo "Refusing to stop unrelated process on port $port: pid=$pid cwd=$cwd cmd=$cmd" >&2
      exit 1
    fi
  done

  for _ in $(seq 1 10); do
    if [ -z "$(port_listener_pids "$port")" ]; then
      return 0
    fi
    sleep 1
  done

  echo "Port $port is still occupied after stop attempt: $(port_listener_pids "$port")" >&2
  exit 1
}

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Repo not found: $REPO_ROOT" >&2
  exit 1
fi

cd "$REPO_ROOT"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env.production}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

export LEADPULSE_SITE_URL="${LEADPULSE_SITE_URL:-https://leadpulseagi.com}"
export LEADPULSE_M2M_BACKEND_URL="${LEADPULSE_M2M_BACKEND_URL:-http://$M2M_HOST:$M2M_PORT}"
export LEADPULSE_PAYMENT_PROVIDER="${LEADPULSE_PAYMENT_PROVIDER:-xunhupay}"
export LEADPULSE_XUNHU_GATEWAY_URL="${LEADPULSE_XUNHU_GATEWAY_URL:-https://api.xunhupay.com/payment/do.html}"
export LEADPULSE_XUNHU_NOTIFY_URL="${LEADPULSE_XUNHU_NOTIFY_URL:-$LEADPULSE_SITE_URL/api/v1/xunhupay/notify}"
export LEADPULSE_XUNHU_RETURN_URL="${LEADPULSE_XUNHU_RETURN_URL:-$LEADPULSE_SITE_URL/pay?payment=return}"
export WALLET_SIGNING_SECRET="${WALLET_SIGNING_SECRET:-leadpulse-wallet-prod-change-me}"
export DEFAULT_EXPORT_CREDITS="${DEFAULT_EXPORT_CREDITS:-60}"
export FREE_EXPORT_LIMIT="${FREE_EXPORT_LIMIT:-3}"
export EXPORT_CREDIT_COST="${EXPORT_CREDIT_COST:-20}"

cd "$APP_DIR"
rm -rf .next
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
  stop_pid_tree "$OLD_PID"
fi

pkill -f "next start --hostname $HOST --port $PORT" || true
stop_port_listeners "$PORT"
sleep 2

nohup node node_modules/next/dist/bin/next start --hostname "$HOST" --port "$PORT" >"$NEXT_STDOUT" 2>"$NEXT_STDERR" &
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

LISTENER_PID="$(port_listener_pids "$PORT" | head -n 1)"
if [ -z "$LISTENER_PID" ]; then
  echo "Next.js health check passed but no listener pid was found on $HOST:$PORT" >&2
  exit 1
fi
echo "$LISTENER_PID" > "$PID_FILE"

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
  "pid": $LISTENER_PID,
  "m2m_pid": $NEW_M2M_PID,
  "deployed_at": "$BUILD_TIME"
}
EOF

echo "LeadPulse fixed domain deploy complete"
echo "commit=$COMMIT_SHA"
echo "pid=$LISTENER_PID"
echo "m2m_pid=$NEW_M2M_PID"
echo "port=$PORT"
echo "m2m_port=$M2M_PORT"
