// POST /telegram/test — 세팅 화면의 (아직 저장 전) 입력값으로 시험 메시지를 보낸다. 값이 안 오면 저장된 것을 쓴다
// 계정에서() 를 안 부른다 — TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID 는 공유 열쇠라 계정을 안 가린다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const b = await 몸통(req)
  const { 알리기 } = await 엔진('알림')
  const r = await 알리기('설정 화면에서 보낸 시험 메시지입니다.', {
    토큰: b.토큰, 방번호: b.방번호, 종류: '시험-' + Date.now(),
  })
  return 응답(r)
})
