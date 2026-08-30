'use client'
// 팔로워 추이 꺾은선 SVG — 옛 팔로워그리기() 안의 SVG 조립(설정화면-html.mjs 2207~2271)을 그대로 옮긴다.
// 최솟값을 바닥으로 잡아 미세 변화도 보이게 한다(막대로 그리면 1113 → 1115 가 같은 높이로 보인다)
type 하루치 = { 날: string; 수: number }

export function 팔로워추이차트({ 줄들 }: { 줄들: 하루치[] }) {
  const 값들 = 줄들.map((r) => r.수)
  const 최소 = Math.min(...값들)
  const 최대 = Math.max(...값들)
  const 폭 = 1000
  const 높 = 180
  const 여백 = { 위: 14, 아래: 26, 왼: 52, 오: 12 }
  const 그릴폭 = 폭 - 여백.왼 - 여백.오
  const 그릴높 = 높 - 여백.위 - 여백.아래
  // 값이 하나도 안 변한 구간이면 나누기가 0 이 된다. 그때는 가운데 선으로 그린다
  const 폭차 = 최대 - 최소
  const x = (i: number) => 여백.왼 + (줄들.length === 1 ? 그릴폭 / 2 : (i / (줄들.length - 1)) * 그릴폭)
  const y = (v: number) => 여백.위 + (폭차 === 0 ? 그릴높 / 2 : (1 - (v - 최소) / 폭차) * 그릴높)

  const 점들 = 줄들.map((r, i) => x(i).toFixed(1) + ',' + y(r.수).toFixed(1)).join(' ')
  const 바닥 = 높 - 여백.아래
  const 면 = 여백.왼 + ',' + 바닥 + ' ' + 점들 + ' ' + x(줄들.length - 1).toFixed(1) + ',' + 바닥

  // 날짜 눈금은 다섯 개까지만. 서른 개를 다 적으면 글자가 겹친다
  const 걸음 = Math.max(1, Math.ceil(줄들.length / 5))
  const 보임 = (i: number) => i % 걸음 === 0 || i === 줄들.length - 1

  return (
    <svg viewBox={`0 0 ${폭} ${높}`} preserveAspectRatio="none" role="img" aria-label="팔로워 추이"
      style={{ width: '100%', height: 180, display: 'block', overflow: 'visible' }}>
      <line x1={여백.왼} y1={여백.위} x2={폭 - 여백.오} y2={여백.위} stroke="var(--border)" strokeWidth={1} />
      <line x1={여백.왼} y1={바닥} x2={폭 - 여백.오} y2={바닥} stroke="var(--border)" strokeWidth={1} />
      {/* 값이 하나도 안 변한 구간이면 위아래 눈금이 같은 숫자로 두 번 찍힌다. 하나만 그린다 */}
      {폭차 === 0 ? (
        <text x={4} y={여백.위 + 그릴높 / 2 + 4} fill="var(--muted-foreground)" fontSize={11} fontFamily="ui-monospace,Menlo,monospace">
          {최소.toLocaleString('ko-KR')}
        </text>
      ) : (
        <>
          <text x={4} y={여백.위 + 4} fill="var(--muted-foreground)" fontSize={11} fontFamily="ui-monospace,Menlo,monospace">
            {최대.toLocaleString('ko-KR')}
          </text>
          <text x={4} y={바닥 + 4} fill="var(--muted-foreground)" fontSize={11} fontFamily="ui-monospace,Menlo,monospace">
            {최소.toLocaleString('ko-KR')}
          </text>
        </>
      )}
      <polygon points={면} fill="#16a34a" opacity={0.12} />
      <polyline points={점들} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {줄들.map((r, i) => 보임(i) ? (
        <circle key={'점' + i} cx={x(i).toFixed(1)} cy={y(r.수).toFixed(1)} r={3.5} fill="var(--card)" stroke="#16a34a" strokeWidth={2.5}>
          <title>{r.날 + ' · ' + r.수.toLocaleString('ko-KR') + '명'}</title>
        </circle>
      ) : null)}
      {줄들.map((r, i) => 보임(i) ? (
        <text key={'눈' + i} textAnchor="middle" x={x(i).toFixed(1)} y={높 - 8}
          fill="var(--muted-foreground)" fontSize={11} fontFamily="ui-monospace,Menlo,monospace">
          {r.날.slice(5)}
        </text>
      ) : null)}
    </svg>
  )
}
