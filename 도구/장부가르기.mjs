// 한 파일에 여덟 계정이 들어 있던 장부를 계정별 파일로 가른다 — 한 번만 돌리는 도구
//
// 왜 가르나 (2026-08-29, 사용자가 정했다).
//   한 파일 안에서 계정 이름으로 칸만 나눠 두면 **그 파일이 깨질 때 여덟 계정이 같이 죽는다.**
//   계정 하나를 지울 때도 파일을 열어 그 칸만 도려내야 한다.
//   활동장부·보관함·점검기록은 이미 계정별 파일이었다 — 나머지를 같은 규칙으로 맞춘다.
//
// 쓰는 법
//   node 도구/장부가르기.mjs           마른 판. 무엇이 어디로 갈지만 보여 준다
//   node 도구/장부가르기.mjs --실행     실제로 옮긴다
//
// ⚠️ 옛 파일을 지우지 않는다. `첫계정백업/장부가르기-<때>/` 로 옮겨 둔다.
//    잘못되면 그 폴더 것을 뿌리로 되돌리고 이 도구 이전 코드로 돌아가면 된다

import { readFile, writeFile, mkdir, rename, readdir, rm, cp } from 'node:fs/promises'
import { join } from 'node:path'

const 자리 = (계정) => 계정 || 'main'

// 키로 나뉜 장부 — { 계정: 값 } 이 { } 하나씩으로 갈린다
const 키장부들 = [
  { 옛: '팔로워장부.json', 새: (k) => `팔로워장부.${자리(k)}.json` },
  { 옛: '글성적장부.json', 새: (k) => `글성적장부.${자리(k)}.json` },
  { 옛: '길들이기장부.json', 새: (k) => `길들이기장부.${자리(k)}.json` },
  { 옛: '도달기준선.json', 새: (k) => `도달기준선.${자리(k)}.json` },
  // 점검상태의 `_전체` 는 계정이 아니라 「계정 공통」 자리다. 이름이 계정꼴과 안 겹쳐 그대로 쓴다
  { 옛: '점검상태.json', 새: (k) => `점검상태.${자리(k)}.json` },
]

const 있나 = (p) => readFile(p, 'utf8').then(() => true).catch(() => false)

async function 키장부계획(뿌리) {
  const 할것 = []
  for (const { 옛, 새 } of 키장부들) {
    const 글 = await readFile(join(뿌리, 옛), 'utf8').catch(() => null)
    if (글 === null) continue
    let 것 = null
    try { 것 = JSON.parse(글) } catch { 것 = null }
    if (!것 || typeof 것 !== 'object' || Array.isArray(것)) continue
    for (const [키, 값] of Object.entries(것)) {
      할것.push({ 갈래: '키장부', 옛, 새: 새(키), 값, 셈: Array.isArray(값) ? 값.length : 1 })
    }
  }
  return 할것
}

async function 줄장부계획(뿌리) {
  const 글 = await readFile(join(뿌리, '도달이력.jsonl'), 'utf8').catch(() => null)
  if (글 === null) return []
  const 통 = new Map()
  for (const 줄 of 글.split('\n').filter(Boolean)) {
    let r = null
    try { r = JSON.parse(줄) } catch { continue } // 깨진 줄 하나가 옮기기를 세우면 안 된다
    const 키 = 자리(r.계정 ?? '')
    if (!통.has(키)) 통.set(키, [])
    통.get(키).push(줄)
  }
  return [...통].map(([키, 줄들]) => ({
    갈래: '줄장부', 옛: '도달이력.jsonl', 새: `도달이력.${키}.jsonl`,
    글: `${줄들.join('\n')}\n`, 셈: 줄들.length,
  }))
}

