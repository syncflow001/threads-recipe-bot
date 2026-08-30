// GET /followers — 옛 설정화면.mjs 844~861줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 계정열쇠읽기 } = await 엔진('감시모음')
  const { 하루한번찍기, 장부읽기: 팔로워장부읽기, 증감 } = await 엔진('팔로워')
  // insights 는 자기 토큰으로만 답한다. 계정마다 자기 열쇠를 쓴다
  const [토큰, 아이디] = await Promise.all([
    계정열쇠읽기(r.계정, 'THREADS_ACCESS_TOKEN'),
    계정열쇠읽기(r.계정, 'THREADS_USER_ID'),
  ])
  await 하루한번찍기(r.계정, { 토큰, 아이디 }).catch(() => null)
  const 줄들 = await 팔로워장부읽기(r.계정)
  return 응답({
    줄들,
    지금: 줄들.length ? 줄들[줄들.length - 1].수 : null,
    이레: 증감(줄들, { 며칠: 7 }),
    하루: 증감(줄들, { 며칠: 1 }),
    // 언제부터 쌓였는지 화면이 정직하게 적을 수 있어야 한다
    시작날: 줄들.length ? 줄들[0].날 : null,
    열쇠없음: !토큰 || !아이디,
  })
})
