// 내가 올린 글의 성적을 정기적으로 찍어 쌓는다 — 스레드는 과거 값을 안 주므로 안 찍으면 영영 못 채운다
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { 안전쓰기 } from './장부쓰기.mjs'
import { 미디어뿌리, 계정길 } from './계정.mjs'
import { 찍기 as 팔로워찍기 } from './팔로워.mjs'

const API = 'https://graph.threads.net/v1.0'
// 계정마다 제 파일이다 (2026-08-29)
export const 장부파일 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '글성적장부.json'))

// 실측 (2026-08-25) — 여섯 지표를 쉼표로 이어 한 번에 받는다. 글 하나당 API 한 번이다.
// replies 는 답이 thread_replies 라는 다른 id 로 오지만 name 은 replies 로 온다
export const 지표들 = {
  views: '조회수', likes: '좋아요', replies: '답글',
  reposts: '리포스트', quotes: '인용', shares: '공유',
}

// 글 한 편이 몇 판까지 쌓이나. 여섯 시간마다면 100줄이 25일치다.
// 안 자르면 글 스무 편 × 몇 달이 쌓여 파일이 화면을 느리게 만든다
export const 글당최대줄 = 100
export const 기본개수 = 10
export const 기본간격시간 = 6

export async function 글성적읽기(본문번호, {
  토큰 = process.env.THREADS_ACCESS_TOKEN,
  fetch: 가져오기 = fetch,
} = {}) {
  if (!본문번호 || !토큰) return null
  try {
    const 이름들 = Object.keys(지표들).join(',')
    const r = await 가져오기(`${API}/${본문번호}/insights?metric=${이름들}&access_token=${토큰}`)
    if (!r.ok) return null
    const j = await r.json()
    const 것 = {}
    let 하나라도 = false
    for (const [영, 한] of Object.entries(지표들)) {
      const 값 = j?.data?.find((d) => d.name === 영)?.values?.[0]?.value
      // 못 받은 지표는 0 이 아니라 null 이다. 0 으로 채우면 「공유가 0」과 구분이 안 된다
      것[한] = Number.isFinite(값) ? 값 : null
      if (Number.isFinite(값)) 하나라도 = true
    }
    return 하나라도 ? 것 : null
  } catch {
    return null // 그물이 끊겼다고 다음 판까지 멈추면 안 된다
  }
}

// 내가 올린 글의 본문번호를 최근 순으로 모은다.
// 미디어 폴더는 계정마다 따로다 — media/쓴것 은 첫 계정, media/<이름>/쓴것 은 나머지
export async function 내글들(계정, { 뿌리 = process.cwd() } = {}) {
  const 쓴곳 = join(뿌리, 미디어뿌리(계정), '쓴것')
  let 폴더 = []
  try { 폴더 = await readdir(쓴곳) } catch { return [] }

  const 글들 = []
  for (const code of 폴더) {
    const 글 = await readFile(join(쓴곳, code, '재구성.json'), 'utf8')
      .then(JSON.parse).catch(() => null)
    if (!글?.발행?.본문번호) continue
    if ((글.발행.계정 ?? '') !== 계정) continue
    // 본문도 함께 준다 — 조회수 알리미가 「어느 글인가」를 사람에게 보여줄 때 쓴다.
    // 성적 찍기는 이 칸을 안 본다 (더해도 하던 일은 그대로다)
    글들.push({
      code, 번호: String(글.발행.본문번호), 올린때: 글.발행.올린때 ?? '',
      본문: String(글.본문 ?? ''),
    })
  }
  return 글들.sort((a, b) => String(b.올린때).localeCompare(String(a.올린때)))
}

export async function 장부읽기(계정, 뿌리 = process.cwd()) {
  const 것 = await readFile(장부파일(계정, 뿌리), 'utf8').then(JSON.parse).catch(() => null)
  return 것 && typeof 것 === 'object' && !Array.isArray(것) ? 것 : {}
}

export function 줄넣기(줄들, 새줄) {
  const 다 = [...(줄들 ?? []), 새줄]
  return 다.length > 글당최대줄 ? 다.slice(다.length - 글당최대줄) : 다
}

// 값이 하나도 안 바뀌었으면 줄을 더하지 않는다. 여섯 시간마다 도는데 조용한 글은
// 며칠씩 같은 값이라, 그대로 쌓으면 장부의 아홉 할이 같은 줄이 된다
export function 그대로인가(마지막, 지금것) {
  if (!마지막) return false
  return Object.values(지표들).every((한) => (마지막[한] ?? null) === (지금것[한] ?? null))
}

// 한 판 — 팔로워 하나와 최근 글 몇 편을 찍는다. 사용자가 켜고 끄는 것은 이 한 판이다
export async function 한판(계정, {
  뿌리 = process.cwd(), 개수 = 기본개수, 지금 = new Date(), ...옵션
} = {}) {
  const 팔 = await 팔로워찍기(계정, { 뿌리, 지금, ...옵션 })

  const 글들 = (await 내글들(계정, { 뿌리 })).slice(0, 개수)
  const 그계정 = await 장부읽기(계정, 뿌리)
  const 때 = new Date(지금).toISOString()
  let 찍음 = 0
  let 못읽음 = 0
  let 그대로 = 0

  for (const g of 글들) {
    const 것 = await 글성적읽기(g.번호, 옵션)
    if (!것) { 못읽음 += 1; continue }
    const 있던것 = 그계정[g.번호] ?? { code: g.code, 올린때: g.올린때, 줄들: [] }
    const 마지막 = 있던것.줄들[있던것.줄들.length - 1]
    if (그대로인가(마지막, 것)) { 그대로 += 1; continue }
    있던것.code = g.code
    있던것.올린때 = g.올린때
    있던것.줄들 = 줄넣기(있던것.줄들, { 때, ...것 })
    그계정[g.번호] = 있던것
    찍음 += 1
  }

  await 안전쓰기(장부파일(계정, 뿌리), JSON.stringify(그계정, null, 2))
  return { 팔로워: 팔.수 ?? null, 본글: 글들.length, 찍음, 그대로, 못읽음, 때 }
}

// 화면이 읽기 좋게 — 글마다 지금 값과 처음 잰 뒤 얼마나 늘었는지
export function 요약(그계정, { 개수 = 20 } = {}) {
  return Object.entries(그계정 ?? {})
    .map(([번호, 것]) => {
      const 줄들 = 것.줄들 ?? []
      const 끝 = 줄들[줄들.length - 1]
      const 첫 = 줄들[0]
      if (!끝) return null
      return {
        번호,
        code: 것.code,
        올린때: 것.올린때,
        지금: 끝,
        잰횟수: 줄들.length,
        // 잰 것이 한 판뿐이면 「얼마나 늘었나」를 만들 수 없다. 지어내지 않는다
        늘어남: 줄들.length > 1
          ? Object.fromEntries(Object.values(지표들)
              .map((한) => [한, (끝[한] ?? 0) - (첫[한] ?? 0)]))
          : null,
        줄들,
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.올린때).localeCompare(String(a.올린때)))
    .slice(0, 개수)
}
