'use client'
// 발행 현황 카드 — 개요용 최근 일주일 격자(옛 HTML 699~708, 격자그리기() 2309~2338)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'
import { 발행격자, type 발행격자자료 } from '@/components/공용/발행격자'

export function 발행현황({ 자료, 에러 }: { 자료?: 발행격자자료; 에러?: unknown }) {
  const 비었나 = 에러 || !(자료?.시각들 ?? []).length

  return (
    <카드 제목="발행 현황">
      <귀띔>정해 둔 시각마다 한 편씩 올라가요. 최근 일주일치입니다.</귀띔>
      {비었나 ? (
        <p className="text-sm text-muted-foreground">
          이 계정은 자동 발행이 꺼져 있습니다.<br />
          켜는 법은 사용법 문서 10-1·10-2절에 있습니다. 그전에도 왼쪽 <b>빠른 실행</b> 으로 올릴 수 있습니다.
        </p>
      ) : (
        <굴림칸><발행격자 자료={자료!} /></굴림칸>
      )}
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
