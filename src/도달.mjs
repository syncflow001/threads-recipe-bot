// 내 계정 도달이 조용히 깎이는 것을 잡는다 — 제재 1단계는 밴이 아니라 말없는 도달 축소다
import './그물.mjs'   // IPv6 헛디딤 막기 (부수 효과) — 왜인지는 그 파일 머리에 있다
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { 안전쓰기 } from './장부쓰기.mjs'
import { 미디어뿌리, 계정길 } from './계정.mjs'

const API = 'https://graph.threads.net/v1.0'
// 계정마다 제 파일이다 (2026-08-29)
const 상태파일 = (계정, 뿌리) => join(뿌리, 계정길(계정, '도달기준선.json'))
const 이력파일 = (계정, 뿌리) => join(뿌리, 계정길(계정, '도달이력.jsonl'))

const 이틀 = (n) => String(n).padStart(2, '0')
// 그 자리의 날짜다. UTC 로 적으면 아침 08:10 판이 전날 줄로 들어가는 날이 생긴다
const 날짜글 = (d) => `${d.getFullYear()}-${이틀(d.getMonth() + 1)}-${이틀(d.getDate())}`

// 표본이 적으면 판단을 보류한다. 3편으로 낸 비율은 숫자가 아니다
export const 최소표본 = 5

