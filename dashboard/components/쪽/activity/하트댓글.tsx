'use client'
// 하트·댓글 카드 — 완전자동 스위치·초안 적용·세밀 조정(옛 HTML 783~811, JS 1671~1714)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 속내 } from '@/components/공용/속내'
import { 켜짐표 } from '@/components/공용/켜짐표'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { 활동초안 } from './활동초안'
import { 세밀조정, type 조절항목 } from './세밀조정'
import { 부르기 } from '@/lib/api'

export function 하트댓글({ 언어, 차림, 값, onChange, 즉시저장, 팔로우한판, 팔로우하루 }: {
  언어?: string
  차림: 조절항목[]
  값: Record<string, number>
  onChange: (키: string, v: number) => void
  즉시저장: (새값: Record<string, number>) => Promise<Record<string, number>>
  팔로우한판: number
  팔로우하루: number
}) {
  const [도는것, 도는것담기] = useState<string | null>(null)
  const [알림, 알림담기] = useState('')
  const 완전자동 = Number(값.완전자동 ?? 0) === 1

  const 활동시작 = async (무엇: '하트댓글' | '답하기', 방식: '보기만' | '바로') => {
    도는것담기(무엇)
    try {
      const r = await 부르기<{ 안됨?: string }>('/activity', { 무엇, 방식 })
      알림담기(r.안됨 ?? '돌고 있습니다. 「발행」 쪽 돌려 본 기록에서 볼 수 있어요.')
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 도는것담기(null) }
  }

  // 하트·댓글은 남에게 나가는 행동이다. 완전 자동이 꺼져 있으면(기본) 초안만 만든다 — 아무것도 안 나가니 묻지 않는다.
  // 켜져 있으면 바로 나가므로 한 번 묻는다(2026-08-26, 사용자가 정했다)
  const 하트댓글누름 = () => {
    const 언어글 = 언어 || '그 언어'
    if (!완전자동) return 활동시작('하트댓글', '보기만')
    if (!confirm('완전 자동입니다. 이 계정으로 남의 글에 하트를 누르고 ' + 언어글 + '로 댓글 한 개를 바로 올립니다.\n' +
      '올린 댓글의 한국어 뜻이 기록에 함께 찍힙니다. 계속할까요?')) return
    활동시작('하트댓글', '바로')
  }
  const 답하기누름 = () => {
    const 언어글 = 언어 || '그 언어'
    if (!완전자동) return 활동시작('답하기', '보기만')
    if (!confirm('완전 자동입니다. 내 글에 달린 남의 댓글에 하트를 누르고 ' + 언어글 + '로 답글을 바로 올립니다 (최대 5개).\n' +
      '답글의 한국어 뜻이 기록에 함께 찍힙니다. 계속할까요?')) return
    활동시작('답하기', '바로')
  }

  const 완전자동토글 = async () => {
    const 켜려는가 = !완전자동
    if (켜려는가 && !confirm('완전 자동을 켭니다. 이제부터 활동 단추를 누르면 확인 없이 바로 올라갑니다. 계속할까요?')) return
    try {
      const 저장 = await 즉시저장({ ...값, 완전자동: 켜려는가 ? 1 : 0 })
      알림담기(Number(저장.완전자동) === 1
        ? '완전 자동을 켰습니다. 단추를 누르면 바로 올라갑니다.'
        : '수동으로 돌아왔습니다. 단추는 초안만 만듭니다.')
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
  }

  return (
    <카드 제목="하트 · 댓글">
      <귀띔>남의 글에 하트를 누르고 댓글을 답니다.{' '}
        <b>가장 위험한 활동</b>이라 하루 한도를 두고 조금씩만 해요.</귀띔>
      <속내 머리="어떻게 돌아가나요">
        <ol className="ml-[1.1rem] list-decimal space-y-1">
          <li>홈을 내리며 <b>그 언어 · 그 분야</b> 글만 고릅니다.</li>
          <li>고른 글에 <b>하트를 몇 개</b> 누르고, <b>댓글을 하나</b> 답니다.</li>
          <li>댓글은 AI가 그 언어로 씁니다. <b>120자를 넘기지 않아요</b> — 길면 광고처럼 보입니다.</li>
          <li>하루 한도를 채우면 <b>그날은 더 안 합니다.</b></li>
        </ol>
        <p className="mt-2"><b>이건 자동으로 안 돌립니다.</b> 시각표에 걸지 않고 직접 누를 때만 돌아요.
          기계가 남의 글에 계속 반응하는 게 스레드가 가장 싫어하는 짓입니다.</p>
      </속내>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!!도는것} onClick={하트댓글누름}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          지금 한 번 돌리기
        </button>
        <button type="button" disabled={!!도는것} onClick={답하기누름}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          내 글 댓글에 답하기
        </button>
        <span className="ml-auto flex items-center gap-2">
          <켜짐표 켜짐={완전자동} 켜짐글="완전 자동" 꺼짐글="수동" />
          <스위치 켜짐={완전자동} onChange={완전자동토글} aria-label="완전 자동 켜고 끄기" />
        </span>
      </div>
      <귀띔><b>수동</b>(기본)이면 단추는 <b>초안만</b> 만듭니다 — 아무것도 올라가지 않아요.
        아래에 초안이 뜨면 읽어 보고 <b>「이대로 올리기」</b>를 누르세요. 켜면 단추가 바로 올립니다.</귀띔>
      <활동초안 팔로우한판={팔로우한판} 팔로우하루={팔로우하루} />
      <귀띔><b>내 글 댓글에 답하기</b> — 최근 내 글 10편에 달린 남의 댓글을 <b>화면에서 읽어</b>,
        아직 답 안 한 것에 하트를 누르고 그 언어로 답글을 답니다. 답은 <b>내 글·레시피에 있는 것을 먼저</b> 쓰고,
        없으면 AI가 <b>웹을 검색해서</b> 답합니다. 그래도 모르면 「잘 모르겠다」고 씁니다. 한 번에 5개, 하루 10개까지.
        답글과 한국어 뜻은 <b>바로 아래 「활동 기록」</b> 에 남습니다 (같은 「활동」 쪽입니다).</귀띔>
      <알림줄 글={알림} />
      <세밀조정 갈래="하트댓글" 차림={차림} 값={값} onChange={onChange} 즉시저장={즉시저장} />
    </카드>
  )
}
