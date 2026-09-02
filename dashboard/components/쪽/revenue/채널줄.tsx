'use client'
// 지금 보고 있는 수익이 **어느 제휴 채널 것인지** 한 줄로 알린다 (2026-08-30).
// 전에는 계정을 바꿔도 화면이 똑같아, 보고 있는 숫자가 누구 것인지 알 길이 없었다.
// ⚠️ 딱지 이름과 **숫자의 출처를 따로 말한다.** 「라쿠텐」 딱지 밑에 쿠팡 숫자를 두면 거짓말이다

type 채널꼴 = { 이름: string; 고른것: string; 출처: string; 빌려옴: boolean }

export function 채널줄({ 정보 }: { 정보?: 채널꼴 }) {
  if (!정보) return null
  const { 이름, 고른것, 출처, 빌려옴 } = 정보
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">{이름}</span>
      <span className="text-[0.86rem] text-muted-foreground">
        {빌려옴
          ? <>이 계정은 <b>{고른것}</b> 을 골랐지만 <b>아직 그쪽에서 들어온 수익이 없어요.</b>{' '}
              아래 숫자는 <b>{출처}</b> 실적입니다.</>
          : 고른것 === '없음'
            ? <>이 계정은 제휴사를 <b>「없음」</b> 으로 두었어요. <b>{출처}</b> 실적을 그대로 보여 드립니다.</>
            : <><b>{출처}</b> 실적입니다.</>}
      </span>
    </div>
  )
}
