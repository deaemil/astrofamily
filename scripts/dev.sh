#!/usr/bin/env sh
# POSIX shell: compatible with the Bash 3.2 supplied by macOS.
set -eu
cd "$(dirname "$0")/.."

if [ ! -x .venv/bin/python ] || [ ! -f node_modules/vite/bin/vite.js ]; then
  echo 'Липсват зависимости. Първо изпълнете bash scripts/install.sh.' >&2
  exit 1
fi
ASTRO_API_PORT="${ASTRO_API_PORT:-8000}"
ASTRO_WEB_PORT="${ASTRO_WEB_PORT:-5173}"
export ASTRO_API_PORT
api_pid=''
web_pid=''
cleanup() {
  trap - EXIT INT TERM
  if [ -n "$web_pid" ]; then kill "$web_pid" 2>/dev/null || true; fi
  if [ -n "$api_pid" ]; then kill "$api_pid" 2>/dev/null || true; fi
  if [ -n "$web_pid" ]; then wait "$web_pid" 2>/dev/null || true; fi
  if [ -n "$api_pid" ]; then wait "$api_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

.venv/bin/python -m uvicorn server.main:app --host 0.0.0.0 --port "$ASTRO_API_PORT" --no-access-log &
api_pid=$!
echo 'Проверяваме връзката с изчислителния сървър…'
if ! .venv/bin/python scripts/wait_for_api.py "$ASTRO_API_PORT" "$api_pid"; then
  echo 'Сървърът не стартира. Проверете грешката по-горе; интерфейсът не е стартиран.' >&2
  exit 1
fi
node node_modules/vite/bin/vite.js --host 0.0.0.0 --port "$ASTRO_WEB_PORT" --strictPort "$@" &
web_pid=$!

# Monitor both processes without `wait -n`, unavailable in macOS Bash 3.2.
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do
  sleep 1
done
if ! kill -0 "$api_pid" 2>/dev/null; then
  echo 'Изчислителният сървър спря. Проверете грешката по-горе.' >&2
  wait "$api_pid" || exit "$?"
else
  wait "$web_pid" || exit "$?"
fi
exit 1
