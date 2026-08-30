// GET /schedule — 옛 설정화면.mjs 758~765줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  // 「기록」 쪽은 같은 격자를 더 긴 날수로 본다. 60일까지만 — 그 위는 화면이 못 읽는다
  const 일수 = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 7))
  const { 발행격자 } = await 엔진('대시보드')
  const { 첫판날짜찾기 } = await 엔진('감시모음')
  const 격자 = await 발행격자(r.계정, { 일수 })
  // 계정이 생기기 전 날들을 「못 올림」으로 세면 성공률이 거짓이 된다
  ;(격자 as any).첫판날짜 = await 첫판날짜찾기(r.계정).catch(() => null)
  return 응답(격자)
})
