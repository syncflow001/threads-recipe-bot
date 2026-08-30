// POST /inspect-on — 점검을 켠다(옛 watchdog-on 을 본떴다). 사람이 화면에서 누를 때만 불린다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 점검켜기 } = await 엔진('대시보드')
  return 응답(await 점검켜기(b.간격 ?? 30))
})