export function 중앙값(숫자들) {
  const 성한것 = (숫자들 ?? []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (성한것.length < 최소표본) return null
  const 가운데 = Math.floor(성한것.length / 2)
  return 성한것.length % 2
    ? 성한것[가운데]
    : (성한것[가운데 - 1] + 성한것[가운데]) / 2
}

// 내 글은 남의 글과 다르다. 쿠키로 문서를 긁을 필요 없이 스레드가 공식으로 알려준다.
// 2026-08-24 실측 — 우리 토큰에 threads_manage_insights 가 들어 있다
export async function 조회수읽기(본문번호, {
  토큰 = process.env.THREADS_ACCESS_TOKEN,
  fetch: 가져오기 = fetch,
} = {}) {
  try {
    const r = await 가져오기(`${API}/${본문번호}/insights?metric=views&access_token=${토큰}`)
    if (!r.ok) return null
    const j = await r.json()
    const 값 = j?.data?.find((d) => d.name === 'views')?.values?.[0]?.value
    return Number.isFinite(값) ? 값 : null
  } catch {
    return null // 그물이 끊겼다고 감시가 멈추면 안 된다
  }
}

// 최근 올린 글의 본문번호를 모은다. 최근글() 은 번호를 안 주므로 여기서 직접 읽는다.
// 미디어 폴더는 계정마다 따로다 — media/쓴것 은 첫 계정, media/<이름>/쓴것 은 나머지
export async function 내글조회수들(계정, { 개수 = 8, 뿌리 = process.cwd(), ...옵션 } = {}) {
  const 쓴곳 = join(뿌리, 미디어뿌리(계정), '쓴것')
  let 폴더 = []
  try { 폴더 = await readdir(쓴곳) } catch { return [] }

  const 글들 = []
  for (const code of 폴더) {
    const 글 = await readFile(join(쓴곳, code, '재구성.json'), 'utf8')
      .then(JSON.parse).catch(() => null)
    if (!글?.발행?.본문번호) continue
    if ((글.발행.계정 ?? '') !== 계정) continue
    글들.push({ 번호: 글.발행.본문번호, 때: 글.발행.올린때 ?? '' })
  }
  글들.sort((a, b) => String(b.때).localeCompare(String(a.때)))

  const 숫자들 = []
  for (const g of 글들.slice(0, 개수)) {
    const v = await 조회수읽기(g.번호, 옵션)
    if (v !== null) 숫자들.push(v)
  }
  return 숫자들
}

const 장부읽기 = async (계정, 뿌리) =>
  readFile(상태파일(계정, 뿌리), 'utf8').then(JSON.parse).catch(() => ({}))

// 기준선은 처음 한 번만 찍는다. 계속 갱신하면 서서히 깎이는 것을 못 잡는다.
// 사용자가 설정 화면에서 "기준선 다시 찍기" 를 누를 때만 다시=true 로 덮어쓴다
export async function 기준선찍기(계정, { 다시 = false, 뿌리 = process.cwd(), ...옵션 } = {}) {
  const 있던것 = await 장부읽기(계정, 뿌리)
  if (!다시 && 있던것?.기준선) return { ...있던것, 그대로: true }

  const 숫자들 = await 내글조회수들(계정, { 뿌리, ...옵션 })
  const 값 = 중앙값(숫자들)
  if (값 === null) return { 모자람: true, 표본: 숫자들.length }

  const 새것 = { 기준선: 값, 표본: 숫자들.length, 찍은때: new Date().toISOString() }
  await 안전쓰기(상태파일(계정, 뿌리), JSON.stringify(새것, null, 2))
  return 새것
}

export async function 견주기(계정, { 뿌리 = process.cwd(), ...옵션 } = {}) {
  const 있던것 = await 장부읽기(계정, 뿌리)
  if (!있던것?.기준선) return null

  const 숫자들 = await 내글조회수들(계정, { 뿌리, ...옵션 })
  const 지금 = 중앙값(숫자들)
  if (지금 === null) return null // 표본이 모자라면 숫자를 만들지 않는다

  return {
    기준선: 있던것.기준선,
    지금,
    비율: Math.round((지금 / 있던것.기준선) * 100),
    표본: 숫자들.length,
  }
}

// ── 정기 측정 ───────────────────────────────────────────────────
// 텔레그램 한 줄로 스쳐 지나가던 것을 파일에 쌓는다.
// 프로세스를 넘겨야 하는 결과는 파일에 적는다 ([[서버가-제-몸을-다시-켜면-메모리-결과가-사라진다]])

export async function 이력읽기(계정, 뿌리 = process.cwd()) {
  const 글 = await readFile(이력파일(계정, 뿌리), 'utf8').catch(() => '')
  return 글.split('\n').filter(Boolean).flatMap((줄) => {
    try { return [JSON.parse(줄)] } catch { return [] } // 반쪽 줄 하나가 이력 전체를 못 읽게 하면 안 된다
  })
}

// 같은 날 두 번 돌면 그날 줄을 덮는다 — 감시기가 두 번 도는 날이 있다
async function 이력쓰기(줄, 뿌리) {
  const 남길것 = (await 이력읽기(줄.계정, 뿌리)).filter((r) => r.날짜 !== 줄.날짜)
  남길것.push(줄)
  await 안전쓰기(이력파일(줄.계정, 뿌리), `${남길것.map((r) => JSON.stringify(r)).join('\n')}\n`)
}

// 도달 한 판. 기준선이 없으면 **그 자리에서 한 번** 찍고, 있으면 손대지 않는다.
// 조회수는 한 번만 물어본다 — 기준선찍기 와 견주기 를 따로 부르면 스레드에 두 배로 묻는다
export async function 도달재기(계정, {
  뿌리 = process.cwd(), 오늘 = 날짜글(new Date()), ...옵션
} = {}) {
  const 숫자들 = await 내글조회수들(계정, { 뿌리, ...옵션 })
  const 지금 = 중앙값(숫자들)
  if (지금 === null) return null // 표본이 모자라면 기준선도 이력도 만들지 않는다

  const 있던것 = await 장부읽기(계정, 뿌리)
  let 기준선 = 있던것?.기준선
  if (!기준선) {
    기준선 = 지금
    await 안전쓰기(상태파일(계정, 뿌리),
      JSON.stringify({ 기준선: 지금, 표본: 숫자들.length, 찍은때: new Date().toISOString() }, null, 2))
  }

  const 줄 = {
    날짜: 오늘,
    계정,
    지금,
    기준선,
    비율: Math.round((지금 / 기준선) * 100),
    표본: 숫자들.length,
  }
  await 이력쓰기(줄, 뿌리)
  return 줄
}
