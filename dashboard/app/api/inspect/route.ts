// GET /inspect — 그 계정의 열린 문제와 점검 예약 상태(옛 /watchdog 을 본떴다)
import { stat } from 'node:fs/promises'
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 점검문제들 } = await 엔진('화면엔진')
  const { 점검찾기 } = await 엔진('대시보드')
  const { 상태길 } = await 엔진('점검기록')
  const [문제들, 시각표, 상태통계] = await Promise.all([
    점검문제들(r.계정), 점검찾기(), stat(상태길(뿌리())).catch(() => null),
  ])
  return 응답({
    문제들, 켜짐: !!시각표, 간격분: 시각표 ? Math.round(시각표.간격초 / 60) : 30,
    // 점검상태.json 은 한판 이 무슨 일이 있어도 finally 에서 매번 다시 쓴다 — 그 mtime 이 곧 마지막으로 돈 때다
    마지막: 상태통계 ? 상태통계.mtime.toISOString() : null,
  })
})
