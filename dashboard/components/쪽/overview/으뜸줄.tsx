'use client'
// 개요 으뜸줄 5칸 — 오늘 올린 글·7일 성공률·다음 발행·팔로워·이번 달 수익(옛 으뜸그리기() 1221~1276)
// /schedule·/followers·/revenue 세 자료 중 온 것만 그린다 — 없는 칸을 0으로 채우지 않는다(옛 그대로)
import type { ReactNode } from 'react'
import { 으뜸칸, 배지칸, 사람칼 } from '@/components/공용/으뜸칸'
import { 돈 } from '@/lib/글자'
import type { 발행격자자료 } from '@/components/공용/발행격자'

type 팔로워증감 = { 옛날짜: string; 차: number; 비율: number | null } | null
export type 팔로워자료 = { 지금: number | null; 이레: 팔로워증감; 열쇠없음: boolean }
export type 수익자료 = { 이번달?: number; 클릭?: number; 안됨?: string; 달성?: { 비율: number } | null }

// 시각표에 적힌 시각 가운데 지금 다음에 오는 것. 24 는 밤 12시라 0 으로 본다(옛 2459~2464줄 그대로)
export function 다음시각(시각들: number[]): string {
  if (!시각들.length) return '꺼짐'
  const 줄 = [...new Set(시각들.map((h) => h % 24))].sort((a, b) => a - b)
  const 이따 = 줄.find((h) => h > new Date().getHours())
  return 이따 === undefined
    ? '내일 ' + String(줄[0]).padStart(2, '0') + '시'
    : String(이따).padStart(2, '0') + '시'
}

// 늘고 준 것을 부호·색과 함께. 0 은 「그대로」라고 쓴다 — +0 은 읽기 나쁘다(옛 1211~1219줄).
// 초록·빨강은 옛 .늚/.줆(154~155줄)을 text-green-700/text-red-700 으로 옮긴 것 — 발행격자.tsx 와 같은 색 관용구를 쓴다
// ⚠️ 「이레 전과 견준다」고 쓰지 마라. 쌓인 날이 이틀뿐이면 실제로는 하루 전과 견준 것이다.
// 견준 날을 그대로 적는다 — 그래야 사용자가 무엇과 무엇을 견줬는지 안다
export function 증감글(ㅈ: 팔로워증감): ReactNode {
  if (!ㅈ) return '팔로워 — 아직 비교할 날이 없어요'
  const 날 = ㅈ.옛날짜.slice(5).replace('-', '/')
  if (ㅈ.차 === 0) return '팔로워 — ' + 날 + ' 이후 그대로'
  const 늚 = ㅈ.차 > 0
  const 부호 = 늚 ? '+' : '−'
  return (
    <>팔로워 <span className={늚 ? 'text-green-700' : 'text-red-700'}>
      {부호 + Math.abs(ㅈ.차).toLocaleString('ko-KR') + (ㅈ.비율 == null ? '' : ' (' + 부호 + Math.abs(ㅈ.비율) + '%)')}
    </span> · {날} 이후</>
  )
}

export function 으뜸줄({ 시각표, 팔로워, 수익 }: {
  시각표?: 발행격자자료
  팔로워?: 팔로워자료
  수익?: 수익자료
}) {
  const 칸들: ReactNode[] = []

  if (시각표) {
    // ① 오늘 몇 편 올라갔나
    const 오늘줄 = (시각표.줄 ?? [])[0]
    const 예정 = (오늘줄?.칸 ?? []).length
    const 올림 = (오늘줄?.칸 ?? []).filter((c) => c.상태 === '올림').length
    칸들.push(
      <으뜸칸 key="오늘" 찬비율={예정 ? 올림 / 예정 : 0} 큰글={올림 + ' / ' + 예정 + '편'}
        작은글="오늘 올린 글" 멈춤={!예정} />
    )

    // ② 최근 7일 성공률
    const 셀줄 = 시각표.첫판날짜 ? (시각표.줄 ?? []).filter((줄) => 줄.날짜 >= 시각표.첫판날짜!) : (시각표.줄 ?? [])
    const 다 = 셀줄.flatMap((줄) => 줄.칸)
    const 지남 = 다.filter((c) => c.상태 !== '아직' && c.상태 !== '기록없음')
    const 됨 = 지남.filter((c) => c.상태 === '올림').length
    칸들.push(
      지남.length ? (
        <으뜸칸 key="성공률" 찬비율={됨 / 지남.length} 큰글={Math.round((됨 / 지남.length) * 100) + '%'}
          작은글={'7일 성공률 (' + 됨 + '/' + 지남.length + ')'} />
      ) : (
        <으뜸칸 key="성공률" 찬비율={0} 큰글="—" 작은글="7일 성공률 (측정 없음)" 멈춤 />
      )
    )

    // ③ 다음 발행까지 얼마나 남았나
    const 다음 = 다음시각(시각표.시각들)
    칸들.push(
      <으뜸칸 key="다음발행" 찬비율={시각표.시각들.length ? 1 : 0} 큰글={시각표.시각들.length ? 다음 : '꺼짐'}
        작은글={시각표.시각들.length ? '다음 발행' : '자동 발행이 꺼져 있습니다'} 멈춤={!시각표.시각들.length} />
    )
  }

  if (팔로워) {
    // ④ 팔로워
    칸들.push(
      <배지칸 key="팔로워" 칼={사람칼}
        큰글={팔로워.지금 == null ? '—' : Number(팔로워.지금).toLocaleString('ko-KR')}
        작은글={팔로워.열쇠없음 ? '팔로워 — 이 계정 열쇠가 없습니다'
          : 팔로워.지금 == null ? '팔로워 — 아직 못 읽었습니다' : 증감글(팔로워.이레)} />
    )
  }

  if (수익) {
    // ⑤ 이번 달 수익. 달성률은 고리 안에 넣는다 — 큰 글에 붙였더니 카드가 좁아 줄이 바뀌었다(실측)
    const ㄷ = 수익.달성
    칸들.push(
      <으뜸칸 key="수익" 찬비율={ㄷ ? ㄷ.비율 / 100 : 0} 큰글={돈(수익.이번달 ?? 0)}
        작은글={'이번 달 클릭 ' + Number(수익.클릭 ?? 0).toLocaleString('ko-KR') + '회'}
        멈춤={!!수익.안됨 || !ㄷ} 고리속={ㄷ ? Math.round(ㄷ.비율) + '%' : null} />
    )
  }

  if (!칸들.length) return null

  return (
    <div className="grid grid-cols-1 gap-2.5 min-[601px]:grid-cols-2 sm:grid-cols-[1.25fr_1.25fr_1.25fr_1fr_1fr] sm:gap-3">
      {칸들}
    </div>
  )
}
