// GET /tame — 옛 설정화면.mjs 766~777줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 정보 } = await 엔진('계정')
  const { 길들이기찾기 } = await 엔진('대시보드')
  const { 장부읽기: 길들이기장부읽기, 설정: 길들이기설정 } = await 엔진('길들이기')
  const 그정보 = await 정보(r.계정)
  const 시각표 = await 길들이기찾기(r.계정)
  return 응답({
    언어: 그정보.언어 ?? '한국어',
    켜짐: !!시각표,
    간격시간: 시각표?.간격시간 ?? 길들이기설정.간격시간,
    기본간격: 길들이기설정.간격시간,
    최근: await 길들이기장부읽기(r.계정),
  })
})
