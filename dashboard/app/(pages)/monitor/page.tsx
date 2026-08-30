'use client'
// 모니터링 쪽 — 헬스체크·조회수 알리미·점검 셋(옛 감시 쪽, HTML 1077~1118, JS 3245~3327 + 점검은 과제 6 고침). 계정을 안 가린다
import { use자료 } from '@/lib/hooks'
import { 헬스체크 } from '@/components/쪽/monitor/헬스체크'
import { 조회수알리미 } from '@/components/쪽/monitor/조회수알리미'
import { 점검 } from '@/components/쪽/monitor/점검'

export type 감시자료 = {
  헬스체크: { 켜짐: boolean; 간격시간: number; 마지막: { 때: string; 계정수: number; 탈: string[] } | null }
  알리미: {
    켜짐: boolean; 간격분: number; 문턱: number; 며칠: number
    마지막: {
      때: string
      판들: { 계정?: string; 안됨?: string; 본글?: number }[]
      알린것: { 별칭?: string; 계정?: string; 이름: string; 성적?: { 조회수?: number } }[]
    } | null
  }
  텔레그램있나: boolean
}

export default function 모니터링() {
  const 감시 = use자료<감시자료>('/watchdog', { 계정무관: true })
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">모니터링</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <헬스체크 자료={감시.data} 에러={감시.error} 다시읽기={() => 감시.refetch()} />
        <조회수알리미 자료={감시.data} 에러={감시.error} 다시읽기={() => 감시.refetch()} />
        <점검 />
      </div>
    </>
  )
}
