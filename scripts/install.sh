#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
astro_cache_dir="${ASTRO_CACHE_DIR:-$(pwd)/.cache}"
astro_python="${ASTRO_PYTHON:-python3.12}"
if ! command -v "$astro_python" >/dev/null 2>&1; then
  echo 'Не е намерен Python 3.12. На macOS изпълнете: brew install python@3.12' >&2
  exit 1
fi
"$astro_python" -m venv .venv
CC="${CC:-gcc}" CXX="${CXX:-g++}" .venv/bin/python -m pip install --cache-dir "$astro_cache_dir/pip" -r server/requirements.lock
npm ci --cache "$astro_cache_dir/npm" --no-audit --no-fund
.venv/bin/python scripts/ephemeris.py
