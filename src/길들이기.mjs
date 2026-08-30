// 외국어 계정의 홈 피드를 그 언어 글로 채우려고 사람처럼 들락거린다 — 하트·댓글은 안 누른다

// 왜 필요한가. 스레드 피드를 정하는 것은 앱 언어 설정이 아니라 **누구를 팔로우했고 무엇을 봤는가**다
// (앱에서 언어를 바꿔도 피드는 안 바뀐다 — 실측, HANDOFF §7-6).
// 일본어·영어 계정은 홈이 그 언어 글로 차 있지 않으면 수집이 통째로 빈손이 된다.
// 그래서 발행 사이사이에 그 계정으로 홈을 열어 내려보고, 그 언어 글 몇 편을 열어 머문다.
//
// ⚠️ **하트·댓글·팔로우를 프로그램이 누른다.** 진짜 사람 반응처럼 행동하는 일이기 때문에 신중하게 행동해야 할 것이다. 다른 사람 계정을 팔로우 하고 확산이 잘되고 있는 게시물에 하트와 댓글을 남긴다. 내 계정 게시물에 달린 댓글에도 하트를 누르고 답글을 남겨준다. 항상 진짜 사람처럼 행동하는 치밀함을 보여야 한다.
//
// ⚠️ **효과는 우리가 직접 못 본다.** 스레드는 랭킹을 안 보여 준다.
// 볼 수 있는 것은 하나뿐이다 — **다음에 걷힌 글이 그 언어인가.** 그래서 판마다 장부에 적는다.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { 안전쓰기 } from './장부쓰기.mjs'
import { 길들이기옵션 } from './활동설정.mjs'
import { dirname, join } from 'node:path'
import { 홈에서걷기 } from './홈수집.mjs'
import { 돌려쓰기, 계정길 } from './계정.mjs'

export const 설정 = {
  깨는시각: 8,       // 밤에는 안 돈다. 사람은 새벽 4시에 피드를 안 본다
  자는시각: 23,
  스크롤: [12, 22],  // 판마다 흩뜨린다. 같은 숫자로 매번 도는 것이 더 기계 같다
  열어볼글: [3, 6],  // 그 언어 글을 몇 편 열어 볼까
  머물초: [4, 9],    // 한 편에 몇 초 머물까. 머문 시간이 신호다
  간격시간: 3,       // 시각표가 몇 시간마다 부를까
  // 검색어로 가르치기 — 홈에 그 언어 글이 없으면 열어 볼 것도 없다.
  // 그럴 때는 **찾아 들어가서** 봐야 한다. 검색 기록과 거기서 머문 시간이 추천에 들어간다
  한판에검색어: 2,   // 한 판에 몇 단어를 두드릴까. 같은 단어를 하루 열몇 번 두드리면 그 단어가 조인다
  검색결과열기: [2, 3],
}

// 계정마다 제 파일이다 (2026-08-29)
export const 장부길 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '길들이기장부.json'))

// 사람처럼 흩뜨린다. 씨앗을 받을 수 있어야 검사가 값을 고정할 수 있다
export const 사람처럼 = ([작은, 큰], 굴림 = Math.random) =>
  작은 + Math.floor(굴림() * (큰 - 작은 + 1))

// 글자를 세어 어느 언어인지 가린다. 한글·가나·라틴 세 종류만 센다 —
// 한자만으로는 일본어와 중국어를 못 가른다. 일본어는 가나로 가린다
export function 언어판별(글자) {
  const 글 = String(글자 ?? '')
  const 센다 = (정규식) => (글.match(정규식) ?? []).length
  const 표 = {
    한국어: 센다(/[가-힣]/g),
    일본어: 센다(/[ぁ-んァ-ヴー]/g),
    영어: 센다(/[A-Za-z]/g),
  }
  const 으뜸 = Object.entries(표).sort((a, b) => b[1] - a[1])[0]
  // 라틴 몇 글자는 어느 언어 글에나 섞인다 (해시태그·상품명). 너무 적으면 판단하지 않는다
  return 으뜸[1] >= 3 ? 으뜸[0] : '기타'
}

// 걷은 글들이 어느 언어였나. 이것이 길들이기의 유일한 성적표다
export function 언어비율(글들) {
  const 표 = { 한국어: 0, 일본어: 0, 영어: 0, 기타: 0 }
  for (const p of 글들 ?? []) 표[언어판별(p?.글자)] += 1
  const 합 = Object.values(표).reduce((a, b) => a + b, 0)
  return { 수: 표, 합, 비율: Object.fromEntries(Object.entries(표)
    .map(([k, v]) => [k, 합 ? Number((v / 합).toFixed(2)) : 0])) }
}

