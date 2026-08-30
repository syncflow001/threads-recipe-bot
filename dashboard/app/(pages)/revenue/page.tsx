'use client'
// 수익 쪽 — 으뜸줄·이번 달 목표·날짜별 실적·돈이 되는 길목·요일별·달마다·걸어 둔 상품
// (옛 수익 쪽, HTML 846~919, JS 1282~1537)
import { useState } from 'react'
import { use자료, use다시그리기 } from '@/lib/hooks'
import { 으뜸줄 } from '@/components/쪽/revenue/으뜸줄'
import { 이번달목표 } from '@/components/쪽/revenue/이번달목표'
import { 날짜별실적 } from '@/components/쪽/revenue/날짜별실적'
import { 돈이되는길목 } from '@/components/쪽/revenue/돈이되는길목'
import { 요일별 } from '@/components/쪽/revenue/요일별'
import { 달마다 } from '@/components/쪽/revenue/달마다'
import { 걸어둔상품 } from '@/components/쪽/revenue/걸어둔상품'
import { 판매된상품 } from '@/components/쪽/revenue/판매된상품'

export default function 수익() {
  const [날수, 날수담기] = useState('30')
  const 다시그리기 = use다시그리기()
  const 자료 = use자료<any>(`/revenue-detail?days=${날수}`)
  // 옛 화면의 `.catch((e) => ({ 안됨: e.message }))` 를 그대로 옮긴다 — 아예 못 받았을 때도
  // 「쿠팡 실적을 못 받았다」와 같은 모양으로 아래 칸들이 알아서 빈 상태를 그리게 한다
  const r = 자료.data ?? (자료.error ? { 안됨: (자료.error as Error).message } : undefined)

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">수익</h1>
      <으뜸줄 자료={r} />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <이번달목표 자료={r} 저장후={다시그리기} />
        <날짜별실적 날수={날수} 날수바꿈={날수담기} 자료={r} 에러={자료.error} />
        <돈이되는길목 자료={r} />
        <요일별 자료={r} />
        <달마다 자료={r} />
        <걸어둔상품 />
        <판매된상품 />
      </div>
    </>
  )
}
