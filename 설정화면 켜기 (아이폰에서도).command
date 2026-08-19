#!/bin/bash
# 아이폰·아이패드에서도 열 수 있게 테일스케일 주소로 켠다 — 내 기기끼리만 통하는 사설망이다
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js 가 없습니다. https://nodejs.org 에서 설치한 뒤 다시 더블클릭해 주세요."
  read -r -p "  엔터를 누르면 닫힙니다. "
  exit 1
fi

# 테일스케일이 준 100.x 주소를 찾는다. 없으면 이 컴퓨터에서만 열고 그 사실을 알린다
TS=$(tailscale ip -4 2>/dev/null | head -1)
if [ -z "$TS" ]; then
  TS=$(ifconfig 2>/dev/null | grep -o 'inet 100\.[0-9.]*' | head -1 | awk '{print $2}')
fi

if [ -z "$TS" ]; then
  echo ""
  echo "  테일스케일 주소를 못 찾았습니다. 이 컴퓨터에서만 열립니다."
  echo "  아이폰에서도 쓰려면 테일스케일을 켜고 다시 더블클릭해 주세요."
  echo ""
  exec node 설정화면.mjs
fi

echo ""
echo "  아이폰·아이패드에서도 열 수 있게 켭니다."
echo "  아래 주소를 그 기기의 브라우저에 붙여넣으세요 (테일스케일이 켜져 있어야 합니다)."
echo ""
exec env BIND="$TS" node 설정화면.mjs
