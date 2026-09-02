// 이번 달 수익 목표를 담아 둔다 — 개요의 고리가 이 값으로 달성률을 그린다
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// ⚠️ **계정별로 안 나눈다 — 불가능하다** (2026-08-30 사용자 결정, CLAUDE.md 확정 사항).
//   쿠팡이 꼬리표(SubID)를 빈 값으로 돌려줘서 실적 자체가 계정별로 안 갈린다.
//   다시 시도하지 않는다.
//
// **제휴 채널별로는 나눈다** (2026-08-31). 쿠팡·라쿠텐·아마존JP·아마존US 는 서로 다른 돈이라
// 목표를 하나로 두면 뜻이 없다. 목표는 **그 숫자를 실제로 받아오는 채널**에 붙는다 —
// 라쿠텐 목표를 세워 두고 쿠팡 숫자로 달성률을 그리면 거짓말이 되기 때문이다
// (src/계정.mjs 의 `수익채널()` 이 정하는 `출처` 가 그 채널이다)
export const 목표파일 = (뿌리) => join(뿌리, '수익목표.json')

export const 기본채널 = '쿠팡파트너스'

export const 최대목표 = 100_000_000 // 1억. 이 위는 잘못 누른 것으로 본다

// 0 은 「목표 없음」이다. 0 을 목표로 두면 달성률이 무한대가 된다
export function 다듬기(받은것) {
  const n = Number(받은것)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(최대목표, Math.round(n))
}

const 짐읽기 = (뿌리) => readFile(목표파일(뿌리), 'utf8').then(JSON.parse).catch(() => ({}))

// 옛 꼴은 `{ 월목표: 150000 }` 하나뿐이었다. 그것은 **쿠팡 목표**로 읽는다 —
// 그때 실적이 들어오던 채널이 쿠팡뿐이었기 때문이다. 파일을 손대지 않아도 그대로 이어진다
export function 채널목표(짐, 채널 = 기본채널) {
  const 채널별 = 짐?.채널별 ?? {}
  if (채널 in 채널별) return 다듬기(채널별[채널])
  return 채널 === 기본채널 ? 다듬기(짐?.월목표) : 0
}

export async function 읽기(뿌리 = process.cwd(), 채널 = 기본채널) {
  return 채널목표(await 짐읽기(뿌리), 채널)
}

// 채널마다 얼마씩인지 통째로. 화면이 「어디에 목표를 세워 뒀나」를 보여 주는 데 쓴다
export async function 모두읽기(뿌리 = process.cwd(), 채널들 = [기본채널]) {
  const 짐 = await 짐읽기(뿌리)
  return Object.fromEntries(채널들.map((c) => [c, 채널목표(짐, c)]))
}

export async function 쓰기(값, 뿌리 = process.cwd(), 채널 = 기본채널) {
  const 짐 = await 짐읽기(뿌리)
  const 목표 = 다듬기(값)
  const 채널별 = { ...(짐.채널별 ?? {}), [채널]: 목표 }
  // 옛 칸도 함께 맞춰 둔다 — 아직 이 파일을 옛 꼴로 읽는 곳이 있으면 어긋나지 않게
  const 새짐 = { ...짐, 채널별, ...(채널 === 기본채널 ? { 월목표: 목표 } : {}) }
  await writeFile(목표파일(뿌리), JSON.stringify(새짐, null, 2) + '\n')
  return 목표
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
