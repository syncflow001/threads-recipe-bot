// GET/POST /activity-feed — 스레드 활동 알림(좋아요·팔로우·답글 등)을 걷고 읽는다
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 읽기 } = await 엔진('활동알림')
  const 값 = await 읽기(r.계정, 뿌리())
  return 응답(값 ?? { 없음: true })
})

export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 걷기 } = await 엔진('활동알림')
  try {
    return 응답(await 걷기(r.계정, { 뿌리: 뿌리() }))
  } catch (e: any) {
    if (e?.message === '쿠키없음' || e?.message === '못읽음') return 안됨(e.message, 400)
    throw e
  }
})
