// POST /blocked-drop(=안전길들.blockedDrop) — 옛 설정화면.mjs 1187줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 막힌글지우기 } = await 엔진('화면엔진')
  return 응답(await 막힌글지우기(r.계정, b.code))
})
