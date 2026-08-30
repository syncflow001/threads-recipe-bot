'use client'
// 「요일별」 카드 — 하루평균수수료 비례 막대(옛 HTML 894~899, JS 1380~1389)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 돈 } from '@/lib/글자'

type 요일자료 = { 이름: string; 날수: number; 하루평균수수료?: number | null }
type 자료꼴 = { 요일?: 요일자료[] | null }

export function 요일별({ 자료 }: { 자료?: 자료꼴 }) {
  const ㅇ = 자료?.요일 ?? []
  const 최대평균 = Math.max(1, ...ㅇ.map((x) => x.하루평균수수료 ?? 0))
  const 비었나 = !ㅇ.length || 최대평균 <= 1

  return (
    <카드 제목="요일별">
      <귀띔>어느 요일이 잘 되는지예요. 날수가 달라서 <b>하루 평균</b>으로 맞췄습니다.
        발행 시각을 정할 때 참고하세요.</귀띔>
      {비었나 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">아직 요일을 가를 만큼 벌이가 없어요.</div>
      ) : (
        <div className="space-y-1.5">
          {ㅇ.map((x) => (
            <div key={x.이름} className="grid grid-cols-[1.4rem_minmax(0,1fr)_auto] items-center gap-2">
              <span className="text-center text-sm font-bold">{x.이름}</span>
              <span className="block h-[9px] overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full"
                  style={{ width: Math.round(((x.하루평균수수료 ?? 0) / 최대평균) * 100) + '%', background: '#c2410c' }} />
              </span>
              <span className="whitespace-nowrap text-[0.78rem] tabular-nums text-muted-foreground">
                {x.날수 ? 돈(x.하루평균수수료 ?? 0) + ' / 일' : '기록 없음'}
              </span>
            </div>
          ))}
        </div>
      )}
    </카드>
  )
}
