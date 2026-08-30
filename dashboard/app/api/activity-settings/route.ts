// GET /activity-settings — 옛 설정화면.mjs 923~926줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 정보 } = await 엔진('계정')
  const { 차림: 활동차림, 다듬기: 활동다듬기 } = await 엔진('활동설정')
  const 그정보 = await 정보(r.계정)
  return 응답({ 차림: 활동차림, 값: 활동다듬기(그정보.활동설정) })
})
