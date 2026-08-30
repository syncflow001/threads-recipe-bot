// 잘 퍼지는 글을 놓치지 않게 — 최근 글이 조회수 문턱을 넘으면 텔레그램으로 알린다

// 왜 만들었나 (2026-08-26, 사용자가 시켰다). 글이 터지는 순간을 알아야
// 그 글에 링크를 손보거나, 같은 결의 글을 더 쓰거나, 댓글에 답할 수 있다.
// 하루 뒤에 알면 늦다. 그래서 **30분마다** 본다.
//
// 조건 (사용자가 정했다) — **잰 때로부터 2일 이내에 올린 글** 중 **조회수 1만 이상.**
// 옛 글이 천천히 1만을 넘는 것은 알리지 않는다. 「지금 터지고 있는 글」만 본다.
//
// ⚠️ **한 글은 한 번만 알린다.** 조회수는 계속 오르므로 안 그러면 30분마다 같은 알림이 온다.
// 알린 것은 계정마다 제 파일에 이어붙인다 (`알림기록.<계정>.jsonl`) —
// 계정 기록을 섞지 않는 것이 이 저장소의 규칙이다 (인계 §7-16).

import { readFile, appendFile } from 'node:fs/promises'
import { 이어쓰기 } from './장부쓰기.mjs'
import { 계정길 } from './계정.mjs'
import { join } from 'node:path'
import { 내글들, 글성적읽기 } from './성적.mjs'
import { 글주소받기 } from './publish.mjs'
import { 계정열쇠읽기 } from './감시모음.mjs'

export const 설정 = {
  문턱: 10000,   // 조회수 몇부터 알리나
  며칠: 2,       // 잰 때로부터 며칠 안에 올린 글만
  글수: 12,      // 계정마다 최근 몇 편까지 볼까 (2일이면 넉넉하다)
}

export const 기록길 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '알림기록.jsonl'))

export async function 알린것읽기(계정, 뿌리 = process.cwd()) {
  const 글 = await readFile(기록길(계정, 뿌리), 'utf8').catch(() => '')
  const 것들 = []
  for (const 줄 of 글.split('\n')) {
    if (!줄.trim()) continue
    try { 것들.push(JSON.parse(줄)) } catch { /* 깨진 줄 하나는 버리고 나머지를 살린다 */ }
  }
  return 것들
}

export const 알린것적기 = (계정, 줄들, 뿌리 = process.cwd()) =>
  이어쓰기(기록길(계정, 뿌리), `${줄들.map((r) => JSON.stringify(r)).join('\n')}\n`)

// 올린 지 며칠 안 됐나
export const 최근인가 = (올린때, 지금, 며칠 = 설정.며칠) => {
  const t = Date.parse(올린때 ?? '')
  if (!Number.isFinite(t)) return false
  return 지금 - t <= 며칠 * 24 * 60 * 60 * 1000 && t <= 지금
}

// 알릴 것을 고른다. **순수 함수** — 네트워크도 파일도 안 건드린다
export function 알릴것고르기(글들, { 이미알린것 = [], 지금 = Date.now(), 옵션 = 설정 } = {}) {
  const 알린번호 = new Set((이미알린것 ?? []).map((r) => String(r.번호)))
  return (글들 ?? []).filter((g) => {
    if (!g?.번호 || 알린번호.has(String(g.번호))) return false
    if (!최근인가(g.올린때, 지금, 옵션.며칠)) return false
    return Number(g.성적?.조회수 ?? 0) >= 옵션.문턱
  })
}

// 글 제목이 없다. 본문 첫 줄을 이름으로 쓴다 — 사람이 어느 글인지 알아보면 된다
export const 글이름 = (본문, 길이 = 40) => {
  const 첫줄 = String(본문 ?? '').split('\n').map((s) => s.trim()).find(Boolean) ?? '(제목 없음)'
  return 첫줄.length > 길이 ? `${첫줄.slice(0, 길이)}…` : 첫줄
}

