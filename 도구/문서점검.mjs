// 문서 위생 점검 — 교훈 카드가 색인에 있나, 뒤집은 카드가 실제로 있나, 세션 파일에 세 절이 있나
import { readFileSync, readdirSync } from 'node:fs';
const 문제 = [];
const 색인 = readFileSync('docs/교훈/색인.md', 'utf8');
const 카드들 = readdirSync('docs/교훈').filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== '색인.md');
for (const f of 카드들) {
  const 본문 = readFileSync(`docs/교훈/${f}`, 'utf8');
  if (!색인.includes(`](${f})`)) 문제.push(`색인에 없음: docs/교훈/${f}`);
  for (const 칸 of ['status:', 'confidence:', 'description:']) if (!본문.includes(칸)) 문제.push(`${f}: ${칸} 칸 없음`);
  const s = 본문.match(/^supersedes:\s*(\S+)/m)?.[1];
  if (s && !카드들.includes(s.replace(/\.md$/, '') + '.md')) 문제.push(`${f}: supersedes ${s} 가 없음`);
}
for (const f of readdirSync('docs/세션').filter(f => /^\d/.test(f))) {
  const 본문 = readFileSync(`docs/세션/${f}`, 'utf8');
  for (const 절 of ['## 한 일', '## 결정', '## 다음 액션']) if (!본문.includes(절)) 문제.push(`세션 ${f}: 「${절}」 없음`);
}
console.log(문제.length ? 문제.join('\n') : `이상 없음 — 카드 ${카드들.length}장`);
process.exit(문제.length ? 1 : 0);
