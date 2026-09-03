// 여러 계정이 같은 시각에 몰리지 않게 발행 칸(시·분)을 자동으로 나눠 준다.
// 배정 규칙은 순수 함수다 — 파일을 안 읽는다. 간격 설정만 이 파일 아래쪽에서 읽고 쓴다
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// 다른 계정과 이만큼(분) 안 떨어지면 겹친 것으로 본다.
// 3분에서 20분으로 늘렸다 (2026-08-28 사용자 요청) — 몇 분 차이로 두 계정이 연달아 올라가면
// 같은 사람이 굴리는 것이 눈에 보인다.
// 2026-09-03 부터 **사용자가 화면에서 1~59분으로 정한다** (설정 → 발행 시각 카드 맨 아래).
// 여기 값은 아직 안 정했을 때 쓰는 바탕값이다
export const 기본간격분 = 20

// 칸이 남의칸들 중 하나와 간격 안으로 붙어 있으면 true. 자정 넘김은 안 본다 (옛 규칙과 같다)
export function 겹치나(칸, 남의칸들, 간격 = 기본간격분) {
  const 나 = 칸.시 * 60 + 칸.분
  return 남의칸들.some((남) => Math.abs(나 - (남.시 * 60 + 남.분)) < 간격)
}

// 그 시 안에서 남의칸들과 안 겹치는 **가장 빠른** 분을 찾는다. 없으면 null.
// ⚠️ 1분씩 훑는다 (2026-09-03). 전에는 3분씩 건너뛰어 23분이 되는 자리를 24분으로 밀었다 —
// 사용자가 「설정 가능한 가장 빠른 시각」을 원했다. 간격을 1분으로 정하면 3분 걸음은 뜻이 없다
function 빈분찾기(시, 남의칸들, 간격) {
  for (let 분 = 0; 분 <= 59; 분 += 1) {
    if (!겹치나({ 시, 분 }, 남의칸들, 간격)) return 분
  }
  return null
}

// 남들의 칸을 피해 이 계정의 칸을 고른다. 이미 고른 시가 있으면 그 시는 유지하고 분만 새로 고른다.
// 그 시에 빈 분이 없으면 다음 시로 밀고 밀림에 적는다
export function 자동배정({ 남들 = [], 시들 = [8, 12, 16, 20], 이미 = [], 간격 = 기본간격분 }) {
  const 남의칸들 = 남들.flatMap((x) => x.칸들)
  const 대상시들 = 이미.length ? 이미.map((c) => c.시) : 시들
  const 칸들 = []
  const 밀림 = []
  for (const 바란시 of 대상시들) {
    let 시 = 바란시
    let 분 = 빈분찾기(시, 남의칸들, 간격)
    while (분 === null) {
      시 += 1
      분 = 빈분찾기(시, 남의칸들, 간격)
    }
    if (시 !== 바란시) 밀림.push({ 바란시, 시 })
    칸들.push({ 시, 분 })
  }
  return { 칸들, 밀림 }
}

// ── 간격 설정 — 계정별이 아니라 **이 맥 전체의 규칙**이라 뿌리에 둔다 (CLAUDE.md §3-1)

export const 간격파일 = (뿌리 = process.cwd()) => join(뿌리, '발행간격.json')

// 1분 아래도 60분 위도 뜻이 없다 — 화면 드롭다운이 1~59만 준다.
// 이상한 값이 들어오면 막지 말고 바탕값으로 물러선다. 여기서 던지면 발행이 통째로 선다
export function 간격다듬기(받은것) {
  // ⚠️ **빈 값은 0 이 아니라 「안 정했다」다.** `Number(null)` 은 0 이라 그냥 넘기면
  // 「안 정함」이 1분으로 바뀐다 — 열한 계정이 1분 간격으로 몰릴 뻔했다
  if (받은것 === null || 받은것 === undefined || 받은것 === '') return 기본간격분
  const n = Math.round(Number(받은것))
  if (!Number.isFinite(n)) return 기본간격분
  return Math.min(59, Math.max(1, n))
}

export async function 간격읽기(뿌리 = process.cwd()) {
  const 짐 = await readFile(간격파일(뿌리), 'utf8').then(JSON.parse).catch(() => null)
  return 짐 && 짐.분 !== undefined ? 간격다듬기(짐.분) : 기본간격분
}

export async function 간격쓰기(값, 뿌리 = process.cwd()) {
  const 분 = 간격다듬기(값)
  await writeFile(간격파일(뿌리), `${JSON.stringify({ 분 }, null, 2)}\n`)
  return 분
}
