// POST /shadow-on — 섀도우밴 살피기를 켠다
import { type NextRequest } from 'next/server'
import { 응답, 몸통, 감싸기 } from '@/lib/길'
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const b = await 몸통(req)
  const { 섀도우켜기 } = await 엔진('대시보드')
  return 응답(await 섀도우켜기(b.간격시간 ?? 24, 뿌리()))
})
