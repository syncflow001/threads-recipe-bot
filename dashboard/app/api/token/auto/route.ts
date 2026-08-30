// POST /token/auto — 크롬 창을 띄워 토큰을 자동으로 받아 온다. 자동발급() 을 기다리지 않고 띄우고
// 화면엔진.mjs 의 진행 통(진행시작/알림담기/진행끝)에 그대로 얹는다 — 진행 통 모양을 베끼지 않는다.
// 잠금은 상태통.토큰도는중 깃발로 둔다 — 계정칸(계정).진행 은 화면이 읽는 진행 상황일 뿐 잠금이 아니다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
import { 계정에서, 응답, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function 쉬운말(메시지: string): string {
  if (메시지 === '앱없음') return '페이스북 앱 ID·시크릿을 먼저 넣어 주세요.'
  if (메시지 === '거부') return '허용을 안 누르셨어요. 다시 해 보세요.'
  if (메시지 === '시간초과') return '5분 안에 허용이 안 눌려 창을 닫았어요.'
  if (메시지.startsWith('권한부족:')) return `허용 화면에서 항목을 다 켜 주세요 — 빠진 것: ${메시지.slice('권한부족:'.length)}`
  if (메시지.startsWith('딴계정:')) return `그 크롬에 로그인된 스레드 계정(@${메시지.slice('딴계정:'.length)})이 이 계정과 달라요.`
  return 메시지
}

export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 상태통, 진행시작, 진행끝, 알림담기 } = await 엔진('화면엔진')
  const { 자동발급 } = await 엔진('토큰받기')
  if (상태통.토큰도는중) return 안됨('이미 돌고 있습니다')
  상태통.토큰도는중 = true
  진행시작('토큰 자동발급', r.계정)
  자동발급(r.계정, { 뿌리: 뿌리(), 진행: (글: string) => 알림담기(글, r.계정) })
    .then((값: unknown) => 진행끝(값, r.계정))
    .catch((e: any) => 진행끝({ 안됨: 쉬운말(e?.message || '실패했습니다') }, r.계정))
    .finally(() => { 상태통.토큰도는중 = false })
  return 응답({ 시작함: true })
})
