// GET /api/term/check — 열린 창을 알려 준다. 터미널은 2026-08-30 부터 늘 열려 있다(비밀번호 없음)
import { type NextRequest } from 'next/server'
import { 응답, 감싸기 } from '@/lib/길'
import { 엔진 } from '@/lib/엔진'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async (_req: NextRequest) => {
  // 문은 대시보드 열쇠말 하나뿐이다 — 여기까지 왔으면 이미 지난 것이다 (2026-08-30)
  const { 열린창들 } = await 엔진('설정화면-터미널')
  const res = 응답({ 통과: true, 열린것: 열린창들() })
  res.headers.set('Cache-Control', 'no-store')
  return res
})
