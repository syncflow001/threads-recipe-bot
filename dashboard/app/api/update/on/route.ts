// POST /api/update/on — 매일 11:00 launchd 확인을 켠다(plist 를 심고 load)
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = 감싸기(async () => {
  const { 매일확인켜기, 매일확인켜졌나 } = await 엔진('업데이트')
  await 매일확인켜기(뿌리())
  return 응답({ 켜짐: await 매일확인켜졌나() })
})
