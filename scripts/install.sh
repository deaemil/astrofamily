#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv
CC=gcc CXX=g++ .venv/bin/pip install --cache-dir /workspace/.pip-cache -r server/requirements.lock
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
.venv/bin/python scripts/ephemeris.py
