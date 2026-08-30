// GET /activity-draft — 옛 설정화면.mjs 780~785줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 초안읽기: 교류초안읽기 } = await 엔진('교류하기')
  const { 초안읽기: 답하기초안읽기 } = await 엔진('답하기')
  const { 초안읽기: 팔로우초안읽기 } = await 엔진('팔로우하기')
  return 응답({
    하트댓글: await 교류초안읽기(r.계정),
    답하기: await 답하기초안읽기(r.계정),
    팔로우: await 팔로우초안읽기(r.계정),
  })
})
