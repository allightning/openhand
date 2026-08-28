#!/usr/bin/env bash
# 确保 Combat Lab 开发服在 5175 运行；未运行则后台拉起。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://127.0.0.1:5175/combat-lab.html"
LOG="/tmp/openhand-lab-server.log"

if curl -sfI "$URL" >/dev/null 2>&1; then
  echo "Lab already up: $URL"
  exit 0
fi

echo "Starting lab server..."
cd "$ROOT"
nohup npm run dev >>"$LOG" 2>&1 &
for i in $(seq 1 30); do
  if curl -sfI "$URL" >/dev/null 2>&1; then
    echo "Lab ready: $URL"
    echo "Log: $LOG"
    exit 0
  fi
  sleep 0.2
done

echo "Lab failed to start. See $LOG" >&2
tail -20 "$LOG" >&2 || true
exit 1
