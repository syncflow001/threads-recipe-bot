'use client'
// 점검 카드 — 자동화가 도는지 살펴보는 것을 켜고 끈다(모니터링 쪽, 헬스체크·조회수알리미와 같은 결. 과제 6 고침)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 짧은때 } from '@/lib/글자'

type 점검자료 = { 켜짐: boolean; 간격분: number; 마지막: string | null }

export function 점검() {
  const 자료 = use자료<점검자료>('/inspect', { 계정무관: true })
  const [알림, 알림담기] = useState('')

  // 파수꾼 자신이 죽으면 아무도 안 알려 준다. 마지막으로 돈 때가 간격의 3배보다 낡았으면
  // 그 자체가 이상이다 — 맥이 자다 깬 정도는 3배 안에 들어온다 (src/점검.mjs 의 늦었나 와 같은 배수)
  const 마지막 = 자료.data?.마지막
  const 낡음 = !!마지막 && Date.now() - Date.parse(마지막) > (자료.data?.간격분 ?? 30) * 60000 * 3

  // 켜기는 오직 이 스위치를 사람이 누를 때만 불린다 — 화면이 열릴 때 저절로 켜지지 않는다
  const 스위치누름 = async () => {
    try {
      if (자료.data?.켜짐) { await 부르기('/inspect-off'); 알림담기('껐습니다.') }
      else { await 부르기('/inspect-on', { 간격: 30 }); 알림담기('켰습니다.') }
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 자료.refetch() }
  }

  return (
    <카드 제목="점검 — 자동화가 잘 도는지">
      <귀띔>30분마다 계정마다 자동화가 제대로 도는지 살펴보고, 문제가 생기거나 고쳐지면 텔레그램으로 알립니다.</귀띔>
      {자료.error ? (
        <알림줄 글={'못 읽었어요 — ' + (자료.error as Error).message} 종류="나쁨" />
      ) : !자료.data ? (
        <div className="text-sm text-muted-foreground">확인하는 중...</div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <스위치 켜짐={자료.data.켜짐} onChange={스위치누름} aria-label="점검 켜고 끄기" />
            <span>{자료.data.켜짐 ? <b className="text-green-600">켜짐</b> : '꺼짐'}</span>
          </div>
          <알림줄 글={알림} />
          {자료.data.켜짐 ? (
            <div className="mt-2 text-sm">
              <div>{자료.data.간격분}분마다 살펴봅니다.</div>
              <div className={낡음 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                {자료.data.마지막 ? '마지막으로 돈 때 ' + 짧은때(자료.data.마지막) : '아직 돈 적이 없습니다.'}
                {낡음 && ' — 점검기가 멈춘 것 같습니다.'}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">꺼져 있으면 자동화 문제를 아무도 안 알려 줍니다. 켜기를 권합니다.</div>
          )}
        </>
      )}
    </카드>
  )
}
