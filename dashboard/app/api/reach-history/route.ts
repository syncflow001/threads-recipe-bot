// GET /reach-history — 매일 아침 감시기가 쌓은 도달 이력에서 그 계정 최근 14일을 준다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 도달추이 } = await 엔진('화면엔진')
  return 응답(await 도달추이(r.계정))
})
