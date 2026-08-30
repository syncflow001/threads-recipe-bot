'use client'
// 맨 위 요약 카드 한 칸 — 고리(도넛 진행률)·배지(아이콘) 두 꼴. 수익·개요 쪽이 함께 쓴다
// (옛 설정화면-html.mjs 고리()·으뜸칸()·배지칸()·칼들·사람칼 1169~1206)
import type { ReactNode } from 'react'

const 칠 = '#2f9e74'
const 칠짙 = '#25805e'
const 칠연 = '#e4f3ec'
const 회색 = '#94a39d'
const 글 = '#1f2a37'

export function 고리({ 찬비율, 가운데, 멈춤, 크게 }: {
  찬비율: number
  가운데?: ReactNode
  멈춤?: boolean
  크게?: boolean
}) {
  const 둘레 = 2 * Math.PI * 22
  const 찬 = Math.max(0, Math.min(1, 찬비율 || 0)) * 둘레
  const 크기 = 크게 ? 58 : 52
  return (
    <svg viewBox="0 0 52 52" width={크기} height={크기} aria-hidden="true" className="shrink-0">
      <circle cx={26} cy={26} r={22} fill="none" strokeWidth={5.5} stroke={멈춤 ? 회색 : 칠연} />
      <circle cx={26} cy={26} r={22} fill="none" strokeWidth={5.5} strokeLinecap="round"
        stroke={멈춤 ? 회색 : 칠} strokeDasharray={`${찬.toFixed(1)} ${둘레.toFixed(1)}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray .35s ease' }} />
      {가운데 != null && (
        <text x={26} y={26} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={800}
          letterSpacing="-.02em" fill={멈춤 ? 회색 : 글} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {가운데}
        </text>
      )}
    </svg>
  )
}

export function 으뜸칸({ 찬비율, 큰글, 작은글, 멈춤, 고리속, 크게 }: {
  찬비율: number
  큰글: ReactNode
  작은글: ReactNode
  멈춤?: boolean
  고리속?: ReactNode
  크게?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-sm">
      <고리 찬비율={찬비율} 가운데={고리속} 멈춤={멈춤} 크게={크게} />
      <div className="min-w-0">
        <b className={'block [overflow-wrap:anywhere] tracking-[-0.03em] leading-tight tabular-nums ' + (크게 ? 'text-[1.6rem]' : 'text-[1.4rem]')}>{큰글}</b>
        <span className="block text-[0.78rem] leading-snug text-muted-foreground">{작은글}</span>
      </div>
    </div>
  )
}

// 팔로워는 고리를 안 쓴다. 채워야 할 목표가 없고, 늘었나 줄었나가 본질이다
export const 사람칼 = (
  <path d="M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM18 8.5h4M20 6.5v4" />
)

// ⚠️ 고리는 「몇 %를 채웠나」가 있는 값에만 쓴다. 목표가 없는 값에 그리면
// 텅 빈 회색 원이 되어 아무 뜻도 없이 자리만 먹는다 (실측)
export const 칼들 = {
  돈: <><rect x={2} y={6} width={20} height={12} rx={2} /><circle cx={12} cy={12} r={3} /><path d="M6 12h.01M18 12h.01" /></>,
  추세: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  클릭: <><path d="M9 4v10.5l2.5-2.2 2 4.7 2.2-1-2-4.6 3.3-.4z" /><path d="M4 9H2M6.5 4.5L5 3M9 2v-.5M13.5 4.5L15 3" /></>,
  장바구니: <><path d="M3 4h2l2.5 11h10L20 7H6" /><circle cx={9} cy={19} r={1.6} /><circle cx={17} cy={19} r={1.6} /></>,
  영수증: <><path d="M5 3v18l2.5-1.6L10 21l2-1.6L14 21l2.5-1.6L19 21V3z" /><path d="M9 8h6M9 12h6" /></>,
}

export function 배지칸({ 칼, 큰글, 작은글, 크게 }: {
  칼: ReactNode
  큰글: ReactNode
  작은글: ReactNode
  크게?: boolean
}) {
  const 크기 = 크게 ? 58 : 52
  const 아이콘크기 = 크게 ? 26 : 24
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-sm">
      <span className="inline-flex shrink-0 items-center justify-center rounded-2xl"
        style={{ width: 크기, height: 크기, background: 칠연, color: 칠짙 }}>
        <svg viewBox="0 0 24 24" width={아이콘크기} height={아이콘크기} aria-hidden="true" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {칼}
        </svg>
      </span>
      <div className="min-w-0">
        <b className={'block [overflow-wrap:anywhere] tracking-[-0.03em] leading-tight tabular-nums ' + (크게 ? 'text-[1.6rem]' : 'text-[1.4rem]')}>{큰글}</b>
        <span className="block text-[0.78rem] leading-snug text-muted-foreground">{작은글}</span>
      </div>
    </div>
  )
}
