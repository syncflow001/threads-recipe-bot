#!/bin/bash
# 화면(dashboard)을 다시 짓고 **반드시 서버까지 껐다 켠다** — 둘을 따로 하면 화면이 깨진다.
# (bash 는 한글 변수명을 못 쓴다. 주석과 화면 글만 한국어다)
#
# 왜 있나. 2026-08-29 에 화면만 다시 짓고 서버를 안 껐다. 돌고 있던 서버는 **옛 조각 이름**이
# 적힌 HTML 을 계속 내주는데 그 조각 파일은 이미 지워진 뒤라, 폰에서 열면 색도 글꼴도 없는
# 맨 글자만 나왔다. 자동 발행은 멀쩡했는데 화면만 깨져서 더 헷갈렸다.
set -uo pipefail
HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HOME_DIR" || exit 1
PORT=${PORT:-7788}

echo "▶ 화면을 다시 짓습니다 (1~2분)"
if ! node dashboard/node_modules/next/dist/bin/next build dashboard; then
  echo "‼️  짓기에 실패했습니다. 서버는 그대로 둡니다 — 지금 화면은 멀쩡히 돕니다."
  exit 1
fi

echo "▶ 서버를 껐다 켭니다 (LaunchAgent 가 저절로 다시 띄웁니다)"
PIDS=$(lsof -ti:"$PORT" 2>/dev/null)
if [ -z "$PIDS" ]; then
  echo "  $PORT 번에 도는 것이 없습니다 — 짓기만 하고 끝냅니다."
  exit 0
fi
for p in $PIDS; do kill -9 "$p" 2>/dev/null; done

for i in $(seq 1 20); do
  sleep 1
  if [ -n "$(lsof -ti:"$PORT" 2>/dev/null)" ]; then
    echo "✅ 다시 떴습니다 — http://127.0.0.1:$PORT"
    exit 0
  fi
done
echo "‼️  20초가 지나도 안 떴습니다. 「설정화면 켜기.command」 를 더블클릭해 주세요."
exit 1
