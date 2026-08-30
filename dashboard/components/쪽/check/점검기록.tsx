'use client'
// 점검 기록 카드 — 점검이 잡아낸 문제의 생김·고쳐짐 이력(/inspect-log, src/점검기록.mjs)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'
import { 짧은때 } from '@/lib/글자'
import { cn } from '@/lib/utils'

type 점검기록줄 = {
  때: string; 일: '생김' | '고쳐짐'; 갈래: string; 무엇: string; 원인?: string; 심각도: '높음' | '보통'; 열쇠: string
}

// 내부 갈래 이름을 그대로 화면에 안 찍는다 — 사람이 읽는 말로 바꾼다
const 갈래말: Record<string, string> = {
  예약살았나: '예약이 내려가 있습니다',
  있어야할것: '예약이 없습니다',
  켜뒀는데안돎: '켜져 있는데 흔적이 없습니다',
  발행: '발행이 안 됐습니다',
  마지막으로돈때: '오래 흔적이 없습니다',
  열쇠: '열쇠에 이상이 있습니다',
}

export function 점검기록() {
  const 자료 = use자료<{ 이력: 점검기록줄[] }>('/inspect-log')
  const 줄들 = 자료.data?.이력 ?? []

  return (
    <카드 제목="점검 기록">
      <귀띔>점검이 이상을 찾았을 때(빨강)와 이상이 없어졌을 때(초록)를 남깁니다. 최신 순입니다.</귀띔>
      {자료.error ? (
        <div className="text-sm font-semibold text-destructive">못 읽었어요 — {(자료.error as Error).message}</div>
      ) : !자료.data ? (
        <div className="text-sm text-muted-foreground">살펴보는 중...</div>
      ) : !줄들.length ? (
        <div className="text-sm text-muted-foreground">아직 기록이 없습니다.</div>
      ) : (
        줄들.map((h, i) => (
          <div key={i} className="border-t border-[#eef0f3] py-2 text-sm first:border-t-0">
            <span className="text-muted-foreground">{짧은때(h.때)}</span>{' '}
            <b className={cn(h.일 === '생김' ? 'text-destructive' : 'text-green-600')}>
              {h.일 === '생김' ? '생김' : '고쳐짐'}
            </b>
            {' · '}{갈래말[h.갈래] ?? h.갈래}
            <div>{h.무엇}</div>
            {h.원인 && <div className="text-muted-foreground">→ {h.원인}</div>}
          </div>
        ))
      )}
    </카드>
  )
}
