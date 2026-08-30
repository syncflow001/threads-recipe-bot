'use client'
// 활동 기록 카드 — 최근 120개 활동 로그(옛 HTML 812~818, JS 1980~1996)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'
import { 짧은때 } from '@/lib/글자'

type 기록자료 = { 것들: { 갈래: string; 글: string; 때: string | number }[]; 주인모름?: number }

// 본문만: 개요 쪽 활동기록탭이 카드 없이 이 목록만 쓸 때 true 로 준다(문구는 그대로, 카드 틀만 뺀다)
export function 활동기록({ 본문만 = false }: { 본문만?: boolean } = {}) {
  const { data: r, error, refetch } = use자료<기록자료>('/history')

  const 다시보기단추 = (
    <button type="button" onClick={() => refetch()}
      className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2.5 py-1 text-xs font-semibold">다시 보기</button>
  )

  const 본문 = (
    <>
      <귀띔>이 계정이 한 일을 시간 순으로 모았어요. 최근 120개까지 보여줍니다.</귀띔>
      {error ? (
        <div className="text-sm text-destructive">못 읽었어요 — {(error as Error).message}</div>
      ) : (
        <>
          {(r?.것들 ?? []).length ? (
            <div className="divide-y">
              {r!.것들.map((h, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-2 py-1.5 text-sm">
                  <span className="w-24 shrink-0 font-semibold text-muted-foreground">{h.갈래}</span>
                  <span className="flex-1">{h.글}</span>
                  <span className="text-xs text-muted-foreground">{짧은때(h.때)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">이 계정은 아직 활동 기록이 없어요. 위 버튼을 눌러 한 번 돌려 보세요.</div>
          )}
          {!!r?.주인모름 && (
            <div className="mt-2 text-sm text-muted-foreground">
              계정 이름이 안 적힌 예전 팔로우 기록 {r.주인모름}건은 감췄어요. 누가 한 건지 알 수 없어서예요.
            </div>
          )}
        </>
      )}
    </>
  )

  if (본문만) {
    return (
      <div>
        <div className="mb-2 flex justify-end">{다시보기단추}</div>
        {본문}
      </div>
    )
  }

  return (
    <카드 제목="활동 기록" 넓게 단추={다시보기단추}>
      {본문}
    </카드>
  )
}
