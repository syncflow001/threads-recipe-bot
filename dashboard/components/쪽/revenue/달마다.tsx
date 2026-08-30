'use client'
// 「달마다」 카드 — 굴림칸 표 + 지난달 견주기(옛 HTML 901~906, JS 1391~1410)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'
import { 돈 } from '@/lib/글자'

type 달자료 = { 달: string; 수수료: number; 클릭: number; 주문: number; 거래액: number; 날수: number }
type 견주기자료 = { 칸: string; 이번: number; 지난: number; 차: number; 비율: number | null }
type 자료꼴 = { 달들?: 달자료[]; 달견주기?: 견주기자료[] | null }

export function 달마다({ 자료 }: { 자료?: 자료꼴 }) {
  const 달들 = 자료?.달들 ?? []
  const ㄱ = 자료?.달견주기

  return (
    <카드 제목="달마다" 넓게>
      <귀띔>달 단위로 벌이가 느는지 봅니다. <b>90일 이상</b>을 골라야 지난달이 온전히 들어와요.</귀띔>
      {달들.length < 2 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          달을 견주려면 두 달치가 있어야 해요. 위에서 <b>90일 이상</b>을 골라 보세요.
        </div>
      ) : (
        <>
          <굴림칸>
            <table className="w-full text-sm">
              <thead>
                <tr><th>달</th><th>수수료</th><th>클릭</th><th>주문</th><th>거래액</th><th>기록된 날</th></tr>
              </thead>
              <tbody>
                {달들.slice().reverse().map((m) => (
                  <tr key={m.달}>
                    <td className="text-xs whitespace-nowrap text-muted-foreground">{m.달}</td>
                    <td className="font-mono text-[0.81rem] whitespace-nowrap">{돈(m.수수료)}</td>
                    <td className="font-mono text-[0.81rem] whitespace-nowrap">{m.클릭.toLocaleString('ko-KR')}</td>
                    <td className="font-mono text-[0.81rem] whitespace-nowrap">{m.주문.toLocaleString('ko-KR')}</td>
                    <td className="font-mono text-[0.81rem] whitespace-nowrap">{돈(m.거래액)}</td>
                    <td className="text-xs whitespace-nowrap text-muted-foreground">{m.날수}일</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </굴림칸>
          {ㄱ && (
            <div className="mt-2.5 text-sm text-muted-foreground">
              지난달과 견주면 —{' '}
              {ㄱ.map((c, i) => (
                <span key={c.칸}>
                  {i > 0 && ' · '}
                  {c.칸}{' '}
                  <b className={c.차 > 0 ? 'text-green-700' : c.차 < 0 ? 'text-red-700' : ''}>
                    {c.차 > 0 ? '+' : ''}
                    {c.칸 === '클릭' || c.칸 === '주문'
                      ? c.차.toLocaleString('ko-KR')
                      : 돈(c.차).replace('₩', c.차 < 0 ? '-₩' : '₩').replace('--', '-')}
                  </b>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </카드>
  )
}
