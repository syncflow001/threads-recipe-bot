'use client'
// 옆바의 계정 카드 — 지금 보고 있는 계정을 한눈에(옛 설정화면-html.mjs 605~614 · 2442~2456 · 2318).
// 자동 발행 ON/OFF · 제휴 링크 ON/OFF · 아이디 · 별칭 · 프로필 사진 · 분야/언어/제휴 꼬리표 · 다음 발행,
// 그 아래 추가·수정·삭제 단추 셋. 두 ON/OFF 는 보여 주기만 한다 — 끄고 켜는 것은 설정 쪽 발행 시각 카드다.
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { use계정, use자료 } from '@/lib/hooks'
import { 알림줄 } from '@/components/공용/알림줄'
import { 프로필링크 } from '@/components/공용/프로필링크'
import { 계정수정판, type 계정상태 } from '@/components/쪽/settings/계정수정판'
import { 계정삭제판 } from '@/components/쪽/settings/계정삭제판'

type 시각표 = { 시각들: number[] }
// /health 가 계정 목록에 실어 보내는 점검 심각도 — 계정마다 /inspect 를 따로 읽는 대신
// 계정 목록을 이미 읽는 이 API 에 얹는다(과제 6, dashboard/app/api/health/route.ts)
type 계정목록자료 = { 계정들: { 이름: string; 심각도?: '높음' | '보통'; 문제수?: number }[] }

// 시각표에 적힌 시각 가운데 지금 다음에 오는 것. 24 는 밤 12시라 0 으로 본다(옛 2459~2466)
const 다음시각 = (시각들: number[]) => {
  if (!시각들.length) return '꺼짐'
  const 줄 = [...new Set(시각들.map((h) => h % 24))].sort((a, b) => a - b)
  const 이따 = 줄.find((h) => h > new Date().getHours())
  return 이따 === undefined
    ? '내일 ' + String(줄[0]).padStart(2, '0') + '시'
    : String(이따).padStart(2, '0') + '시'
}

export function 계정카드() {
  const 지금계정 = use계정()
  const { data: s } = use자료<계정상태 & { 아이디?: string; 계정?: string }>('/status')
  const { data: 표 } = use자료<시각표>('/schedule')
  const { data: 링크 } = use자료<{ 켜짐: boolean }>('/link')
  const { data: 건강 } = use자료<계정목록자료>('/health', { 계정무관: true })
  const [수정열림, 수정열림담기] = useState(false)
  const [삭제열림, 삭제열림담기] = useState(false)
  const [사진있음, 사진있음담기] = useState(true)
  const [알림, 알림담기] = useState('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()

  const 정보 = (s?.정보 ?? {}) as Record<string, string | undefined>
  const 켜짐 = !!표?.시각들?.length
  const 별칭 = 정보.별칭 || 지금계정 || '첫 계정'
  const 이름줄 = s?.아이디 ? '@' + s.아이디 : 별칭
  const 링크켜짐 = 링크?.켜짐 ?? true
  const 꼬리표들 = ['분야', '언어', '제휴'].map((k) => 정보[k]).filter((v): v is string => !!v)
  const 점검점 = 건강?.계정들?.find((c) => c.이름 === (지금계정 ?? ''))
  const 점색 = 점검점?.심각도 === '높음' ? 'bg-destructive' : 점검점?.심각도 === '보통' ? 'bg-yellow-400' : null
  // 「자동 발행」과 「제휴 링크」 두 줄이 같은 모양을 쓴다
  const 켜짐표 = (켜졌나: boolean) => cn('rounded px-1.5 py-0.5 text-[.72rem] font-extrabold tracking-wide',
    켜졌나 ? 'bg-green-100 text-green-900' : 'bg-muted text-muted-foreground')
  // 카드마다 으뜸 단추 하나만 꽉 찬 초록이다. 나머지는 테두리만 — 어디를 먼저 눌러야 할지가 보인다
  const 으뜸단추 = 'rounded-md border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-2 py-1 text-xs font-semibold disabled:opacity-50'
  const 단추 = 'rounded-md border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2 py-1 text-xs font-semibold disabled:opacity-50'
  // 지우는 단추만 빨강 테두리로 둔다 — 초록 바탕에 빨간 글씨를 얹으면 무엇을 지우는지 안 보인다
  const 위험단추 = 'rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20'

  const 삭제열기 = () => {
    // 첫 계정은 내부 이름이 빈 값이다. 지우면 돌아갈 자리가 없다
    if (!지금계정) { 알림담기('첫 계정은 지울 수 없습니다.'); 종류담기('나쁨'); return }
    알림담기(''); 삭제열림담기(true)
  }

  return (
    <section aria-label="지금 계정" className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">자동 발행</span>
        <span className={켜짐표(켜짐)}>{켜짐 ? 'ON' : 'OFF'}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">제휴 링크</span>
        <span className={켜짐표(링크켜짐)}>{링크켜짐 ? 'ON' : 'OFF'}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 font-mono font-bold break-all">
        {s?.아이디 ? <프로필링크 아이디={s.아이디} /> : 이름줄}
        {점색 && (
          <span
            className={cn('inline-block size-2 shrink-0 rounded-full', 점색)}
            title={`문제 ${점검점?.문제수}개`}
          />
        )}
      </div>
      {s?.아이디 && 정보.별칭 && <div className="text-xs text-muted-foreground">{정보.별칭}</div>}
      {/* 스레드 프로필 사진 — 서버가 하루 한 번 받아 두고 내준다. 토큰이 없거나 못 받으면 자리를 비운다. 폰에서는 숨긴다 */}
      {사진있음 && 지금계정 !== null && (
        <img
          className="mt-3 hidden size-16 rounded-full object-cover md:block"
          alt={이름줄 + ' 프로필 사진'}
          src={'/api/profile-photo?profile=' + encodeURIComponent(지금계정) + '&t=' + Math.floor(Date.now() / 3_600_000)}
          onError={() => 사진있음담기(false)}
        />
      )}
      {꼬리표들.length > 0 && (
        <div className="mt-3 hidden flex-wrap gap-1 md:flex">
          {꼬리표들.map((v) => (
            <span key={v} className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{v}</span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
        <span className="text-muted-foreground">다음 발행</span>
        <b>{표 ? 다음시각(표.시각들 ?? []) : '—'}</b>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link href="/wizard" className={으뜸단추}>＋ 계정 추가</Link>
        <button type="button" className={단추} disabled={!s} onClick={() => { 알림담기(''); 수정열림담기(true) }}>수정</button>
        <button type="button" className={위험단추} onClick={삭제열기}>계정 삭제</button>
      </div>
      <알림줄 글={알림} 종류={종류} />

      {s && (
        <계정수정판
          열림={수정열림} 열림담기={수정열림담기} 상태={s}
          onDone={(새별칭) => { 알림담기('"' + 새별칭 + '" 정보를 고쳤습니다.'); 종류담기('좋음') }}
        />
      )}
      <계정삭제판
        열림={삭제열림} 열림담기={삭제열림담기} 별칭={별칭}
        onDone={() => { 알림담기('지웠습니다.'); 종류담기('좋음') }}
      />
    </section>
  )
}
