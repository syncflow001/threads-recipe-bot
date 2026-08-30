'use client'
// 접히지 않는 설명 상자(옛 .속내) — 회색 판 위에 굵은 머리말과 설명을 얹는다
import type { ReactNode } from 'react'

export function 속내({ 머리, children }: { 머리: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/40 px-3.5 py-3 text-sm">
      <b className="mb-1 block text-[0.78rem] font-extrabold tracking-wide">{머리}</b>
      {children}
    </div>
  )
}
