// GET /api/update — 지금 판·최신 판(check 가 logs/업데이트확인.json 에 남긴 것)·매일 확인 스위치·최근 기록 다섯 줄.
// 네트워크는 안 부른다 — 최신 판을 새로 물어보려면 /api/update/check 를 따로 부른다
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async () => {
  const { 판번호 } = await 엔진('제작자')
  const { 기록읽기, 매일확인켜졌나, 판비교 } = await 엔진('업데이트')
  const 확인 = await readFile(join(뿌리(), 'logs', '업데이트확인.json'), 'utf8')
    .then((글) => JSON.parse(글)).catch(() => null)
  const 기록 = await 기록읽기(뿌리())
  const 지금판 = await 판번호(뿌리())
  const 최신판 = 확인?.판 ?? null
  return 응답({
    지금판,
    최신판,
    새판있음: 최신판 ? 판비교(지금판, 최신판) > 0 : false,
    마지막확인: 확인?.때 ?? null,
    켜짐: await 매일확인켜졌나(),
    기록: 기록.slice(-5),
  })
})
