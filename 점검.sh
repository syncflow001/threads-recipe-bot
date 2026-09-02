#!/bin/bash
# 30분마다 전 계정을 훑어 이상이 있으면 텔레그램으로 알린다 — LaunchAgent 가 부른다. 읽기만 한다
set -uo pipefail

HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"
LOG=$LOG_DIR/점검.log

cd "$HOME_DIR" || exit 1

echo "" >> "$LOG"
echo "═══ 점검 $(date '+%Y-%m-%d %H:%M:%S') ═══" >> "$LOG"

# 열쇠는 첫 계정 것을 쓴다. 텔레그램 열쇠가 거기 있다
"$NODE" --env-file="$HOME_DIR/.env.local" "$HOME_DIR/src/점검돌기.mjs" >> "$LOG" 2>&1
CODE=$?
[ $CODE -ne 0 ] && echo "‼️  점검이 실패했습니다 (종료코드 $CODE)" >> "$LOG"
exit $CODE
