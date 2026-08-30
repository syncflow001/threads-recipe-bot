'use client'
// 짧은 알림 한 줄 — 빈 글이면 안 그린다(옛 .알림)
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function 알림줄({ 글, 종류 }: { 글?: ReactNode; 종류?: '좋음' | '나쁨' }) {
  if (!글) return null
  return (
    <div className={cn(
      'mt-3 min-h-[1.1rem] text-[0.86rem] font-semibold',
      종류 === '좋음' && 'text-green-600',
      종류 === '나쁨' && 'text-destructive',
    )}>
      {글}
    </div>
  )
}
