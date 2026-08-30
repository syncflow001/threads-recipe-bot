'use client'
// 글별 성과 카드 — 성적 표 + 늚 배지(옛 HTML 1053~1064, JS 2141~2157)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'
import type { 성적자료 } from './성과측정'

const 셈꼴 = (v?: number | null) => v == null ? '—' : Number(v).toLocaleString('ko-KR')

function 값칸({ 지금값, 늘값 }: { 지금값?: number | null; 늘값?: number | null }) {
  return (
    <td className="whitespace-nowrap font-mono text-[0.81rem]">
      {셈꼴(지금값)}
      {늘값 ? <span className="ml-1 font-bold text-green-700">+{Number(늘값).toLocaleString('ko-KR')}</span> : null}
    </td>
  )
}

export function 글별성과({ 자료, 에러 }: { 자료?: 성적자료; 에러?: unknown }) {
  const 것들 = 자료?.것들 ?? []

  return (
    <카드 제목="글별 성과" 넓게 꼬리={<span>{것들.length ? 것들.length + '편' : ''}</span>}>
      <귀띔>최근에 올린 글이 지금 어디까지 갔는지예요.
        옆에 붙은 초록 숫자는 <b>처음 측정했을 때보다 늘어난 만큼</b>이에요.</귀띔>
      {에러 ? (
        <div className="text-sm text-muted-foreground">못 읽었어요 — {(에러 as Error).message}</div>
      ) : (
        <굴림칸>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th>올린 때</th><th>조회</th><th>좋아요</th><th>답글</th>
                <th>리포스트</th><th>인용</th><th>공유</th><th>측정 횟수</th>
              </tr>
            </thead>
            <tbody>
              {것들.length ? 것들.map((g: any, i: number) => {
                const ㅈ = g.지금 ?? {}
                const ㄴ = g.늘어남 ?? {}
                // 날짜만 적으면 같은 날 올린 글 셋이 구분이 안 된다(실측 — 08/24 가 세 줄이었다)
                const 때 = String(g.올린때).slice(5, 16).replace('-', '/').replace('T', ' ')
                return (
                  <tr key={i}>
                    <td className="whitespace-nowrap font-mono text-[0.81rem]">{때}</td>
                    <값칸 지금값={ㅈ.조회수} 늘값={ㄴ.조회수} />
                    <값칸 지금값={ㅈ.좋아요} 늘값={ㄴ.좋아요} />
                    <값칸 지금값={ㅈ.답글} 늘값={ㄴ.답글} />
                    <값칸 지금값={ㅈ.리포스트} 늘값={ㄴ.리포스트} />
                    <값칸 지금값={ㅈ.인용} 늘값={ㄴ.인용} />
                    <값칸 지금값={ㅈ.공유} 늘값={ㄴ.공유} />
                    <td className="whitespace-nowrap font-mono text-[0.81rem]">{g.잰횟수}판</td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">
                  아직 측정한 게 없어요. 위 <b>지금 측정하기</b> 버튼을 눌러 보세요.
                </td></tr>
              )}
            </tbody>
          </table>
        </굴림칸>
      )}
    </카드>
  )
}
