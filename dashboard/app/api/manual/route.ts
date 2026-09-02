// GET /manual?이름=<키> — 문서 한 편(또는 그 절 하나)을 그대로 준다.
// 절만 잘라 주던 것을 문서 통째로도 줄 수 있게 늘렸다 (2026-08-31 섀도우밴 설명 팝업)
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 제목이 있으면 그 절만, 없으면 문서 통째로 준다
const 문서표: Record<string, { 파일: string; 제목?: string }> = {
  페이스북앱: { 파일: 'docs/사용법.md', 제목: '## 페이스북 앱 만들기와 스레드 연결' },
  섀도우밴: { 파일: 'docs/섀도우밴-대응.md' },
}

export const GET = 감싸기(async (req: NextRequest) => {
  const 이름 = req.nextUrl.searchParams.get('이름') ?? ''
  const 것 = 문서표[이름]
  if (!것) return 안됨('없는 문서입니다', 404)
  const 글 = await readFile(join(뿌리(), ...것.파일.split('/')), 'utf8').catch(() => null)
  if (글 == null) return 안됨('없는 문서입니다', 404)
  if (!것.제목) return 응답({ 글: 글.trimEnd() })
  const 시작 = 글.indexOf(것.제목)
  if (시작 < 0) return 안됨('없는 절입니다', 404)
  const 다음 = 글.indexOf('\n## ', 시작 + 것.제목.length)
  return 응답({ 글: 글.slice(시작, 다음 < 0 ? undefined : 다음).trimEnd() })
})
