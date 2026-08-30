// 점검 결과를 파일에 남긴다 — 지금 열린 문제(점검상태.json)와 지나간 이력(점검기록.<계정>.jsonl)
import { appendFile, readFile } from 'node:fs/promises'
import { 계정길 } from './계정.mjs'
import { join } from 'node:path'
import { 안전쓰기, 이어쓰기 } from './장부쓰기.mjs'

export const 최대줄 = 500   // 이 정도면 30일치가 넉넉히 들어간다
export const 보관날수 = 30

// 계정을 안 가리는 「전체」 결과가 앉는 자리. 옛 '' 는 첫 계정과 같은 열쇠라
// 첫 계정이 생기는 순간 둘이 30분마다 서로를 덮어쓰며 알림 폭풍이 됐다 (2026-08-29 검토).
// 계정 이름은 [a-z0-9._] 만 되므로 밑줄로 시작하는 이 이름과는 절대 안 부딪힌다
export const 전체자리 = '_전체'

// 계정마다 제 파일이다 (2026-08-29). 전체자리(계정을 안 가리는 문제)도 제 파일 하나를 갖는다 —
// 계정꼴이 영문·숫자라 `_전체` 는 어느 계정 이름과도 안 겹친다
export const 상태길 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '점검상태.json'))
// 전체자리 는 참이라 그대로 점검기록._전체.jsonl 이 된다 — 첫 계정(점검기록.main.jsonl)과 갈린다
export const 기록길 = (계정, 뿌리 = process.cwd()) => join(뿌리, 계정길(계정, '점검기록.jsonl'))

// ⚠️ 자르는 장치를 처음부터 둔다. 활동장부.<계정>.jsonl 에는 이게 없어 무한정 자라고 있다 (2026-08-29 실측)
export function 자르기(줄들, 지금, 최대 = 최대줄, 날수 = 보관날수) {
  const 문턱 = 지금 - 날수 * 24 * 3600 * 1000
  const 산것 = (줄들 ?? []).filter((x) => {
    const t = Date.parse(x?.때 ?? '')
    return Number.isNaN(t) ? true : t >= 문턱   // 때를 못 읽는 줄은 버리지 않는다
  })
  return 산것.slice(-최대)
}

export async function 상태읽기(계정, 뿌리) {
  const 것 = await readFile(상태길(계정, 뿌리), 'utf8').then(JSON.parse).catch(() => null)
  return Array.isArray(것) ? 것 : []
}

// 여러 계정을 한 번에 봐야 하는 자리(옆바 점·개요)를 위한 길. 없는 계정은 빈 줄이다
export async function 모두읽기(계정들, 뿌리) {
  const 것들 = await Promise.all((계정들 ?? []).map((계정) => 상태읽기(계정, 뿌리)))
  return Object.fromEntries((계정들 ?? []).map((계정, i) => [계정, 것들[i]]))
}

export async function 상태쓰기(계정, 문제들, 뿌리) {
  await 안전쓰기(상태길(계정, 뿌리), JSON.stringify(문제들 ?? [], null, 2) + '\n')
}

// 깨진 줄 하나는 버리고 나머지를 살린다 (src/교류하기.mjs 의 장부읽기 와 같은 결) —
// appendFile 뒤 프로세스가 죽으면 마지막 줄이 반쪽으로 남을 수 있는데, 여기서 안 걸러내면
// 그 뒤로 이 파일을 열 때마다 영원히 던진다
const 한줄파싱 = (줄) => { try { return JSON.parse(줄) } catch { return null } }

async function 줄들읽기(경로) {
  const 글 = await readFile(경로, 'utf8').catch(() => '')
  return 글.split('\n').filter((줄) => 줄.trim()).map(한줄파싱).filter(Boolean)
}

// jsonl 에 이어붙인 뒤, 전부 읽어 자르기 를 태우고 안전쓰기 로 덮는다
export async function 기록더하기(계정, 줄들, 뿌리) {
  if (!줄들?.length) return
  const 경로 = 기록길(계정, 뿌리)
  await 이어쓰기(경로, 줄들.map((x) => `${JSON.stringify(x)}\n`).join(''))
  const 전부 = await 줄들읽기(경로)
  const 남은것 = 자르기(전부, Date.now())
  await 안전쓰기(경로, 남은것.map((x) => `${JSON.stringify(x)}\n`).join(''))
}

export async function 기록읽기(계정, 뿌리, 개수 = 200) {
  const 전부 = await 줄들읽기(기록길(계정, 뿌리))
  return 전부.slice(-개수).reverse()
}
