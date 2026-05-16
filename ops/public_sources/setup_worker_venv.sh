#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${PUBLIC_SOURCES_VENV:-$REPO_ROOT/.venv-public-sources}"
INSTALL_SCRAPLING="${INSTALL_SCRAPLING:-0}"

if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"
FEEDGRAB_SPEC="${FEEDGRAB_SPEC:-feedgrab[all] @ git+https://github.com/iBigQiang/feedgrab.git}"

"$PYTHON" -m pip install --upgrade pip
"$PIP" install --upgrade requests
"$PIP" install --upgrade "$FEEDGRAB_SPEC"

if [ "$INSTALL_SCRAPLING" = "1" ]; then
  "$PIP" install --upgrade "scrapling[all]"
  "$VENV_DIR/bin/scrapling" install
fi

cat <<EOF
LeadPulse public-source worker venv is ready.
venv=$VENV_DIR
feedgrab=$VENV_DIR/bin/feedgrab
scrapling=$([ -x "$VENV_DIR/bin/scrapling" ] && echo "$VENV_DIR/bin/scrapling" || echo "not installed")
EOF
