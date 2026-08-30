'use client'
// 「판매된 상품」 카드 — 최근 30일 주문 목록을 표로(신규, TanStack Table). /orders?days=30
import { useMemo, useState } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  createColumnHelper, type SortingState,
} from '@tanstack/react-table'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'
import { use자료 } from '@/lib/hooks'
import { 돈 } from '@/lib/글자'

type 주문 = {
  날짜: string
  주문번호: string
  상품번호: string
  상품명: string
  수량: number
  거래액: number
  수수료: number
  수수료율: number
  분류: string
  꼬리표: string
}
type 자료꼴 = {
  것들: 주문[]
  합?: { 건수: number; 수량: number; 거래액: number; 수수료: number }
  기간?: { 시작: string; 끝: string }
  안됨?: string
}

const 도우미 = createColumnHelper<주문>()
const 열들 = [
  도우미.accessor('날짜', { header: '날짜' }),
  도우미.accessor('상품명', { header: '상품명' }),
  도우미.accessor('수량', { header: '수량', cell: (c) => c.getValue().toLocaleString('ko-KR') }),
  도우미.accessor('거래액', { header: '거래액', cell: (c) => 돈(c.getValue()) }),
  도우미.accessor('수수료', { header: '수수료', cell: (c) => 돈(c.getValue()) }),
  도우미.accessor('분류', { header: '분류' }),
]

export function 판매된상품() {
  const 자료 = use자료<자료꼴>('/orders?days=30')
  const r = 자료.data
  const [검색, 검색담기] = useState('')
  const [정렬, 정렬담기] = useState<SortingState>([{ id: '날짜', desc: true }])

  const 것들 = useMemo(() => {
    const 전체 = r?.것들 ?? []
    const 낱말 = 검색.trim()
    return 낱말 ? 전체.filter((o) => o.상품명.includes(낱말)) : 전체
  }, [r, 검색])

  // 걸러진 표와 합계가 같아야 한다 — 검색으로 줄어든 행이면 합계도 그 행들로만 다시 센다
  const 걸러진합 = useMemo(() => 것들.reduce((합, o) => ({
    건수: 합.건수 + 1,
    수량: 합.수량 + o.수량,
    거래액: 합.거래액 + o.거래액,
    수수료: 합.수수료 + o.수수료,
  }), { 건수: 0, 수량: 0, 거래액: 0, 수수료: 0 }), [것들])

  const 표 = useReactTable({
    data: 것들,
    columns: 열들,
    state: { sorting: 정렬 },
    onSortingChange: 정렬담기,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const 에러글 = 자료.error ? (자료.error as Error).message : undefined
  const 안됨 = 에러글 ?? r?.안됨
  const 합 = r?.합 ?? { 건수: 0, 수량: 0, 거래액: 0, 수수료: 0 }

  return (
    <카드 제목="판매된 상품" 넓게
      꼬리={r ? <span className="text-sm text-muted-foreground">최근 30일 · {합.건수.toLocaleString('ko-KR')}건</span> : undefined}>
      <귀띔>쿠팡이 알려 주는 주문 건별 목록이에요. <b>어느 글에서 팔렸는지는 알 수 없어요</b> — 쿠팡이 꼬리표(SubID)를 빈 값으로 돌려주기 때문입니다.</귀띔>
      {안됨 ? (
        <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm">쿠팡 실적을 못 받았습니다 — {안됨}</div>
      ) : !r ? (
        <div className="py-6 text-center text-sm text-muted-foreground">읽는 중...</div>
      ) : !r.것들.length ? (
        <div className="py-6 text-center text-sm text-muted-foreground">최근 30일에 팔린 상품이 없어요.</div>
      ) : (
        <>
          <input
            value={검색}
            onChange={(e) => 검색담기(e.target.value)}
            placeholder="상품명으로 찾기"
            className="mb-3 w-full max-w-xs rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <굴림칸>
            <table className="w-full text-sm">
              <thead>
                {표.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id}
                        className="cursor-pointer select-none whitespace-nowrap px-2 py-1.5 text-left font-medium"
                        onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {표.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#f1f2f4]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-2 py-1.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </굴림칸>
          <div className="mt-3 text-sm text-muted-foreground">
            합계 — 건수 {걸러진합.건수.toLocaleString('ko-KR')} · 수량 {걸러진합.수량.toLocaleString('ko-KR')} · 거래액 {돈(걸러진합.거래액)} · 수수료 {돈(걸러진합.수수료)}
          </div>
        </>
      )}
    </카드>
  )
}
