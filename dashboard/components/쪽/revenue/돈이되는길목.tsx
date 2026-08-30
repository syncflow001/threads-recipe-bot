'use client'
// 「돈이 되는 길목」 카드 — 길목마다의 전환 지표 6개(옛 HTML 887~892, JS 1357~1377)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 돈 } from '@/lib/글자'

type 전환자료 = {
  클릭당수익?: number | null
  백클릭당주문?: number | null
  주문당거래액?: number | null
  수수료율?: number | null
  취소율?: number | null
}
type 자료꼴 = {
  전환?: 전환자료 | null
  벌이?: { 비율?: number | null; 전체?: number; 있는날?: number }
}

const 없는값 = <span className="block text-[1rem] font-semibold text-muted-foreground">아직 없음</span>

function 길목({ 이름, 값, 풀이 }: { 이름: string; 값?: string | null; 풀이: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3.5 py-3">
      <span className="block text-[0.76rem] font-semibold text-muted-foreground">{이름}</span>
      {값 == null ? 없는값 : <span className="block text-[1.35rem] font-extrabold tracking-[-0.03em]">{값}</span>}
      <span className="mt-0.5 block text-[0.72rem] leading-relaxed text-muted-foreground">{풀이}</span>
    </div>
  )
}

export function 돈이되는길목({ 자료 }: { 자료?: 자료꼴 }) {
  const ㅈ = 자료?.전환

  return (
    <카드 제목="돈이 되는 길목">
      <귀띔>총액만 보면 <b>클릭은 느는데 왜 돈이 안 느는지</b> 알 수 없어요.
        클릭 → 주문 → 거래액 → 수수료로 이어지는 길목마다 비율을 냅니다.</귀띔>
      {!ㅈ ? (
        <div className="py-6 text-center text-sm text-muted-foreground">쿠팡 실적을 못 받아서 계산할 수 없어요.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2.5">
          <길목 이름="클릭당 수익" 값={ㅈ.클릭당수익 == null ? null : '₩' + ㅈ.클릭당수익}
            풀이="한 번 눌릴 때마다 이만큼 법니다. 글 하나 더 올릴 값어치예요." />
          <길목 이름="100클릭당 주문" 값={ㅈ.백클릭당주문 == null ? null : ㅈ.백클릭당주문 + '건'}
            풀이="100번 눌러 몇 건이 팔리는지. 낮으면 상품이 글과 안 맞는 겁니다." />
          <길목 이름="주문당 거래액" 값={ㅈ.주문당거래액 == null ? null : 돈(ㅈ.주문당거래액)}
            풀이="한 건에 얼마짜리를 사는지. 싼 것만 팔리면 클릭이 많아도 돈이 안 돼요." />
          <길목 이름="수수료율" 값={ㅈ.수수료율 == null ? null : ㅈ.수수료율 + '%'}
            풀이="거래액에서 우리 몫이 몇 %인지. 쿠팡 기본은 3%쯤입니다." />
          <길목 이름="취소율" 값={ㅈ.취소율 == null ? null : ㅈ.취소율 + '%'}
            풀이="높으면 수수료가 왜 안 느는지 이걸로 설명됩니다." />
          <길목 이름="벌이 난 날" 값={자료?.벌이?.비율 == null ? null : 자료.벌이.비율 + '%'}
            풀이={`${자료?.벌이?.전체 ?? 0}일 가운데 ${자료?.벌이?.있는날 ?? 0}일에 돈이 들어왔어요.`} />
        </div>
      )}
    </카드>
  )
}
