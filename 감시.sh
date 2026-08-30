#!/bin/bash
# 조용히 멈춘 발행을 잡아 텔레그램으로 알린다 — LaunchAgent 가 부른다
# 인자: 아침 | 주간 | 자동(시각을 보고 스스로 고른다)
set -uo pipefail

HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"
LOG=$LOG_DIR/감시.log

cd "$HOME_DIR" || exit 1

WHEN="${1:-자동}"
# 자동이면 시각으로 고른다. 일요일 09시 이후는 주간, 나머지는 아침이다.
# 09시 정각만 보면 맥이 자다 깨서 늦게 도는 날(launchd 가 뭉쳐서 돌리는 날) 그 주는
# 주간 보고가 아예 안 나간다 — 감시기가 죽은 것과 구분이 안 되는 신호라 정각 대신 이상으로 본다
if [ "$WHEN" = "자동" ]; then
  if [ "$(date +%u)" = "7" ] && [ "$(date +%H)" -ge "09" ]; then WHEN=주간; else WHEN=아침; fi
fi

echo "" >> "$LOG"
echo "═══ 감시($WHEN) $(date '+%Y-%m-%d %H:%M:%S') ═══" >> "$LOG"

# 열쇠는 첫 계정 것을 쓴다. 텔레그램 열쇠가 거기 있다
"$NODE" --env-file="$HOME_DIR/.env.local" "$HOME_DIR/감시돌기.mjs" "$WHEN" >> "$LOG" 2>&1
CODE=$?
[ $CODE -ne 0 ] && echo "‼️  감시가 실패했습니다 (종료코드 $CODE)" >> "$LOG"
exit $CODE
