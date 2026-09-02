#!/bin/bash
# 세션 시작 훅 — 최근 세션 파일의 「다음 액션」과 교훈 색인만 뽑아 새 세션에 넣는다
cd "$(dirname "$0")/.." || exit 0   # 도구/ 안에 있으니 한 칸 올라가야 저장소 뿌리다 (2026-09-01)
last=$(ls -t docs/세션/[0-9]*.md 2>/dev/null | head -1)
if [ -n "$last" ]; then
  echo "▶ 최근 세션: $last"
  awk '/^## 다음 액션/{p=1;next} /^## /{p=0} p' "$last"
fi
echo "▶ 교훈 색인 (docs/교훈/색인.md) — 행동을 바꾸기 전에 본다"
# 카드가 늘면 조용히 잘린다. 상한을 두되 잘렸으면 잘렸다고 말한다 (2026-09-01)
cards=$(grep -c '^| \[' docs/교훈/색인.md 2>/dev/null || echo 0)
grep '^| \[' docs/교훈/색인.md 2>/dev/null | head -60
if [ "$cards" -gt 60 ]; then
  echo "  … 카드 $cards 장 중 60장만 보였다. 나머지는 docs/교훈/색인.md 를 직접 열어 본다"
fi
exit 0
