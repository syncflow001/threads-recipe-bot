// GET /score — 옛 설정화면.mjs 864~878줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 성적찾기 } = await 엔진('대시보드')
  const {
    장부읽기: 성적장부읽기, 요약: 성적요약,
    기본간격시간: 성적기본간격, 기본개수: 성적기본개수,
  } = await 엔진('성적')
  const 시각표 = await 성적찾기(r.계정)
  const 것들 = 성적요약(await 성적장부읽기(r.계정))
  // 마지막으로 찍은 때는 글마다 다르다. 그중 가장 최근을 「마지막 판」으로 본다
  const 마지막 = 것들.map((g: any) => g.지금?.때).filter(Boolean).sort().pop() ?? null
  return 응답({
    켜짐: !!시각표,
    간격시간: 시각표?.간격시간 ?? 성적기본간격,
    기본간격: 성적기본간격,
    찍는개수: 성적기본개수,
    마지막,
    것들,
  })
})
