// GET /history — 옛 설정화면.mjs 949~985줄 그대로
import { type NextRequest } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 장부읽기: 길들이기장부읽기 } = await 엔진('길들이기')
  const { 장부읽기: 활동장부읽기 } = await 엔진('교류하기')

  const 길들 = (await 길들이기장부읽기(r.계정)).map((h: any) => ({
    갈래: '길들이기', 때: h.때,
    글: `홈 ${Math.round((h.비율?.[h.목표언어] ?? 0) * 100)}% 가 ${h.목표언어} · ` +
      `${h.걷은수}편 보고 ${h.열어본수}편 열었습니다`,
  }))
  const 활동장부 = await 활동장부읽기().catch(() => ({}))
  // 활동장부는 한 줄이 한 행동이다 — 하트 하나, 댓글 하나, 답글 하나.
  // (전에는 요약 줄인 줄 알고 `h.하트`를 읽어 늘 「0개」로 찍혔다 — 2026-08-26 고침)
  const 짧게 = (s: any, n = 40) => (String(s ?? '').length > n ? `${String(s).slice(0, n)}…` : String(s ?? ''))
  const 못봄 = (h: any) => (h.확인 === '못봄' ? ' ⚠️ 화면에서 못 봄 — 직접 확인' : '')
  const 하트들 = (활동장부[r.계정] ?? []).map((h: any) => {
    if (h.한것 === '답글') return { 갈래: '내 글 답글', 때: h.때,
      글: `@${h.작성자} 「${짧게(h.원댓글)}」 → ${h.글}${h.뜻 ? ` (뜻: ${짧게(h.뜻, 60)})` : ''}${h.근거 ? ` · ${h.근거}` : ''}${못봄(h)}` }
    if (h.한것 === '댓글') return { 갈래: '하트·댓글', 때: h.때,
      글: `@${h.작성자} 글에 댓글 — ${h.글}${h.뜻 ? ` (뜻: ${짧게(h.뜻, 60)})` : ''}${못봄(h)}` }
    // 팔로우도 이 장부에 산다 (2026-08-26). 계정마다 제 파일이라 남의 것이 섞이지 않는다
    if (h.한것 === '팔로우') return { 갈래: '팔로우', 때: h.때,
      글: `@${h.who} 를 팔로우 (팔로워 ${Number(h.팔로워 ?? 0).toLocaleString('ko-KR')}`
        + `${h.확산 ? ` · 확산 ${h.확산}배` : ''})${못봄(h)}` }
    return { 갈래: '하트·댓글', 때: h.때, 글: `@${h.작성자} 글에 하트` }
  })
  // ⚠️ 주인을 모르는 옛 팔로우 줄은 따로 산다(팔로우장부.주인모름.json, 2026-08-29).
  // 그것을 계정 화면에 섞으면 영어 계정이 팔로우한 기록이 한국어 계정 화면에 뜬다 (사용자가 잡았다).
  // 여기서는 계정 파일만 읽고, 주인 모르는 것이 몇 개인지만 알린다
  // 계정이 누른 팔로우는 활동장부.<계정>.jsonl 에 산다(위 하트들 과 같은 곳).
  // 이 파일에는 주인을 모르는 옛 줄만 남아 있어 개수만 센다
  // 경로를 여기서 조립하지 않는다 — 엔진이 계정길() 로 만든 자리를 쓴다 (2026-09-01)
  const { 주인모름읽기 } = await 엔진('팔로우하기')
  const 주인모름 = (await 주인모름읽기(뿌리()).catch(() => [])).length
  const 다 = [...길들, ...하트들]
    .filter((v) => v.때)
    .sort((a, b) => String(b.때).localeCompare(String(a.때)))
    .slice(0, 120)
  return 응답({ 것들: 다, 주인모름 })
})
