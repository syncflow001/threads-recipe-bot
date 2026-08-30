// GET /orders — 쿠팡 orders 리포트로 판매된 상품 리스트와 합계를 낸다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const 이틀 = (n: number) => String(n).padStart(2, '0')
const 쿠팡날짜 = (d: Date) => `${d.getFullYear()}${이틀(d.getMonth() + 1)}${이틀(d.getDate())}`
const 날짜글 = (d: Date) => `${d.getFullYear()}-${이틀(d.getMonth() + 1)}-${이틀(d.getDate())}`

export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  // 실측 창이 30일이다 (docs/coupang-api-facts.md 「orders 엔드포인트 실측」) — 그보다 길게 물으면 자른다
  const 일수 = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30))
  const 오늘 = new Date()
  const 시작일 = new Date(오늘)
  시작일.setDate(시작일.getDate() - (일수 - 1))

  const { 주문목록 } = await 엔진('coupang')
  let 것들: Array<{ 수량: number; 거래액: number; 수수료: number }>
  try {
    것들 = await 주문목록(쿠팡날짜(시작일), 쿠팡날짜(오늘))
  } catch (e: any) {
    // 쿠팡에서 못 받았으면 「모른다」다 — 0건으로 그리지 않는다 (수익 쪽과 같은 규칙)
    return 응답({ 안됨: e?.message ?? '실패했습니다', 것들: [] })
  }

  const 합 = 것들.reduce<{ 건수: number; 수량: number; 거래액: number; 수수료: number }>(
    (acc, o) => ({ 건수: acc.건수 + 1, 수량: acc.수량 + o.수량, 거래액: acc.거래액 + o.거래액, 수수료: acc.수수료 + o.수수료 }),
    { 건수: 0, 수량: 0, 거래액: 0, 수수료: 0 },
  )
  return 응답({ 것들, 합, 기간: { 시작: 날짜글(시작일), 끝: 날짜글(오늘) } })
})
