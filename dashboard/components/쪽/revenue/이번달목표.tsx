'use client'
// 「이번 달 목표」 카드 — 포커스 중이면 값 안 덮어씀, 엔터로 저장(옛 HTML 849~865, JS 1282~1327)
import { useEffect, useRef, useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 부르기 } from '@/lib/api'
import { 돈 } from '@/lib/글자'

const 경고칸 = 'rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm mt-2'

type 목표자료 = {
  월목표?: number
  수익채널?: { 출처: string }
  안됨?: string
  달성?: { 목표: number; 비율: number; 남은돈: number; 넘었나: boolean } | null
  속도?: { 지난비율: number; 있어야할돈: number; 앞서나: boolean; 이대로면: number } | null
}

export function 이번달목표({ 자료, 저장후 }: { 자료?: 목표자료; 저장후: () => void }) {
  const 입력ref = useRef<HTMLInputElement>(null)
  const [값, 값담기] = useState('')
  const [저장중, 저장중담기] = useState(false)
  const [알림, 알림담기] = useState('')

  // 사람이 지금 고치는 중이면 덮어쓰지 않는다 — 옛 1287
  useEffect(() => {
    if (document.activeElement === 입력ref.current) return
    값담기(자료?.월목표 ? String(자료.월목표) : '')
  }, [자료?.월목표])

  const 저장 = async () => {
    저장중담기(true)
    try {
      await 부르기('/revenue-goal', { 월목표: Number(값) || 0 })
      입력ref.current?.blur() // 다시 그릴 때 값이 덮이도록 손을 뗀다
      저장후()
    } catch (err: any) {
      알림담기('목표를 저장하지 못했습니다 — ' + err.message)
    } finally {
      저장중담기(false)
    }
  }

  const ㄷ = 자료?.달성
  const ㅅ = 자료?.속도
  const 넘음 = !!ㄷ?.넘었나
  const 잘됨 = 넘음 || !!(ㅅ && ㅅ.앞서나)
  const 색 = 잘됨 ? 'text-green-700' : 'text-orange-700'

  return (
    <카드 제목="이번 달 목표" 넓게 꼬리={
      <span className="text-sm text-muted-foreground">{자료?.수익채널?.출처 ?? '쿠팡파트너스'} 목표</span>}>
      <귀띔>목표를 넣으면 개요 맨 위 고리가 <b>달성률</b>로 바뀌어요.
        목표는 <b>제휴 채널마다 따로</b> 둡니다 — 지금 세우는 것은{' '}
        <b>{자료?.수익채널?.출처 ?? '쿠팡파트너스'}</b> 목표예요.{' '}
        쿠팡 실적은 계정별로 안 갈려서 <b>쿠팡을 쓰는 계정들이 목표 하나를 같이 씁니다.</b></귀띔>
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <label htmlFor="월목표" className="text-sm font-semibold whitespace-nowrap">한 달에</label>
        <span className="text-sm text-muted-foreground">₩</span>
        <input ref={입력ref} id="월목표" type="number" min={0} step={10000} placeholder="예: 100000"
          inputMode="numeric" autoComplete="off" value={값} onChange={(e) => 값담기(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') 저장() }}
          className="w-[7.5rem] rounded-md border px-2 py-1.5 text-sm" />
        <button type="button" disabled={저장중} onClick={저장}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
          저장
        </button>
      </div>
      {!ㄷ ? (
        <p className="text-[0.82rem] leading-relaxed">
          {자료?.월목표 && 자료?.안됨
            ? <>목표는 <b>{돈(자료.월목표)}</b>인데 <b>쿠팡 실적을 못 받아서</b> 얼마나 채웠는지는 알 수 없어요. 아래 경고를 봐 주세요.</>
            : <>목표를 넣으면 위 카드의 고리가 <b>달성률</b>로 바뀌어요. 쿠팡 실적은 계정별로 안 갈려서 <b>네 계정이 목표 하나를 같이 씁니다.</b></>}
        </p>
      ) : (
        <p className="text-[0.82rem] leading-relaxed">
          {넘음
            ? <>목표 <b>{돈(ㄷ.목표)}</b>을 넘었어요 — <b className="text-green-700">{ㄷ.비율}%</b> 채웠습니다.</>
            : <>목표 <b>{돈(ㄷ.목표)}</b> 가운데 <b className={색}>{ㄷ.비율}%</b>를 채웠고 <b>{돈(ㄷ.남은돈)}</b> 남았어요.</>}
          {ㅅ && <> 이번 달이 {ㅅ.지난비율}% 지났으니 지금쯤 <b>{돈(ㅅ.있어야할돈)}</b>은 있어야 하고,
            이 속도면 이번 달에 <b className={색}>{돈(ㅅ.이대로면)}</b>쯤 됩니다.</>}
        </p>
      )}
      {알림 && <div className={경고칸}>{알림}</div>}
    </카드>
  )
}
