// POST /progress-stop — 옛 설정화면.mjs 1191~1194줄 그대로. 다음 고리에서 멈춘다 — 즉시가 아니다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 계정칸 } = await 엔진('화면엔진')
  const 칸 = 계정칸(r.계정)
  if (칸.진행) 칸.진행.멈춤 = true
  return 응답({ 멈춤: !!칸.진행 })
})
