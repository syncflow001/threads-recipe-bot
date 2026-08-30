// 헬스체크 한 판 — 재고, 이상하면 텔레그램으로 알리고, 결과를 파일에 남긴다
import { writeFile } from 'node:fs/promises'
import { 한판, 글월 } from './헬스체크.mjs'
import { 알리기 } from './알림.mjs'

export const 결과길 = '헬스체크결과.json'

const r = await 한판()
await writeFile(결과길, `${JSON.stringify(r, null, 1)}\n`)

const 글 = 글월(r)
if (!글) {
  console.log(`✅ 이상 없습니다 — 계정 ${r.계정수}개를 쟀습니다 (${r.잰것.join(', ')})`)
  process.exit(0)
}
console.log(글)
// ⚠️ **잠잠 시간을 건너뛴다.** 알림.mjs 는 같은 종류를 6시간에 한 번만 보내는데,
// 열쇠가 깨진 것은 매번 알려야 한다 — 조용해지면 그게 제일 위험하다
const 결과 = await 알리기(글, { 종류: '헬스체크', 잠잠시간: 0 })
console.log(결과.보냄 ? '→ 텔레그램으로 보냈습니다' : `→ 못 보냈습니다: ${결과.까닭}`)
