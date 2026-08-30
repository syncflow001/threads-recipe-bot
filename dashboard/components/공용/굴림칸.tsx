'use client'
// 표를 담아 세로로만 굴리는 칸 — 머리글줄은 붙박이(옛 .굴림칸)
import type { ReactNode } from 'react'

export function 굴림칸({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-[34rem] overflow-auto [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:bg-card">
      {children}
    </div>
  )
}
