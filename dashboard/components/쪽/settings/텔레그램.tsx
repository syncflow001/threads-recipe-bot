'use client'
// 텔레그램 알림 카드 — 봇 토큰·방 번호 두 칸(열쇠 표에서 이리로 옮겼다) · 시험 메시지 · 번호 찾기
import { 완료표 } from '@/components/공용/완료표'
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import { 열쇠도움 } from '@/components/공용/열쇠도움'
import { use다시그리기, use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import type { 열쇠줄 } from './열쇠'

// 알리기() 가 주는 까닭은 개발자 말이다(「텔레그램 400: {...}」). 사용자가 알아들을 말로 바꿔 준다
function 쉬운까닭(까닭: string) {
  if (/열쇠가 없다/.test(까닭)) return '봇 토큰과 방 번호를 먼저 넣어 주세요.'
  if (/텔레그램 4\d\d/.test(까닭)) return '봇 토큰이나 방 번호가 맞지 않아요.'
  return 까닭
}

const 토큰이름 = 'TELEGRAM_BOT_TOKEN'
const 방이름 = 'TELEGRAM_CHAT_ID'

export function 텔레그램() {
  const { data } = use자료<{ 열쇠: 열쇠줄[] }>('/status')
  const [토큰, 토큰담기] = useState('')
  const [방번호, 방번호담기] = useState('')
  const [알림, 알림담기] = useState('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()
  const [바쁨, 바쁨담기] = useState(false)
  const 다시그리기 = use다시그리기()

  const 찾기 = (이름: string) => (data?.열쇠 ?? []).find((k) => k.이름 === 이름)
  const 그봇 = 찾기(토큰이름)
  const 그방 = 찾기(방이름)

  const 하기 = async (일: () => Promise<void>) => {
    바쁨담기(true)
    알림담기('')
    try { await 일() } catch (err) { 알림담기((err as Error).message); 종류담기('나쁨') }
    finally { 바쁨담기(false) }
  }

  const 저장 = () => 하기(async () => {
    const 낼것: Record<string, string> = {}
    if (토큰.trim()) 낼것[토큰이름] = 토큰.trim()
    if (방번호.trim()) 낼것[방이름] = 방번호.trim()
    if (!Object.keys(낼것).length) { 알림담기('바꿀 값이 없습니다.'); 종류담기(undefined); return }
    await 부르기('/keys', 낼것)
    토큰담기(''); 방번호담기('')
    다시그리기()
    알림담기('저장했습니다. ✓'); 종류담기('좋음')
  })

  const 시험 = () => 하기(async () => {
    const r = await 부르기<{ 보냄: boolean; 까닭?: string }>('/telegram/test', {
      토큰: 토큰.trim() || undefined, 방번호: 방번호.trim() || undefined,
    })
    if (r.보냄) { 알림담기('보냈습니다. 텔레그램을 확인해 주세요. ✓'); 종류담기('좋음') }
    else { 알림담기('못 보냈습니다 — ' + 쉬운까닭(r.까닭 ?? '')); 종류담기('나쁨') }
  })

  const 번호찾기 = () => 하기(async () => {
    if (!토큰.trim()) { 알림담기('봇 토큰을 먼저 넣어 주세요.'); 종류담기('나쁨'); return }
    const r = await 부르기<{ 방번호?: number; 이름?: string; 안됨?: string }>('/telegram/find', { 토큰: 토큰.trim() })
    if (r.안됨) { 알림담기(r.안됨); 종류담기('나쁨'); return }
    방번호담기(String(r.방번호))
    알림담기(`${r.이름 || '그 사람'} 의 번호를 채웠어요. 「저장」을 눌러 주세요.`)
    종류담기('좋음')
  })

  // 카드마다 으뜸 단추 하나만 꽉 찬 초록이다. 나머지는 테두리만 — 어디를 먼저 눌러야 할지가 보인다
  const 으뜸단추 = 'rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold disabled:opacity-45'
  const 단추 = 'rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-45'

  return (
    <카드 제목="텔레그램 알림">
      <귀띔>쿠키가 죽거나 발행이 막히면 텔레그램으로 알려 줘요. 두 값 다 <b>모든 계정이 함께 씁니다.</b></귀띔>

      <div className="flex flex-col gap-2">
        <div>
          <div className="text-sm font-semibold break-all">
            <열쇠도움 이름={토큰이름} 받는법={그봇?.받는법} />
            <label htmlFor="텔레그램토큰"><완료표 보임={!!그봇?.채움} /></label>
          </div>
          <input
            id="텔레그램토큰" type="password" autoComplete="off" aria-label={토큰이름}
            className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder={그봇?.채움 ? '바꿀 때만 넣으세요' : '값을 붙여넣으세요'}
            value={토큰} onChange={(e) => 토큰담기(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm font-semibold break-all">
            <열쇠도움 이름={방이름} 받는법={그방?.받는법} />
            <label htmlFor="텔레그램방"><완료표 보임={!!그방?.채움} /></label>
          </div>
          <input
            id="텔레그램방" autoComplete="off" inputMode="numeric" aria-label={방이름}
            className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder={그방?.채움 ? '바꿀 때만 넣으세요' : '「번호 찾기」로 채울 수 있어요'}
            value={방번호} onChange={(e) => 방번호담기(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={바쁨} onClick={저장} className={으뜸단추}>저장</button>
        <button type="button" disabled={바쁨} onClick={번호찾기} className={단추}>번호 찾기</button>
        <button type="button" disabled={바쁨} onClick={시험} className={단추}>시험 메시지 보내기</button>
      </div>
      <알림줄 글={알림} 종류={종류} />
    </카드>
  )
}
