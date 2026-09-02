#!/bin/bash
# 더블클릭하면 설정 화면이 켜지고 브라우저가 저절로 열린다 — 끄려면 이 창에서 Control + C
cd "$(dirname "$0")/.." || exit 1   # 단추/ 안에 있으니 한 칸 올라간다 (2026-09-01)

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js 가 없습니다."
  echo "  https://nodejs.org 에서 내려받아 설치한 뒤 다시 더블클릭해 주세요."
  echo ""
  read -r -p "  엔터를 누르면 닫힙니다. "
  exit 1
fi

if [ ! -d "dashboard/.next" ]; then
  echo "  먼저 화면을 한 번 빌드합니다 (1~2분)."
  node dashboard/node_modules/next/dist/bin/next build dashboard || { echo "  빌드에 실패했습니다."; read -r -p "  엔터. "; exit 1; }
fi

exec node 대시보드서버.mjs