// 그 언어 글만 골라 열어 본다. 없으면 아무것도 열지 않는다 —
// 엉뚱한 언어 글을 열면 길들이기가 거꾸로 간다
// ⚠️ **언어만 보면 「영어 잡담」으로 길들여진다.** 실측 2026-08-24 —
// sample_dinner 홈이 영어 70% 인데 요리 글은 40편 중 2편, 레시피는 0편이었다.
// 그 상태로는 수집이 67편을 걷어 67편을 전부 버린다. 분야까지 봐야 홈이 그 주제로 찬다.
// 분야 잣대는 팩의 `분야스러운가` 다 — 발행용 `쓸만한가` 는 문턱이 너무 높아 여기 쓰면 안 된다
export function 열어볼것고르기(글들, 목표언어, 몇편, 분야스러운가 = null) {
  return (글들 ?? [])
    .filter((p) => 언어판별(p?.글자) === 목표언어)
    .filter((p) => !분야스러운가 || 분야스러운가({ 본문: p?.글자 ?? '' }))
    .slice(0, 몇편)
}

export async function 장부읽기(계정, 뿌리 = process.cwd()) {
  try {
    const 것 = JSON.parse(await readFile(장부길(계정, 뿌리), 'utf8'))
    return Array.isArray(것) ? 것 : []
  } catch { return [] }
}

// 계정마다 최근 스무 판만 남긴다. 다 쌓아 두면 화면이 느려지고 볼 일도 없다
export async function 장부적기(계정, 한줄, 뿌리 = process.cwd()) {
  const 목록 = [한줄, ...(await 장부읽기(계정, 뿌리))].slice(0, 20)
  await 안전쓰기(장부길(계정, 뿌리), JSON.stringify(목록, null, 2))
  return 목록
}

export const 사람깨어있나 = (때 = new Date(), 옵션 = 설정) => {
  const 시 = new Date(때).getHours()
  return 시 >= 옵션.깨는시각 && 시 <= 옵션.자는시각
}

// 화면에서 글 목록을 줍는다. 홈수집의 것과 같은 자리를 본다 (검색 결과도 같은 껍데기다)
const 목록줍기 = () => [...document.querySelectorAll('[data-pressable-container]')].map((칸) => {
  const 주소 = [...칸.querySelectorAll('a[href*="/post/"]')]
    .map((a) => a.getAttribute('href')).find((h) => /^\/@[^/]+\/post\/[A-Za-z0-9_-]+/.test(h))
  const m = 주소?.match(/^\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/)
  return m ? { code: m[2], 작성자: m[1], 글자: (칸.innerText ?? '').slice(0, 300) } : null
}).filter(Boolean)

// 한 판 — 홈을 내려보고, 그 언어 글 몇 편을 열어 머문다. 브라우저는 한 번만 띄운다
export async function 한판(계정, {
  쿠키, 목표언어, 뿌리 = process.cwd(), 옵션 = 설정, 굴림 = Math.random,
  // 사용자가 정한 검색어. 홈에 원하는 글이 안 뜰 때 **찾아 들어가서** 가르친다
  검색어들 = [], 걷기 = 홈에서걷기, 때 = new Date(), 알림 = () => {},
  // 그 분야 글인지 보는 느슨한 잣대 (팩의 분야스러운가). 안 주면 언어만 보고 고른다
  분야스러운가 = null,
} = {}) {
  if (!목표언어) throw new Error('어느 언어로 길들일지 모른다')
  const 스크롤수 = 사람처럼(옵션.스크롤, 굴림)
  const 열어볼수 = 사람처럼(옵션.열어볼글, 굴림)
  알림(`홈을 ${스크롤수}번 내려본다`)

  const 열어본것 = []
  const 두드린것 = []
  // 같은 단어를 거듭 두드리면 스레드가 그 단어 결과를 조인다 (실측). 시각으로 자리를 돌려 쓴다
  const 고른검색어 = 돌려쓰기((검색어들 ?? []).filter(Boolean), 때).slice(0, 옵션.한판에검색어)

  const 글들 = await 걷기({
    쿠키, 계정, 스크롤수,
    머문뒤: async (쪽, 걷은것) => {
      const 고른것 = 열어볼것고르기(걷은것, 목표언어, 열어볼수, 분야스러운가)
      for (const p of 고른것) {
        const 초 = 사람처럼(옵션.머물초, 굴림)
        알림(`@${p.작성자} 의 글을 열어 ${초}초 머문다`)
        try {
          await 쪽.goto(`https://www.threads.com/@${p.작성자}/post/${p.code}`,
            { waitUntil: 'domcontentloaded', timeout: 45000 })
          // 머문 시간이 신호다. 열고 바로 닫으면 본 것으로 안 쳐 준다.
          // 사람처럼 조금 내려도 본다 — 글 하나를 읽으면 화면이 움직인다
          await 쪽.waitForTimeout(초 * 500)
          await 쪽.evaluate(() => { document.documentElement.scrollTop += 400 })
          await 쪽.waitForTimeout(초 * 500)
          열어본것.push(p.code)
        } catch { /* 한 편이 안 열려도 나머지로 간다 */ }
      }
      // 검색어로 가르치기. 홈에 그 언어 글이 없으면 여기서 찾아 들어가 본다 —
      // 검색한 것과 거기서 머문 것이 다음 홈 피드에 들어간다
      for (const 낱말 of 고른검색어) {
        알림(`"${낱말}" 로 찾아 들어가 본다`)
        try {
          await 쪽.goto(`https://www.threads.com/search?q=${encodeURIComponent(낱말)}&serp_type=default`,
            { waitUntil: 'domcontentloaded', timeout: 45000 })
          await 쪽.waitForTimeout(3000)
          const 결과 = (await 쪽.evaluate(목록줍기)) ?? []
          두드린것.push({ 낱말, 결과수: 결과.length })
          const 볼것 = 열어볼것고르기(결과, 목표언어, 사람처럼(옵션.검색결과열기, 굴림), 분야스러운가)
          for (const p of 볼것) {
            const 초 = 사람처럼(옵션.머물초, 굴림)
            try {
              await 쪽.goto(`https://www.threads.com/@${p.작성자}/post/${p.code}`,
                { waitUntil: 'domcontentloaded', timeout: 45000 })
              await 쪽.waitForTimeout(초 * 500)
              await 쪽.evaluate(() => { document.documentElement.scrollTop += 400 })
              await 쪽.waitForTimeout(초 * 500)
              열어본것.push(p.code)
            } catch { /* 한 편이 안 열려도 나머지로 간다 */ }
          }
          알림(`  "${낱말}" 결과 ${결과.length}편 중 ${볼것.length}편을 봤다`)
        } catch { 알림(`  "${낱말}" 검색이 안 열렸다`) }
      }
      await 쪽.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 })
        .catch(() => {})
    },
  })

  const 잰것 = 언어비율(글들)
  const 한줄 = {
    때: new Date(때).toISOString(),
    목표언어,
    걷은수: 글들.length,
    열어본수: 열어본것.length,
    스크롤수,
    비율: 잰것.비율,
    // ⚠️ 언어 비율만 적으면 「영어 100%」로 성공처럼 보인다. 분야 비율을 함께 남긴다
    분야비율: 분야스러운가
      ? Number((글들.filter((p) => 분야스러운가({ 본문: p?.글자 ?? '' })).length / (글들.length || 1)).toFixed(2))
      : null,
    두드린검색어: 두드린것.map((d) => d.낱말),
  }
  await 장부적기(계정, 한줄, 뿌리)
  알림(`걷은 ${글들.length}편 중 ${목표언어} ${Math.round((잰것.비율[목표언어] ?? 0) * 100)}% · ${열어본것.length}편 열어 봤다`)
  return 한줄
}

