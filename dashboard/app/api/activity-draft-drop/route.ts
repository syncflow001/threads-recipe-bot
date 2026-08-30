// POST /activity-draft-drop — 옛 설정화면.mjs 1162~1168줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 안됨, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  if (b.무엇 === '하트댓글') { const { 초안버리기 } = await 엔진('교류하기'); await 초안버리기(r.계정) }
  else if (b.무엇 === '답하기') { const { 초안버리기 } = await 엔진('답하기'); await 초안버리기(r.계정) }
  else if (b.무엇 === '팔로우') { const { 초안버리기 } = await 엔진('팔로우하기'); await 초안버리기(r.계정) }
  else return 안됨('모르는 활동입니다', 400)
  return 응답({ 됨: true })
})
