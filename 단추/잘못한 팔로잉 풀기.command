#!/bin/bash
# 더블클릭하면 잘못 나간 팔로잉을 하루 두 명씩 푼다 — 며칠에 걸쳐 나눠 푼다
cd "$(dirname "$0")/.." || exit 1   # 단추/ 안에 있으니 한 칸 올라간다 (2026-09-01)

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js 가 없습니다."
  echo "  https://nodejs.org 에서 내려받아 설치한 뒤 다시 더블클릭해 주세요."
  echo ""
  read -r -p "  엔터를 누르면 닫힙니다. "
  exit 1
fi

node --env-file=.env.local --env-file=계정/example.cook/열쇠.env src/팔로잉풀기돌기.mjs example.cook "$@"
read -r -p "  엔터를 누르면 닫힙니다. "
