'use client'
// 세밀 조정 슬라이더 — 활동설정.mjs 의 차림표를 그대로 그린다. 손을 뗀 뒤 600ms 있다 저장한다(옛 활동설정그리기 2027~2075)
export type 조절항목 = {
  갈래: string
  키: string
  이름: string
  기본: number
  최소: number
  최대: number
  단위: string
  풀이: string
}

export function 세밀조정({ 갈래, 차림, 값, onChange, 즉시저장 }: {
  갈래: string
  차림: 조절항목[]
  값: Record<string, number>
  onChange: (키: string, v: number) => void
  즉시저장: (새값: Record<string, number>) => void
}) {
  const 것들 = 차림.filter((ㅊ) => ㅊ.갈래 === 갈래 && ㅊ.키 !== '완전자동') // 완전자동은 스위치로 그린다
  if (!것들.length) return null

  const 되돌리기 = async () => {
    const 새값 = { ...값 }
    for (const ㅊ of 것들) 새값[ㅊ.키] = ㅊ.기본
    try { await 즉시저장(새값) } catch { /* 실패해도 화면은 그대로 쓴다(옛 활동차림 되돌리기 2073~2075) */ }
  }

  return (
    <div className="mt-3 rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">세밀 조정</span>
        <button type="button" onClick={되돌리기}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2.5 py-1 text-xs font-semibold">
          기본값으로
        </button>
      </div>
      <div className="space-y-3">
        {것들.map((ㅊ) => (
          <div key={ㅊ.키}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <label htmlFor={`ㅎ${ㅊ.키}`}>{ㅊ.이름}</label>
              <span className="tabular-nums font-semibold">{값[ㅊ.키] ?? ㅊ.기본}{ㅊ.단위}</span>
            </div>
            <input
              id={`ㅎ${ㅊ.키}`}
              type="range"
              min={ㅊ.최소}
              max={ㅊ.최대}
              step={1}
              value={값[ㅊ.키] ?? ㅊ.기본}
              onChange={(e) => onChange(ㅊ.키, Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-xs text-muted-foreground">{ㅊ.풀이}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