// ─── 시각표가 부르는 자리 ──────────────────────────────────────────
// 길들이기.sh 가 `node src/길들이기.mjs {계정}` 으로 부른다.
// import.meta.main 이라 다른 데서 불러 써도 여기가 안 돈다
if (import.meta.main) {
  const 계정 = (process.argv[2] ?? '').trim()
  const { 정보 } = await import('./계정.mjs')
  const 그정보 = await 정보(계정)
  const 목표언어 = 그정보.언어
  const 검색어들 = 그정보.검색어 ?? []
  // 분야 잣대는 그 계정의 팩에서 가져온다. 팩이 없으면 언어만 보고 돈다 (옛 동작)
  let 분야스러운가 = null
  try {
    const { 계정팩 } = await import('./팩.mjs')
    분야스러운가 = 계정팩(그정보).분야팩.분야스러운가 ?? null
  } catch { /* 안 되는 조합이면 언어만 본다 */ }
  const 이름 = 계정 || '첫 계정'

  if (!사람깨어있나()) {
    console.log(`⏸  [${이름}] 밤이라 건너뛴다 (${설정.깨는시각}시~${설정.자는시각}시에만 돈다)`)
    process.exit(0)
  }
  if (!process.env.THREADS_COOKIE?.trim()) {
    console.error(`‼️  [${이름}] THREADS_COOKIE 가 없다 — 길들이기는 쿠키로 돈다`)
    process.exit(1)
  }
  try {
    const 한줄 = await 한판(계정, {
      쿠키: process.env.THREADS_COOKIE,
      목표언어, 검색어들, 분야스러운가,
      // 계정마다 값을 다르게 잡을 수 있다. 화면의 「언어 길들이기」 칸에서 고친다
      옵션: 길들이기옵션(설정, 그정보.활동설정),
      알림: (m) => console.log(`  · ${m}`),
    })
    console.log(`✅ [${이름}] ${목표언어} ${Math.round((한줄.비율[목표언어] ?? 0) * 100)}%` +
      (한줄.분야비율 == null ? '' : ` · ${그정보.분야} ${Math.round(한줄.분야비율 * 100)}%`) + ` · ` +
      `걷은 ${한줄.걷은수}편 · 열어본 ${한줄.열어본수}편` +
      (한줄.두드린검색어?.length ? ` · 두드린 검색어 ${한줄.두드린검색어.join(', ')}` : ''))
  } catch (오류) {
    console.error(`‼️  [${이름}] ${오류.message}`)
    process.exit(1)
  }
}
