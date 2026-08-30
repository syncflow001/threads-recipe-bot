// GET /progress — 옛 설정화면.mjs 1024~1032줄 그대로. 폴링 1.5초
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 계정칸 } = await 엔진('화면엔진')
  const 진행 = 계정칸(r.계정).진행
  return 응답(진행 ? {
    도는중: true, 무엇: 진행.무엇, 계정: 진행.계정 ?? '', 멈춤: 진행.멈춤,
    지난초: Math.round((Date.now() - 진행.시작) / 1000),
    단계: 진행.단계들[진행.단계들.length - 1] ?? '',
    단계수: 진행.단계들.length,
  } : { 도는중: false })
})
