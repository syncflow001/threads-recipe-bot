// 본문만 올라가고 레시피 답글이 안 붙은 글에, 그 레시피를 뒤늦게 달아 준다
//
//   node 도구/레시피답글달기.mjs sample_yori Dc5qwlYgO2P
//   node 도구/레시피답글달기.mjs sample_yori Dc5qwlYgO2P --진짜로   (실제로 단다)
//   node 도구/레시피답글달기.mjs sample_yori --빠진것 --진짜로      (답글 없는 글을 모두)
//   node 도구/레시피답글달기.mjs sample_yori --빠진것 --진짜로 --사이 90   (한 편에 90초씩 쉰다)
//
// 왜 있나. 답글은 웹 화면(브라우저)으로 다는데, 그 길이 끊기면 **본문은 올라가고 레시피만 빠진다.**
// 2026-09-06 에 `sample_yori`·`sample_minimi` 가 사흘 동안 그랬다 —
// 글 주소로 그냥 들어가면 스레드가 검색엔진용 껍데기를 줘서 답글 칸이 아예 없었다
// (`src/홈수집.mjs` 의 `글열기` 주석). 길은 고쳤지만 그동안 벌거벗고 올라간 글이 남는다.
//
// ⚠️ **먼저 스레드에 물어본다.** 우리 기록에 「답글 0개」라고 적혀 있어도 실제로는 달렸을 수 있다.
//    두 번 달면 같은 레시피가 두 번 보인다 — 되돌리려면 손으로 지워야 한다.
// ⚠️ `--진짜로` 없이는 **무엇을 달지 보여만 준다.**
// ⚠️ **한 편씩 쉬어 가며 단다.** 스물다섯 편을 몰아서 달면 봇처럼 보인다 —
//    우리 글에 다는 답글이라도 몰아치기는 몰아치기다 (docs/섀도우밴-대응.md).
//    새로 올린 글부터 단다. 사람이 중간에 멈춰도 값어치 있는 것이 먼저 달려 있게
import { readFile } from 'node:fs/promises'
import { 계정길, 계정목록 } from '../src/계정.mjs'
import { 계정열쇠읽기 } from '../src/감시모음.mjs'
import { 글주소받기, 나누기 } from '../src/publish.mjs'
import { 브라우저로답글달기 } from '../src/브라우저답글.mjs'
import { 상세 } from '../src/threads.mjs'
import { 안전쓰기 } from '../src/장부쓰기.mjs'

const 인자 = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const [계정, code] = 인자
const 진짜로 = process.argv.includes('--진짜로')
const 빠진것 = process.argv.includes('--빠진것')
const 사이초 = Number(process.argv[process.argv.indexOf('--사이') + 1]) || 75
if (!계정 || (!code && !빠진것)) {
  console.error('쓰는 법)  node 도구/레시피답글달기.mjs <계정> <글번호>')
  console.error('예)       node 도구/레시피답글달기.mjs sample_yori Dc5qwlYgO2P')
  process.exit(1)
}
if (!(await 계정목록()).includes(계정)) { console.error(`"${계정}" 은 없는 계정입니다.`); process.exit(1) }

async function 한편(code) {
const 길 = 계정길(계정, 'media', '쓴것', code, '재구성.json')
const 글 = await readFile(길, 'utf8').then(JSON.parse).catch(() => null)
if (!글) { console.log(`  ${code} — 기록이 없습니다`); return '없음' }
if (!글.발행?.본문번호) { console.log(`  ${code} — 아직 안 올라갔습니다`); return '없음' }
if (!글.레시피?.trim()) { console.log(`  ${code} — 레시피가 비어 있습니다`); return '없음' }

const 주소 = await 글주소받기(글.발행.본문번호, 토큰)
const m = 주소.match(/@([^/]+)\/post\/([^/?#]+)/)
console.log(`글  ${주소}`)

// **스레드에 직접 물어본다.** 우리 기록보다 실제가 먼저다
const 지금 = await 상세(m[1], m[2], { cookie: 쿠키 }).catch(() => null)
const 이미 = 지금?.글타래?.length ?? 0
if (이미 > 0) {
  console.log(`  ${code} — 이미 답글이 ${이미}개 있습니다. 건너뜁니다`)
  return '이미'
}

const 조각들 = 나누기(글.레시피)
console.log(`달 것  ${조각들.length}조각 · ${글.레시피.length}자\n`)
console.log(글.레시피.split('\n').map((l) => `  │ ${l}`).join('\n'))

if (!진짜로) { console.log('  (보여만 줬습니다 — 실제로 달려면 --진짜로)'); return '미리' }

console.log('\n웹 화면으로 답글을 답니다 — 1분쯤 걸립니다.')
// 주제 태그는 안 단다. 링크가 없는 글이라 광고가 아니다 (광고 아닌 글에 광고 표시를 붙이지 않는다)
const r = await 브라우저로답글달기({ 주소, 조각들, 쿠키, 계정, 주제달기: null })
console.log(`✅ ${r.올린조각수}조각을 달았습니다.`)

// 기록에도 남긴다. 안 남기면 다음에 또 「답글 0개」로 보여 두 번 달게 된다
글.발행 = { ...글.발행, 답글통로: '브라우저(손으로)', 답글조각수: r.올린조각수, 답글단때: new Date().toISOString() }
await 안전쓰기(길, JSON.stringify(글, null, 2))
console.log(`   기록에 남겼습니다 — ${길}`)
return '달았다'
}

const [토큰, 쿠키] = await Promise.all([
  계정열쇠읽기(계정, 'THREADS_ACCESS_TOKEN'), 계정열쇠읽기(계정, 'THREADS_COOKIE'),
])
if (!토큰 || !쿠키) { console.error('이 계정의 토큰이나 쿠키가 없습니다.'); process.exit(1) }

if (!빠진것) { await 한편(code); process.exit(0) }

// 답글이 안 달린 글을 새것부터 훑는다. **스레드에 물어보는 것은 한편() 안에서 한다** —
// 기록만 보고 고르면 이미 달린 글에 또 단다
const { readdir } = await import('node:fs/promises')
const 뿌리 = 계정길(계정, 'media', '쓴것')
const 목록 = []
for (const c of await readdir(뿌리).catch(() => [])) {
  const d = await readFile(`${뿌리}/${c}/재구성.json`, 'utf8').then(JSON.parse).catch(() => null)
  const 발 = d?.발행
  if (!발?.본문번호 || !d?.레시피?.trim()) continue
  if ((발.답글번호들 ?? []).length || 발.답글조각수) continue
  목록.push({ code: c, 때: 발.올린때 ?? '' })
}
목록.sort((a, b) => b.때.localeCompare(a.때))   // 새것부터
console.log(`${계정} — 답글이 안 달린 것으로 보이는 글 ${목록.length}편 (새것부터 답니다)\n`)

const 셈 = {}
for (const [i, t] of 목록.entries()) {
  console.log(`── ${i + 1}/${목록.length}  ${t.code}  (${t.때.slice(0, 16)})`)
  const r = await 한편(t.code).catch((e) => { console.log(`  💥 ${e.message.slice(0, 120)}`); return '실패' })
  셈[r] = (셈[r] ?? 0) + 1
  // 몰아치지 않는다. 마지막 편 뒤에는 안 쉰다
  if (진짜로 && r === '달았다' && i < 목록.length - 1) {
    console.log(`  … ${사이초}초 쉽니다`)
    await new Promise((끝) => setTimeout(끝, 사이초 * 1000))
  }
}
console.log(`\n끝났습니다 — ${Object.entries(셈).map(([k, v]) => `${k} ${v}편`).join(' · ')}`)
