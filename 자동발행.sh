#!/bin/bash
# 정해진 시각에 한 편씩 자동으로 올린다 — LaunchAgent 가 부른다. 계정 이름을 인자로 받는다
# (bash 는 한글 변수명을 못 쓴다. 주석과 화면 글만 한국어다)
set -uo pipefail

# 이 스크립트가 놓인 폴더를 그대로 쓴다. 경로를 박아 두면 옮길 때마다 깨진다
HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"
# 계정 이름을 첫 인자로 받는다. 안 주면 지금까지 쓰던 첫 계정이다.
#   ./자동발행.sh        →  .env.local · persona.json · logs/2026-08.log
#   ./자동발행.sh b      →  .env.b     · persona.b.json · logs/b-2026-08.log
PROFILE="${1:-}"
if [ -n "$PROFILE" ]; then
  export PROFILE
  ENV_FILE=$HOME_DIR/.env.$PROFILE
  LOG=$LOG_DIR/$PROFILE-$(date +%Y-%m).log
  LAST=$LOG_DIR/마지막발행-$PROFILE.txt
  TITLE="[$PROFILE] "
else
  ENV_FILE=$HOME_DIR/.env.local
  LOG=$LOG_DIR/$(date +%Y-%m).log
  LAST=$LOG_DIR/마지막발행.txt
  TITLE=""
fi

cd "$HOME_DIR" || exit 1

if [ ! -f "$ENV_FILE" ]; then
  echo "‼️  열쇠 파일이 없다: $ENV_FILE" >> "$LOG"
  exit 1
fi

echo "" >> "$LOG"
echo "═══ ${TITLE}$(date '+%Y-%m-%d %H:%M:%S') ═══" >> "$LOG"

# 맥이 자는 동안 지나간 시각들을 launchd 가 깨어난 뒤 한꺼번에 실행한다.
# 그대로 두면 3시간 간격이 깨지고 글이 연달아 올라간다 — 스레드에서 제일 안 좋은 모양이다.
# 그래서 마지막으로 올린 지 150분이 안 됐으면 이 판은 건너뛴다
# 시각표가 알려 준다. 안 알려 주면 넉넉히 잡는다 (LaunchAgent 가 EnvironmentVariables 로 넘긴다)
GAP_MIN=${GAP_MIN:-150}
if [ -f "$LAST" ]; then
  PREV=$(cat "$LAST" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$(( (NOW - PREV) / 60 ))
  if [ "$ELAPSED" -lt "$GAP_MIN" ]; then
    echo "⏸  건너뜀 — 마지막 발행이 ${ELAPSED}분 전이다 (${GAP_MIN}분은 띄운다)" >> "$LOG"
    exit 0
  fi
fi

# 검색이 조여 있으면 후보가 안 잡힌다. TOP 을 넉넉히 주고 LIMIT 으로 한 편만 묶는다
START_LINE=$(wc -l < "$LOG")
TOP=12 LIMIT=1 "$NODE" --env-file="$ENV_FILE" run.mjs 레시피 요리 한식 \
  --받기 --재구성 --발행 >> "$LOG" 2>&1
CODE=$?

# 이번 판에서 새로 찍힌 줄만 본다. 지난 판의 "올림" 을 보고 성공이라 착각하면 안 된다
if [ $CODE -ne 0 ]; then
  echo "‼️  실패 (종료코드 $CODE)" >> "$LOG"
elif tail -n +"$START_LINE" "$LOG" | grep -q "올림 →"; then
  date +%s > "$LAST"   # 올린 때를 적어 둔다. 다음 판이 간격을 지키는 근거다
  echo "✅ 올렸다" >> "$LOG"
else
  echo "⏭  올린 것 없음 — 후보가 다 걸러졌거나 검색이 조였다" >> "$LOG"
fi

exit 0
