// GET /revenue — 옛 설정화면.mjs 749~757줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 수익 } = await 엔진('대시보드')
  const { 읽기: 목표읽기, 달성: 목표달성, 속도: 목표속도, 최대목표 } = await 엔진('수익목표')
  const 값 = await 수익()
  const 월목표 = await 목표읽기()
  // ⚠️ 쿠팡에서 실적을 못 받았으면 달성률을 만들지 않는다. 그때 이번달은 0 인데
  // 그건 「0원 벌었다」가 아니라 「모른다」다. 0% 로 그리면 거짓말이 된다
  const 달성 = 값.안됨 ? null : 목표달성(값.이번달, 월목표)
  return 응답({ ...값, 월목표, 최대목표, 달성, 속도: 목표속도(달성) })
})
