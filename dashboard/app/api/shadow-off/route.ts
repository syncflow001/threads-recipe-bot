// POST /shadow-off — 섀도우밴 살피기를 끈다
import { 응답, 감싸기 } from '@/lib/길'
import { 엔진 } from '@/lib/엔진'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async () => {
  const { 섀도우끄기 } = await 엔진('대시보드')
  return 응답(await 섀도우끄기())
})
