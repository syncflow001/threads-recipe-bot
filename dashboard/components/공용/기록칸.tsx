'use client'
// /log 를 1초마다 물어 실행 로그를 그대로 보여준다(옛 보기시작 3376~3398)
import { useEffect, useRef } from 'react'
import { use폴링 } from '@/lib/hooks'

type 기록자료 = { 도는중: boolean; 글?: string }

export function 기록칸({ 켜짐, onDone, 초기글 = '기다리는 중...' }: {
  켜짐: boolean
  onDone?: () => void
  초기글?: string
}) {
  const 자료 = use폴링<기록자료>('/log', 1000, 켜짐)
  const 끝난것알림 = useRef(false)

  useEffect(() => {
    if (!켜짐) { 끝난것알림.current = false; return }
    if (자료 && !자료.도는중 && !끝난것알림.current) {
      끝난것알림.current = true
      onDone?.()
    }
  }, [자료, 켜짐, onDone])

  return (
    <pre className="max-h-[20rem] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
      {자료?.글 || 초기글}
    </pre>
  )
}
