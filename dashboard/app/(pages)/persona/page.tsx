'use client'
// 페르소나 쪽 — 말투 · 피드 학습 검색어 두 카드(옛 세팅 쪽 일부, HTML 919~988)
import { 말투 } from '@/components/쪽/persona/말투'
import { 피드학습검색어 } from '@/components/쪽/persona/피드학습검색어'

export default function 페르소나() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">페르소나</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <말투 />
        <피드학습검색어 />
      </div>
    </>
  )
}
