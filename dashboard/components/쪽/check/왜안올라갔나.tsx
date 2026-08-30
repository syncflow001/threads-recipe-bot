'use client'
// 왜 안 올라갔나 카드 — 한줄답 + 항목들(옛 src/설정화면-안전.mjs 67~70 · JS 3268~3282)
import { 카드 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type 진단항목 = { 이름: string; 됨: boolean | null; 지금: string; 조치: string | null; 풀이: string }
type 진단자료 = {
  답: { 괜찮나: boolean; 글: string; 조치: string; 더: string } | null
  것들: 진단항목[]
}

export function 왜안올라갔나() {
  const 진단 = use자료<진단자료>('/diagnose')

  return (
    <카드 제목="왜 안 올라갔나">
      {진단.error ? (
        <div className="text-sm font-semibold text-destructive">못 읽었어요 — {(진단.error as Error).message}</div>
      ) : !진단.data ? (
        <div className="text-sm text-muted-foreground">살펴보는 중...</div>
      ) : (
        <>
          {진단.data.답 && (
            <div className={cn('mb-2 rounded-lg p-3 text-sm', 진단.data.답.괜찮나 ? 'bg-[#e4f3ec]' : 'bg-[#fdecec]')}>
              <b>{진단.data.답.글}</b>
              <div className="text-muted-foreground">→ {진단.data.답.조치}</div>
              {진단.data.답.더 && <div className="text-muted-foreground">{진단.data.답.더}</div>}
            </div>
          )}
          {(진단.data.것들 ?? []).map((h, i) => (
            <div key={i} className="border-t border-[#f1f2f4] py-2 text-sm first:border-t-0">
              <span className={cn('inline-block w-[1.1em] font-bold', h.됨 === false && 'text-[#b91c1c]')}>
                {h.됨 === true ? '✓' : h.됨 === false ? '✕' : '·'}
              </span>{' '}
              <b>{h.이름}</b> — {h.지금}
              {h.풀이 && <div className="pl-[1.6em] text-[0.88em] text-muted-foreground">{h.풀이}</div>}
              {h.조치 && <div className="pl-[18px] text-[0.9em] text-muted-foreground">→ {h.조치}</div>}
            </div>
          ))}
        </>
      )}
    </카드>
  )
}
