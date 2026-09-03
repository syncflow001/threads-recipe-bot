// GET/POST /schedule/gap — 계정별 발행 시각을 얼마나 벌릴지(분). 계정마다가 아니라 이 맥 전체의 규칙이다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async () => {
  const { 간격읽기, 기본간격분 } = await 엔진('시각배정')
  return 응답({ 분: await 간격읽기(), 바탕: 기본간격분 })
})

export const POST = 감싸기(async (req: NextRequest) => {
  const b = await 몸통(req)
  const { 간격쓰기 } = await 엔진('시각배정')
  // 다듬기는 엔진이 한다 — 이상한 값이 와도 막지 않고 1~59 안으로 끌어당긴다
  return 응답({ 분: await 간격쓰기(b.분) })
})
