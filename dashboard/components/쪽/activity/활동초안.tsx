'use client'
// 활동 초안 카드 — 하트댓글·답하기·팔로우 세 초안을 보여주고 올리거나 버린다(옛 초안그리기 1718~1779)
import { useState } from 'react'
import { 알림줄 } from '@/components/공용/알림줄'
import { use자료, use다시그리기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 짧은때 } from '@/lib/글자'

type 초안자료 = {
  하트댓글?: { 만든때: string | number; 하트?: { 작성자: string; 글자: string }[]; 댓글?: { 작성자: string; 글: string; 뜻: string } }
  답하기?: { 만든때: string | number; 답글?: { 작성자: string; 원댓글: string; 글: string; 뜻: string; 근거: string }[] }
  팔로우?: { 만든때: string | number; 후보들?: { 작성자: string; 팔로워: number; 확산: number }[] }
}

// 만든 초안이 너무 길면 화면이 지저분해진다 — 옛 초안글() 그대로
const 짧게 = (s: unknown, n = 120) => {
  const str = String(s ?? '')
  return str.length > n ? str.slice(0, n) + '…' : str
}

const 올리기단추 = 'rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-45'
const 버리기단추 = 'rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-45'
const 경고칸 = 'rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm'

export function 활동초안({ 팔로우한판, 팔로우하루 }: { 팔로우한판: number; 팔로우하루: number }) {
  const { data: r, refetch } = use자료<초안자료>('/activity-draft')
  const 다시그리기 = use다시그리기()
  const [도는것, 도는것담기] = useState<string | null>(null)
  const [알림, 알림담기] = useState('')

  if (!r || (!r.하트댓글 && !r.답하기 && !r.팔로우)) return null

  // 초안을 그대로 올린다 — 눌러야만 실제로 남에게 나간다(옛 활동초안 클릭 위임 1763~1779)
  const 올리기 = async (무엇: string) => {
    const 물음 = 무엇 === '팔로우'
      ? `이 계정으로 위 목록을 위에서부터 ${팔로우한판}명까지 실제로 팔로우합니다. 계속할까요?`
      : '확인한 초안을 그대로 올립니다. 실제로 남에게 나갑니다. 계속할까요?'
    if (!confirm(물음)) return
    도는것담기(무엇)
    try {
      const rr = await 부르기<{ 안됨?: string }>('/activity', { 무엇, 방식: '초안' })
      알림담기(rr.안됨 ?? '돌고 있습니다. 「발행」 쪽 돌려 본 기록에서 볼 수 있어요.')
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 도는것담기(null); 다시그리기() }
  }
  const 버리기 = async (무엇: string) => {
    도는것담기(무엇)
    await 부르기('/activity-draft-drop', { 무엇 }).catch(() => {})
    도는것담기(null)
    refetch()
  }

  const 교 = r.하트댓글
  const 답 = r.답하기
  const 팔 = r.팔로우

  return (
    <div className="mt-3 space-y-2">
      {교 && (() => {
        const n = (교.하트 ?? []).length + (교.댓글 ? 1 : 0)
        return (
          <div className={경고칸}>
            <b>초안 — 남의 글에 하트·댓글</b> <span className="text-muted-foreground">{짧은때(교.만든때)}</span>
            {n ? (
              <ul className="my-1.5 ml-[1.1rem] list-disc space-y-1">
                {(교.하트 ?? []).map((h, i) => (
                  <li key={'h' + i}>하트 → @{h.작성자} <span className="text-muted-foreground">{짧게(h.글자, 50)}</span></li>
                ))}
                {교.댓글 && (
                  <li><b>댓글 → @{교.댓글.작성자}</b><br />{짧게(교.댓글.글)}
                    <br /><span className="text-muted-foreground">뜻: {짧게(교.댓글.뜻)}</span></li>
                )}
              </ul>
            ) : <div className="my-1.5 text-muted-foreground">담을 것이 없었어요 — 홈에 그 언어 글이 없었습니다.</div>}
            <div className="mt-2 flex gap-2">
              {n > 0 && (
                <button type="button" disabled={도는것 === '하트댓글'} onClick={() => 올리기('하트댓글')} className={올리기단추}>
                  이대로 올리기
                </button>
              )}
              <button type="button" disabled={도는것 === '하트댓글'} onClick={() => 버리기('하트댓글')} className={버리기단추}>
                버리기
              </button>
            </div>
          </div>
        )
      })()}

      {답 && (() => {
        const 것들 = 답.답글 ?? []
        return (
          <div className={경고칸}>
            <b>초안 — 내 글 댓글에 답글</b> <span className="text-muted-foreground">{짧은때(답.만든때)}</span>
            {것들.length ? (
              <ul className="my-1.5 ml-[1.1rem] list-disc space-y-1">
                {것들.map((c, i) => (
                  <li key={i}><b>@{c.작성자}</b> 「{짧게(c.원댓글, 60)}」<br />→ {짧게(c.글)}
                    <br /><span className="text-muted-foreground">뜻: {짧게(c.뜻)} · {c.근거}</span></li>
                ))}
              </ul>
            ) : <div className="my-1.5 text-muted-foreground">답 안 한 댓글이 없었어요.</div>}
            <div className="mt-2 flex gap-2">
              {것들.length > 0 && (
                <button type="button" disabled={도는것 === '답하기'} onClick={() => 올리기('답하기')} className={올리기단추}>
                  이대로 올리기
                </button>
              )}
              <button type="button" disabled={도는것 === '답하기'} onClick={() => 버리기('답하기')} className={버리기단추}>
                버리기
              </button>
            </div>
          </div>
        )
      })()}

      {팔 && (() => {
        const 것들 = 팔.후보들 ?? []
        return (
          <div className={경고칸}>
            <b>초안 — 팔로우할 계정</b> <span className="text-muted-foreground">{짧은때(팔.만든때)}</span>
            {것들.length ? (
              <>
                <p className="my-1 text-muted-foreground">한 번에 <b>{팔로우한판}명</b>까지, 하루 <b>{팔로우하루}명</b>까지 누릅니다. 위에서부터 차례로요.</p>
                <ul className="my-1.5 ml-[1.1rem] list-disc space-y-1">
                  {것들.map((c, i) => (
                    <li key={i} className={i >= 팔로우한판 ? 'text-muted-foreground' : undefined}>
                      <b>@{c.작성자}</b> · 팔로워 {Number(c.팔로워 ?? 0).toLocaleString('ko-KR')}
                      {c.확산 ? ` · 확산 ${c.확산}배` : ''}
                      {i >= 팔로우한판 && <span className="text-xs"> (이번 판에는 안 함)</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : <div className="my-1.5 text-muted-foreground">찾은 계정이 없었어요.</div>}
            <div className="mt-2 flex gap-2">
              {것들.length > 0 && (
                <button type="button" disabled={도는것 === '팔로우'} onClick={() => 올리기('팔로우')} className={올리기단추}>
                  이대로 팔로우
                </button>
              )}
              <button type="button" disabled={도는것 === '팔로우'} onClick={() => 버리기('팔로우')} className={버리기단추}>
                버리기
              </button>
            </div>
          </div>
        )
      })()}
      <알림줄 글={알림} />
    </div>
  )
}
