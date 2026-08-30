// GET /manual?이름=<키> — docs/사용법.md 에서 그 절만(다음 「## 」 전까지) 잘라 준다
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 지금은 절 하나뿐이다 — 늘어나면 여기 줄만 늘린다
const 제목표: Record<string, string> = {
  페이스북앱: '## 페이스북 앱 만들기와 스레드 연결',
}

export const GET = 감싸기(async (req: NextRequest) => {
  const 이름 = req.nextUrl.searchParams.get('이름') ?? ''
  const 제목 = 제목표[이름]
  if (!제목) return 안됨('없는 절입니다', 404)
  const 글 = await readFile(join(뿌리(), 'docs', '사용법.md'), 'utf8')
  const 시작 = 글.indexOf(제목)
  if (시작 < 0) return 안됨('없는 절입니다', 404)
  const 다음 = 글.indexOf('\n## ', 시작 + 제목.length)
  return 응답({ 글: 글.slice(시작, 다음 < 0 ? undefined : 다음).trimEnd() })
})