// 팔로우장부는 지금 남은 것이 전부 「주인 모름」이다. 계정이 누른 팔로우는
// 2026-08-26 부터 활동장부.<계정>.jsonl 에 산다 (src/팔로우하기.mjs)
async function 팔로우계획(뿌리) {
  const 글 = await readFile(join(뿌리, '팔로우장부.json'), 'utf8').catch(() => null)
  if (글 === null) return []
  let 것 = []
  try { 것 = JSON.parse(글) } catch { return [] }
  if (!Array.isArray(것) || !것.length) return []
  const 통 = new Map()
  for (const r of 것) {
    const 키 = r?.계정 === undefined ? '주인모름' : 자리(r.계정)
    if (!통.has(키)) 통.set(키, [])
    통.get(키).push(r)
  }
  return [...통].map(([키, 줄들]) => ({
    갈래: '키장부', 옛: '팔로우장부.json', 새: `팔로우장부.${키}.json`, 값: 줄들, 셈: 줄들.length,
  }))
}

// 막힌 글 — 폴더째 계정 폴더로 옮긴다. 까닭.json 의 계정 칸이 주인이다
async function 막힌글계획(뿌리) {
  const 옛곳 = join(뿌리, 'media', '막힌것')
  const 폴더 = await readdir(옛곳).catch(() => null)
  if (폴더 === null) return []
  const 할것 = []
  for (const code of 폴더) {
    const 까닭 = await readFile(join(옛곳, code, '까닭.json'), 'utf8').then(JSON.parse).catch(() => null)
    const 계정 = 까닭?.계정
    할것.push({
      갈래: '폴더',
      옛: join('media', '막힌것', code),
      새: 계정 ? join('media', 계정, '막힌것', code) : join('media', '막힌것.주인모름', code),
      셈: 1,
    })
  }
  return 할것
}

export async function 가르기({ 뿌리 = process.cwd(), 실행 = false, 때 = null } = {}) {
  const 할것 = [
    ...(await 키장부계획(뿌리)),
    ...(await 줄장부계획(뿌리)),
    ...(await 팔로우계획(뿌리)),
    ...(await 막힌글계획(뿌리)),
  ]
  if (!실행 || !할것.length) return { 실행: false, 할것, 백업폴더: null }

  // 옛 것을 먼저 안전한 곳에 둔다. 새 파일을 쓰다 죽어도 되돌릴 수 있어야 한다
  const 이름 = `장부가르기-${(때 ?? new Date()).toISOString().replace(/[-:T]/g, '').slice(0, 13)}`
  const 백업폴더 = join(뿌리, '첫계정백업', 이름)
  await mkdir(백업폴더, { recursive: true })

  const 옛것들 = [...new Set(할것.map((h) => h.옛))]
  for (const 옛 of 옛것들) {
    await cp(join(뿌리, 옛), join(백업폴더, 옛.split('/').pop()), { recursive: true })
  }

  // 새 파일을 쓴다
  for (const h of 할것) {
    if (h.갈래 === '키장부') {
      await writeFile(join(뿌리, h.새), JSON.stringify(h.값, null, 2) + '\n')
    } else if (h.갈래 === '줄장부') {
      await writeFile(join(뿌리, h.새), h.글)
    } else {
      await mkdir(join(뿌리, h.새, '..'), { recursive: true })
      await cp(join(뿌리, h.옛), join(뿌리, h.새), { recursive: true })
    }
  }

  // 다 쓴 뒤에야 옛 것을 뿌리에서 치운다. 둘이 함께 남으면 어느 쪽이 진짜인지 헷갈린다
  for (const 옛 of 옛것들) await rm(join(뿌리, 옛), { recursive: true, force: true })
  // 막힌것 폴더는 알맹이를 다 옮긴 뒤 껍데기만 남는다
  await rm(join(뿌리, 'media', '막힌것'), { recursive: true, force: true }).catch(() => {})

  return { 실행: true, 할것, 백업폴더 }
}

// ── 2단계 — 뿌리에 흩어진 계정 파일을 `계정/<이름>/` 폴더로 모은다 (2026-08-29) ──────
//
// 계정 하나 = 폴더 하나. 지우기·백업·복사가 폴더 단위로 끝난다.
// 파일 이름에서 계정을 뗀다 — 폴더가 이미 누구 것인지 말해 준다

