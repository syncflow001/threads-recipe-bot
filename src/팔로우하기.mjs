// 찾아 둔 후보 계정을 화면에서 직접 팔로우한다 — 계정마다 제 장부에 적는다

// 왜 만들었나. 예전에는 후보 목록을 보여 주고 **사람이 링크를 눌러 직접** 팔로우했다.
// 그래서 누가 팔로우됐는지 우리가 알 수 없었고 기록도 안 남았다
// (`팔로우장부.주인모름.json` 에 그 옛 줄 15개가 남아 있다 — 2026-08-29 에 계정별로 가르면서
//  주인을 모르는 것만 따로 뺐다).
// 2026-08-26 에 사용자가 「팔로우도 네가 직접 해라. 계정별로 따로 관리해라」고 정했다.
//
// ⚠️ **팔로우는 남에게 나가는 행동이다.** 하트·댓글과 같은 문을 건다.
//   · **사람이 단추를 누를 때만** 돈다. 시각표에 안 건다
//   · 한 판 3명 · 하루 10명. 한꺼번에 쏟아붓는 것이 계정이 막히는 가장 빠른 길이다
//   · **초안 → 확인 → 이대로 팔로우.** 누구를 팔로우할지 사람이 먼저 본다
//   · 밤에는 안 한다 (사람이 자는 시간에 도는 계정은 티가 난다)
//   · 누른 뒤 **정말 팔로우가 됐는지 화면에서 확인**하고, 못 보면 「못봄」으로 적는다

import { readFile, writeFile, unlink } from 'node:fs/promises'
import { 안전쓰기 } from './장부쓰기.mjs'
import { 계정길 } from './계정.mjs'
import { join } from 'node:path'
import { 쿠키풀기, 쿠키죽음 } from './홈수집.mjs'
import { 장부적기, 장부읽기, 오늘 } from './교류하기.mjs'
import { 사람처럼, 사람깨어있나 } from './길들이기.mjs'
import { 계정이름으로벽 } from './계정벽.mjs'

export const 설정 = {
  한판: 3,                    // 한 번에 몇 명. 사람이 앉아서 누르는 만큼만
  하루한계: 10,
  머물초: [4, 9],             // 프로필을 읽는 시간. 열자마자 누르면 사람이 아니다
}

// 초안 — 「팔로워 찾기」가 찾아 둔 후보. 사람이 보고 「이대로 팔로우」를 누르면 그대로 누른다
export const 초안길 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '활동초안.팔로우.json'))
export async function 초안읽기(계정, 뿌리 = process.cwd()) {
  try { return JSON.parse(await readFile(초안길(계정, 뿌리), 'utf8')) } catch { return null }
}
export async function 초안쓰기(계정, 초안, 뿌리 = process.cwd()) {
  await 안전쓰기(초안길(계정, 뿌리), JSON.stringify({
    갈래: '팔로우', 만든때: new Date().toISOString(), ...초안,
  }, null, 2))
}
export const 초안버리기 = (계정, 뿌리 = process.cwd()) => unlink(초안길(계정, 뿌리)).catch(() => {})

// 오늘 몇 명 팔로우했나. 활동 장부에서 센다 — 팔로우도 활동이라 같은 장부에 산다
export const 오늘팔로우수 = (줄들, 때 = new Date()) =>
  (줄들 ?? []).filter((r) => r?.한것 === '팔로우' && 오늘(r.때) === 오늘(때)).length

// ⚠️ **단추 글자는 계정 UI 언어를 탄다.** 일본어 계정으로 로그인하면 「フォロー」다.
// 그래서 여러 말을 함께 찾는다. 못 찾으면 **조용히 넘어가지 않고 「단추못찾음」으로 적는다** —
// 틀린 셀렉터로 아무것도 안 하면서 「했다」고 적는 것이 가장 나쁘다
const 팔로우말 = ['팔로우', 'Follow', 'フォロー', 'フォローする']
const 팔로우중말 = ['팔로잉', 'Following', 'フォロー中', '팔로우 취소', 'Requested', '요청됨']

const 잡기 = (쪽, 말들) => 쪽.locator(
  말들.flatMap((말) => [`[role="button"]:text-is("${말}")`, `button:text-is("${말}")`]).join(', '),
)

// 프로필 한 곳에서 팔로우 단추를 누른다. 하트누르기와 같은 꼴이다 —
// 누른 것으로 끝내지 않고 **이름표가 바뀌었는지** 본다
export async function 팔로우누르기(쪽, { 기다림 = 2500 } = {}) {
  if (await 잡기(쪽, 팔로우중말).count()) return '이미팔로우'
  const 단추 = 잡기(쪽, 팔로우말).first()
  if (!(await 단추.count())) return '단추못찾음'
  await 단추.click()
  await 쪽.waitForTimeout(기다림)
  return (await 잡기(쪽, 팔로우중말).count()) ? '팔로우함' : '못봄'
}

