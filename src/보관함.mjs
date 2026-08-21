// 나중에 쓸 만한 글을 쟁여 두는 보관함 — 홈에서 건진 것을 담고, 발행할 때 꺼내 쓴다

import { readFile, writeFile } from 'node:fs/promises'

export const 기본파일 = '보관함.json'

// 미디어 주소는 하루 반이면 죽는다. 주소에 만료 시각이 박혀 있다 (실측 — oe 파라미터).
// 그래서 보관함은 주소를 믿지 않는다. 무엇이 쓸 만한지만 기억해 두고,
// 실제로 쓸 때 그 글을 다시 받아 새 주소를 얻는다.
export const 보관기간일 = 14

export async function 읽기(파일 = 기본파일) {
  try {
    const 것 = JSON.parse(await readFile(파일, 'utf8'))
    return Array.isArray(것) ? 것 : []
  } catch {
    return [] // 아직 없으면 빈 보관함이다. 없는 것은 고장이 아니다
  }
}

// 같은 글을 두 번 담지 않는다. 다시 담으면 등급과 조회수를 새것으로 갱신한다 —
// 조회수는 시간이 지나며 오르니 나중에 잰 값이 더 맞다.
export async function 담기(글들, { 파일 = 기본파일, 지금 = Date.now() } = {}) {
  const 자리 = new Map((await 읽기(파일)).map((p) => [p.code, p]))
  let 새것 = 0
  for (const p of 글들 ?? []) {
    if (!p?.code) continue
    const 있던 = 자리.get(p.code)
    if (!있던) 새것 += 1
    자리.set(p.code, { ...있던, ...p, 건진때: 있던?.건진때 ?? 지금, 갱신때: 지금 })
  }
  const 담긴것 = [...자리.values()]
  await writeFile(파일, `${JSON.stringify(담긴것, null, 1)}\n`)
  return { 새것, 전체: 담긴것.length }
}

const 순위 = { 플래티넘: 0, 골드: 1, 실버: 2, 브론즈: 3, 미달: 4 }

// 쓸 만한 것만 좋은 순으로 꺼낸다. 오래된 것은 내보내지 않는다 —
// 원글이 지워졌거나 미디어가 죽었을 확률이 높아서다.
export async function 꺼내기({ 파일 = 기본파일, 최소등급 = '실버', 지금 = Date.now() } = {}) {
  const 문턱 = 순위[최소등급] ?? 9
  const 만료 = 지금 - 보관기간일 * 24 * 60 * 60 * 1000
  return (await 읽기(파일))
    .filter((p) => (순위[p.등급] ?? 9) <= 문턱 && (p.건진때 ?? 0) >= 만료)
    .sort((a, b) => (순위[a.등급] ?? 9) - (순위[b.등급] ?? 9) || (b.비율 ?? -1) - (a.비율 ?? -1))
}

// 쓴 글은 보관함에서 뺀다. 안 빼면 다음에 또 1등으로 올라온다
export async function 빼기(codes, { 파일 = 기본파일 } = {}) {
  const 뺄것 = new Set(codes ?? [])
  const 남은것 = (await 읽기(파일)).filter((p) => !뺄것.has(p.code))
  await writeFile(파일, `${JSON.stringify(남은것, null, 1)}\n`)
  return 남은것.length
}
