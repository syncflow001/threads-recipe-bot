// 인사할 글을 골라 사용자에게 알린다 — 하트와 댓글은 프로그램이 직접 누른다

// 하트·댓글을 프로그램이 누른다. 댓글을 받는 쪽이 감동을 받도록 항상 친절하게 행동하고 칭찬을 해주는 따뜻함을 가진다.
//
// 시간표 — 08:40 부터 한 시간에 한 번, 23:00 까지 (사용자가 정했다).
// 한 번에 하트 5~7개 · 댓글 1개.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export const 설정 = {
  깨는시각: 8, // 08:40 부터
  자는시각: 23, // 23:00 까지
  한번에하트: [5, 7],
  한번에댓글: 1,
}

export const 장부길 = (뿌리) => `${뿌리}/교류장부.json`

// 08:40~23:00 안인가. 시각표가 그 시간에만 부르지만, 맥이 자다 깨면 지난 시각이 한꺼번에 온다
export function 알릴때인가(때, 옵션 = 설정) {
  const d = new Date(때)
  const 분 = d.getHours() * 60 + d.getMinutes()
  return 분 >= 옵션.깨는시각 * 60 + 40 && 분 <= 옵션.자는시각 * 60
}

export const 오늘 = (때) => new Date(때).toLocaleDateString('sv-SE') // YYYY-MM-DD, 지역 시각

export async function 장부읽기(뿌리) {
  try {
    const 것 = JSON.parse(await readFile(장부길(뿌리), 'utf8'))
    return 것 && typeof 것 === 'object' ? 것 : {}
  } catch {
    return {}
  }
}

export async function 장부쓰기(뿌리, 장부) {
  await mkdir(dirname(장부길(뿌리)), { recursive: true })
  await writeFile(장부길(뿌리), `${JSON.stringify(장부, null, 1)}\n`)
}

// 이번에 알릴지 정한다. 이미 본 글을 또 권하지 않으려고 본 것을 적어 둔다
export function 이번판(장부, { 지금 = Date.now(), 옵션 = 설정 } = {}) {
  if (!알릴때인가(지금, 옵션)) return { 할까: false, 까닭: '알릴 시간이 아니다 (08:40~23:00)' }
  const 날 = 오늘(지금)
  // 같은 시각에 두 번 부르는 것만 막는다. 50분 안에 또 부르면 건너뛴다
  if (장부.마지막때 && 지금 - 장부.마지막때 < 50 * 60_000) {
    return { 할까: false, 까닭: `${Math.round((지금 - 장부.마지막때) / 60_000)}분 전에 알렸다` }
  }
  const [적게, 많게] = 옵션.한번에하트
  return { 할까: true, 하트수: 적게 + Math.floor(Math.random() * (많게 - 적게 + 1)), 댓글수: 옵션.한번에댓글, 날 }
}

export function 장부갱신(장부, { 날, 권한것 = [], 지금 = Date.now() } = {}) {
  const 같은날 = 장부.날 === 날
  return {
    날,
    알린횟수: (같은날 ? 장부.알린횟수 ?? 0 : 0) + 1,
    마지막때: 지금,
    // 이미 권한 글은 다시 안 권한다. 너무 오래 쌓이면 무거우니 최근 것만 둔다
    본것: [...new Set([...(장부.본것 ?? []), ...권한것])].slice(-300),
  }
}
