// POST /revenue-goal — 옛 설정화면.mjs 1104~1106줄 그대로. 계정마다가 아니라 전체 하나다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  // 옛 서버는 계정 형식을 라우트 분기 전에 이미 검사한다 — 이 길이 계정을 안 써도 검사는 돈다
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 쓰기 } = await 엔진('수익목표')
  return 응답({ 월목표: await 쓰기(b.월목표) })
})
