#!/usr/bin/env bash
set -euo pipefail

# Simple entrypoint for Railway/Railpack to run the backend service from a monorepo.
# Expected to be executed from the repository root by Railpack.

echo "[start.sh] Starting backend service"

# Ensure we run from repo root, then cd into backend
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Ensure user bin is on PATH for any per-user installs
export PATH="$HOME/.local/bin:$PATH"

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# Resolve a usable Python executable
resolve_python() {
  if have_cmd python; then
    echo python
  elif have_cmd python3; then
    echo python3
  else
    echo "" # no python found
  fi
}

run_with_uv() {
  echo "[start.sh] Using uv for dependency sync and run"
  if [ -f "uv.lock" ]; then
    uv sync --frozen || uv sync
  else
    uv sync
  fi
  if [ "${RUN_MIGRATIONS:-1}" = "1" ] && [ -f "alembic.ini" ]; then
    echo "[start.sh] Running Alembic migrations (uv)"
    uv run alembic upgrade head || echo "[start.sh] Alembic not configured or failed; continuing"
  fi
  PORT="${PORT:-8000}"
  echo "[start.sh] Launching Uvicorn (uv) on 0.0.0.0:${PORT}"
  exec uv run uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
}

run_with_pip() {
  echo "[start.sh] Falling back to python + pip install ."
  PYTHON_BIN="$(resolve_python)"
  if [ -z "$PYTHON_BIN" ]; then
    echo "[start.sh] ERROR: No python interpreter found for pip fallback."
    exit 1
  fi
  # Ensure pip is up to date and install the app with its dependencies
  "$PYTHON_BIN" -m pip install --upgrade pip
  # Install project (declared in pyproject.toml) into the environment
  "$PYTHON_BIN" -m pip install .
  if [ "${RUN_MIGRATIONS:-1}" = "1" ] && [ -f "alembic.ini" ]; then
    echo "[start.sh] Running Alembic migrations (pip)"
    "$PYTHON_BIN" -m alembic upgrade head || echo "[start.sh] Alembic not configured or failed; continuing"
  fi
  PORT="${PORT:-8000}"
  echo "[start.sh] Launching Uvicorn (pip) on 0.0.0.0:${PORT}"
  exec "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
}

# Strategy:
# 1) If uv is available, use it.
# 2) Else if python is available, use pip fallback.
# 3) Otherwise, error with guidance.

if have_cmd uv; then
  run_with_uv
elif [ -n "$(resolve_python)" ]; then
  run_with_pip
else
  echo "[start.sh] ERROR: Neither 'uv' nor 'python' found in PATH."
  echo "[start.sh] Hint: Add a railpack.json with packages.python to install Python at build time."
  exit 1
fi
