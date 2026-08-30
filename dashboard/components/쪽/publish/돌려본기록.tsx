'use client'
// 돌려 본 기록 카드 — 실행 로그를 보여 준다(옛 HTML 833~836)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 기록칸 } from '@/components/공용/기록칸'

export function 돌려본기록({ 실행중, onDone }: { 실행중: boolean; onDone: () => void }) {
  return (
    <카드 제목="돌려 본 기록">
      <귀띔>왼쪽 <b>빠른 실행</b>을 누르면 여기에 한 줄씩 찍혀요.</귀띔>
      <기록칸 켜짐={실행중} onDone={onDone} 초기글="아직 돌린 게 없어요." />
    </카드>
  )
}
