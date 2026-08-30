// POST /api/remote/send { 코드 } — 크롬 원격 데스크톱 액세스 코드를 제작자 텔레그램으로 보낸다. 토큰은 응답에 안 싣는다
import { type NextRequest } from 'next/server'
import { 계정에서, 응답, 안됨, 몸통, 감싸기 } from '@/lib/길'
import { 엔진 } from '@/lib/엔진'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const 코드 = String(b.코드 ?? '').replace(/\s/g, '')
  if (!/^\d{12}$/.test(코드)) return 안됨('12자리 숫자를 넣어 주세요.')

  const { 제작자방번호, 제작자봇토큰, 판번호, 맥이름, 원격메시지 } = await 엔진('제작자')
  if (!제작자방번호 || !제작자봇토큰) return 응답({ 보냄: false, 까닭: '제작자 연락처가 비어 있어요.' })

  const { 알리기 } = await 엔진('알림')
  const 글 = 원격메시지({ 코드, 계정: r.계정, 맥: 맥이름(), 판: await 판번호() })
  const 답 = await 알리기(글, { 토큰: 제작자봇토큰, 방번호: 제작자방번호, 종류: '원격-' + Date.now(), 잠잠시간: 0 })
  return 응답({ 보냄: 답.보냄, 까닭: 답.까닭 })
})
