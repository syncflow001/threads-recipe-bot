// POST /run — 옛 설정화면.mjs 1082~1086줄 그대로. 검색어는 안 준다 — 수집은 홈 스크롤이 1차다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 돌리기 } = await 엔진('화면엔진')
  // 돌리기() 는 동기고 안에서 상태통.도는중 을 보고 겹치면 {안됨:'이미 돌고 있습니다'} 를 준다
  return 응답(돌리기(r.계정, b.단계, []))
})
