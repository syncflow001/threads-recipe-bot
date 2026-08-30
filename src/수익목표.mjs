// 이번 달 수익 목표를 담아 둔다 — 개요의 고리가 이 값으로 달성률을 그린다
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// ⚠️ 계정별이 아니라 전체 하나다.
//   쿠팡이 꼬리표(SubID)를 빈 값으로 돌려줘서 실적 자체가 계정별로 안 갈린다
//   (src/대시보드.mjs 의 수익() 이 계정 인자를 안 받는 것과 같은 까닭이다).
//   나중에 쿠팡이 갈라 주기 시작하면 그때 계정별로 나눈다 — 지금 나누면 거짓 목표가 된다
export const 목표파일 = (뿌리) => join(뿌리, '수익목표.json')

export const 최대목표 = 100_000_000 // 1억. 이 위는 잘못 누른 것으로 본다

// 0 은 「목표 없음」이다. 0 을 목표로 두면 달성률이 무한대가 된다
export function 다듬기(받은것) {
  const n = Number(받은것)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(최대목표, Math.round(n))
}

export async function 읽기(뿌리 = process.cwd()) {
  const 것 = await readFile(목표파일(뿌리), 'utf8').then(JSON.parse).catch(() => ({}))
  return 다듬기(것.월목표)
}

export async function 쓰기(값, 뿌리 = process.cwd()) {
  const 월목표 = 다듬기(값)
  await writeFile(목표파일(뿌리), JSON.stringify({ 월목표 }, null, 2))
  return 월목표
}

// 목표가 없으면 달성률을 만들지 않는다. 지어낸 100% 보다 「아직 안 정했어요」가 낫다
export function 달성(이번달, 월목표) {
  if (!월목표) return null
  const 번것 = Number(이번달) || 0
  return {
    목표: 월목표,
    이번달: 번것,
    비율: Math.round((번것 / 월목표) * 1000) / 10,
    남은돈: Math.max(0, 월목표 - 번것),
    넘었나: 번것 >= 월목표,
  }
}

// 이번 달이 얼마나 지났는지에 견줘 지금 속도가 맞는지 본다.
// 「10만 원 중 3만 원」만 보면 늦은 건지 이른 건지 모른다 — 달의 30% 지점이면 딱 맞는 것이다
export function 속도(달성것, 지금 = new Date()) {
  if (!달성것) return null
  const 오늘날 = 지금.getDate()
  const 이달끝 = new Date(지금.getFullYear(), 지금.getMonth() + 1, 0).getDate()
  const 지난비율 = 오늘날 / 이달끝
  const 있어야할돈 = Math.round(달성것.목표 * 지난비율)
  return {
    지난비율: Math.round(지난비율 * 1000) / 10,
    있어야할돈,
    앞서나: 달성것.이번달 >= 있어야할돈,
    // 지금 속도로 달 끝까지 가면 얼마가 될까. 0일째는 없으니 나누기가 안전하다
    이대로면: Math.round(달성것.이번달 / 지난비율),
  }
}
