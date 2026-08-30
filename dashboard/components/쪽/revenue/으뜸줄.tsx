'use client'
// 수익 쪽 으뜸줄 5칸 — 이번 달 번 돈(고리)·이 속도면 이번 달·이번 달 거래액·이번 달 클릭·이번 달 주문
// "오늘 번 돈"은 일부러 안 넣는다 — 쿠팡은 어제 벌이를 오늘 오후에야 채워 줘서 오늘 칸은 늘 0 이다 (옛 1346~1348)
import { 으뜸칸, 배지칸, 칼들 } from '@/components/공용/으뜸칸'
import { 돈 } from '@/lib/글자'

type 수익요약 = {
  이번달?: number
  클릭?: number
  주문?: number
  거래액?: number
  안됨?: string
  달성?: { 비율: number } | null
  속도?: { 이대로면: number } | null
}

export function 으뜸줄({ 자료 }: { 자료?: 수익요약 }) {
  const r = 자료 ?? {}
  const ㄷ = r.달성
  const ㅅ = r.속도
  return (
    <div className="grid grid-cols-1 gap-2.5 min-[601px]:grid-cols-2 sm:grid-cols-[1.25fr_1.25fr_1.25fr_1fr_1fr] sm:gap-3">
      <으뜸칸 찬비율={ㄷ ? ㄷ.비율 / 100 : 0} 큰글={돈(r.이번달 ?? 0)} 작은글="이번 달 번 돈"
        멈춤={!!r.안됨 || !ㄷ} 고리속={ㄷ ? Math.round(ㄷ.비율) + '%' : null} 크게 />
      <배지칸 칼={칼들.추세} 큰글={ㅅ ? 돈(ㅅ.이대로면) : '—'} 작은글="이 속도면 이번 달" 크게 />
      <배지칸 칼={칼들.영수증} 큰글={돈(r.거래액 ?? 0)} 작은글="이번 달 거래액" 크게 />
      <배지칸 칼={칼들.클릭} 큰글={Number(r.클릭 ?? 0).toLocaleString('ko-KR')} 작은글="이번 달 클릭" 크게 />
      <배지칸 칼={칼들.장바구니} 큰글={Number(r.주문 ?? 0).toLocaleString('ko-KR')} 작은글="이번 달 주문" 크게 />
    </div>
  )
}