export function 글월(알릴것들) {
  if (!알릴것들?.length) return null
  const 줄 = (g) => [
    `📈 ${g.별칭 || g.계정 || '첫 계정'}`,
    `「${g.이름}」`,
    `조회 ${Number(g.성적.조회수).toLocaleString('ko-KR')}`
    + ` · 좋아요 ${Number(g.성적.좋아요 ?? 0).toLocaleString('ko-KR')}`
    + ` · 댓글 ${Number(g.성적.답글 ?? 0).toLocaleString('ko-KR')}`,
    ...(g.주소 ? [g.주소] : []),
  ].join('\n')
  return [
    알릴것들.length === 1 ? '🔥 글 하나가 잘 퍼지고 있습니다' : `🔥 잘 퍼지는 글 ${알릴것들.length}편`,
    '',
    알릴것들.map(줄).join('\n\n'),
  ].join('\n')
}

// 계정 하나를 잰다. 알릴 것을 돌려주고 **기록까지 적는다** (두 번 알리지 않게)
export async function 계정한판(계정, {
  뿌리 = process.cwd(), 지금 = Date.now(), 옵션 = 설정, 별칭 = '',
  글목록 = 내글들, 성적읽기 = 글성적읽기, 열쇠읽기 = 계정열쇠읽기, 주소받기 = 글주소받기,
} = {}) {
  const 토큰 = await 열쇠읽기(계정, 'THREADS_ACCESS_TOKEN', 뿌리)
  if (!토큰) return { 계정, 안됨: '스레드 출입증이 없습니다', 알릴것: [] }

  const 이미알린것 = await 알린것읽기(계정, 뿌리)
  const 알린번호 = new Set(이미알린것.map((r) => String(r.번호)))

  // 최근 글만 본다. 2일이 넘은 글은 성적을 물어볼 것도 없다 — API 를 아낀다
  const 후보 = (await 글목록(계정, { 뿌리 })).slice(0, 옵션.글수)
    .filter((g) => 최근인가(g.올린때, 지금, 옵션.며칠) && !알린번호.has(String(g.번호)))

  const 잰것 = []
  for (const g of 후보) {
    const 성적 = await 성적읽기(g.번호, { 토큰 })
    if (!성적) continue
    잰것.push({ ...g, 성적 })
  }

  const 알릴것 = 알릴것고르기(잰것, { 이미알린것, 지금, 옵션 }).map((g) => ({
    계정, 별칭, 번호: g.번호, code: g.code, 올린때: g.올린때,
    이름: 글이름(g.본문), 성적: g.성적, 주소: '',
  }))

  // ⚠️ **주소는 API 에게 물어야 한다.** `threads.com/t/{번호}` 꼴은 안 열린다 (인계 §8 6번).
  // 알릴 글에 대해서만 묻는다 — 30분마다 다 물으면 헛일이다
  for (const g of 알릴것) {
    // ⚠️ `글주소받기(번호, 토큰)` 은 토큰을 **그대로** 받는다. 객체로 넘기면 조용히 빈 주소가 온다
    g.주소 = (await 주소받기(g.번호, 토큰).catch(() => '')) || ''
  }

  if (알릴것.length) {
    await 알린것적기(계정, 알릴것.map((g) => ({
      때: new Date(지금).toISOString(), 번호: g.번호, code: g.code,
      조회수: g.성적.조회수, 이름: g.이름,
    })), 뿌리)
  }
  return { 계정, 본글: 후보.length, 알릴것 }
}

// 모든 계정을 한 바퀴
export async function 한판({ 뿌리 = process.cwd(), 지금 = Date.now(), 옵션 = 설정, ...나머지 } = {}) {
  const 정보 = await readFile(join(뿌리, '계정정보.json'), 'utf8').then(JSON.parse).catch(() => ({ '': {} }))
  const 알릴것 = []
  const 판들 = []
  for (const 계정 of Object.keys(정보)) {
    const r = await 계정한판(계정, { 뿌리, 지금, 옵션, 별칭: 정보[계정]?.별칭 ?? '', ...나머지 })
    판들.push(r)
    알릴것.push(...(r.알릴것 ?? []))
  }
  return { 때: new Date(지금).toISOString(), 판들, 알릴것 }
}
