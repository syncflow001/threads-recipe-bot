// GET /last-result — 옛 설정화면.mjs 1019~1023줄 그대로. 한 번 읽으면 소진된다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const 결과보관 = 10 * 60 * 1000
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 계정칸 } = await 엔진('화면엔진')
  const 칸 = 계정칸(r.계정)
  const 것 = 칸.마지막결과
  if (!것 || Date.now() - 것.때 > 결과보관 || 것.계정 !== r.계정) return 응답({ 없음: true })
  칸.마지막결과 = null
  return 응답({ 무엇: 것.무엇, 값: 것.값 })
})
