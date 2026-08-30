// 조회수 알리미 한 판 — 계정마다 최근 글을 보고 문턱을 넘은 것을 텔레그램으로 알린다
import { writeFile } from 'node:fs/promises'
import { 한판, 글월, 설정 } from './조회수알리미.mjs'
import { 알리기 } from './알림.mjs'

export const 결과길 = '조회수알리미결과.json'

const r = await 한판()
await writeFile(결과길, `${JSON.stringify({
  때: r.때, 문턱: 설정.문턱, 며칠: 설정.며칠,
  판들: r.판들.map((p) => ({ 계정: p.계정, 본글: p.본글 ?? 0, 알린수: (p.알릴것 ?? []).length, 안됨: p.안됨 ?? null })),
  알린것: r.알릴것,
}, null, 1)}\n`)

const 글 = 글월(r.알릴것)
if (!글) {
  console.log(`문턱(${설정.문턱.toLocaleString('ko-KR')}회)을 넘은 새 글이 없습니다`)
  process.exit(0)
}
console.log(글)
// 잘 퍼지는 글은 **바로** 알아야 한다. 한 글은 한 번만 알리므로 시끄러워지지 않는다
const 결과 = await 알리기(글, { 종류: '조회수알리미', 잠잠시간: 0 })
console.log(결과.보냄 ? '→ 텔레그램으로 보냈습니다' : `→ 못 보냈습니다: ${결과.까닭}`)
