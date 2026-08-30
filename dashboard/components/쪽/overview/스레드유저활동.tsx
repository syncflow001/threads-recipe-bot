'use client'
// 스레드 유저 활동 — 좋아요·팔로우·리포스트 등 알림 목록(새로, src/활동알림.mjs · /activity-feed)
import { useState } from 'react'
import { use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 짧은때 } from '@/lib/글자'

type 활동줄 = {
  종류: string
  누가: string | null
  몇명?: number
  글조각?: string | null
  대상코드?: string | null
  대상주인?: string | null
  때: string | number
}
type 활동자료 = { 때?: string | number; 것들?: 활동줄[]; 없음?: true }

// 엔진(src/활동알림.mjs) 이 던지는 짧은 신호를 사람이 읽을 문구로 바꾼다 — 엔진 쪽 신호 자체는 안 건드린다
function 문구로(원문: string): string {
  if (원문 === '쿠키없음') return '이 계정의 스레드 쿠키가 없어요 — 설정 쪽에서 넣어 주세요.'
  if (원문 === '못읽음') return '스레드 화면에서 알림을 못 찾았어요. 쿠키가 만료됐을 수 있어요.'
  return `못 읽었습니다 — ${원문}`
}

export function 스레드유저활동() {
  const { data: 자료, error, refetch } = use자료<활동자료>('/activity-feed')
  const [도는중, 도는중담기] = useState(false)
  const [못됨, 못됨담기] = useState<string | null>(null)

  const 새로보기 = async () => {
    도는중담기(true)
    못됨담기(null)
    try {
      await 부르기('/activity-feed', {})
      await refetch()
    } catch (e) {
      못됨담기((e as Error).message)
    } finally {
      도는중담기(false)
    }
  }

  const 것들 = 자료?.것들 ?? []

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={새로보기} disabled={도는중}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2.5 py-1 text-xs font-semibold disabled:opacity-50">
          {도는중 ? '걷는 중…' : '새로 보기'}
        </button>
        {자료?.때 && <span className="text-xs text-muted-foreground">마지막으로 걷은 때 {짧은때(자료.때)}</span>}
      </div>
      {(error || 못됨) ? (
        <div className="text-sm text-destructive">{문구로(못됨 ?? (error as Error).message)}</div>
      ) : !자료 || 자료.없음 ? (
        <div className="text-sm text-muted-foreground">아직 안 걷었어요. 「새로 보기」를 누르면 스레드 활동 화면을 읽어 옵니다.</div>
      ) : (
        <div className="divide-y">
          {것들.map((h, i) => {
            const 공통 = 'flex items-center gap-2 py-1.5 text-sm'
            const 내용 = (
              <>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{h.종류}</span>
                <span className="shrink-0 font-medium">
                  @{h.누가 ?? ''}{(h.몇명 ?? 0) > 1 ? ` 님 외 ${(h.몇명 as number) - 1}명` : ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{h.글조각 ?? ''}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{짧은때(h.때)}</span>
              </>
            )
            return h.대상코드 && h.대상주인 ? (
              <a key={i} href={`https://www.threads.com/@${h.대상주인}/post/${h.대상코드}`}
                target="_blank" rel="noreferrer" className={`${공통} -mx-1 rounded-md px-1 hover:bg-muted/40`}>
                {내용}
              </a>
            ) : (
              <div key={i} className={공통}>{내용}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
