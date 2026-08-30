#!/bin/bash
# 팔로워와 내가 올린 글의 성적을 정기적으로 찍어 쌓는다 — LaunchAgent 가 부른다
# (bash 는 한글 변수명을 못 쓴다. 주석과 화면 글만 한국어다)
set -uo pipefail

HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"

PROFILE="${1:-}"
if [ -n "$PROFILE" ]; then
  # ⚠️ export 를 빠뜨리면 아래 node 가 PROFILE 을 못 본다. 그러면 어느 계정을 주든
  # **첫 계정의 글을** 그 계정 토큰으로 읽으려 들어 전부 「못 읽음」이 되고,
  # 팔로워 수까지 첫 계정 칸에 잘못 적힌다 (2026-08-25 실측). 자동발행.sh 와 같은 꼴로 둔다
  export PROFILE
  ENV_FILE=$HOME_DIR/계정/$PROFILE/열쇠.env
  # 공유 열쇠는 첫 계정 것을 물려받는다. 뒤 파일이 이긴다
  ENV_ARGS=(--env-file="$HOME_DIR/.env.local" --env-file="$ENV_FILE")
  LOG=$LOG_DIR/성적-$PROFILE-$(date +%Y-%m).log
  TITLE="[$PROFILE] "
else
  ENV_FILE=$HOME_DIR/.env.local
  ENV_ARGS=(--env-file="$ENV_FILE")
  LOG=$LOG_DIR/성적-$(date +%Y-%m).log
  TITLE=""
fi

cd "$HOME_DIR" || exit 1

if [ ! -f "$ENV_FILE" ]; then
  echo "‼️  열쇠 파일이 없습니다: $ENV_FILE" >> "$LOG"
  exit 1
fi

# ⚠️ 멈춤 스위치를 보지 않는다. 멈춤은 「글을 올리지 마라」이지
# 「성적을 재지 마라」가 아니다. 멈춰 둔 동안에도 조회수와 팔로워는 움직인다
echo "" >> "$LOG"
echo "═══ ${TITLE}$(date '+%Y-%m-%d %H:%M:%S') ═══" >> "$LOG"

"$NODE" "${ENV_ARGS[@]}" -e "
import('./src/성적.mjs').then(async (m) => {
  const r = await m.한판(process.env.PROFILE ?? '')
  console.log('팔로워 ' + (r.팔로워 ?? '못 읽음') +
    ' · 글 ' + r.본글 + '편 가운데 ' + r.찍음 + '편 새로 찍음' +
    ' · 그대로 ' + r.그대로 + '편' +
    (r.못읽음 ? ' · 못 읽음 ' + r.못읽음 + '편' : ''))
})" >> "$LOG" 2>&1
CODE=$?

if [ $CODE -ne 0 ]; then
  echo "‼️  성적을 못 찍었습니다 (종료코드 $CODE)" >> "$LOG"
fi

exit 0
