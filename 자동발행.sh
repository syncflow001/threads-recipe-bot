#!/bin/bash
# 정해진 시각에 한 편씩 자동으로 올린다 — LaunchAgent 가 하루 세 번 부른다
# (bash 는 한글 변수명을 못 쓴다. 주석과 화면 글만 한국어다)
set -uo pipefail

# 이 스크립트가 놓인 폴더를 그대로 쓴다. 경로를 박아 두면 옮길 때마다 깨진다
HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"
LOG=$LOG_DIR/$(date +%Y-%m).log

cd "$HOME_DIR" || exit 1

# 스레드는 사람을 밖으로 내보내는 글을 싫어한다. 세 편 중 한 편(점심때)만 링크를 단다.
# 조사한 여러 출처가 "열 편에 한두 편만 링크" 를 말한다 — 도달이 급격히 떨어진다고 한다
HOUR=$(date +%H)
if [ "$HOUR" = "13" ]; then
  export NOLINK=0
  MODE="링크 있음"
else
  export NOLINK=1
  MODE="링크 없음"
fi

echo "" >> "$LOG"
echo "═══ $(date '+%Y-%m-%d %H:%M:%S') · $MODE ═══" >> "$LOG"

# 검색이 조여 있으면 후보가 안 잡힌다. TOP 을 넉넉히 주고 LIMIT 으로 한 편만 묶는다
START_LINE=$(wc -l < "$LOG")
TOP=12 LIMIT=1 "$NODE" --env-file="$HOME_DIR/.env.local" run.mjs 레시피 요리 한식 \
  --받기 --재구성 --발행 >> "$LOG" 2>&1
CODE=$?

# 이번 판에서 새로 찍힌 줄만 본다. 지난 판의 "올림" 을 보고 성공이라 착각하면 안 된다
if [ $CODE -ne 0 ]; then
  echo "‼️  실패 (종료코드 $CODE)" >> "$LOG"
elif tail -n +"$START_LINE" "$LOG" | grep -q "올림 →"; then
  echo "✅ 올렸다" >> "$LOG"
else
  echo "⏭  올린 것 없음 — 후보가 다 걸러졌거나 검색이 조였다" >> "$LOG"
fi

exit 0
