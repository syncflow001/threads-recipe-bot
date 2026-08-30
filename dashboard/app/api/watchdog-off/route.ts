// POST /watchdog-off — 옛 설정화면.mjs 1124~1126줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 알리미끄기, 헬스체크끄기 } = await 엔진('대시보드')
  return 응답(b.무엇 === '알리미' ? await 알리미끄기() : await 헬스체크끄기())
})
