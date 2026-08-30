// GET /log — 옛 설정화면.mjs 1041줄 그대로. 폴링(SSE 아님)
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 상태통, 계정칸 } = await 엔진('화면엔진')
  const 칸 = 계정칸(r.계정)
  return 응답({ 도는중: 상태통.도는중?.계정 === r.계정, 글: 칸.기록.join('') })
})
