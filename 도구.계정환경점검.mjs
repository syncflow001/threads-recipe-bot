// 대시보드 기능마다 「어느 계정 열쇠가 실제로 들어가는가」만 잰다 — 기능은 하나도 안 돌린다
//
//   node 도구.계정환경점검.mjs            (지금 폴더)
//   node 도구.계정환경점검.mjs ~/projects/coupas-auto
//   node 도구.계정환경점검.mjs . --빠르게   (스레드에 안 물어본다)
//
// 왜 있나. 2026-08-26 에 sample_dinner 로 누른 답글이 example.cook 로 나갔다 (인계 §7-17).
// 그 뒤 전수 점검에서 쿠키가 잘려 있던 것까지 나왔다 (§7-18). 계정 열쇠는 눈으로 못 본다 —
// **재는 도구가 있어야 한다.** 기능은 하나도 안 돌린다.
//
// 2026-08-29 에 한 가지를 더 붙였다. 이 도구는 「어느 **파일**에서 온 값인가」만 봐서,
// sample_table 칸에 sample_minimi 의 쿠키가 들어 있는데도 초록불을 줬다.
// 이제 **쿠키의 진짜 주인**을 스레드에 물어본다 — 읽기 한 번뿐이고 아무것도 안 바꾼다.
// 그것마저 싫으면 `--빠르게` 를 주면 건너뛴다.
//
// ⚠️ 열쇠 값은 한 글자도 안 찍는다. 해시 앞 8자로만 견준다
import { spawnSync } from 'node:child_process'
import { 계정길 } from './src/계정.mjs'
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

// 값은 절대 안 찍는다. 해시 앞 8자로만 견준다
const 지문 = (v) => (v == null || v === '' ? null : createHash('sha256').update(String(v).trim()).digest('hex').slice(0, 8))

// 어디서 돌려도 되게 — 인자로 주면 그 폴더, 안 주면 지금 폴더
const 빠르게 = process.argv.includes('--빠르게')
// 상대 경로를 그대로 쓰면 `join('.', 'src/…')` 이 꾸러미 이름처럼 보여 import 가 죽는다
const 뿌리 = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? process.cwd())
process.chdir(뿌리)
const { 자식환경 } = await import(join(뿌리, 'src/열쇠파일.mjs'))
const { 계정열쇠읽기 } = await import(join(뿌리, 'src/감시모음.mjs'))
const { 쿠키주인 } = await import(join(뿌리, 'src/계정벽.mjs'))
const { 정보, 보일아이디 } = await import(join(뿌리, 'src/계정.mjs'))

// 계정 목록 — 설정화면과 같은 규칙
// ⚠️ 목록 규칙을 여기서 다시 적지 않는다 (2026-08-29). 옛 규칙은 뿌리의 `.env.<계정>` 을
// 찾아 **여덟 계정을 하나도 못 재고 있었다** — 재라고 만든 도구가 아무것도 안 쟀다
const { 계정목록 } = await import('./src/계정.mjs')
const 계정들 = await 계정목록(뿌리)

// ⚠️ 열쇠 값은 절대 찍지 않는다. **어느 계정 파일의 값인가**만 가린다
const 값표 = {}
for (const 계정 of 계정들) {
  const 글 = readFileSync(join(뿌리, 계정 ? 계정길(계정, '열쇠.env') : '.env.local'), 'utf8')
  for (const 줄 of 글.split('\n')) {
    const m = 줄.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const 열쇠 = `${m[1]} ${지문(m[2].trim().replace(/^["']|["']$/g, ''))}`
    ;(값표[열쇠] ??= []).push(계정 || '(첫 계정)')
  }
}
const 누구것 = (이름, 값) => {
  if (!값) return '없음'
  const 주인 = 값표[`${이름} ${지문(값)}`]
  return 주인 ? 주인.join('·') : '모르는 값'
}

// 시험용 자식 — 아무 기능도 안 하고 받은 열쇠가 누구 것인지만 찍는다
const 시험자식 = join(뿌리, '.환경점검-자식.mjs')
writeFileSync(시험자식, [
  "const 볼것 = ['THREADS_COOKIE','THREADS_ACCESS_TOKEN','THREADS_USER_ID','COUPANG_ACCESS_KEY','TELEGRAM_BOT_TOKEN']",
  'console.log(JSON.stringify(Object.fromEntries(볼것.map((k) => [k, process.env[k] ?? null]))))',
].join('\n'))

