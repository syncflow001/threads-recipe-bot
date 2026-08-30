// POST /archive-drop — 옛 설정화면.mjs 848~854줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 안됨, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const code = String(b.code ?? '')
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(code)) return 안됨('이름이 이상합니다')
  const { 빼기: 보관함빼기, 보관함길 } = await 엔진('보관함')
  await 보관함빼기([code], { 파일: 보관함길(r.계정) })
  return 응답({ 됨: true })
})
