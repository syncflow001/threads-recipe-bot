// GET/POST /late-link-alert — 터진 글에 링크를 달았다·못 달았다 알림을 보낼지 읽고 바꾼다. 값은 뿌리 알림설정.json 에 남는다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 응답, 안됨, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async () => {
  const { 알림설정읽기 } = await 엔진('늦은링크')
  return 응답({ 켜짐: (await 알림설정읽기()).늦은링크 !== false })
})

export const POST = 감싸기(async (req: NextRequest) => {
  const b = await 몸통(req)
  // 켜기 를 안 보내면 !!undefined 가 false 가 되어 조용히 알림을 꺼 버린다 — 애매하면 거절한다
  if (typeof b.켜기 !== 'boolean') return 안됨('켜기 를 true 나 false 로 보내 주세요')
  const { 알림설정쓰기 } = await 엔진('늦은링크')
  const 값 = await 알림설정쓰기({ 늦은링크: b.켜기 })
  return 응답({ 켜짐: 값.늦은링크 !== false })
})
