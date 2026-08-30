// POST /schedule-on — 옛 설정화면.mjs 1087~1090줄 그대로. 마법사는 옛 꼴("8, 12, 16")로도 보낸다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 시각표켜기 } = await 엔진('대시보드')
  return 응답(await 시각표켜기(r.계정, b.칸들 ?? b.시각))
})
