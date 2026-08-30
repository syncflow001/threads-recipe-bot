'use client'
// 열쇠 카드 — 어떤 열쇠가 채워졌는지 보여 주고 새 값만 받아 저장한다(옛 설정화면-html.mjs 989~999 · 2402~2419 · 2912~2924)
import { 완료표 } from '@/components/공용/완료표'
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import { 열쇠도움 } from '@/components/공용/열쇠도움'
import { 발급매뉴얼 } from './발급매뉴얼'
import { 자동발급 } from './자동발급'
import { use다시그리기, use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

export type 열쇠줄 = { 이름: string; 설명: string; 필수: boolean; 공유: boolean; 받는법?: string[]; 채움: boolean }
type 상태 = { 열쇠: 열쇠줄[]; 정보?: { userId?: string } }

// 텔레그램 둘은 이 표에서 뺀다 — 「텔레그램 알림」 카드로 옮겼다
const 텔레그램것 = (이름: string) => 이름.startsWith('TELEGRAM_')

const 공유표 = <span className="ml-1 rounded bg-muted px-1 text-[0.7rem] font-semibold align-middle">공유</span>

export function 열쇠() {
  const { data } = use자료<상태>('/status')
  const [넣은것, 넣은것담기] = useState<Record<string, string>>({})
  const [알림, 알림담기] = useState('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()
  const [저장중, 저장중담기] = useState(false)
  const 다시그리기 = use다시그리기()

  const 열쇠들 = (data?.열쇠 ?? []).filter((k) => !텔레그램것(k.이름))
  const uid = data?.정보?.userId

  const 저장 = async () => {
    const 낼것: Record<string, string> = {}
    for (const [이름, 값] of Object.entries(넣은것)) if (값.trim()) 낼것[이름] = 값.trim()
    if (!Object.keys(낼것).length) { 알림담기('바꿀 값이 없습니다.'); 종류담기(undefined); return }
    저장중담기(true)
    try {
      const s = await 부르기<{ 나?: { 틀림?: string; 어긋남?: string }; 쿠키확인?: { 주인?: string; 못읽음?: string } }>('/keys', 낼것)
      넣은것담기({})
      다시그리기()
      // 토큰이 딴 계정 것이면 글이 엉뚱한 데로 올라간다. 반드시 알린다
      const 틀림 = s.나?.틀림 ?? s.나?.어긋남
      if (틀림) { 알림담기(틀림); 종류담기('나쁨') }
      // 쿠키 주인을 못 읽었으면 저장은 됐지만 확인은 못 한 것이다. 조용히 넘기지 않는다
      else if (s.쿠키확인?.못읽음) { 알림담기('저장했습니다. 다만 ' + s.쿠키확인.못읽음); 종류담기(undefined) }
      else if (s.쿠키확인?.주인) { 알림담기(`저장했습니다. ✓ 쿠키 주인이 @${s.쿠키확인.주인} 인 것까지 확인했어요.`); 종류담기('좋음') }
      else { 알림담기('저장했습니다. ✓'); 종류담기('좋음') }
    } catch (err) {
      알림담기('실패 — ' + (err as Error).message)
      종류담기('나쁨')
    } finally { 저장중담기(false) }
  }

  return (
    <카드 제목="열쇠" 넓게 단추={<발급매뉴얼 />}>
      <귀띔>
        이미 넣은 값은 다시 안 보여줘요. 바꿀 때만 새로 넣으세요.<br />
        <b>스레드 User ID 는 안 넣으셔도 됩니다.</b> 토큰을 저장하면 저희가 알아내 채웁니다.<br />
        <b>공유</b> 가 붙은 것은 <b>모든 계정이 함께 씁니다.</b>{' '}
        어느 화면에서 넣든 한 곳에 저장되고, 새 계정은 그대로 물려받습니다.
      </귀띔>

      {uid && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-900">
          스레드 User ID <b>{uid}</b> 가 들어 있습니다.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {열쇠들.map((k) => (
              <tr key={k.이름} className="border-b last:border-0">
                <td className={'w-6 py-1 align-top ' + (k.채움 ? 'text-green-600' : k.필수 ? 'text-destructive' : 'text-muted-foreground')}>
                  {k.채움 ? '✓' : k.필수 ? '✗' : '·'}
                </td>
                <td className="py-1 pr-2 align-top font-semibold break-all">
                  <열쇠도움 이름={k.이름} 받는법={k.받는법} />
                  {k.공유 ? 공유표 : null}
                </td>
                <td className="py-1 align-top text-muted-foreground text-pretty">
                  {k.설명}{k.필수 ? '' : ' (선택)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {열쇠들.map((k) => (
          <div key={k.이름}>
            <label className="block text-sm font-semibold break-all" htmlFor={'열쇠-' + k.이름}>
              {k.이름}{k.공유 ? 공유표 : null}<완료표 보임={!!k.채움} />
            </label>
            <input
              id={'열쇠-' + k.이름}
              type="password"
              autoComplete="off"
              className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              placeholder={k.채움 ? '바꿀 때만 넣으세요' : '값을 붙여넣으세요'}
              value={넣은것[k.이름] ?? ''}
              onChange={(e) => 넣은것담기((v) => ({ ...v, [k.이름]: e.target.value }))}
            />
            {k.이름 === 'THREADS_ACCESS_TOKEN' && <자동발급 />}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <button
          type="button"
          disabled={저장중}
          onClick={저장}
          className="rounded-lg border-transparent bg-primary transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
        >
          열쇠 저장
        </button>
      </div>
      <알림줄 글={알림} 종류={종류} />
    </카드>
  )
}
