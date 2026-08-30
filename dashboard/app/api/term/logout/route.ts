// POST /api/term/logout — 통행증 버리기 + 창 전부 닫기 (설정화면.mjs 664~700, account-agnostic)
import { type NextRequest } from 'next/server'
import { 응답, 감싸기 } from '@/lib/길'
import { 통행증확인, 통행증쿠키 } from '@/lib/터미널'
import { 엔진 } from '@/lib/엔진'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = 감싸기(async (req: NextRequest) => {
  const 문 = await 통행증확인(req)
  if (문 instanceof Response) return 문
  const { 통행증버리기, 창전부닫기 } = await 엔진('설정화면-터미널')
  창전부닫기()
  통행증버리기(문.통행증)
  const res = 응답({ 통과: false })
  res.cookies.set({ ...통행증쿠키(''), maxAge: 0 })
  return res
})
