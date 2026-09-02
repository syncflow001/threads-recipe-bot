#!/bin/bash
# 검사를 하나도 빠뜨리지 않고 전부 돌린다 — 이 저장소의 유일한 검사 명령
#
# ⚠️ **왜 만들었나 (2026-08-30).**
#   `node --test 검사/test.*.mjs` 는 **`검사/test.mjs` 를 안 돈다.** 무늬가 `test.<이름>.mjs` 라
#   점이 없는 `test.mjs` 가 빠진다. 그것을 모르고 「검사 96개 전부 초록」이라고 보고했는데,
#   빠진 절반 안에 **여덟 계정 발행을 죽일 버그 셋**이 들어 있었다.
#   검사 파일을 새로 만들어도 여기 손댈 일이 없어야 한다 — 그래서 폴더를 세어 돈다.
#   (bash 는 한글 변수 이름을 못 쓴다. 주석과 화면 글만 한국어다)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

files=(검사/test*.mjs)
echo ""
echo "  검사 파일 ${#files[@]}개를 돕니다"
echo ""

fail=0
node_tests=()
self_tests=()
for f in "${files[@]}"; do
  if grep -q "from 'node:test'" "$f"; then node_tests+=("$f"); else self_tests+=("$f"); fi
done

if [ ${#node_tests[@]} -gt 0 ]; then
  echo "── node:test 로 도는 것 ${#node_tests[@]}개 ──"
  node --test "${node_tests[@]}" || fail=1
fi

# 스스로 도는 검사(assert 를 직접 던진다). 하나라도 빠지면 안 된다
for f in "${self_tests[@]}"; do
  echo ""
  echo "── $f ──"
  node "$f" || fail=1
done

echo ""
if [ $fail -eq 0 ]; then
  echo "  ✅ 검사 파일 ${#files[@]}개 전부 초록입니다."
else
  echo "  ‼️  실패한 검사가 있습니다 — 위 기록을 보세요."
fi
exit $fail
