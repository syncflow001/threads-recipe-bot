'use client'
// /progress 를 1.5초마다 물어 돌이·경과초·단계·중단 단추를 그린다(옛 진행그리기 3022~3047)
import { useEffect, useRef } from 'react'
import { use폴링 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 진행자료 = {
  도는중: boolean
  무엇?: string
  계정?: string
  멈춤?: boolean
  지난초?: number
  단계?: string
  단계수?: number
}

export function 진행칸({ 켜짐, 무엇, onDone, 중단없이 }: { 켜짐: boolean; 무엇: string; onDone?: () => void; 중단없이?: boolean }) {
  const 자료 = use폴링<진행자료>('/progress', 1500, 켜짐)
  const 끝난것알림 = useRef(false)

  useEffect(() => {
    if (!켜짐) { 끝난것알림.current = false; return }
    if (자료 && !자료.도는중 && !끝난것알림.current) {
      끝난것알림.current = true
      onDone?.()
    }
  }, [자료, 켜짐, onDone])

  if (!켜짐) return null
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <b>{무엇}</b>
      {자료?.지난초 ? <span>· {자료.지난초}초</span> : null}
      {!중단없이 && (
        <button
          type="button"
          className="rounded-md border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-1.5 py-0.5 text-xs font-semibold"
          onClick={() => 부르기('/progress-stop', {})}
        >
          중단
        </button>
      )}
      {자료?.단계 && (
        <span className="block w-full text-xs text-muted-foreground">
          {(!중단없이 && 자료.멈춤 ? '중단하는 중 — ' : '') + 자료.단계}
        </span>
      )}
    </span>
  )
}
