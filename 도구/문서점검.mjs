// 문서 위생 점검 — 교훈 카드가 색인에 있나, 뒤집은 카드가 실제로 있나, 세션 파일에 세 절이 있나
import { readFileSync, readdirSync } from 'node:fs';
const 문제 = [];
const 색인 = readFileSync('docs/교훈/색인.md', 'utf8');
const 카드들 = readdirSync('docs/교훈').filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== '색인.md');
for (const f of 카드들) {
  const 본문 = readFileSync(`docs/교훈/${f}`, 'utf8');
  if (!색인.includes(`](${f})`)) 문제.push(`색인에 없음: docs/교훈/${f}`);
  for (const 칸 of ['status:', 'confidence:', 'description:']) if (!본문.includes(칸)) 문제.push(`${f}: ${칸} 칸 없음`);
  // ⚠️ `\s*` 를 쓰면 줄바꿈까지 먹어, 「supersedes: (빈 값)」 다음 줄의 `---` 를 카드 이름으로 읽는다.
  //    형식 파일은 「없으면 비움」이라 시키는데 비우면 빨간불이 났다 (2026-09-08 실측). 같은 줄만 본다
  const s = 본문.match(/^supersedes:[^\S\n]*(\S+)/m)?.[1];
  if (s && !카드들.includes(s.replace(/\.md$/, '') + '.md')) 문제.push(`${f}: supersedes ${s} 가 없음`);
}
// ⚠️ 반대쪽도 본다 — **색인에만 있고 카드가 없는 줄**. 2026-09-08 에 실제로 만들었는데 초록이었다.
// 한쪽만 보는 검사는 「둘이 맞는다」가 아니라 「한쪽이 다른 쪽에 있다」만 말한다
// 있는 파일인지로 본다 — 색인은 형식 파일(`_형식.md`)도 가리키는데 그것은 카드가 아니다
const 있는파일 = new Set(readdirSync('docs/교훈'));
for (const [, 이름] of 색인.matchAll(/\]\((?!https?:)([^)]+\.md)\)/g)) {
  if (!있는파일.has(decodeURIComponent(이름))) 문제.push(`색인이 가리키는 카드가 없음: docs/교훈/${이름}`);
}
for (const f of readdirSync('docs/세션').filter(f => /^\d/.test(f))) {
  const 본문 = readFileSync(`docs/세션/${f}`, 'utf8');
  for (const 절 of ['## 한 일', '## 결정', '## 다음 액션']) if (!본문.includes(절)) 문제.push(`세션 ${f}: 「${절}」 없음`);
}
console.log(문제.length ? 문제.join('\n') : `이상 없음 — 카드 ${카드들.length}장`);
process.exit(문제.length ? 1 : 0);
