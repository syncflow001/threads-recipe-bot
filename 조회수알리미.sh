#!/bin/bash
# 30분마다 계정마다 최근 글의 조회수를 보고, 문턱을 넘으면 텔레그램으로 알린다
set -uo pipefail
HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HOME_DIR" || exit 1
# 계정 출입증은 알리미가 계정마다 파일에서 직접 읽는다. 여기서는 텔레그램 열쇠만 준다
exec node --env-file="$HOME_DIR/.env.local" src/조회수알리미돌기.mjs "$@"
