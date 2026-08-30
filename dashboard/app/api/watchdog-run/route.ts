// POST /watchdog-run — 옛 설정화면.mjs 1128~1136줄 그대로. 시각표를 안 기다리고 지금 한 번 돌려 본다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const { 스크립트돌리기 } = await 엔진('화면엔진')
  const 길 = b.무엇 === '알리미' ? '조회수알리미.sh' : '헬스체크.sh'
  return 응답(스크립트돌리기('', [], {
    설명: b.무엇 === '알리미'
      ? '▶ **지금 조회수를 봅니다.** 문턱을 넘은 새 글이 있으면 텔레그램으로 알립니다.'
      : '▶ **지금 계정 열쇠를 잽니다.** 이상이 있으면 텔레그램으로 알립니다.',
    쉘: 길,
  }))
})
