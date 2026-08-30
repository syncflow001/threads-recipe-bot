// POST /account — 옛 설정화면.mjs 1178~1180줄 그대로. 계정 이름은 몸통에서 온다 — query 계정과 무관하다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const b = await 몸통(req)
  const { 계정만들기, 상태 } = await 엔진('화면엔진')
  return 응답(await 상태(await 계정만들기(b)))
})
