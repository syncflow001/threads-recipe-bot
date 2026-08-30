'use client'
// 개요 쪽 — 으뜸줄·상태 체크·발행 현황(③) · 수익 현황·최근 글·활동 기록 두 탭(옛 개요 쪽, HTML 688~731)
import { use자료 } from '@/lib/hooks'
import { 으뜸줄, type 팔로워자료, type 수익자료 } from '@/components/쪽/overview/으뜸줄'
import { 상태체크 } from '@/components/쪽/overview/상태체크'
import { 발행현황 } from '@/components/쪽/overview/발행현황'
import { 수익현황 } from '@/components/쪽/overview/수익현황'
import { 최근글 } from '@/components/쪽/overview/최근글'
import { 활동기록탭 } from '@/components/쪽/overview/활동기록탭'
import type { 발행격자자료 } from '@/components/공용/발행격자'

export default function 개요() {
  const 시각표 = use자료<발행격자자료>('/schedule?days=7')
  const 팔로워 = use자료<팔로워자료>('/followers')
  const 수익 = use자료<수익자료>('/revenue')

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">개요</h1>
      <으뜸줄 시각표={시각표.data} 팔로워={팔로워.data} 수익={수익.data} />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <상태체크 />
        <발행현황 자료={시각표.data} 에러={시각표.error} />
        <수익현황 />
        <최근글 />
        <활동기록탭 />
      </div>
    </>
  )
}
