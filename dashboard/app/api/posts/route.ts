// GET /posts — 옛 설정화면.mjs 778줄 그대로. 개수 인자(1~200, 기본 20)로 가져올 글 수를 정한다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const 개수 = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('개수')) || 20))
  const { 최근글 } = await 엔진('대시보드')
  return 응답(await 최근글(r.계정, { 개수 }))
})
