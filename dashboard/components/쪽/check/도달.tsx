'use client'
// 도달 카드 — 매일 아침 감시기가 쌓은 추이와, 사람이 누르는 기준값 다시 측정
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { use자료, use계정 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { cn } from '@/lib/utils'

type 도달줄 = { 날짜: string; 계정: string; 지금: number; 기준선: number; 비율: number; 표본: number }
type 도달자료 = { 줄들: 도달줄[]; 마지막: 도달줄 | null }

// 100 이 「평소만큼」이다. 70 아래로 내려가면 조용한 축소를 의심할 만하다
const 결 = (비율: number) => (비율 >= 100 ? '좋음' : 비율 >= 70 ? '보통' : '나쁨')
const 글색 = (ㄱ: string) =>
  ㄱ === '좋음' ? 'text-green-600' : ㄱ === '나쁨' ? 'text-destructive' : 'text-foreground'
const 막대색 = (ㄱ: string) =>
  ㄱ === '좋음' ? 'bg-green-600' : ㄱ === '나쁨' ? 'bg-destructive' : 'bg-muted-foreground'

const 날짜꼴 = (날짜: string) => 날짜.slice(5).replace('-', '.')
const 숫자꼴 = (n: number) => Math.round(n).toLocaleString('ko-KR')

export function 도달() {
  const 계정 = use계정()
  const 자료 = use자료<도달자료>('/reach-history')
  const [알림, 알림담기] = useState('')

  const 다시측정 = async () => {
    if (!confirm('지금 조회수로 기준값을 다시 측정합니다. 전에 측정한 기준값을 덮어씁니다.')) return
    알림담기('재는 중...')
    try {
      const r = await 부르기<{ 모자람?: boolean; 표본: number; 기준선?: number }>('/reach-baseline', {}, 계정)
      알림담기(r.모자람
        ? `데이터 부족 (${r.표본}편) — 글을 더 올린 뒤 다시 눌러 주세요`
        : `새 기준값 ${숫자꼴(r.기준선 as number)} (${r.표본}편으로 쟀어요)`)
      자료.refetch()
    } catch (e) {
      알림담기(`못 쟀어요 — ${(e as Error).message}`)
    }
  }

  const r = 자료.data
  const 마지막 = r?.마지막 ?? null
  // 막대 높이는 150% 를 천장으로 삼는다. 어쩌다 튄 하루가 나머지를 다 눌러버리면 추이가 안 보인다
  const 높이 = (비율: number) => `${Math.max(4, Math.min(100, (비율 / 150) * 100))}%`

  return (
    <카드 제목="도달" 넓게 단추={
      <button type="button" onClick={다시측정}
        className="shrink-0 rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold">
        기준값 다시 측정
      </button>
    }>
      <귀띔>
        <b className="text-foreground">이 계정 글이 평소만큼 사람들한테 닿고 있는지 봐요.</b>{' '}
        제재는 계정을 막는 것부터 오지 않고, 말없이 도달을 줄이는 것부터 옵니다.
        매일 아침 8시 10분에 저절로 재서 아래에 쌓아요. 100%면 평소와 같다는 뜻입니다.
      </귀띔>

      {자료.error ? (
        <div className="text-sm font-semibold text-destructive">못 읽었어요 — {(자료.error as Error).message}</div>
      ) : !r ? (
        <div className="py-6 text-center text-sm text-muted-foreground">읽는 중...</div>
      ) : !마지막 ? (
        <div className="rounded-xl border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          도달 기준값을 아직 측정 안 했습니다. 글이 5편 넘게 쌓이면 내일 아침 첫 판에 저절로 재서 여기에 뜹니다.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border bg-muted/40 p-4">
            <b className={cn('text-4xl tabular-nums', 글색(결(마지막.비율)))}>{마지막.비율}%</b>
            <span className="text-sm text-muted-foreground">
              최근 {마지막.표본}편 {숫자꼴(마지막.지금)}회 · 평소 기준 {숫자꼴(마지막.기준선)}회
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{날짜꼴(마지막.날짜)} 잼</span>
          </div>

          <div>
            <div className="flex h-24 items-end gap-1">
              {r.줄들.map((줄) => (
                <div key={줄.날짜} className="group relative flex h-full flex-1 items-end"
                  title={`${날짜꼴(줄.날짜)} — ${줄.비율}% (${숫자꼴(줄.지금)}회, ${줄.표본}편)`}>
                  <div className={cn('w-full rounded-t transition-opacity group-hover:opacity-70', 막대색(결(줄.비율)))}
                    style={{ height: 높이(줄.비율) }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{날짜꼴(r.줄들[0].날짜)}</span>
              <span>최근 {r.줄들.length}일</span>
              <span>{날짜꼴(r.줄들[r.줄들.length - 1].날짜)}</span>
            </div>
          </div>
        </div>
      )}

      {알림 && <p className="mt-3 text-sm font-semibold">{알림}</p>}
    </카드>
  )
}
