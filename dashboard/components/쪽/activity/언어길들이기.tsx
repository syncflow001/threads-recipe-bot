'use client'
// 언어 길들이기 카드 — 스위치·최근 성적·세밀 조정(옛 HTML 757~780, JS 1560~1588·1671·1783~1800)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 속내 } from '@/components/공용/속내'
import { 켜짐표 } from '@/components/공용/켜짐표'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { 세밀조정, type 조절항목 } from './세밀조정'
import { use다시그리기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 태임자료 = { 언어: string; 켜짐: boolean; 간격시간: number; 기본간격: number; 최근: any[] }

export function 언어길들이기({ tame, 차림, 값, onChange, 즉시저장 }: {
  tame?: 태임자료
  차림: 조절항목[]
  값: Record<string, number>
  onChange: (키: string, v: number) => void
  즉시저장: (새값: Record<string, number>) => void
}) {
  const 다시그리기 = use다시그리기()
  const [돌리는중, 돌리는중담기] = useState(false)
  const [알림, 알림담기] = useState('')

  if (!tame) return <카드 제목="언어 길들이기">불러오는 중…</카드>

  // 스위치는 지금 상태이자 누르는 자리다. 실패했으면 서버에 다시 물어 진짜 상태로 그린다(옛 1783~1800)
  const 스위치누름 = async () => {
    try {
      if (tame.켜짐) {
        await 부르기('/tame-off', {})
        알림담기('껐어요. 위 버튼으로 직접 돌리는 건 그대로 됩니다.')
      } else {
        const r = await 부르기<{ 간격시간: number }>('/tame-on', {})
        알림담기(r.간격시간 + '시간마다 알아서 돌아요. 첫 번째는 ' + r.간격시간 + '시간 뒤입니다.')
      }
    } catch (err: any) {
      알림담기('실패 — ' + err.message)
    } finally {
      다시그리기()
    }
  }

  const 지금돌리기 = async () => {
    돌리는중담기(true)
    try {
      const r = await 부르기<{ 안됨?: string }>('/activity', { 무엇: '길들이기', 방식: '바로' })
      알림담기(r.안됨 ?? '돌고 있습니다. 「발행」 쪽 돌려 본 기록에서 볼 수 있어요.')
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 돌리는중담기(false) }
  }

  const 최근 = tame.최근 ?? []
  const 목표비율 = (한줄: any) => Math.round((한줄.비율?.[한줄.목표언어] ?? 0) * 100)

  return (
    <카드 제목="언어 길들이기" 단추={
      <span className="flex items-center gap-2">
        <켜짐표 켜짐={tame.켜짐} />
        <스위치 켜짐={tame.켜짐} onChange={스위치누름}
          title={tame.켜짐 ? '눌러서 끄기' : '눌러서 켜기'}
          aria-label="언어 길들이기 자동 실행 켜고 끄기" />
      </span>
    }>
      <귀띔>외국어 계정은 홈에 한국어 글만 뜨면 가져올 글이 없어요.{' '}
        <b>그 언어 글을 사람처럼 읽어서</b> 스레드한테 취향을 알려줍니다.{' '}
        <b>한국어 계정도 씁니다</b> — 홈이 이 계정의 분야로 채워지고,
        꾸준히 들락거리는 계정이 됩니다.</귀띔>
      <속내 머리="어떻게 돌아가나요">
        <ol className="ml-[1.1rem] list-decimal space-y-1">
          <li>홈을 열고 <b>정해진 횟수만큼 내려요.</b> 지나친 글도 취향으로 잡힙니다.</li>
          <li>그 언어 글이 보이면 <b>열어서 몇 초 머물러요.</b> 머문 시간이 가장 센 신호예요.</li>
          <li>홈에 그 언어 글이 없으면 <b>검색어로 직접 찾아 들어가</b> 몇 편 봅니다.</li>
          <li>판마다 횟수와 시간을 <b>조금씩 다르게</b> 합니다. 매번 똑같으면 기계로 보여요.</li>
        </ol>
        <p className="mt-2"><b>밤에는 안 돌아요.</b> 새벽 4시에 피드를 보는 사람은 드물거든요.
          스위치를 켜면 몇 시간마다 알아서 돕니다.</p>
      </속내>
      <div className="mt-3 flex">
        <button type="button" disabled={돌리는중} onClick={지금돌리기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          지금 한 번 돌리기
        </button>
      </div>
      <div className="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        {!최근.length ? '아직 한 번도 실행 안 했어요.' : (
          <>
            <b>{최근[0].목표언어} {목표비율(최근[0])}%</b> — 마지막 실행에서 가져온 {최근[0].걷은수}편 기준
            <br />
            {최근.slice(0, 3).map((r: any, i: number) => (
              <span key={i}>{i > 0 && <br />}{String(r.때).slice(5, 16).replace('T', ' ')} · {목표비율(r)}%</span>
            ))}
          </>
        )}
      </div>
      <알림줄 글={알림} />
      <세밀조정 갈래="길들이기" 차림={차림} 값={값} onChange={onChange} 즉시저장={즉시저장} />
    </카드>
  )
}
