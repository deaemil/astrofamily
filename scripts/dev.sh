#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
.venv/bin/python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --no-access-log &
api_pid=$!
trap 'kill "$api_pid" 2>/dev/null || true' EXIT INT TERM
node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort "$@" &
web_pid=$!
trap 'kill "$api_pid" "$web_pid" 2>/dev/null || true' EXIT INT TERM
wait -n "$api_pid" "$web_pid"
