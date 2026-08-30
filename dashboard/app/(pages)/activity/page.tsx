'use client'
// 활동 쪽 — 팔로워 찾기·언어 길들이기·하트 댓글·활동 기록 네 카드(옛 활동 쪽, HTML 731~819)
import { useEffect, useRef, useState } from 'react'
import { use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 활동설명 } from '@/components/쪽/activity/활동설명'
import { 팔로워찾기 } from '@/components/쪽/activity/팔로워찾기'
import { 언어길들이기 } from '@/components/쪽/activity/언어길들이기'
import { 하트댓글 } from '@/components/쪽/activity/하트댓글'
import { 활동기록 } from '@/components/쪽/activity/활동기록'
import type { 조절항목 } from '@/components/쪽/activity/세밀조정'

type 활동설정자료 = { 차림: 조절항목[]; 값: Record<string, number> }
type 태임자료 = { 언어: string; 켜짐: boolean; 간격시간: number; 기본간격: number; 최근: any[] }
type 상태자료 = { 팔로우몫?: { 한판: number; 하루: number } }

export default function 활동() {
  const tame = use자료<태임자료>('/tame')
  const 설정 = use자료<활동설정자료>('/activity-settings')
  const 상태 = use자료<상태자료>('/status')

  // 활동값은 옛 화면의 전역 변수 활동값을 대신한다 — 세밀조정·완전자동 스위치가 함께 쓴다
  const [값, 값담기] = useState<Record<string, number> | null>(null)
  useEffect(() => { if (설정.data) 값담기(설정.data.값) }, [설정.data])

  // 슬라이더는 손을 뗀 뒤 600ms 있다 한 번만 저장한다(옛 활동값저장예약 2098~2103)
  const 타이머 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const 최근값 = useRef<Record<string, number> | null>(null)
  // 타이머 예약·ref 갱신은 부작용이라 값담기 의 업데이터 함수 밖에서 한다 — 그 함수는 순수해야 한다
  const 저장예약 = (키: string, v: number) => {
    const 새값 = { ...(최근값.current ?? 값 ?? {}), [키]: v }
    최근값.current = 새값
    값담기(새값)
    if (타이머.current) clearTimeout(타이머.current)
    타이머.current = setTimeout(async () => {
      try { const r = await 부르기<{ 값: Record<string, number> }>('/activity-settings-save', { 값: 최근값.current }); 값담기(r.값) } catch {}
    }, 600)
  }
  const 즉시저장 = async (새값: Record<string, number>) => {
    if (타이머.current) clearTimeout(타이머.current)
    const r = await 부르기<{ 값: Record<string, number> }>('/activity-settings-save', { 값: 새값 })
    값담기(r.값)
    return r.값
  }

  if (!값 || !설정.data) {
    return (
      <>
        <h1 className="mb-4 text-xl font-semibold">활동</h1>
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </>
    )
  }

  const 팔로우한판 = 상태.data?.팔로우몫?.한판 ?? 3
  const 팔로우하루 = 상태.data?.팔로우몫?.하루 ?? 10

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">활동</h1>
      <활동설명 tame={tame.data} />
      <div className="grid gap-4 md:grid-cols-2">
        <팔로워찾기 차림={설정.data.차림} 값={값} onChange={저장예약} 즉시저장={즉시저장} />
        <언어길들이기 tame={tame.data} 차림={설정.data.차림} 값={값} onChange={저장예약} 즉시저장={즉시저장} />
        <하트댓글
          언어={tame.data?.언어} 차림={설정.data.차림} 값={값} onChange={저장예약} 즉시저장={즉시저장}
          팔로우한판={팔로우한판} 팔로우하루={팔로우하루}
        />
        <활동기록 />
      </div>
    </>
  )
}
