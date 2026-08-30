'use client'
// 관리자 도구 쪽 — 터미널 카드(창 넷) · 원격 연결 카드 · 자동 업데이트 카드.
// 터미널 비밀번호는 2026-08-30 에 뗐다 — archive/2026-08-30-터미널-비밀번호/README.md
import { useEffect, useState } from 'react'
import { 카드 } from '@/components/공용/카드'
import { 터미널판 } from '@/components/쪽/admin/터미널판'
import { 원격연결 } from '@/components/쪽/admin/원격연결'
import { 자동업데이트 } from '@/components/쪽/admin/자동업데이트'
import { 대기명령꺼내기 } from '@/lib/대기명령'
import { 부르기 } from '@/lib/api'

export default function 관리자도구() {
  const [열린것, 열린것담기] = useState<number[] | null>(null) // null 이면 아직 서버에 안 물어봤다
  const [명령, 명령담기] = useState<string | null>(null)

  // 서버가 기억하는 열린 창을 받아 온다. 설정 쪽이 남긴 대기명령도 이때 꺼낸다
  useEffect(() => {
    const 쪽지 = 대기명령꺼내기()
    if (쪽지) 명령담기(쪽지)
    부르기<{ 통과: boolean; 열린것: number[] }>('/term/check', null)
      .then((r) => 열린것담기(r.열린것 ?? []))
      .catch(() => 열린것담기([]))  // 못 물어봤어도 창은 연다 — 문은 열쇠말 하나뿐이다
  }, [])

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">관리자 도구</h1>
      <카드 제목="터미널" 넓게>
        {열린것 === null
          ? <p className="text-sm text-muted-foreground">여는 중…</p>
          : <터미널판 처음창들={열린것} 명령={명령} 다닫음={() => 명령담기(null)} />}
      </카드>
      <원격연결 />
      <자동업데이트 />
    </>
  )
}