// 이미 팔로우했거나 오늘 몫을 넘긴 것은 빼고, 한 판 몫만 고른다
export function 할것고르기(후보들, { 이미한것 = [], 몇개 = 설정.한판 } = {}) {
  const 한사람 = new Set((이미한것 ?? []).filter((r) => r?.한것 === '팔로우').map((r) => r.who))
  return (후보들 ?? [])
    .filter((c) => c?.작성자 && !한사람.has(c.작성자))
    .slice(0, 몇개)
}

// 브라우저를 열어 후보를 하나씩 팔로우한다.
// **한 명 누를 때마다 바로 장부에 적는다** — 중간에 죽어도 누른 것은 남는다
export async function 한판(계정, {
  후보들, 쿠키 = process.env.THREADS_COOKIE, 뿌리 = process.cwd(),
  옵션 = 설정, 굴림 = Math.random, 때 = new Date(), 알림 = () => {},
  chromium, 띄우기 = false, 깨어있나 = 사람깨어있나,
} = {}) {
  if (!쿠키?.trim()) throw new 쿠키죽음(계정)
  if (!깨어있나(때)) throw new Error('지금은 사람이 자는 시간이다 — 팔로우는 낮에만 한다')
  // 나가기 직전의 벽 — 이 쿠키가 정말 그 계정 것인가 (src/계정벽.mjs)
  await 계정이름으로벽(계정, 쿠키, { 알림 })

  const 이미한것 = (await 장부읽기(뿌리))[계정] ?? []
  const 오늘까지 = 오늘팔로우수(이미한것, 때)
  if (오늘까지 >= 옵션.하루한계) {
    throw new Error(`오늘 이미 ${오늘까지}명을 팔로우했다 (하루 ${옵션.하루한계}명까지)`)
  }
  const 할것 = 할것고르기(후보들, { 이미한것, 몇개: Math.min(옵션.한판, 옵션.하루한계 - 오늘까지) })
  if (!할것.length) { 알림('팔로우할 새 계정이 없다'); return { 팔로우: 0, 기록들: [] } }

  const { chromium: 크로미움 } = chromium ? { chromium } : await import('playwright-core')
  const 브라우저 = await 크로미움.launch({ headless: !띄우기, channel: 'chrome' })
  const 기록들 = []
  try {
    const 판 = await 브라우저.newContext({ viewport: { width: 1280, height: 1200 }, locale: 'ko-KR' })
    await 판.addCookies(쿠키풀기(쿠키))
    const 쪽 = await 판.newPage()

    for (const c of 할것) {
      const 주소 = `https://www.threads.com/@${c.작성자}`
      try {
        await 쪽.goto(주소, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await 쪽.waitForTimeout(사람처럼(옵션.머물초, 굴림) * 1000)
        const 결과 = await 팔로우누르기(쪽)
        알림(`  @${c.작성자} — ${결과}`)
        // **눌렀든 못 봤든 적는다.** 「못봄」은 눌리긴 했을 가능성이 크니 사람이 확인해야 한다.
        // 안 적고 넘어가면 다음 판에 또 눌러 두 번 팔로우·언팔이 될 수 있다
        if (결과 === '이미팔로우' || 결과 === '단추못찾음') continue
        const 기록 = {
          때: new Date(때).toISOString(), 한것: '팔로우', who: c.작성자,
          팔로워: c.팔로워 ?? null, 확산: c.확산 ?? null, 주소,
          ...(결과 === '못봄' ? { 확인: '못봄' } : {}),
        }
        기록들.push(기록)
        await 장부적기(계정, [기록], 뿌리)
      } catch (e) {
        알림(`  @${c.작성자} — 못 열었다 (${String(e?.message ?? e).slice(0, 60)})`)
      }
    }
  } finally {
    await 브라우저.close().catch(() => {})
  }
  return { 팔로우: 기록들.filter((r) => !r.확인).length, 기록들 }
}

// 초안을 그대로 실행한다. 올린 뒤 초안을 지운다 — 두 번 눌리지 않게
export async function 초안올리기(계정, 옵션 = {}) {
  const 초안 = await 초안읽기(계정, 옵션.뿌리 ?? process.cwd())
  if (!초안?.후보들?.length) throw new Error('팔로우할 초안이 없다 — 「팔로워 찾기」를 먼저 누른다')
  const r = await 한판(계정, { ...옵션, 후보들: 초안.후보들 })
  await 초안버리기(계정, 옵션.뿌리 ?? process.cwd())
  return r
}

// ─── 손으로 돌릴 때 ────────────────────────────────────────────────
if (process.argv[1]?.endsWith('팔로우하기.mjs')) {
  const 계정 = process.argv[2] ?? ''
  const 이름 = 계정 || '첫 계정'
  try {
    const r = await 초안올리기(계정, { 알림: (m) => console.log(`  · ${m}`) })
    const 못본것 = r.기록들.filter((x) => x.확인 === '못봄').length
    console.log(`✅ [${이름}] ${r.팔로우}명 팔로우했다`
      + (못본것 ? ` · ⚠️ ${못본것}명은 화면에서 확인 못 했다 — 직접 열어 본다` : ''))
  } catch (오류) {
    console.error(`‼️  [${이름}] ${오류.message}`)
    process.exit(1)
  }
}

// ── 잘못한 팔로잉 풀기 (2026-08-29) ──────────────────────────────────
// 2026-08-24 10:31~10:53 에 열쇠가 새서 `example.cook` 이름으로 영어권 요리 계정 15명이
// 22분 만에 팔로우됐다. 그 뒤 도달이 평소의 1% 로 떨어졌다
// (docs/교훈/구멍을-막아도-이미-나간-행동의-벌은-며칠-뒤에-온다.md).
//
// ⚠️ **몰아서 하지 않는다.** 몰아서 한 것이 문제였으니 되돌리기도 몰아서 하면 안 된다.
//   하루 두 명. 사람이 더블클릭할 때만 (「잘못한 팔로잉 풀기.command」). 시각표에 안 건다

// 주인을 모르는 옛 팔로우 줄. 어느 계정이 눌렀는지 기록이 없어 계정 파일에 못 넣는다
export const 주인모름길 = (뿌리 = process.cwd()) => join(뿌리, '팔로우장부.주인모름.json')
export const 주인모름읽기 = async (뿌리 = process.cwd()) =>
  readFile(주인모름길(뿌리), 'utf8').then(JSON.parse).catch(() => []).then((v) => (Array.isArray(v) ? v : []))

export const 풀기설정 = {
  하루한계: 2,          // 하루 두 명. 22분에 15명이 문제였으니 반대로 간다
  머물초: [4, 9],
}

// 스레드는 언팔에 확인 창을 띄우기도 한다. 창이 없는 화면도 있어서 둘 다 견딘다
const 언팔확인말 = ['팔로우 취소', 'Unfollow', 'フォローをやめる', '팔로우 취소하기']

export const 오늘언팔수 = (줄들, 때 = new Date()) =>
  (줄들 ?? []).filter((r) => r?.한것 === '언팔' && 오늘(r.때) === 오늘(때)).length

// 풀 대상 — `팔로우장부.주인모름.json` 의 줄들이다. 계정별 파일에 든 것은
// 그 계정이 제대로 누른 것이라 건드리지 않는다
// 몇개 를 안 주면 **남은 것 전부**다. 하루 몫으로 자르는 것은 풀기한판 이 한다 —
// 여기서 잘라 두면 「몇 명 남았나」를 셀 수가 없다
export function 풀대상고르기(장부, { 이미한것 = [], 몇개 = Infinity } = {}) {
  const 푼사람 = new Set((이미한것 ?? []).filter((r) => r?.한것 === '언팔').map((r) => r.who))
  return (Array.isArray(장부) ? 장부 : [])
    .filter((r) => r?.who && r.계정 === undefined && !푼사람.has(r.who))
    .slice(0, 몇개)
}

// 프로필 한 곳에서 팔로우를 푼다. 누른 것으로 끝내지 않고 **「팔로우」로 돌아왔는지** 본다
export async function 언팔누르기(쪽, { 기다림 = 2500 } = {}) {
  if (!(await 잡기(쪽, 팔로우중말).count())) return '이미풀림'
  await 잡기(쪽, 팔로우중말).first().click()
  await 쪽.waitForTimeout(기다림)

  // 확인 창이 떴으면 거기까지 누른다. 안 떴으면 그냥 지난다
  const 확인 = 잡기(쪽, 언팔확인말)
  if (await 확인.count()) {
    await 확인.first().click()
    await 쪽.waitForTimeout(기다림)
  }
  return (await 잡기(쪽, 팔로우말).count()) ? '풀었다' : '못봄'
}

// 한 판 — 하루 몫만큼 푼다. 팔로우와 같은 문을 건다(계정벽·밤금지·쿠키확인).
// **한 명 풀 때마다 바로 장부에 적는다** — 중간에 죽어도 푼 것은 남는다
export async function 풀기한판(계정, {
  쿠키 = process.env.THREADS_COOKIE, 뿌리 = process.cwd(),
  옵션 = 풀기설정, 굴림 = Math.random, 때 = new Date(), 알림 = () => {},
  chromium, 띄우기 = false, 깨어있나 = 사람깨어있나,
} = {}) {
  if (!쿠키?.trim()) throw new 쿠키죽음(계정)
  if (!깨어있나(때)) throw new Error('지금은 사람이 자는 시간이다 — 팔로잉 풀기는 낮에만 한다')
  await 계정이름으로벽(계정, 쿠키, { 알림 })

  const 전체 = await 주인모름읽기(뿌리)
  const 이미한것 = (await 장부읽기(뿌리))[계정] ?? []
  const 남은전부 = 풀대상고르기(전체, { 이미한것, 몇개: Infinity })
  const 오늘까지 = 오늘언팔수(이미한것, 때)

  if (!남은전부.length) return { 푼수: 0, 남은수: 0, 말: '풀 것이 남아 있지 않습니다. 다 끝났습니다.' }
  if (오늘까지 >= 옵션.하루한계) {
    return { 푼수: 0, 남은수: 남은전부.length,
      말: `오늘은 이미 ${오늘까지}명을 풀었습니다 (하루 ${옵션.하루한계}명까지). `
        + `${남은전부.length}명 남았습니다 — 내일 다시 눌러 주세요.` }
  }

  const 할것 = 남은전부.slice(0, 옵션.하루한계 - 오늘까지)
  const { chromium: 크로미움 } = chromium ? { chromium } : await import('playwright-core')
  const 브라우저 = await 크로미움.launch({ headless: !띄우기, channel: 'chrome' })
  const 기록들 = []
  try {
    const 판 = await 브라우저.newContext({ viewport: { width: 1280, height: 1200 }, locale: 'ko-KR' })
    await 판.addCookies(쿠키풀기(쿠키))
    const 쪽 = await 판.newPage()

    for (const c of 할것) {
      const 주소 = `https://www.threads.com/@${c.who}`
      try {
        await 쪽.goto(주소, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await 쪽.waitForTimeout(사람처럼(옵션.머물초, 굴림) * 1000)
        const 결과 = await 언팔누르기(쪽)
        알림(`  @${c.who} — ${결과}`)
        // 「이미풀림」도 적는다. 안 적으면 다음 판에 또 이 사람부터 열어 앞으로 못 나간다
        const 기록 = {
          때: new Date(때).toISOString(), 한것: '언팔', who: c.who, 주소,
          ...(결과 === '못봄' ? { 확인: '못봄' } : {}),
          ...(결과 === '이미풀림' ? { 확인: '이미풀림' } : {}),
        }
        기록들.push(기록)
        await 장부적기(계정, [기록], 뿌리)
      } catch (e) {
        알림(`  @${c.who} — 못 열었다 (${String(e?.message ?? e).slice(0, 60)})`)
      }
    }
  } finally {
    await 브라우저.close().catch(() => {})
  }

  // ⚠️ **눌러서 푼 것만 「풀었다」로 센다.** 이미 팔로우 중이 아니었던 것을 성공으로 세면
  // 아무것도 안 하고 「다 했습니다」를 보고하게 된다 (2026-08-29 실측 — 열다섯 명이 이미
  // 다 풀려 있었는데 「2명을 풀었습니다」라고 말했다)
  const 푼수 = 기록들.filter((r) => !r.확인).length
  const 이미풀림수 = 기록들.filter((r) => r.확인 === '이미풀림').length
  const 못봄수 = 기록들.filter((r) => r.확인 === '못봄').length
  const 남은수 = 남은전부.length - 기록들.length

  const 조각 = []
  if (푼수) 조각.push(`${푼수}명을 풀었습니다`)
  if (이미풀림수) 조각.push(`${이미풀림수}명은 이미 풀려 있었습니다 (건드리지 않았습니다)`)
  if (못봄수) 조각.push(`${못봄수}명은 눌렀지만 확인이 안 됐습니다 — 화면에서 봐 주세요`)
  if (!조각.length) 조각.push('아무것도 하지 않았습니다')

  return { 푼수, 이미풀림수, 못봄수, 남은수, 기록들,
    말: `${조각.join('. ')}. ${남은수}명 남았습니다`
      + `${남은수 ? ' — 내일 다시 눌러 주세요.' : ' — 다 끝났습니다.'}` }
}
