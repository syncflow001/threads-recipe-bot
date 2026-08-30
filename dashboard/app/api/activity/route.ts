// POST /activity — 옛 설정화면.mjs 1154~1161줄 그대로. 길들이기는 초안이 없다 — 남에게 나가는 글이 아니라서
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 안됨, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 활동스크립트, 스크립트돌리기 } = await 엔진('화면엔진')
  const 길 = 활동스크립트[b.무엇]
  if (!길) return 안됨('모르는 활동입니다', 400)
  const 꼬리표 = b.방식 === '보기만' ? ['--보기만'] : b.방식 === '초안' ? ['--초안'] : []
  return 응답(스크립트돌리기(r.계정, [길, r.계정, ...꼬리표]))
})
