'use client'
// 날짜별 수익·클릭 복합 SVG — 막대(수익, 오른쪽 축) + 선(클릭, 왼쪽 축), 말풍선은 우리가 직접 그린다
// (옛 수익막대그리기() 설정화면-html.mjs 1416~1517)
// ★ 축을 하나로 두면 안 된다. 수익은 만 단위, 클릭은 백 단위라 한 축에 얹으면
//   작은 쪽이 바닥에 눌려 아무것도 안 보인다. 좌우로 나눠 각자 제 최대에 맞춘다
import { useState, type PointerEvent } from 'react'
import { 돈 } from '@/lib/글자'

type 하루치 = { 날짜: string; 수수료: number; 클릭: number; 주문: number; 거래액: number; 취소: number }

const 강조 = '#c2410c'
const 칠 = '#2f9e74'

export function 실적그림({ 자료 }: { 자료: 하루치[] }) {
  const 다 = 자료
  const 폭 = 1000
  const 높 = 270
  const 여백 = { 위: 16, 아래: 30, 왼: 46, 오: 62 }
  const 그릴폭 = 폭 - 여백.왼 - 여백.오
  const 바닥 = 높 - 여백.아래
  const 그릴높 = 바닥 - 여백.위
  const 최대수익 = Math.max(1, ...다.map((d) => Math.abs(d.수수료 || 0)))
  const 최대클릭 = Math.max(1, ...다.map((d) => d.클릭 || 0))
  // 눈금 숫자가 1,234 처럼 들쭉날쭉하면 읽기 나쁘다. 위로 올려 반듯한 수로 맞춘다
  const 반듯 = (n: number) => { const 자리 = 10 ** Math.floor(Math.log10(n)); return Math.ceil(n / 자리) * 자리 }
  const 수익끝 = 반듯(최대수익)
  const 클릭끝 = 반듯(최대클릭)
  const 칸폭 = 그릴폭 / 다.length
  const x = (i: number) => 여백.왼 + 칸폭 * (i + 0.5)
  const y수익 = (v: number) => 바닥 - (Math.abs(v) / 수익끝) * 그릴높
  const y클릭 = (v: number) => 바닥 - (v / 클릭끝) * 그릴높
  // 막대가 너무 두꺼우면 선이 가리고, 너무 가늘면 안 보인다. 칸의 절반쯤이 알맞다
  const 막대폭 = Math.max(2, Math.min(22, 칸폭 * 0.55))
  const 걸음 = Math.max(1, Math.ceil(다.length / 6))

  const [말풍선, 말풍선담기] = useState<{ i: number; left: number; top: number; 아래: boolean } | null>(null)

  const 포인터이동 = (e: PointerEvent<SVGSVGElement>) => {
    const 칸 = (e.target as Element).closest?.('[data-i]')
    if (!칸) { 말풍선담기(null); return }
    const i = Number(칸.getAttribute('data-i'))
    const d = 다[i]
    // 칸의 가운데 위에 띄운다. viewBox 좌표를 화면 좌표로 옮긴다
    const 틀 = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const 가로 = 틀.width / 폭
    const 꼭대기 = Math.min(y수익(d.수수료 || 0), y클릭(d.클릭 || 0)) * (틀.height / 높)
    말풍선담기({ i, left: (여백.왼 + 칸폭 * (i + 0.5)) * 가로, top: 꼭대기, 아래: 꼭대기 < 96 })
  }

  const d = 말풍선 ? 다[말풍선.i] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${폭} ${높}`} preserveAspectRatio="none" role="img" aria-label="날짜별 수익과 클릭"
        className="block w-full" style={{ height: 270, overflow: 'visible' }}
        onPointerMove={포인터이동} onPointerLeave={() => 말풍선담기(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = 바닥 - t * 그릴높
          return (
            <g key={t}>
              <line x1={여백.왼} y1={yy} x2={폭 - 여백.오} y2={yy} stroke="var(--border)" strokeWidth={1} />
              <text x={여백.왼 - 6} y={yy + 4} textAnchor="end" fontSize={11}
                fontFamily="ui-monospace,Menlo,monospace" fill={칠}>
                {Math.round(클릭끝 * t).toLocaleString('ko-KR')}
              </text>
              <text x={폭 - 여백.오 + 6} y={yy + 4} fontSize={11}
                fontFamily="ui-monospace,Menlo,monospace" fill={강조}>
                {Math.round(수익끝 * t).toLocaleString('ko-KR')}
              </text>
            </g>
          )
        })}
        {다.map((dd, i) => {
          const 높이 = Math.max(dd.수수료 ? 1.5 : 0, 바닥 - y수익(dd.수수료 || 0))
          return <rect key={'막대' + i} x={x(i) - 막대폭 / 2} y={바닥 - 높이} width={막대폭} height={높이}
            rx={2} fill={강조} opacity={0.85} />
        })}
        <polyline points={다.map((dd, i) => `${x(i).toFixed(1)},${y클릭(dd.클릭 || 0).toFixed(1)}`).join(' ')}
          fill="none" stroke={칠} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* 날짜가 많으면 점을 다 찍을 수 없다. 서른 개 넘으면 선만 그린다 */}
        {다.length <= 30 && 다.map((dd, i) => (
          <circle key={'점' + i} cx={x(i)} cy={y클릭(dd.클릭 || 0)} r={3} fill="var(--card)" stroke={칠} strokeWidth={2} />
        ))}
        {다.map((dd, i) => (i % 걸음 === 0 || i === 다.length - 1) ? (
          <text key={'눈' + i} textAnchor="middle" x={x(i)} y={높 - 10} fontSize={11}
            fontFamily="ui-monospace,Menlo,monospace" fill="var(--muted-foreground)">
            {dd.날짜.slice(5).replace('-', '/')}
          </text>
        ) : null)}
        {/* 날짜마다 투명한 세로 칸을 깔아 막대·점이 아니라 그 칸 어디에 올려도 뜨게 한다 */}
        {다.map((_dd, i) => (
          <rect key={'칸' + i} data-i={i} x={여백.왼 + 칸폭 * i} y={여백.위} width={칸폭} height={그릴높}
            fill={말풍선?.i === i ? 'rgba(47,158,116,.08)' : 'transparent'} />
        ))}
      </svg>
      {d && (
        <div className="pointer-events-none absolute z-[3] rounded-[10px] px-[0.7rem] py-2 text-[0.82rem] leading-relaxed whitespace-nowrap shadow-lg"
          style={{
            background: '#1f2a37', color: '#fff', left: 말풍선!.left, top: 말풍선!.top,
            transform: 말풍선!.아래 ? 'translate(-50%,12px)' : 'translate(-50%,calc(-100% - 10px))',
          }}>
          <b className="mb-1.5 block text-[0.78rem] opacity-75">{d.날짜.slice(5).replace('-', '월 ') + '일'}</b>
          <span className="mr-1.5 inline-block h-[0.6rem] w-[0.6rem] rounded-sm align-[-1px]" style={{ background: 칠 }} />
          클릭 {(d.클릭 || 0).toLocaleString('ko-KR')}<br />
          <span className="mr-1.5 inline-block h-[0.6rem] w-[0.6rem] rounded-sm align-[-1px]" style={{ background: '#94a39d' }} />
          매출 {돈(d.거래액 || 0)} · 주문 {d.주문 || 0}{d.취소 ? ' · 취소 ' + d.취소 : ''}<br />
          <span className="mr-1.5 inline-block h-[0.6rem] w-[0.6rem] rounded-sm align-[-1px]" style={{ background: 강조 }} />
          수익 {돈(d.수수료 || 0)}
        </div>
      )}
    </div>
  )
}
