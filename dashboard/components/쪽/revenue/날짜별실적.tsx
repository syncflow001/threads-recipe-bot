'use client'
// 「날짜별 실적」 카드 — 숫자줄·범례·SVG 차트·경고(옛 HTML 866~885, JS 1334~1411 · 1416~1517)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 숫자줄 } from '@/components/공용/숫자줄'
import { 실적그림 } from '@/components/차트/실적그림'
import { 돈 } from '@/lib/글자'

const 경고칸 = 'rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm mt-3'

type 하루치 = { 날짜: string; 수수료: number; 클릭: number; 주문: number; 거래액: number; 취소: number }
type 자료꼴 = {
  기간합?: { 수수료: number; 클릭: number; 주문: number; 거래액: number; 취소: number }
  최근?: 하루치[]
  안됨?: string
  계정별가능?: boolean
}

export function 날짜별실적({ 날수, 날수바꿈, 자료, 에러 }: {
  날수: string
  날수바꿈: (v: string) => void
  자료?: 자료꼴
  에러?: unknown
}) {
  const ㄱ = 자료?.기간합 ?? { 수수료: 0, 클릭: 0, 주문: 0, 거래액: 0, 취소: 0 }
  const 다 = 자료?.최근 ?? []
  const 안됨 = 에러 ? (에러 as Error).message : 자료?.안됨

  return (
    <카드 제목="날짜별 실적" 넓게
      꼬리={
        <Select value={날수} items={{ '14': '최근 14일', '30': '최근 30일', '90': '최근 90일', '180': '최근 180일' }}
          onValueChange={(v) => v && 날수바꿈(v)}>
          <SelectTrigger className="w-auto min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="14">최근 14일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="90">최근 90일</SelectItem>
            <SelectItem value="180">최근 180일</SelectItem>
          </SelectContent>
        </Select>
      }>
      <귀띔>막대는 <b>수익</b>, 선은 <b>클릭</b>이에요. 단위가 달라서 축을 좌우로 나눴습니다.
        막대나 점에 마우스를 올리면 그날 숫자가 나와요.</귀띔>
      <숫자줄 항목={[
        { 이름: '이 기간 수수료', 값: 돈(ㄱ.수수료 ?? 0) },
        { 이름: '클릭', 값: Number(ㄱ.클릭 ?? 0).toLocaleString('ko-KR') },
        { 이름: '주문', 값: Number(ㄱ.주문 ?? 0).toLocaleString('ko-KR') },
        { 이름: '거래액', 값: 돈(ㄱ.거래액 ?? 0) },
        { 이름: '취소', 값: Number(ㄱ.취소 ?? 0).toLocaleString('ko-KR') },
      ]} />
      <div className="mb-3 flex items-center justify-center gap-4 text-[0.82rem]">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-[12px] w-[10px] rounded-sm not-italic" style={{ background: '#c2410c' }} />수익 (오른쪽 축)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-[14px] rounded-sm not-italic" style={{ background: '#2f9e74' }} />클릭 (왼쪽 축)
        </span>
      </div>
      {다.length ? <실적그림 자료={다} /> : <div className="py-6 text-center text-sm text-muted-foreground">보여 줄 날짜가 없어요.</div>}
      {안됨
        ? <div className={경고칸}>쿠팡 실적을 못 받았습니다 — {안됨}</div>
        : (자료?.계정별가능 ? null : (
          <div className={경고칸}>
            쿠팡이 꼬리표(SubID)를 빈 값으로 돌려줘서 <b>계정별로는 안 갈립니다.</b> 이 숫자는 쿠팡 계정 전체 실적이에요.
          </div>
        ))}
    </카드>
  )
}
