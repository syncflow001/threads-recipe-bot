// GET /watchdog — 옛 설정화면.mjs 1059~1078줄 그대로. profile 은 안 쓴다(계정 안 가림)
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 헬스체크찾기, 알리미찾기 } = await 엔진('대시보드')
  const { 설정: 알리미설정 } = await 엔진('조회수알리미')
  const { 계정열쇠읽기 } = await 엔진('감시모음')

  const [헬스, 알리미, 헬스결과, 알림결과] = await Promise.all([
    헬스체크찾기().catch(() => null),
    알리미찾기().catch(() => null),
    readFile(join(뿌리(), '헬스체크결과.json'), 'utf8').then(JSON.parse).catch(() => null),
    readFile(join(뿌리(), '조회수알리미결과.json'), 'utf8').then(JSON.parse).catch(() => null),
  ])
  return 응답({
    헬스체크: {
      켜짐: !!헬스, 간격시간: 헬스 ? Math.round((헬스.간격초 || 0) / 3600) : 3,
      마지막: 헬스결과 && { 때: 헬스결과.때, 계정수: 헬스결과.계정수, 탈: 헬스결과.탈 ?? [] },
    },
    알리미: {
      켜짐: !!알리미, 간격분: 알리미 ? Math.round((알리미.간격초 || 0) / 60) : 30,
      문턱: 알리미설정.문턱, 며칠: 알리미설정.며칠,
      마지막: 알림결과 && { 때: 알림결과.때, 판들: 알림결과.판들 ?? [], 알린것: 알림결과.알린것 ?? [] },
    },
    텔레그램있나: !!(await 계정열쇠읽기('', 'TELEGRAM_BOT_TOKEN')),
  })
})
