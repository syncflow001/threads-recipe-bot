// POST /activity-settings-save — 옛 설정화면.mjs 1107~1111줄 그대로. 차림표 밖 키는 버리고 범위 밖은 잘라 넣는다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 정보쓰기 } = await 엔진('계정')
  const { 다듬기 } = await 엔진('활동설정')
  const 그정보 = await 정보쓰기(r.계정, { 활동설정: 다듬기(b.값) })
  return 응답({ 값: 다듬기(그정보.활동설정) })
})
