'use client'
// 수익 현황 카드 — 개요용 7일/30일 토글(옛개요목록 §C, 「날짜별 실적」 카드의 축약판)
import { useState } from 'react'
import { 카드 } from '@/components/공용/카드'
import { 숫자줄 } from '@/components/공용/숫자줄'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 실적그림 } from '@/components/차트/실적그림'
import { use자료 } from '@/lib/hooks'
import { 돈 } from '@/lib/글자'

type 하루치 = { 날짜: string; 수수료: number; 클릭: number; 주문: number; 거래액: number; 취소: number }
type 자료꼴 = {
  기간합?: { 수수료: number; 클릭: number; 주문: number; 거래액: number }
  최근?: 하루치[]
  안됨?: string
}

export function 수익현황() {
  const [날수, 날수담기] = useState('7')
  const { data: 자료, error } = use자료<자료꼴>(`/revenue-detail?days=${날수}`)
  const ㄱ = 자료?.기간합 ?? { 수수료: 0, 클릭: 0, 주문: 0, 거래액: 0 }
  const 최근 = 자료?.최근 ?? []
  const 안됨 = error ? (error as Error).message : 자료?.안됨

  return (
    <카드 제목="수익 현황" 넓게
      꼬리={
        <Tabs value={날수} onValueChange={(v) => v && 날수담기(String(v))}>
          <TabsList>
            <TabsTrigger value="7">7일</TabsTrigger>
            <TabsTrigger value="30">30일</TabsTrigger>
          </TabsList>
        </Tabs>
      }>
      <숫자줄 항목={[
        { 이름: '이 기간 수수료', 값: 돈(ㄱ.수수료 ?? 0) },
        { 이름: '클릭', 값: Number(ㄱ.클릭 ?? 0).toLocaleString('ko-KR') },
        { 이름: '주문', 값: Number(ㄱ.주문 ?? 0).toLocaleString('ko-KR') },
        { 이름: '거래액', 값: 돈(ㄱ.거래액 ?? 0) },
      ]} />
      {최근.length
        ? <실적그림 자료={최근} />
        : <div className="py-6 text-center text-sm text-muted-foreground">보여 줄 날짜가 없어요.</div>}
      {안됨 && (
        <div className="mt-3 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm">
          쿠팡 실적을 못 받았습니다 — {안됨}
        </div>
      )}
    </카드>
  )
}
