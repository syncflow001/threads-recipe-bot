'use client'
// 수익 쪽 — 채널줄·으뜸줄·이번 달 목표·날짜별 실적·돈이 되는 길목·요일별·달마다·걸어 둔 상품
// (옛 수익 쪽, HTML 846~919, JS 1282~1537)
// 2026-08-30 — 맨 위에 **어느 제휴 채널의 숫자인지**를 붙였다. 계정을 바꿔도 화면이 똑같아
// 보고 있는 숫자가 누구 것인지 알 길이 없었다. 「없음」 계정은 쿠팡 숫자를 그대로 본다
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
import { 채널줄 } from '@/components/쪽/revenue/채널줄'

export default function 수익() {
  const [날수, 날수담기] = useState('30')
  const 다시그리기 = use다시그리기()
  const 자료 = use자료<any>(`/revenue-detail?days=${날수}`)
  // 채널 이름은 계정 정보에서 온다. /status 는 옆바가 이미 부르는 길이라 새로 만들지 않았다
  const 상태 = use자료<any>('/status')
  // 옛 화면의 `.catch((e) => ({ 안됨: e.message }))` 를 그대로 옮긴다 — 아예 못 받았을 때도
  // 「쿠팡 실적을 못 받았다」와 같은 모양으로 아래 칸들이 알아서 빈 상태를 그리게 한다
  const r = 자료.data ?? (자료.error ? { 안됨: (자료.error as Error).message } : undefined)

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">수익</h1>
      <채널줄 정보={상태.data?.수익채널} />
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
