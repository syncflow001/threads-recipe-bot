'use client'
// 세팅 쪽 — 계정 · 열쇠 · 텔레그램 알림 · 발행 시각 네 카드(옛 세팅 쪽 989~999 · 653~687 · 712~724)
// + 맨 아래 터미널 하나. 「자동발급」 단추가 이 터미널에서 돌아 한 자리에서 끝난다 (2026-08-30)
import { useEffect, useState } from 'react'
import { 카드 } from '@/components/공용/카드'
import { 계정 } from '@/components/쪽/settings/계정'
import { 열쇠 } from '@/components/쪽/settings/열쇠'
import { 텔레그램 } from '@/components/쪽/settings/텔레그램'
import { 발행시각 } from '@/components/쪽/settings/발행시각'
import { 터미널판 } from '@/components/쪽/admin/터미널판'
import { 터미널명령이름 } from '@/lib/터미널명령'
import { 부르기 } from '@/lib/api'

export default function 설정() {
  const [열린것, 열린것담기] = useState<number[] | null>(null)
  const [명령, 명령담기] = useState<{ 글: string; 표: number } | null>(null)

  useEffect(() => {
    부르기<{ 열린것: number[] }>('/term/check', null)
      .then((r) => 열린것담기(r.열린것 ?? []))
      .catch(() => 열린것담기([]))
    // 같은 명령을 다시 눌러도 돌아야 한다 — 번호를 하나씩 올려 구분한다
    const 받기 = (e: Event) =>
      명령담기((v) => ({ 글: (e as CustomEvent<string>).detail, 표: (v?.표 ?? 0) + 1 }))
    window.addEventListener(터미널명령이름, 받기)
    return () => window.removeEventListener(터미널명령이름, 받기)
  }, [])

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">설정</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <계정 />
        <텔레그램 />
        <발행시각 />
        <열쇠 />
      </div>
      <div className="mt-4">
        <카드 제목="터미널" 넓게>
          {열린것 === null
            ? <p className="text-sm text-muted-foreground">여는 중…</p>
            : <터미널판 처음창들={열린것} 명령={명령?.글 ?? null} 명령표={명령?.표 ?? 0} />}
        </카드>
      </div>
    </>
  )
}
