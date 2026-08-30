#!/bin/bash
# 외국어 계정의 홈 피드를 그 언어 글로 채우려고 사람처럼 들락거린다 — LaunchAgent 가 부른다
# (bash 는 한글 변수명을 못 쓴다. 주석과 화면 글만 한국어다)
set -uo pipefail

HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"

PROFILE="${1:-}"
if [ -n "$PROFILE" ]; then
  ENV_FILE=$HOME_DIR/계정/$PROFILE/열쇠.env
  # 공유 열쇠는 첫 계정 것을 물려받는다. 뒤 파일이 이긴다
  ENV_ARGS=(--env-file="$HOME_DIR/.env.local" --env-file="$ENV_FILE")
  LOG=$LOG_DIR/길들이기-$PROFILE-$(date +%Y-%m).log
  TITLE="[$PROFILE] "
else
  ENV_FILE=$HOME_DIR/.env.local
  ENV_ARGS=(--env-file="$ENV_FILE")
  LOG=$LOG_DIR/길들이기-$(date +%Y-%m).log
  TITLE=""
fi

cd "$HOME_DIR" || exit 1

if [ ! -f "$ENV_FILE" ]; then
  echo "‼️  열쇠 파일이 없다: $ENV_FILE" >> "$LOG"
  exit 1
fi

# 정각마다 딱딱 들어가면 그게 더 기계 같다. 0~25분을 흩뜨려 들어간다.
# 시각표는 몇 시간마다 한 번만 부르므로 이 대기가 다음 판을 밀지 않는다
sleep $(( RANDOM % 1500 ))

echo "" >> "$LOG"
echo "═══ ${TITLE}$(date '+%Y-%m-%d %H:%M:%S') ═══" >> "$LOG"

"$NODE" "${ENV_ARGS[@]}" src/길들이기.mjs "$PROFILE" >> "$LOG" 2>&1
exit 0
