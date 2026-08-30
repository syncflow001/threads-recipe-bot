'use client'
// 발행 격자 표 — 시각별 칸 그리기(옛 격자그리기() 2309~2338, 표시 1550~1552). 개요·발행 이력이 같이 쓴다
import { 이틀 } from '@/lib/글자'

export type 발행칸 = { 시: number; 분: number; 상태: string; 때?: string }
export type 발행줄 = { 날짜: string; 요일: string; 칸: 발행칸[] }
export type 발행격자자료 = {
  시각들: number[]
  칸들: { 시: number; 분: number }[]
  줄: 발행줄[]
  첫판날짜?: string | null
}

const 표시: Record<string, [string, string]> = {
  올림: ['●', 'text-green-700'],
  못올림: ['◌', 'text-neutral-400'],
  건너뜀: ['⏸', 'text-neutral-400'],
  실패: ['✕', 'text-red-700'],
  기록없음: ['○', 'text-neutral-400'],
  아직: ['○', 'text-neutral-400'],
}

// 첫판날짜자르기 는 기록 쪽(발행이력.tsx)만 켠다 — 옛 격자그리기()(개요, 2309~2338)는 g.줄 을 안 잘랐고,
// 기록그리기()(기록 쪽)만 계정이 생기기 전 날을 잘라 「못 올림」으로 안 세었다. 기본값 false 로 옛 개요 그대로 둔다
export function 발행격자({ 자료, 첫판날짜자르기 = false }: { 자료: 발행격자자료; 첫판날짜자르기?: boolean }) {
  const 줄들 = 첫판날짜자르기 && 자료.첫판날짜 ? 자료.줄.filter((줄) => 줄.날짜 >= 자료.첫판날짜!) : 자료.줄

  return (
    <table className="w-full text-sm">
      <tbody>
        <tr>
          <td></td>
          {(자료.칸들 ?? []).map((c, i) => (
            <td key={i} className="text-xs text-muted-foreground">{이틀(c.시)}:{이틀(c.분)}</td>
          ))}
        </tr>
        {줄들.map((줄) => (
          <tr key={줄.날짜}>
            <td className="text-xs text-muted-foreground whitespace-nowrap">
              {줄.날짜.slice(5).replace('-', '/')} ({줄.요일})
            </td>
            {줄.칸.map((c, i) => {
              const [글자, 색] = 표시[c.상태] || ['○', 'text-neutral-400']
              return (
                <td key={i}>
                  <span className={'text-lg leading-none ' + 색} title={c.상태 + (c.때 ? ' ' + c.때 : '')}>
                    {글자}
                  </span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