// [뿌리에 있던 이름꼴, 폴더 안에서 쓸 이름]. `*` 는 그 자리에 무엇이 와도 된다는 뜻이다
const 옮길꼴들 = [
  ['persona.*.json', 'persona.json'],
  ['보관함.*.json', '보관함.json'],
  ['활동장부.*.jsonl', '활동장부.jsonl'],
  ['활동알림.*.json', '활동알림.json'],
  ['알림기록.*.jsonl', '알림기록.jsonl'],
  ['점검기록.*.jsonl', '점검기록.jsonl'],
  ['점검상태.*.json', '점검상태.json'],
  ['팔로워장부.*.json', '팔로워장부.json'],
  ['글성적장부.*.json', '글성적장부.json'],
  ['길들이기장부.*.json', '길들이기장부.json'],
  ['도달기준선.*.json', '도달기준선.json'],
  ['도달이력.*.jsonl', '도달이력.jsonl'],
  ['멈춤.*', '멈춤'],
  ['.env.*', '열쇠.env'],
]

// 계정 파일이 아닌 것. 이름꼴만 보면 걸리지만 옮기면 안 된다.
//   .env.local  — 공용 열쇠(쿠팡·텔레그램·앱). 계정이 아니라 이 맥 전체의 것이다
//   .env.example — 서식
//   persona.json — 말투 추천의 바탕. 어느 계정 것도 아니다
const 안옮길것 = new Set(['.env.local', '.env.example', 'persona.json'])

// 점검은 계정 말고 「계정 공통」 자리 하나를 더 쓴다. 그것도 제 폴더를 갖는다
const 계정아닌자리 = new Set(['_전체', 'main'])

// ⚠️ **별표 규칙만 믿지 않는다.** `.env.*` 는 앞으로 생길 `.env.backup` 까지 집어삼켜
// `계정/backup/` 같은 엉뚱한 폴더를 만든다. 그래서 **실제로 있는 계정 이름 집합**을
// 먼저 만들고, 거기 든 이름일 때만 옮긴다
async function 아는이름들(뿌리) {
  const 파일들 = await readdir(뿌리).catch(() => [])
  const 것들 = new Set(계정아닌자리)
  for (const f of 파일들) {
    const m = f.match(/^\.env\.([a-z0-9._]{1,30})$/)
    if (m && !안옮길것.has(f)) 것들.add(m[1])
  }
  for (const d of await readdir(join(뿌리, 'media'), { withFileTypes: true }).catch(() => [])) {
    if (d.isDirectory() && !d.name.startsWith('막힌것')) 것들.add(d.name)
  }
  return 것들
}

function 어느계정(파일, 아는것) {
  for (const [꼴, 새이름] of 옮길꼴들) {
    const [앞, 뒤] = 꼴.split('*')
    if (!파일.startsWith(앞) || !파일.endsWith(뒤)) continue
    const 가운데 = 파일.slice(앞.length, 파일.length - 뒤.length)
    if (가운데 && 아는것.has(가운데)) return { 계정: 가운데, 새이름 }
  }
  // 활동초안.<계정>.<갈래>.json → 활동초안.<갈래>.json
  const m = 파일.match(/^활동초안\.(.+)\.([^.]+)\.json$/)
  if (m && 아는것.has(m[1])) return { 계정: m[1], 새이름: `활동초안.${m[2]}.json` }
  return null
}

