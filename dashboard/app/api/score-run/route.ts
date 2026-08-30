// POST /score-run — 옛 설정화면.mjs 1137~1144줄 그대로. 토큰 없으면 400
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 계정열쇠읽기 } = await 엔진('감시모음')
  const [토큰, 아이디] = await Promise.all([
    계정열쇠읽기(r.계정, 'THREADS_ACCESS_TOKEN'),
    계정열쇠읽기(r.계정, 'THREADS_USER_ID'),
  ])
  if (!토큰) return 안됨('이 계정의 스레드 출입증이 없습니다', 400)
  const { 한판 } = await 엔진('성적')
  return 응답(await 한판(r.계정, { 토큰, 아이디 }))
})
