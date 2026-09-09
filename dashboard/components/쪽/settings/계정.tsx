'use client'
// 계정 카드 — 지금 계정의 별칭·아이디·분야·언어·제휴와 추가·수정·삭제 단추(옛 설정화면-html.mjs 630~638 · 2837~2909)
import { useState } from 'react'
import Link from 'next/link'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import { 프로필링크 } from '@/components/공용/프로필링크'
import { use계정, use자료 } from '@/lib/hooks'
import { 계정수정판, type 계정상태 } from './계정수정판'
import { 계정삭제판 } from './계정삭제판'

export function 계정() {
  const 지금계정 = use계정()
  const { data } = use자료<계정상태>('/status')
  const [수정열림, 수정열림담기] = useState(false)
  const [삭제열림, 삭제열림담기] = useState(false)
  const [알림, 알림담기] = useState('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()

  const 정보 = data?.정보 ?? {}
  const 별칭 = 정보.별칭 || 지금계정 || '첫 계정'
  // 카드마다 으뜸 단추 하나만 꽉 찬 초록이다. 나머지는 테두리만 — 어디를 먼저 눌러야 할지가 보인다
  const 으뜸단추 = 'rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold'
  const 단추 = 'rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold'
  // 지우는 단추만 빨강 테두리다 — 옆바의 「계정 삭제」와 같은 모양으로 맞춘다
  const 위험단추 = 'rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20'

  const 삭제열기 = () => {
    // 첫 계정은 내부 이름이 빈 값이다. 지우면 돌아갈 자리가 없다
    if (!지금계정) { 알림담기('첫 계정은 지울 수 없습니다.'); 종류담기('나쁨'); return }
    알림담기('')
    삭제열림담기(true)
  }

  return (
    <카드 제목="계정">
      <귀띔>지금 보고 있는 계정입니다. 말투 · 열쇠 · 발행 시각은 이 쪽의 다른 칸에서 고쳐요.</귀띔>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">별칭</dt>
        <dd className="font-semibold break-all">{별칭}</dd>
        <dt className="text-muted-foreground">아이디</dt>
        <dd className="break-all">{data?.아이디 ? <프로필링크 아이디={data.아이디} className="text-primary" /> : '(아직 모릅니다 — 토큰을 넣으면 채워집니다)'}</dd>
        <dt className="text-muted-foreground">분야</dt>
        <dd>{정보.분야 ?? '—'}</dd>
        <dt className="text-muted-foreground">언어</dt>
        <dd>{정보.언어 ?? '—'}</dd>
        <dt className="text-muted-foreground">제휴</dt>
        <dd>{정보.제휴 ?? '—'}</dd>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/wizard" className={으뜸단추}>계정 추가</Link>
        <button type="button" className={단추} disabled={!data} onClick={() => { 알림담기(''); 수정열림담기(true) }}>수정</button>
        <button type="button" className={위험단추} onClick={삭제열기}>삭제</button>
      </div>
      <알림줄 글={알림} 종류={종류} />

      {data && (
        <계정수정판
          열림={수정열림} 열림담기={수정열림담기} 상태={data}
          onDone={(새별칭) => { 알림담기('"' + 새별칭 + '" 정보를 고쳤습니다.'); 종류담기('좋음') }}
        />
      )}
      <계정삭제판
        열림={삭제열림} 열림담기={삭제열림담기} 별칭={별칭}
        onDone={() => { 알림담기('지웠습니다.'); 종류담기('좋음') }}
      />
    </카드>
  )
}
