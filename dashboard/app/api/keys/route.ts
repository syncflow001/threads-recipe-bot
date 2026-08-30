// POST /keys — 옛 설정화면.mjs 1073~1077줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 열쇠저장, 나를알아내기, 상태 } = await 엔진('화면엔진')
  // 쿠키가 딴 계정 것이면 열쇠저장() 이 던진다 — 감싸기() 가 {안됨} 으로 바꿔 화면에 띄운다
  const 쿠키확인 = await 열쇠저장(r.계정, b)
  const 나 = await 나를알아내기(r.계정) // 토큰이 들어오면 User ID 를 우리가 채운다
  return 응답({ ...(await 상태(r.계정)), 나, 쿠키확인 })
})
