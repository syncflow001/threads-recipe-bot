// GET /inspect-log — 그 계정의 점검 이력, 최신순 200줄(옛 /watchdog 을 본떴다)
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 점검이력 } = await 엔진('화면엔진')
  return 응답({ 이력: await 점검이력(r.계정) })
})
