'use client'
// role=switch 토글 — 누르는 동안 잠가 중복 클릭을 막는다 (옛 1783·1702·2161·3296 의 공통 패턴)
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function 스위치({ 켜짐, onChange, 잠김, title, 'aria-label': ariaLabel }: {
  켜짐: boolean
  onChange: () => void | Promise<void>
  잠김?: boolean
  title?: string
  'aria-label'?: string
}) {
  const [누르는중, 누르는중담기] = useState(false)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={켜짐}
      aria-label={ariaLabel}
      title={title}
      disabled={잠김 || 누르는중}
      onClick={async () => {
        누르는중담기(true)
        try { await onChange() } finally { 누르는중담기(false) }
      }}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border-0 p-0 transition-colors',
        켜짐 ? 'bg-green-600' : 'bg-muted',
        'disabled:cursor-not-allowed disabled:opacity-45',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        "after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition-transform after:content-['']",
        켜짐 && 'after:translate-x-5',
      )}
    />
  )
}
