// POST /stop — 옛 설정화면.mjs 1189줄 그대로. 도는 스크립트를 강제 종료한다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 상태통 } = await 엔진('화면엔진')
  상태통.도는중?.아이?.kill('SIGTERM')
  return 응답({ 멈춤: true })
})
