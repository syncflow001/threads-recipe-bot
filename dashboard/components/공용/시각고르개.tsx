'use client'
// 발행 시각 고르개 — 한 줄이 「몇 시 몇 분」 하나다. 세팅 쪽과 마법사가 같은 부품을 쓴다(옛 설정화면-html.mjs 1819~1864)

export type 시각칸 = { 시: number; 분: number }
export type 남의칸 = { 계정: string; 칸들: 시각칸[] }

export const 이틀 = (n: number) => String(n).padStart(2, '0')

// 받침이 있으면 「과」, 없으면 「와」. 계정 이름이 한글일 수도 영문일 수도 있다
function 와과(말: string) {
  const 끝 = String(말 ?? '').trim().slice(-1)
  const 코드 = 끝.charCodeAt(0)
  if (코드 >= 0xac00 && 코드 <= 0xd7a3) return (코드 - 0xac00) % 28 ? '과' : '와'
  return /[a-z0-9]/i.test(끝) ? '과' : '와' // 영문·숫자는 소리대로 갈리지만 「과」가 무난하다
}

// 다른 계정이 그 시각·분을 이미 쓰고 있나. 같은 분에 둘이 터지면 같은 IP 로 몰려 서로 조인다
export const 겹치는계정 = (칸: 시각칸, 남의칸들: 남의칸[]) =>
  남의칸들
    .filter((t) => (t.칸들 ?? []).some((c) => c.시 === 칸.시 && c.분 === 칸.분))
    .map((t) => t.계정 || '첫 계정')

// 마지막 시각에서 네 시간 뒤를 기본으로 준다. 조사에서 최소 4시간을 권했다.
// 12개를 넘기면 null 을 준다 — 부르는 쪽이 「하루 12번을 넘기지 마세요.」를 띄운다
export function 시각한줄더하기(칸들: 시각칸[], 기본분: number): 시각칸[] | null {
  if (칸들.length >= 12) return null
  const 마지막 = 칸들[칸들.length - 1]
  return [...칸들, 마지막 ? { 시: (마지막.시 + 4) % 24, 분: 마지막.분 } : { 시: 8, 분: 기본분 }]
}

// 겹치는 칸이 있으면 팝업으로 한 번 묻는다. 막지는 않는다 — 일부러 붙여 쓸 수도 있다
export function 겹침묻기(칸들: 시각칸[], 남의칸들: 남의칸[]) {
  const 겹친것 = 칸들.map((칸) => ({ 칸, 겹침: 겹치는계정(칸, 남의칸들) })).filter((v) => v.겹침.length)
  if (!겹친것.length) return true
  const 줄 = 겹친것.map((v) => '  · ' + 이틀(v.칸.시) + ':' + 이틀(v.칸.분) + ' — ' + v.겹침.join(', ')).join('\n')
  return confirm(
    '다른 계정과 같은 시각이 있습니다.\n\n' + 줄 +
    '\n\n같은 순간에 두 계정이 올라가면 스레드가 수집을 조이고, 한 사람이 굴리는 것이 드러날 수 있습니다.' +
    '\n그래도 진행하시겠습니까?',
  )
}

const 칸모양 = 'rounded-md border bg-background px-2 py-1 text-sm'

export function 시각고르개({ 칸들, 남의칸들, onChange }: {
  칸들: 시각칸[]
  남의칸들: 남의칸[]
  onChange: (새칸들: 시각칸[]) => void
}) {
  if (!칸들.length) {
    return (
      <div className="text-sm text-muted-foreground">
        선택한 시각이 없습니다 — <b>＋ 시각 추가</b> 를 눌러 주세요
      </div>
    )
  }
  // 값만 바꾼 새 배열을 준다 — 있던 것을 고치지 않는다
  const 고치기 = (i: number, 조각: Partial<시각칸>) =>
    onChange(칸들.map((칸, j) => (i === j ? { ...칸, ...조각 } : 칸)))

  return (
    <div className="flex flex-col gap-1.5">
      {칸들.map((칸, i) => {
        const 겹침 = 겹치는계정(칸, 남의칸들)
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <select
              className={칸모양 + (겹침.length ? ' border-destructive text-destructive' : '')}
              value={칸.시}
              aria-label="시"
              onChange={(e) => 고치기(i, { 시: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{이틀(h)}시</option>)}
            </select>
            <select
              className={칸모양 + (겹침.length ? ' border-destructive text-destructive' : '')}
              value={칸.분}
              aria-label="분"
              onChange={(e) => 고치기(i, { 분: Number(e.target.value) })}
            >
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{이틀(m)}분</option>)}
            </select>
            <button
              type="button"
              title="빼기"
              aria-label="이 시각 빼기"
              className="grid size-7 place-items-center rounded-md border text-sm hover:bg-muted"
              onClick={() => onChange(칸들.filter((_, j) => j !== i))}
            >
              ✕
            </button>
            {겹침.length > 0 && (
              <span className="text-[0.82rem] font-semibold text-destructive">
                {겹침.join(', ') + 와과(겹침[겹침.length - 1])} 겹칩니다
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
