// POST /persona-sample — 옛 설정화면.mjs 1080줄 그대로. 말투 파일은 안 건드리고 화면 값으로만 돈다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 말투샘플 } = await 엔진('화면엔진')
  return 응답(await 말투샘플(r.계정, b))
})
