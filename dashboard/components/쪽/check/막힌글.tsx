'use client'
// 막힌 글 카드 — 보류함 목록과 버리기(옛 src/설정화면-안전.mjs 72~75 · JS 3284~3298)
import { 카드 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 막힌글항목 = { code: string; 때: string; 까닭: { 무엇: string; 설명: string }[]; 본문: string }

export function 막힌글() {
  const 목록 = use자료<막힌글항목[]>('/blocked')

  const 버리기 = async (code: string) => {
    await 부르기('/blocked-drop', { code })
    목록.refetch()
  }

  return (
    <카드 제목="막힌 글">
      {목록.error ? (
        <div className="text-sm font-semibold text-destructive">못 읽었어요 — {(목록.error as Error).message}</div>
      ) : !목록.data ? (
        <div className="text-sm text-muted-foreground">살펴보는 중...</div>
      ) : !목록.data.length ? (
        <div className="text-sm text-muted-foreground">막힌 글이 없습니다.</div>
      ) : (
        목록.data.map((b) => (
          <div key={b.code} className="border-t border-[#eef0f3] py-2 text-sm first:border-t-0">
            <b>{b.code}</b> · {String(b.때).slice(0, 16).replace('T', ' ')}
            <div>{b.까닭.map((c) => c.무엇 + ' — ' + c.설명).join(' · ')}</div>
            <div className="text-[#4b5563]">{b.본문}</div>
            <button type="button" onClick={() => 버리기(b.code)}
              className="mt-1.5 rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1 text-sm font-semibold">
              버리기
            </button>
          </div>
        ))
      )}
    </카드>
  )
}
