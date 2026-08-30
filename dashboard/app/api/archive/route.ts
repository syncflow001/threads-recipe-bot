// GET /archive — 옛 설정화면.mjs 788~841줄 그대로
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 읽기: 보관함읽기, 보관함길, 보관기간일 } = await 엔진('보관함')
  const { 등급: 등급매기기, 설정: 점수설정, 등급순위 } = await 엔진('score')
  const { 미디어뿌리 } = await 엔진('계정')

  const 것들 = await 보관함읽기(보관함길(r.계정))
  const 지금 = Date.now()
  const 만료 = 지금 - 보관기간일 * 24 * 3600 * 1000
  // ⚠️ 저장된 등급을 그대로 믿지 않는다. 옛 글은 팔로워를 모르던 시절의 기준으로
  // 매겨져 있어 확산 44.9 짜리가 「브론즈」로 찍혀 있다 (실측). 지금 값으로 다시 매긴다
  const 다시매긴것 = 것들.map((g: any) => {
    const ㅅ = 등급매기기(g) ?? { 등급: '알수없음', 비율: null, 확산: g.확산 ?? null }
    return {
      ...g,
      등급: ㅅ.등급,
      확산: ㅅ.확산 ?? g.확산 ?? null,
      옛등급: g.등급 !== ㅅ.등급 ? g.등급 : null,
      지났나: (g.건진때 ?? 0) < 만료,
    }
  })
  const 등급셈: Record<string, number> = {}
  for (const g of 다시매긴것) 등급셈[g.등급] = (등급셈[g.등급] ?? 0) + 1
  // 썸네일 — 받은것 폴더에서 첫 사진을 찾는다. 없으면 자리를 비운다
  const 사진꼴2 = /\.(jpe?g|png|webp|gif)$/i
  const 받은뿌리 = join(뿌리(), 미디어뿌리(r.계정), '받은것')
  const 사진찾기 = async (code: string) => {
    const 것 = await readdir(join(받은뿌리, code)).catch(() => [])
    return 것.filter((f) => 사진꼴2.test(f)).sort()[0] ?? null
  }
  // 등급으로 거르지 않는다 (2026-08-25 에 사용자가 정했다). 미달도 꺼내 쓴다 —
  // 등급은 「쓸까 말까」가 아니라 「어느 것부터 쓸까」를 정할 뿐이다.
  // 못 쓰는 것은 걷어 온 지 오래된 것뿐이다 (원글이 지워졌을 수 있다)
  const 쓸수있는것 = 다시매긴것.filter((g: any) => !g.지났나)
  const 정렬된것: any[] = 다시매긴것
    .slice()
    .sort((a: any, b: any) => (등급순위[a.등급] ?? 9) - (등급순위[b.등급] ?? 9)
      || (b.확산 ?? 0) - (a.확산 ?? 0))
    .slice(0, 60)
  const 보낼것들 = await Promise.all(정렬된것
    .map(async (g: any) => ({
      // 받은것 폴더에 내려받은 사진이 있으면 그것을, 없으면 담을 때 적어 둔 CDN 주소를 쓴다.
      // CDN 주소는 하루 반이면 죽으므로 갓 걷은 글에만 보인다 (그때가 볼 때다)
      사진: await 사진찾기(g.code),
      사진주소: g.사진주소 ?? null,
      code: g.code, 작성자: g.작성자, 등급: g.등급, 옛등급: g.옛등급, 확산: g.확산,
      조회수: g.조회수, 좋아요: g.좋아요, 팔로워: g.팔로워,
      공유: g.공유 ?? null, 리포스트: g.리포스트 ?? null, 답글: g.답글 ?? null,
      레시피: g.레시피, 미디어수: g.미디어수, 건진때: g.건진때, 지났나: g.지났나,
      본문: String(g.본문 ?? '').slice(0, 160),
    })))
  return 응답({
    수: 다시매긴것.length,
    쓸수있는수: 쓸수있는것.length,
    지난것수: 다시매긴것.filter((g: any) => g.지났나).length,
    등급셈, 보관기간일,
    문턱: {
      최소조회수: 점수설정.최소조회수,
      최소팔로워: 점수설정.최소팔로워,
      확산구간: 점수설정.확산구간,
    },
    것들: 보낼것들,
  })
})
