#!/bin/bash
# 3시간마다 계정 열쇠를 재고, 이상하면 텔레그램으로 알린다 (시각표가 부른다)
set -uo pipefail
HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HOME_DIR" || exit 1
# 텔레그램 열쇠만 있으면 된다. 계정 열쇠는 헬스체크가 파일에서 직접 읽는다 —
# 여기서 --env-file 로 넣으면 그 값이 「부모 환경」이 되어 재는 것을 방해한다 (인계 §7-17)
exec node --env-file="$HOME_DIR/.env.local" src/헬스체크돌기.mjs "$@"
