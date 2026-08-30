'use client'
// 화면 곳곳이 쓰는 카드 틀 — 제목·꼬리·단추 한 줄(옛 .칸머리)과 귀띔 문단
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function 카드({ 제목, 꼬리, 단추, 넓게, children }: {
  제목: string
  꼬리?: ReactNode
  단추?: ReactNode
  넓게?: boolean
  children?: ReactNode
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-4', 넓게 && 'md:col-span-2')}>
      {단추 || 꼬리 ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-medium">{제목}</h2>
          <div className="flex items-center gap-2">
            {꼬리}
            {단추}
          </div>
        </div>
      ) : (
        <h2 className="mb-2 text-base font-medium">{제목}</h2>
      )}
      {children}
    </section>
  )
}

export function 귀띔({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[0.88rem] text-pretty text-muted-foreground">{children}</p>
}
