#!/bin/bash
# 세션 시작 훅 — 최근 세션 파일의 「다음 액션」과 교훈 색인만 뽑아 새 세션에 넣는다
cd "$(dirname "$0")" || exit 0
last=$(ls -t docs/세션/[0-9]*.md 2>/dev/null | head -1)
if [ -n "$last" ]; then
  echo "▶ 최근 세션: $last"
  awk '/^## 다음 액션/{p=1;next} /^## /{p=0} p' "$last"
fi
echo "▶ 교훈 색인 (docs/교훈/색인.md) — 행동을 바꾸기 전에 본다"
grep '^| \[' docs/교훈/색인.md 2>/dev/null | head -40
exit 0