export async function 폴더로모으기({ 뿌리 = process.cwd(), 실행 = false, 때 = null } = {}) {
  const 아는것 = await 아는이름들(뿌리)
  const 파일들 = await readdir(뿌리).catch(() => [])
  const 할것 = []
  const 못알아본것 = []
  for (const f of 파일들.sort()) {
    if (안옮길것.has(f)) continue
    const 것 = 어느계정(f, 아는것)
    if (것) { 할것.push({ 옛: f, 새: join('계정', 것.계정, 것.새이름), 계정: 것.계정 }); continue }
    // 계정 파일처럼 생겼는데 아는 이름이 아니면 **조용히 넘기지 않고 말한다**
    if (/^(persona|보관함|활동장부|활동알림|활동초안|알림기록|점검기록|점검상태|팔로워장부|글성적장부|길들이기장부|도달기준선|도달이력|멈춤)\./.test(f)) {
      못알아본것.push(f)
    }
  }
  // media/<계정>/ → 계정/<계정>/media/. 같은 디스크 안 이름 바꾸기라 1.3GB 라도 순식간이다
  for (const d of await readdir(join(뿌리, 'media'), { withFileTypes: true }).catch(() => [])) {
    if (!d.isDirectory() || d.name.startsWith('막힌것')) continue
    할것.push({ 옛: join('media', d.name), 새: join('계정', d.name, 'media'), 계정: d.name })
  }
  if (!실행 || !할것.length) return { 실행: false, 할것, 못알아본것, 되돌림기록: null }

  for (const h of 할것) {
    await mkdir(join(뿌리, '계정', h.계정), { recursive: true })
    await rename(join(뿌리, h.옛), join(뿌리, h.새))
  }

  // ⚠️ **무엇을 어디서 어디로 옮겼는지 적어 둔다.** 이름 바꾸기는 되돌릴 수 있지만,
  // 적어 두지 않으면 사람이 손으로 짚어 가며 복원해야 한다
  const 이름 = `폴더로모으기-${(때 ?? new Date()).toISOString().replace(/[-:T]/g, '').slice(0, 13)}`
  const 되돌림기록 = join(뿌리, '첫계정백업', `${이름}.json`)
  await mkdir(join(뿌리, '첫계정백업'), { recursive: true })
  await writeFile(되돌림기록, JSON.stringify({
    한때: (때 ?? new Date()).toISOString(),
    되돌리는법: '아래 옮김 목록을 새 → 옛 으로 되돌리면 된다 (mv). 코드도 이 커밋 이전으로 돌린다',
    옮김: 할것,
  }, null, 2) + '\n')
  return { 실행: true, 할것, 못알아본것, 되돌림기록 }
}

if (import.meta.main) {
  const 실행 = process.argv.includes('--실행')
  if (process.argv.includes('--폴더로')) {
    const r = await 폴더로모으기({ 뿌리: process.cwd(), 실행 })
    for (const f of r.못알아본것 ?? []) console.log(`  ⚠️  못 알아봤습니다 (그대로 둡니다): ${f}`)
    if (!r.할것.length) { console.log('\n  옮길 것이 없습니다 — 이미 다 모여 있습니다.\n'); process.exit(0) }
    console.log(`\n  ${실행 ? '옮겼습니다' : '이렇게 옮깁니다 (마른 판)'} — ${r.할것.length}개\n`)
    for (const h of r.할것) console.log(`   ${h.옛}  →  ${h.새}`)
    console.log(실행 ? `\n  되돌림 기록: ${r.되돌림기록}\n` : '\n  실제로 옮기려면 --실행 을 붙여 주세요.\n')
    process.exit(0)
  }
  const r = await 가르기({ 뿌리: process.cwd(), 실행 })
  if (!r.할것.length) {
    console.log('\n  옮길 것이 없습니다 — 이미 다 갈려 있습니다.\n')
  } else {
    console.log(`\n  ${실행 ? '옮겼습니다' : '이렇게 옮깁니다 (마른 판)'} — ${r.할것.length}개\n`)
    for (const h of r.할것) console.log(`   ${h.옛}  →  ${h.새}   (${h.셈}개)`)
    console.log(실행
      ? `\n  옛 파일은 ${r.백업폴더} 에 그대로 있습니다.\n`
      : '\n  실제로 옮기려면 --실행 을 붙여 다시 돌려 주세요.\n')
  }
}
