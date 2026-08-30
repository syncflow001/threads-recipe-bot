'use client'
// 발행 이력 카드 — 격자 + 범례(옛 HTML 1025~1042, JS 2273~2308)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'
import { 발행격자, type 발행격자자료 } from '@/components/공용/발행격자'

export function 발행이력({ 날수, 날수바꿈, 자료, 에러 }: {
  날수: string
  날수바꿈: (v: string) => void
  자료?: 발행격자자료
  에러?: unknown
}) {
  const 비었나 = 에러 || !(자료?.시각들 ?? []).length

  return (
    <카드 제목="발행 이력" 넓게
      꼬리={
        <Select value={날수} items={{ '14': '최근 14일', '30': '최근 30일', '60': '최근 60일' }}
          onValueChange={(v) => v && 날수바꿈(v)}>
          <SelectTrigger className="w-auto min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="14">최근 14일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="60">최근 60일</SelectItem>
          </SelectContent>
        </Select>
      }>
      <귀띔>정해 둔 시각마다 무슨 일이 있었는지예요. 개요에 있는 표와 같은 표시입니다.</귀띔>
      <굴림칸>
        {비었나 ? (
          <table className="w-full text-sm"><tbody>
            <tr><td className="py-6 text-center text-muted-foreground">자동 발행이 꺼져 있어서 남은 이력이 없어요.</td></tr>
          </tbody></table>
        ) : (
          <발행격자 자료={자료!} 첫판날짜자르기 />
        )}
      </굴림칸>
      <div className="mt-3.5 flex flex-wrap gap-[1.1rem] text-[0.78rem] text-muted-foreground">
        <span className="text-green-700">● 올림</span>
        <span className="text-neutral-400">◌ 돌았지만 못 올림</span>
        <span className="text-neutral-400">⏸ 너무 붙어서 건너뜀</span>
        <span className="text-red-700">✕ 실패</span>
        <span>○ 발행 전 · 기록 없음</span>
      </div>
    </카드>
  )
}
