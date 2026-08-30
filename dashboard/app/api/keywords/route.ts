// POST /keywords — 옛 설정화면.mjs 1147~1153줄 그대로. 피드를 가르치는 데 쓴다 — 수집은 홈 스크롤이 1차다
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 몸통, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const b = await 몸통(req)
  const 다듬은것 = [...new Set((Array.isArray(b.검색어들) ? b.검색어들 : [])
    .map((v: unknown) => String(v).trim().replace(/\s+/g, ' '))
    .filter((v: string) => v && v.length <= 30))].slice(0, 30)
  const { 정보쓰기 } = await 엔진('계정')
  const 그정보 = await 정보쓰기(r.계정, { 검색어: 다듬은것 })
  return 응답({ 검색어: 그정보.검색어 ?? [] })
})
