// GET /shadow — 섀도우밴 살피기가 켜져 있나 + 계정마다 마지막 판정 (계정을 안 가린다)
import { 응답, 감싸기 } from '@/lib/길'
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async () => {
  const { 섀도우찾기 } = await 엔진('대시보드')
  const { 장부읽기 } = await 엔진('섀도우밴')
  const { 계정목록, 정보 } = await 엔진('계정')
  const 곳 = 뿌리()
  const 시각표 = await 섀도우찾기()
  const 계정들 = await 계정목록(곳)
  const 것들 = []
  for (const 계정 of 계정들) {
    const 줄들 = await 장부읽기(계정, 곳, 2)
    것들.push({
      계정,
      별칭: (await 정보(계정, 곳).catch(() => null))?.별칭 ?? 계정,
      마지막: 줄들[줄들.length - 1] ?? null,
    })
  }
  const res = 응답({ 켜짐: !!시각표, 간격시간: 시각표?.간격시간 ?? 24, 것들 })
  res.headers.set('Cache-Control', 'no-store')
  return res
})
