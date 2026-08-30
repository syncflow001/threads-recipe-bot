// POST /schedule/auto — 발행격자() 의 남들 칸을 피해 자동배정() 으로 이 계정 칸을 나눠 준다.
// 켜지는 않는다 — 시각표켜기() 는 사용자가 「자동 발행 켜기」를 눌러야 부른다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 발행격자 } = await 엔진('대시보드')
  const { 자동배정 } = await 엔진('시각배정')
  const { 남들 } = await 발행격자(r.계정)
  return 응답(자동배정({ 남들, 이미: b.이미 ?? [] }))
})
