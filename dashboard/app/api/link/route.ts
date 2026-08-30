// GET/POST /link — 이 계정이 글타래 답글에 제휴 링크를 넣을지 읽고 바꾼다. 값은 계정정보.json 에 남는다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 안됨, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 정보 } = await 엔진('계정')
  return 응답({ 켜짐: (await 정보(r.계정)).링크넣기 !== false })
})

export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  // 켜기 를 안 보내면 !!undefined 가 false 가 되어 조용히 링크를 꺼 버린다.
  // 링크가 빠지면 수수료가 통째로 날아가므로 애매하면 끄지 말고 거절한다
  if (typeof b.켜기 !== 'boolean') return 안됨('켜기 를 true 나 false 로 보내 주세요')
  const { 정보쓰기 } = await 엔진('계정')
  const 값 = await 정보쓰기(r.계정, { 링크넣기: b.켜기 })
  return 응답({ 켜짐: 값.링크넣기 !== false })
})