const 결과 = []
// ── ① 자식 프로세스로 도는 기능 (발행·모으기·길들이기·하트댓글·답하기·팔로우) ──
// **대시보드와 똑같은 환경**을 흉내낸다 — 대시보드는 --env-file=.env.local 로 떠 있어서
// process.env 에 첫 계정 열쇠가 들어 있다. 그 상태에서 딴 계정으로 돌릴 때가 사고 자리였다
const 첫계정글 = readFileSync(join(뿌리, '.env.local'), 'utf8')
const 값뽑기 = (글, 키) => 글.match(new RegExp(`^${키}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '')
const 대시보드환경 = { ...process.env }
for (const k of ['THREADS_COOKIE', 'THREADS_ACCESS_TOKEN', 'THREADS_USER_ID']) {
  const v = 값뽑기(첫계정글, k)
  if (v) 대시보드환경[k] = v
}

for (const 계정 of 계정들) {
  const 열쇠파일들 = [...(계정 ? ['.env.local'] : []), 계정 ? 계정길(계정, '열쇠.env') : '.env.local']
  const r = spawnSync(process.execPath,
    [...열쇠파일들.map((f) => `--env-file=${f}`), 시험자식],
    { env: { ...자식환경(대시보드환경, 열쇠파일들), PROFILE: 계정 }, encoding: 'utf8' })
  const 본것 = JSON.parse(r.stdout || '{}')
  결과.push({
    갈래: '자식', 고른계정: 계정 || '(첫 계정)',
    쿠키: 누구것('THREADS_COOKIE', 본것.THREADS_COOKIE),
    토큰: 누구것('THREADS_ACCESS_TOKEN', 본것.THREADS_ACCESS_TOKEN),
    번호: 누구것('THREADS_USER_ID', 본것.THREADS_USER_ID),
    쿠팡: 누구것('COUPANG_ACCESS_KEY', 본것.COUPANG_ACCESS_KEY),
  })
}

// ── ② 서버 안에서 직접 도는 기능 ────────────────────────────
for (const 계정 of 계정들) {
  const [쿠키, 토큰, 번호] = await Promise.all([
    계정열쇠읽기(계정, 'THREADS_COOKIE', 뿌리),
    계정열쇠읽기(계정, 'THREADS_ACCESS_TOKEN', 뿌리),
    계정열쇠읽기(계정, 'THREADS_USER_ID', 뿌리),
  ])
  결과.push({
    갈래: '서버안', 고른계정: 계정 || '(첫 계정)',
    쿠키: 누구것('THREADS_COOKIE', 쿠키),
    토큰: 누구것('THREADS_ACCESS_TOKEN', 토큰),
    번호: 누구것('THREADS_USER_ID', 번호),
    쿠팡: '—',
  })
}

unlinkSync(시험자식)

// ── ③ 쿠키의 진짜 주인 — 파일이 맞아도 그 안의 쿠키가 딴 계정 것일 수 있다 ──
// 토큰은 저장할 때 주인을 물어보는데 쿠키는 여태 안 물어봤다. 실제로 어긋난 것이 나왔다
const 주인들 = []
if (!빠르게) {
  for (const 계정 of 계정들) {
    const 쿠키 = await 계정열쇠읽기(계정, 'THREADS_COOKIE', 뿌리)
    const 기대 = 보일아이디(계정, await 정보(계정, 뿌리).catch(() => null))
    if (!쿠키) { 주인들.push({ 계정, 상태: '쿠키 없음' }); continue }
    const 진짜 = await 쿠키주인(쿠키).catch(() => null)
    주인들.push({
      계정, 기대, 진짜,
      상태: !진짜 ? '❌ 죽었거나 확인 못 함'
        : !기대 ? `@${진짜} (견줄 아이디를 몰라 통과)`
        : 진짜 === 기대 ? `✅ @${진짜}`
        : `❌ @${진짜} — 이 계정 것이 아니다`,
    })
    await new Promise((r) => setTimeout(r, 1200))   // 연달아 두드리지 않는다
  }
}

console.log('계정', 계정들.length, '개 —', 계정들.map((c) => c || '(첫 계정)').join(', '), '\n')
const 줄 = (r) => `${r.갈래.padEnd(6)}| ${String(r.고른계정).padEnd(17)}| 쿠키 ${String(r.쿠키).padEnd(17)}| 토큰 ${String(r.토큰).padEnd(17)}| 번호 ${r.번호}`
console.log('갈래  | 고른 계정        | 실제로 들어간 열쇠')
console.log('-'.repeat(105))
for (const r of 결과) console.log(줄(r))

const 어긋남 = 결과.filter((r) => [r.쿠키, r.토큰, r.번호].some((v) => v !== r.고른계정 && v !== '없음'))
console.log('')
console.log(어긋남.length ? `[X] 열쇠가 어긋난 것 ${어긋남.length}개` : '[OK] 모든 기능이 고른 계정의 열쇠로 돈다')
for (const r of 어긋남) console.log('  ', 줄(r))

if (빠르게) {
  console.log('\n쿠키 주인은 안 물어봤습니다 (--빠르게).')
} else {
  console.log('\n쿠키의 진짜 주인 — 스레드에게 직접 물었다')
  for (const o of 주인들) console.log('  ', String(o.계정 || '(첫 계정)').padEnd(20), o.상태)
  const 딴것 = 주인들.filter((o) => String(o.상태).startsWith('❌'))
  console.log(딴것.length
    ? `[X] 쿠키 주인이 어긋나거나 죽은 것 ${딴것.length}개 — 그 계정 칸에 다시 넣어 주세요`
    : '[OK] 모든 쿠키가 제 계정 것이다')
}
