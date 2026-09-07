'use client'
// 링크 달기 알림 카드 — 터진 글에 쿠팡 링크를 달았다·못 달았다를 텔레그램으로 보낼지 켜고 끈다 (2026-09-07)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { 부르기 } from '@/lib/api'
import { use자료 } from '@/lib/hooks'

export function 늦은링크알림() {
  const 자료 = use자료<{ 켜짐: boolean }>('/late-link-alert', { 계정무관: true })
  const [알림, 알림담기] = useState('')

  if (자료.error) return <카드 제목="링크 달기 알림"><알림줄 글={'못 읽었어요 — ' + (자료.error as Error).message} 종류="나쁨" /></카드>
  if (!자료.data) return <카드 제목="링크 달기 알림">확인하는 중…</카드>

  const 켜짐 = 자료.data.켜짐
  const 스위치누름 = async () => {
    try {
      await 부르기('/late-link-alert', { 켜기: !켜짐 })
      알림담기(!켜짐 ? '이제 링크를 달거나 못 달면 텔레그램으로 알려요.' : '껐습니다. 달기는 그대로 하고 알림만 안 와요.')
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 자료.refetch() }
  }

  return (
    <카드 제목="링크 달기 알림">
      <귀띔>
        올린 지 <b>30시간</b> 안에 <b>1만 조회</b>를 넘긴 글에만 쿠팡 링크 답글을 답니다 (30분마다 살핍니다).
        달았을 때와 <b>못 달았을 때</b> 둘 다 텔레그램으로 알립니다. 이 스위치는 알림만 끕니다 — 달기는 계속합니다.
      </귀띔>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <div>
          <div className="text-sm font-semibold">달았다 · 못 달았다 알림</div>
          <p className="text-[0.82rem] text-muted-foreground">
            {켜짐 ? '텔레그램으로 알려요. 「광고」 표시를 못 붙였으면 그것도 알려요.' : '알림이 꺼져 있어요. 기록은 조회수알리미결과.json 에 남아요.'}
          </p>
        </div>
        <스위치 켜짐={켜짐} onChange={스위치누름} aria-label="링크 달기 알림 켜고 끄기" />
      </div>
      {알림 && <div className="mt-2"><알림줄 글={알림} 종류="좋음" /></div>}
    </카드>
  )
}
