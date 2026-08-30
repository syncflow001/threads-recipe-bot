'use client'
// 성장 진단 카드 — 지수·등급·기둥 막대·방향·믿음 문구(옛 HTML 690~698 · JS 성장그리기 2078~2124)
import { 카드 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type 기둥 = { 키: string; 말: string; 점수: number | null; 최근값?: number; 그전값?: number; 까닭?: string }
type 방향항목 = { 결: string; 글: string; 할것: string }
type 성장자료 = {
  지수: number | null
  등급?: { 이름: string; 결: string }
  믿음?: { 결: string; 말: string }
  기둥?: 기둥[]
  방향?: 방향항목[]
  잰편수: number
  센기둥: number
}

// 50 이 「그대로」다. 위면 자라는 중, 아래면 식는 중(옛 src/성장.mjs 의 진단결·기둥풀이 그대로)
const 진단결 = (점: number | null | undefined) => (점 == null ? '' : 점 >= 57 ? '좋음' : 점 < 43 ? '나쁨' : '')

const 기둥풀이 = (ㄱ: 기둥) => {
  if (!Number.isFinite(ㄱ.점수)) return ㄱ.까닭 ?? '아직 비교할 게 없어요'
  const 꼴 = (v: number | undefined) => {
    if (!Number.isFinite(v)) return '—'
    if (ㄱ.키 === '도달') return Math.round(v as number).toLocaleString('ko-KR')
    if (ㄱ.키 === '팔로워') return ((v as number) > 0 ? '+' : '') + Math.round(v as number).toLocaleString('ko-KR') + '명'
    return ((v as number) * 100).toFixed(ㄱ.키 === '꾸준함' ? 0 : 2) + '%'
  }
  if (!Number.isFinite(ㄱ.그전값)) return ㄱ.까닭 ?? ''
  return '예전 ' + 꼴(ㄱ.그전값) + ' → 지금 ' + 꼴(ㄱ.최근값)
}

const 글색 = (결: string) => (결 === '좋음' ? 'text-green-600' : 결 === '나쁨' ? 'text-destructive' : 'text-muted-foreground')
const 점배경 = (결: string) => (결 === '좋음' ? 'bg-green-600' : 결 === '나쁨' ? 'bg-destructive' : 'bg-muted-foreground')

export function 성장진단() {
  const 자료 = use자료<성장자료>('/growth')
  const r = 자료.data

  const 믿음줄: 방향항목[] = r?.믿음 && r.믿음.결 === '낮음'
    ? [{ 결: '보통', 글: `이 점수는 아직 믿기 일러요 — ${r.믿음.말}.`,
        할것: '<b>기록</b> 쪽에서 「성과 측정」를 켜 두고 글이 더 쌓이길 기다려 주세요. ' +
          '측정 횟수가 쌓일수록 이 점수가 정확해져요.' }]
    : []

  return (
    <카드 제목="성장 진단" 넓게
      꼬리={r ? (
        <span className="text-sm text-muted-foreground">
          {r.잰편수 ? `올린 지 하루 넘은 글 ${r.잰편수}개로 계산했어요` : '계산할 글이 아직 없어요'}
        </span>
      ) : undefined}>
      <p className="mb-3 text-[0.88rem] text-pretty text-muted-foreground">
        <b className="text-foreground">이 계정의 요즘과 예전을 비교해요.</b>{' '}
        50점이면 예전과 똑같다는 뜻이고, 높을수록 성장 중, 낮을수록 하락 중입니다.
        다른 사람 계정과는 비교하지 않아요 — 그럴 만한 기준이 저희한테 없거든요.
      </p>

      {자료.error ? (
        <div className="text-sm font-semibold text-destructive">못 읽었어요 — {(자료.error as Error).message}</div>
      ) : !r ? (
        <div className="py-6 text-center text-sm text-muted-foreground">읽는 중...</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <b className={cn('text-4xl tabular-nums', 글색(r.등급?.결 ?? ''))}>{r.지수 == null ? '—' : r.지수}</b>
              <span className="text-sm font-semibold">{r.등급?.이름 ?? ''}</span>
              {r.믿음 && r.믿음.결 !== '없음' && (
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">신뢰도 {r.믿음.결}</span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {r.지수 == null ? '데이터가 아직 모자라요' : `${r.센기둥}개 항목으로 계산`}
            </div>
          </div>

          <div className="space-y-3">
            {(r.기둥 ?? []).map((ㄱ) => {
              const 있나 = Number.isFinite(ㄱ.점수)
              const 반 = 진단결(있나 ? ㄱ.점수 : null)
              return (
                <div key={ㄱ.키} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0">{ㄱ.키}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className={cn('block h-full rounded-full', 점배경(반))} style={{ width: (있나 ? ㄱ.점수 : 0) + '%' }} />
                    </span>
                    <span className={cn('w-8 shrink-0 text-right tabular-nums', !있나 && 'text-muted-foreground')}>
                      {있나 ? ㄱ.점수 : '—'}
                    </span>
                  </div>
                  <div className="pl-16 text-xs text-muted-foreground">{ㄱ.말} · {기둥풀이(ㄱ)}</div>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            {[...믿음줄, ...(r.방향 ?? [])].map((ㅂ, i) => (
              <div key={i} className="flex gap-2 border-t border-[#f1f2f4] pt-2 text-sm first:border-t-0 first:pt-0">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', 점배경(ㅂ.결))} />
                <span>
                  <b>{ㅂ.글}</b>
                  <span className="block text-muted-foreground" dangerouslySetInnerHTML={{ __html: ㅂ.할것 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </카드>
  )
}
