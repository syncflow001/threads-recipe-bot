'use client'
// 흰 판 위에 늘어놓는 숫자 타일 줄(옛 #저장소숫자 · #수익숫자 · #기록숫자)
import type { ReactNode } from 'react'

export function 숫자줄({ 항목 }: { 항목: { 이름: ReactNode; 값: ReactNode; 색?: string }[] }) {
  return (
    <div className="my-1 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2.5">
      {항목.map((칸, i) => (
        <div key={i} className="rounded-2xl border bg-muted/40 px-3.5 py-3">
          <b
            className="block text-[1.7rem] leading-[1.15] tracking-[-0.03em] tabular-nums"
            style={칸.색 ? { color: 칸.색 } : undefined}
          >
            {칸.값}
          </b>
          <span className="text-[0.8rem] text-muted-foreground">{칸.이름}</span>
        </div>
      ))}
    </div>
  )
}
