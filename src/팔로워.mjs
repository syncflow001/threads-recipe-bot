// 팔로워 수를 날마다 한 줄씩 쌓는다 — 목적이 계정을 키우는 것이라 이 숫자가 성적표다
import { readFile } from 'node:fs/promises'
import { 계정길 } from './계정.mjs'
import { join } from 'node:path'
import { 안전쓰기 } from './장부쓰기.mjs'

const API = 'https://graph.threads.net/v1.0'
// 계정마다 제 파일이다 (2026-08-29). 한 파일에 여덟 계정을 담으면 그 파일이 깨질 때
// 여덟이 같이 죽고, 계정 하나를 지울 때 파일을 열어 그 칸만 도려내야 한다
export const 장부파일 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '팔로워장부.json'))

// ⚠️ 실측으로 못 박은 것 (2026-08-25).
// 스레드 공식 API 는 followers_count 를 **지금 값 하나**로만 준다.
// since·until 을 어떻게 줘도 날짜별 값을 안 돌려준다 — total_value 뿐이다.
// 그래서 과거 추이는 우리가 날마다 찍어 쌓는 수밖에 없다. 여기가 그 일을 한다
export async function 지금팔로워({
  아이디 = process.env.THREADS_USER_ID,
  토큰 = process.env.THREADS_ACCESS_TOKEN,
  fetch: 가져오기 = fetch,
} = {}) {
  if (!아이디 || !토큰) return null
  try {
    const r = await 가져오기(
      `${API}/${아이디}/threads_insights?metric=followers_count&access_token=${토큰}`)
    if (!r.ok) return null
    const j = await r.json()
    const 값 = j?.data?.find((d) => d.name === 'followers_count')?.total_value?.value
    return Number.isFinite(값) ? 값 : null
  } catch {
    return null // 그물이 끊겼다고 발행이 멈추면 안 된다
  }
}

export const 날글 = (때 = new Date()) => new Date(때).toLocaleDateString('sv-SE') // YYYY-MM-DD

export async function 장부읽기(계정, 뿌리 = process.cwd()) {
  const 것 = await readFile(장부파일(계정, 뿌리), 'utf8').then(JSON.parse).catch(() => null)
  return Array.isArray(것) ? 것 : []
}

// 하루 한 줄이다. 같은 날 여러 번 찍으면 마지막 값이 그날 값이 된다 —
// 하루 다섯 번 도는 자동 발행이 부르므로 그냥 쌓으면 줄이 다섯 배가 된다
export function 줄넣기(줄들, 날, 수, 때) {
  const 남길것 = (줄들 ?? []).filter((r) => r.날 !== 날)
  남길것.push({ 날, 수, 찍은때: 때 })
  return 남길것.sort((a, b) => a.날.localeCompare(b.날))
}

// 못 읽으면 아무것도 안 쌓는다. 0 이나 null 을 쌓으면 그래프가 절벽처럼 떨어져
// 「계정이 망했다」로 읽힌다 — 틀린 숫자를 보여주느니 그날을 비운다
export async function 찍기(계정, { 뿌리 = process.cwd(), 지금 = new Date(), ...옵션 } = {}) {
  const 수 = await 지금팔로워(옵션)
  if (수 === null) return { 못읽음: true }

  const 줄들 = await 장부읽기(계정, 뿌리)
  const 날 = 날글(지금)
  await 안전쓰기(장부파일(계정, 뿌리),
    JSON.stringify(줄넣기(줄들, 날, 수, new Date(지금).toISOString()), null, 2))
  return { 날, 수 }
}

// 그날 이미 찍었으면 API 를 다시 안 친다. 화면이 5분마다 새로 받으므로
// 이것이 없으면 하루에 288번 스레드를 두드린다
export async function 하루한번찍기(계정, { 뿌리 = process.cwd(), 지금 = new Date(), ...옵션 } = {}) {
  const 줄들 = await 장부읽기(계정, 뿌리)
  const 날 = 날글(지금)
  if (줄들.some((r) => r.날 === 날)) return { 이미: true }
  return 찍기(계정, { 뿌리, 지금, ...옵션 })
}

// 며칠 전과 견준다. 그날 줄이 없으면 그보다 앞선 것 중 가장 가까운 것을 쓴다 —
// 화면을 며칠 안 열면 그 며칠이 비기 때문이다. 견줄 것이 아예 없으면 null 이다
export function 증감(줄들, { 며칠 = 7, 지금 = new Date() } = {}) {
  const 성한것 = (줄들 ?? []).filter((r) => Number.isFinite(r.수))
    .sort((a, b) => a.날.localeCompare(b.날))
  if (성한것.length < 2) return null

  const 마지막 = 성한것[성한것.length - 1]
  const 기준날 = 날글(new Date(new Date(지금).getTime() - 며칠 * 86400000))
  const 앞선것 = 성한것.filter((r) => r.날 <= 기준날)
  const 옛것 = 앞선것.length ? 앞선것[앞선것.length - 1] : 성한것[0]
  if (옛것.날 === 마지막.날) return null

  return {
    지금: 마지막.수,
    옛날: 옛것.수,
    옛날짜: 옛것.날,
    차: 마지막.수 - 옛것.수,
    // 0 에서 시작한 계정은 비율이 무한대가 된다. 그때는 비율을 안 만든다
    비율: 옛것.수 > 0 ? Math.round(((마지막.수 - 옛것.수) / 옛것.수) * 1000) / 10 : null,
  }
}
