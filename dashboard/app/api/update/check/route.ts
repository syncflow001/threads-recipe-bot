// POST /api/update/check — 깃허브에서 최신 판을 물어 logs/업데이트확인.json 에 {판,때} 로 적는다.
// 덮지도, 다시 켜지도 않는다 — 실제 받기·덮기는 /api/update/run 몫이다
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = 감싸기(async () => {
  const { 최신판알아보기, 판비교 } = await 엔진('업데이트')
  const { 판번호 } = await 엔진('제작자')
  const 최신 = await 최신판알아보기()
  if (!최신) return 응답({ 최신판: null, 새판있음: false, 안됨: '최신 판을 확인하지 못했어요.' })

  await mkdir(join(뿌리(), 'logs'), { recursive: true })
  await writeFile(join(뿌리(), 'logs', '업데이트확인.json'), JSON.stringify({ 판: 최신.판, 때: new Date().toISOString() }))

  const 지금판 = await 판번호(뿌리())
  return 응답({ 최신판: 최신.판, 새판있음: 판비교(지금판, 최신.판) > 0 })
})
