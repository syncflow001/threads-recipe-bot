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
#   ./자동발행.sh        →  .env.local · 계정/main/persona.json · logs/2026-08.log
#   ./자동발행.sh b      →  계정/b/열쇠.env · 계정/b/persona.json · logs/b-2026-08.log
PROFILE="${1:-}"
if [ -n "$PROFILE" ]; then
  export PROFILE
  ENV_FILE=$HOME_DIR/계정/$PROFILE/열쇠.env
  # 공유 열쇠는 첫 계정 것을 물려받는다. 뒤 파일이 이긴다
  ENV_ARGS=(--env-file="$HOME_DIR/.env.local" --env-file="$ENV_FILE")
  LOG=$LOG_DIR/$PROFILE-$(date +%Y-%m).log
  LAST=$LOG_DIR/마지막발행-$PROFILE.txt
  TITLE="[$PROFILE] "
else
  ENV_FILE=$HOME_DIR/.env.local
  ENV_ARGS=(--env-file="$ENV_FILE")
  LOG=$LOG_DIR/$(date +%Y-%m).log
  LAST=$LOG_DIR/마지막발행.txt
  TITLE=""
fi

cd "$HOME_DIR" || exit 1

if [ ! -f "$ENV_FILE" ]; then
  echo "‼️  열쇠 파일이 없습니다: $ENV_FILE" >> "$LOG"
  exit 1
fi

echo "" >> "$LOG"
echo "═══ ${TITLE}$(date '+%Y-%m-%d %H:%M:%S') ═══" >> "$LOG"

# 팔로워 수를 하루 한 줄씩 쌓는다. 스레드는 과거 팔로워 수를 안 준다 (2026-08-25 실측) —
# 오늘 안 찍으면 오늘 값은 영영 못 채운다. 그래서 화면을 안 열어도 여기서 찍는다.
# ⚠️ 일부러 멈춤 스위치보다 **위**에 둔다. 멈춰 둔 계정도 팔로워는 늘고 줄기 때문이다.
# 그날 이미 찍었으면 스레드를 아예 안 두드린다. 실패해도 발행은 그대로 간다
"$NODE" "${ENV_ARGS[@]}" -e \
  "import('./src/팔로워.mjs').then((m) => m.하루한번찍기(process.env.PROFILE ?? ''))" \
  >> "$LOG" 2>&1 || echo "· 팔로워 수는 못 찍었습니다 (발행에는 지장이 없습니다)" >> "$LOG"

# 급히 멈추는 스위치. launchctl 을 안 건드리므로 시각표는 그대로 남는다.
# 왜 안 도는지 반드시 로그에 남긴다 — 안 남기면 고장과 구분되지 않는다
if [ -f "$HOME_DIR/멈춤" ]; then
  echo "⏸  멈춰 있습니다 — 전체 멈춤입니다 (설정 화면에서 다시 켤 수 있습니다)" >> "$LOG"
  exit 0
fi
# 계정 멈춤은 그 계정 폴더 안에 산다 (2026-08-29 폴더 개편). 옛 자리를 보면 멈춰도 계속 발행한다
if [ -n "$PROFILE" ] && [ -f "$HOME_DIR/계정/$PROFILE/멈춤" ]; then
  echo "⏸  멈춰 있습니다 — 이 계정만 멈춤입니다 (설정 화면에서 다시 켤 수 있습니다)" >> "$LOG"
  exit 0
fi

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
    echo "⏸  이번 판은 건너뜁니다 — 마지막 발행이 ${ELAPSED}분 전입니다 (${GAP_MIN}분은 띄웁니다)" >> "$LOG"
    exit 0
  fi
fi

# 검색이 조여 있으면 후보가 안 잡힌다. TOP 을 넉넉히 주고 LIMIT 으로 한 편만 묶는다
# wc -l 은 맥에서 앞에 빈칸을 붙인다. 그대로 tail 에 넘기면 "illegal offset" 으로 죽어
# 올렸는데도 "올린 것 없음" 이 찍히고 마지막발행 시각도 안 남았다. 산술 확장이 빈칸을 없앤다
START_LINE=$(( $(wc -l < "$LOG") + 1 ))
# 검색어를 박아 두지 않는다. 계정마다 분야가 다르고, run.mjs 가 시각에 따라 돌려 가며 쓴다 —
# 같은 검색어를 하루 열몇 번 두드리면 스레드가 결과를 1개로 줄인다 (실측)
TOP=12 LIMIT=1 "$NODE" "${ENV_ARGS[@]}" run.mjs --받기 --재구성 --발행 >> "$LOG" 2>&1
CODE=$?

# 이번 판에서 새로 찍힌 줄만 본다. 지난 판의 "올림" 을 보고 성공이라 착각하면 안 된다
if [ $CODE -ne 0 ]; then
  echo "‼️  이번 판이 실패했습니다 (종료코드 $CODE) — 위 기록에서 까닭을 보세요" >> "$LOG"
elif tail -n +"$START_LINE" "$LOG" | grep -q "올림 →"; then
  date +%s > "$LAST"   # 올린 때를 적어 둔다. 다음 판이 간격을 지키는 근거다
  echo "✅ 한 편 올렸습니다" >> "$LOG"
else
  echo "⏭  이번 판은 올린 글이 없습니다 — 쓸 만한 글이 없었습니다 (고장이 아닙니다)" >> "$LOG"
fi

exit 0
