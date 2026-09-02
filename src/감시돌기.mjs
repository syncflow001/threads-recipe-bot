// 감시 한 판 — 계정을 모두 훑어 아침이면 문제만, 주간이면 언제나 보낸다
import { readFile } from 'node:fs/promises'
import { 아침글월, 주간글월 } from './감시.mjs'
import { 계정모음만들기, 계정토큰읽기 } from './감시모음.mjs'
import { 도달재기 } from './도달.mjs'
import { 알리기 } from './알림.mjs'

const 언제 = process.argv[2] === '주간' ? '주간' : '아침'
const 뿌리 = process.cwd()

const 장부 = await readFile('계정정보.json', 'utf8').then(JSON.parse).catch(() => ({ '': {} }))
const 계정들 = Object.keys(장부)

const 모음 = []
for (const 계정 of 계정들) {
  const 별칭 = 장부[계정]?.별칭 ?? 계정
  모음.push(await 계정모음만들기(계정, 별칭, 언제, { 뿌리 }))
}

const 글월 = 언제 === '아침' ? 아침글월(모음) : 주간글월(모음)
if (글월) {
  // 알림이 실패해도 감시는 성공이다. 텔레그램이 죽었다고 종료코드를 더럽히면
  // 무인 실행에서 진짜 실패와 구분되지 않는다 (fail-open)
  const 결과 = await 알리기(글월, { 종류: `감시-${언제}` })
  console.log(글월)
  console.log(결과.보냄 ? '→ 텔레그램으로 보냈습니다' : `→ 못 보냈습니다: ${결과.까닭}`)
} else {
  console.log('보낼 것이 없습니다 — 어제 예정된 판이 모두 돌았습니다')
}

// 도달을 잰다 — **알림을 보낸 뒤**다. 계정 여덟 × 최근 여덟 편이면 스레드에 예순 번 넘게 묻는다.
// 이걸 먼저 하면 「발행이 멈췄다」 알림이 그만큼 늦는다.
// 조용한 아침이라 보낼 것이 없어도 도달은 잰다 — 그날 줄이 비면 추이에 구멍이 난다
for (const 계정 of 계정들) {
  const 토큰 = await 계정토큰읽기(계정, 뿌리)
  if (!토큰) { console.log(`도달 건너뜀 (${계정 || '첫 계정'}) — 출입증이 없습니다`); continue }
  const 줄 = await 도달재기(계정, { 뿌리, 토큰 }).catch((e) => {
    console.log(`도달 실패 (${계정 || '첫 계정'}): ${e.message}`)
    return null
  })
  console.log(줄
    ? `도달 ${계정 || '첫 계정'} — 지금 ${줄.지금} / 기준선 ${줄.기준선} = ${줄.비율}% (${줄.표본}편)`
    : `도달 건너뜀 (${계정 || '첫 계정'}) — 잴 글이 모자랍니다`)
}
