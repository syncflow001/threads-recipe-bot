// GET /persona-file — 옛 설정화면.mjs 1046~1057줄 그대로. 비-JSON(Content-Disposition: attachment)
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 말투파일 } = await 엔진('화면엔진')
  const 이름 = 말투파일(r.계정)
  const 원문 = await readFile(join(뿌리(), 이름), 'utf8').catch(() => null)
  if (원문 === null) return 안됨('말투 파일이 아직 없습니다', 404)
  return new NextResponse(원문, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 계정 이름은 영숫자·점뿐이라(src/계정.mjs 이름꼴) 파일 이름에 그대로 써도 안전하다
      'Content-Disposition': `attachment; filename="${이름}"`,
      'Cache-Control': 'no-store',
    },
  })
})
