'use client'
// 고른 분야 × 언어 × 제휴 조합이 실제로 돌아가는지 알려 준다(옛 설정화면-html.mjs 2524~2545) — 마법사와 계정 수정판이 함께 쓴다
import type { ReactNode } from 'react'

export const 경고칸 = 'rounded-lg border border-amber-300 bg-amber-50 p-2 text-[0.86rem] text-amber-900 text-pretty'

export function 조합안내({ 분야, 언어, 제휴, 조합들, 머리말 = '만들 수는 있지만' }: {
  분야: string
  언어: string
  제휴: string
  조합들: { 분야: string; 언어: string }[]
  머리말?: string
}) {
  const 안됨: ReactNode[] = []
  // 팩이 없거나 링크를 못 만드는 것만 「아직 안 돌아갑니다」 머리말을 붙인다. 제휴 「없음」은 고른 대로 도는 것이라 안 붙인다
  let 경고인가 = false
  if (!조합들.some((c) => c.분야 === 분야 && c.언어 === 언어)) {
    경고인가 = true
    const 그언어 = [...new Set(조합들.filter((c) => c.언어 === 언어).map((c) => c.분야))]
    안됨.push(그언어.length
      ? <><b>{분야} × {언어}</b> 팩이 아직 없습니다 ({언어} 로 되는 분야: {그언어.join('·')})</>
      : <><b>{언어}</b> 로 되는 분야가 아직 하나도 없습니다</>)
  }
  if (제휴 !== '쿠팡파트너스' && 제휴 !== '없음') {
    경고인가 = true
    안됨.push(<><b>{제휴}</b> 는 아직 링크를 못 만듭니다. 제휴를 「없음」으로 두면 링크 없이 돕니다</>)
  }
  if (제휴 === '없음') {
    안됨.push(<>제휴가 「없음」이라 <b>링크·광고 표기·대가성 문구를 안 붙입니다.</b> 계정만 키웁니다</>)
  }
  if (!안됨.length) return null
  return (
    <div className={경고칸}>
      {경고인가 && <>{머리말} <b>아직 안 돌아갑니다.</b><br /></>}
      {안됨.map((줄, i) => <span key={i} className="block">{줄}</span>)}
    </div>
  )
}
