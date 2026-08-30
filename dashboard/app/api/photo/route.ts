// GET /photo — 옛 설정화면.mjs 988~1004줄 그대로. 비-JSON, 이미지 바이트를 스트림한다
import { access, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const 있나 = (p: string) => access(p).then(() => true, () => false)
const 종류들: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
}

export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const code = basename(req.nextUrl.searchParams.get('code') ?? '')
  const file = basename(req.nextUrl.searchParams.get('file') ?? '')
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(code) || !/^[\w.-]{1,40}$/.test(file)) {
    return 안됨('이름이 이상합니다')
  }
  const { 미디어뿌리 } = await 엔진('계정')
  // 보관함 글은 아직 안 쓴 글이라 「받은것」에 있다. 두 곳을 다 본다
  const 어디 = (req.nextUrl.searchParams.get('where') === '받은것') ? '받은것' : '쓴것'
  const 길 = join(뿌리(), 미디어뿌리(r.계정), 어디, code, file)
  if (!(await 있나(길))) return 안됨('없는 사진입니다', 404)
  const 종류 = 종류들[extname(file).toLowerCase()]
  if (!종류) return 안됨('사진이 아닙니다')
  const 바이트 = await readFile(길)
  return new NextResponse(바이트, {
    status: 200,
    headers: { 'Content-Type': 종류, 'Cache-Control': 'private, max-age=3600' },
  })
})
