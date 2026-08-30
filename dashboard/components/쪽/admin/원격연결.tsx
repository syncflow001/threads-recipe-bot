'use client'
// 원격 연결 카드 — 크롬 원격 데스크톱을 열고, 거기서 나온 12자리 코드를 제작자에게 보낸다
import { useEffect, useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import { 부르기 } from '@/lib/api'

const 유효초 = 5 * 60

// 알리기() 가 주는 까닭은 개발자 말이다. 사용자가 알아들을 말로 바꿔 준다
function 쉬운까닭(까닭: string) {
  if (/연락처가 비어/.test(까닭)) return '제작자 연락처가 아직 안 채워져 있어요.'
  if (/텔레그램 4\d\d/.test(까닭)) return '제작자 쪽 설정이 맞지 않아요.'
  return 까닭
}

const 띄기 = (자릿수: string) => 자릿수.replace(/(\d{4})(?=\d)/g, '$1 ')

export function 원격연결() {
  const [코드, 코드담기] = useState('')
  const [알림, 알림담기] = useState('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()
  const [바쁨, 바쁨담기] = useState(false)
  const [남은초, 남은초담기] = useState<number | null>(null)
  const [실패코드, 실패코드담기] = useState('')

  useEffect(() => {
    if (남은초 === null || 남은초 <= 0) return
    const 타이머 = setInterval(() => 남은초담기((초) => (초 === null ? null : 초 - 1)), 1000)
    return () => clearInterval(타이머)
  }, [남은초])

  // 몸통을 안 주면 GET 으로 나간다(lib/api.ts) — 이 길은 POST 만 받으므로 빈 몸통을 준다
  const 열기 = async () => {
    try {
      await 부르기('/remote/open', {})
    } catch {
      // 못 열어도 코드 보내기는 그대로 쓸 수 있다. 손으로 여는 길만 알려 준다
      알림담기('브라우저를 열지 못했어요 — 직접 remotedesktop.google.com/support 를 열어 주세요.')
      종류담기('나쁨')
    }
  }

  const 보내기 = async () => {
    알림담기(''); 종류담기(undefined)
    if (코드.length !== 12) { 알림담기('12자리 숫자를 넣어 주세요.'); 종류담기('나쁨'); return }
    바쁨담기(true)
    try {
      const r = await 부르기<{ 보냄: boolean; 까닭?: string }>('/remote/send', { 코드 })
      if (r.보냄) {
        실패코드담기(''); 남은초담기(유효초); 코드담기('')
        알림담기('보냈습니다. 확인해 주세요. ✓'); 종류담기('좋음')
      } else {
        실패코드담기(코드); 남은초담기(null)
        알림담기(쉬운까닭(r.까닭 ?? '')); 종류담기('나쁨')
      }
    } catch (err) {
      실패코드담기(코드); 남은초담기(null)
      알림담기((err as Error).message); 종류담기('나쁨')
    } finally { 바쁨담기(false) }
  }

  // 카드마다 으뜸 단추 하나만 꽉 찬 초록이다. 나머지는 테두리만 — 어디를 먼저 눌러야 할지가 보인다
  const 으뜸단추 = 'rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold disabled:opacity-45'
  const 단추 = 'rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-45'
  const 분 = 남은초 !== null ? Math.floor(남은초 / 60) : 0
  const 초 = 남은초 !== null ? 남은초 % 60 : 0

  return (
    <카드 제목="원격 연결">
      <귀띔>
        「크롬 원격 데스크톱 열기」를 누르면 새 창이 열려요. 거기서 <b>액세스 코드 생성</b>을 눌러 나온
        12자리 코드를 아래 칸에 넣어 주세요.
      </귀띔>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={열기} className={단추}>크롬 원격 데스크톱 열기</button>
      </div>

      <div className="mt-3">
        <input
          inputMode="numeric" autoComplete="off" aria-label="액세스 코드"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm tracking-widest"
          placeholder="1234 5678 9012"
          value={띄기(코드)}
          onChange={(e) => 코드담기(e.target.value.replace(/\D/g, '').slice(0, 12))}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={바쁨} onClick={보내기} className={으뜸단추}>제작자에게 보내기</button>
        {남은초 !== null && 남은초 > 0 && (
          <span className="text-sm text-muted-foreground">남은 시간 {분}:{String(초).padStart(2, '0')}</span>
        )}
        {남은초 === 0 && <span className="text-sm text-destructive">코드가 만료됐어요. 새 코드를 만들어 주세요.</span>}
      </div>

      {실패코드 && (
        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-center">
          <div className="text-2xl font-bold tracking-widest">{띄기(실패코드)}</div>
          <div className="mt-2 text-sm font-semibold text-destructive">보내지 못했어요 — 이 코드를 직접 전해 주세요.</div>
        </div>
      )}

      <알림줄 글={알림} 종류={종류} />
    </카드>
  )
}
