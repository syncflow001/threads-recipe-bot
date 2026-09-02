#!/bin/bash
# 날마다 계정마다 노출이 죽었는지 재서 쌓는다 — LaunchAgent 가 부른다
# (bash 는 한글 변수명을 못 쓴다. 주석과 화면 글만 한국어다)
set -uo pipefail
HOME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node || echo /usr/local/bin/node)"
LOG_DIR=$HOME_DIR/logs
mkdir -p "$LOG_DIR"
LOG=$LOG_DIR/섀도우밴-$(date +%Y-%m).log
cd "$HOME_DIR" || exit 1
{
  echo ""
  echo "═══ 섀도우밴 살피기 $(date '+%Y-%m-%d %H:%M:%S') ═══"
  "$NODE" --env-file=.env.local src/섀도우밴돌기.mjs
} >>"$LOG" 2>&1
