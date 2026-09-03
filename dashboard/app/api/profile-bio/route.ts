// GET /profile-bio — 스레드에 적어 둔 프로필 소개문구. 말투 카드의 「나를 한 줄로」가 이것을 채운다.
// /status 에 붙이지 않는다 — 그것은 파일만 읽는 빠른 길이고 화면 여럿이 자주 부른다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 소개문구 } = await 엔진('화면엔진')
  return 응답(await 소개문구(r.계정))
})
