// POST /api/term/input { 번호, 글 } — 창에 키 입력 (설정화면.mjs 664~700, account-agnostic)
import { type NextRequest } from 'next/server'
import { 응답, 몸통, 감싸기 } from '@/lib/길'
import { 통행증확인 } from '@/lib/터미널'
import { 엔진 } from '@/lib/엔진'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = 감싸기(async (req: NextRequest) => {
  const 문 = await 통행증확인(req)
  if (문 instanceof Response) return 문
  const { 창입력 } = await 엔진('설정화면-터미널')
  const b = await 몸통(req)
  const 답 = 창입력(Number(b.번호), b.글)
  return 응답(답, 답.안됨 ? 400 : 200)
})
