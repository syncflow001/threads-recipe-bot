// POST /telegram/find { 토큰 } — getUpdates 에서 가장 최근 말 건 사람의 chat id 를 찾아준다. 토큰은 응답에 안 싣는다
// 계정에서() 를 안 부른다 — 몸통으로 받은 토큰만으로 찾고, 계정과는 무관하다(TELEGRAM_* 는 공유 열쇠다)
import { type NextRequest } from 'next/server'
import { 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const b = await 몸통(req)
  const 토큰 = String(b.토큰 ?? '').trim()
  if (!토큰) return 응답({ 안됨: '봇에게 먼저 아무 말이나 보내 주세요.' })
  const j = await fetch(`https://api.telegram.org/bot${토큰}/getUpdates`).then((r) => r.json())
  const 채팅 = j?.result?.at(-1)?.message?.chat
  if (!채팅) return 응답({ 안됨: '봇에게 먼저 아무 말이나 보내 주세요.' })
  return 응답({ 방번호: 채팅.id, 이름: 채팅.first_name ?? 채팅.username ?? '' })
})
