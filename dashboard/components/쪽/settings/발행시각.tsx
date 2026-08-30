'use client'
// 발행 시각 카드 — 시각을 골라 자동 발행을 켜고 끈다(옛 설정화면-html.mjs 712~724 · 2320~2325 · 3347~3373)
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { 카드 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import {
  겹침묻기, 시각고르개, 시각한줄더하기, 이틀,
  type 남의칸, type 시각칸,
} from '@/components/공용/시각고르개'
import { 스위치 } from '@/components/공용/스위치'
import { use계정, use다시그리기, use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 시각표 = { 시각들: number[]; 칸들: 시각칸[]; 분: number; 추천분?: number; 남들?: 남의칸[] }

export function 발행시각() {
  const 계정 = use계정()
  const { data } = use자료<시각표>('/schedule')
  const { data: 링크, refetch: 링크다시읽기 } = use자료<{ 켜짐: boolean }>('/link')
  const [고른칸들, 고른칸들담기] = useState<시각칸[]>([])
  const [알림, 알림담기] = useState<ReactNode>('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()
  const [바쁨, 바쁨담기] = useState(false)
  const 마지막본계정 = useRef<string | null>(null)
  const 다시그리기 = use다시그리기()

  // 화면에 담긴 것이 없으면 지금 시각표를 그대로 보여 준다 (고치다 만 것을 덮지 않는다)
  useEffect(() => {
    if (!data) return
    if (고른칸들.length && 마지막본계정.current === 계정) return
    마지막본계정.current = 계정
    고른칸들담기((data.칸들 ?? []).map((c) => ({ ...c })))
  }, [data, 계정]) // eslint-disable-line react-hooks/exhaustive-deps

  const 켜짐 = !!data?.시각들?.length
  const 남의칸들 = data?.남들 ?? []
  const 기본분 = data?.추천분 ?? data?.분 ?? 0
  const 단추 = 'rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-45'

  const 더하기 = () => {
    const 새것 = 시각한줄더하기(고른칸들, 기본분)
    if (!새것) { 알림담기('하루 12번을 넘기지 마세요.'); 종류담기(undefined); return }
    고른칸들담기(새것)
  }

  const 자동배정 = async () => {
    바쁨담기(true)
    try {
      const r = await 부르기<{ 칸들: 시각칸[]; 밀림: { 바란시: number; 시: number }[] }>('/schedule/auto', { 이미: 고른칸들 })
      고른칸들담기(r.칸들)
      알림담기(
        '다른 계정과 20분 이상 떨어진 자리로 채웠어요. 「자동 발행 켜기」를 누르면 그때부터 돌아요.' +
        (r.밀림 ?? []).map((m) => ` ${m.바란시}시는 자리가 없어 ${m.시}시로 옮겼어요.`).join(''),
      )
      종류담기('좋음')
    } catch (err) { 알림담기((err as Error).message); 종류담기('나쁨') }
    finally { 바쁨담기(false) }
  }

  const 켜기 = async () => {
    if (!고른칸들.length) { 알림담기('시각을 하나는 골라 주세요.'); 종류담기('나쁨'); return }
    // ⚠️ 다른 계정과 같은 시·분이면 먼저 묻는다
    if (!겹침묻기(고른칸들, 남의칸들)) return
    if (!confirm('이 계정의 자동 발행을 켭니다. 정해진 시각마다 실제로 글이 올라갑니다. 계속할까요?')) return
    바쁨담기(true)
    try {
      const r = await 부르기<{ 칸들: 시각칸[]; 좁은간격?: number | null }>('/schedule-on', { 칸들: 고른칸들 })
      고른칸들담기(r.칸들.map((c) => ({ ...c })))
      // 「간격이 짧다」 꼬리만 빨강으로 튀게 한다 — 나머지는 종류="좋음" 초록을 그대로 쓴다(옛 시각표켜기 3356~3358)
      알림담기(
        <>
          켰습니다. {r.칸들.map((c) => 이틀(c.시) + ':' + 이틀(c.분)).join(' · ')}
          {r.좁은간격 ? (
            <span className="text-destructive">
              {` — 간격이 ${r.좁은간격}시간뿐입니다. 4시간 이상 띄우는 게 좋습니다.`}
            </span>
          ) : null}
        </>,
      )
      종류담기('좋음')
      다시그리기()
    } catch (err) { 알림담기((err as Error).message); 종류담기('나쁨') }
    finally { 바쁨담기(false) }
  }

  // 제휴 링크를 넣을지 끌지. 끄면 링크도, 딸린 [광고]·대가성 문구도 안 붙는다 (run.mjs 의 링크끄기)
  const 링크토글 = async () => {
    const 켤까 = !(링크?.켜짐 ?? true)
    try {
      await 부르기('/link', { 켜기: 켤까 })
      await 링크다시읽기()
      알림담기(켤까
        ? '이제 글타래 답글에 제휴 링크를 넣습니다.'
        : '이제 링크 없이 올려요. [광고] 표시와 대가성 문구도 안 붙어요.')
      종류담기('좋음')
    } catch (err) { 알림담기((err as Error).message); 종류담기('나쁨') }
  }

  const 끄기 = async () => {
    if (!confirm('이 계정의 자동 발행을 끕니다. 계속할까요?')) return
    바쁨담기(true)
    try {
      await 부르기('/schedule-off', {})
      알림담기('껐습니다. 이제 저절로 올라가지 않습니다.')
      종류담기('좋음')
      다시그리기()
    } catch (err) { 알림담기((err as Error).message); 종류담기('나쁨') }
    finally { 바쁨담기(false) }
  }

  return (
    <카드 제목="발행 시각" 넓게>
      <p className="mb-2 text-[0.88rem] text-pretty text-muted-foreground">
        {켜짐 ? (
          <>
            지금 <b>{(data?.칸들 ?? []).map((c) => 이틀(c.시) + ':' + 이틀(c.분)).join(' · ')}</b> 에 돕니다.{' '}
            <b>다른 계정과 같은 시·분은 피해 주세요</b> — 같은 순간에 둘이 올라가면 서로 조입니다.
          </>
        ) : (
          <><b>꺼져 있습니다.</b> 시각을 고르고 「자동 발행 켜기」를 누르면 그때부터 저절로 올라갑니다.</>
        )}
      </p>

      <label className="mb-1 block text-sm font-semibold">올릴 시각 — 시와 분을 골라 주세요</label>
      <시각고르개 칸들={고른칸들} 남의칸들={남의칸들} onChange={고른칸들담기} />

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={단추} onClick={더하기}>＋ 시각 추가</button>
        <button type="button" className={단추} disabled={바쁨} onClick={자동배정}>자동 배정</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={바쁨}
          onClick={켜기}
          className="rounded-lg border-transparent bg-primary transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
        >
          {켜짐 ? '이 시각으로 다시 켜기' : '자동 발행 켜기'}
        </button>
        <button type="button" className={단추} disabled={바쁨 || !켜짐} onClick={끄기}>끄기</button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <div>
          <div className="text-sm font-semibold">제휴 링크 넣기</div>
          <p className="text-[0.82rem] text-muted-foreground">
            {링크?.켜짐 ?? true
              ? '레시피 답글에 쿠팡 링크와 [광고] 표시를 넣어요.'
              : '링크 없이 올려요. [광고] 표시와 대가성 문구도 안 붙어요.'}
          </p>
        </div>
        <스위치
          켜짐={링크?.켜짐 ?? true}
          잠김={!링크}
          onChange={링크토글}
          aria-label="제휴 링크 넣기 켜고 끄기"
        />
      </div>
      <알림줄 글={알림} 종류={종류} />
    </카드>
  )
}
