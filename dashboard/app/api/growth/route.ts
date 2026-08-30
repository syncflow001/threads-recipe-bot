// GET /growth — 옛 설정화면.mjs 929~946줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 장부읽기: 성적장부읽기 } = await 엔진('성적')
  const { 장부읽기: 팔로워장부읽기 } = await 엔진('팔로워')
  const { 발행격자 } = await 엔진('대시보드')
  const { 첫판날짜찾기 } = await 엔진('감시모음')
  const { 진단: 성장진단 } = await 엔진('성장')
  const { 요약: 성적요약 } = await 엔진('성적')

  const [성적장부, 팔장부, 격자, 첫판날짜] = await Promise.all([
    성적장부읽기(r.계정),
    팔로워장부읽기(r.계정),
    발행격자(r.계정, { 일수: 14 }),
    첫판날짜찾기(r.계정).catch(() => null),
  ])
  // 계정이 생기기 전 날은 「못 올림」이 아니다. 안 자르면 꾸준함이
  // 「0% → 68%」로 보여 가짜 상승이 지수를 올린다 (실측)
  const 격자줄들 = 첫판날짜
    ? (격자.줄 ?? []).filter((줄: any) => 줄.날짜 >= 첫판날짜)
    : (격자.줄 ?? [])
  return 응답(성장진단({
    성적것들: 성적요약(성적장부, { 개수: 40 }),
    팔로워줄들: 팔장부,
    격자줄들,
  }))
})
