'use client'
// 조회수 알리미 카드 — 스위치·간격·지금 보기(옛 HTML 1097~1118, JS 3245~3327)
// 알리미조건·알리미며칠·알리미문턱 은 옛 화면에서 정적 기본값으로 시작해 /watchdog 응답으로 치환됐다
// ("조회수가 문턱을 넘으면" · "2일" · "10,000") — 여기서는 자료가 오면 바로 서버값으로 그린다
import { useEffect, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 속내 } from '@/components/공용/속내'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { 부르기 } from '@/lib/api'
import { use폴링 } from '@/lib/hooks'
import { 짧은때 } from '@/lib/글자'
import type { 감시자료 } from '@/app/(pages)/monitor/page'

export function 조회수알리미({ 자료, 에러, 다시읽기 }: { 자료?: 감시자료; 에러?: unknown; 다시읽기: () => void }) {
  const [간격, 간격담기] = useState<string | null>(null)
  const [알림, 알림담기] = useState('')
  const [도는중, 도는중담기] = useState(false)
  const 끝난것알림 = useRef(false)

  const 로그 = use폴링<{ 도는중: boolean }>('/log', 1500, 도는중)
  useEffect(() => {
    if (!도는중) { 끝난것알림.current = false; return }
    if (로그 && !로그.도는중 && !끝난것알림.current) {
      끝난것알림.current = true
      도는중담기(false)
      알림담기('끝났습니다.')
      다시읽기()
    }
  }, [로그, 도는중, 다시읽기])

  if (에러) return <카드 제목="조회수 알리미"><알림줄 글={'못 읽었어요 — ' + (에러 as Error).message} 종류="나쁨" /></카드>
  if (!자료) return <카드 제목="조회수 알리미">확인하는 중…</카드>

  const 알 = 자료.알리미
  const 간격값 = 간격 ?? String(알.간격분)
  const 문턱글 = Number(알.문턱).toLocaleString('ko-KR')

  const 스위치누름 = async () => {
    try {
      if (알.켜짐) { await 부르기('/watchdog-off', { 무엇: '알리미' }); 알림담기('껐습니다.') }
      else { await 부르기('/watchdog-on', { 무엇: '알리미', 간격: Number(간격값) }); 알림담기('켰습니다.') }
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 다시읽기() }
  }

  // 간격을 바꾸면 켜져 있을 때만 다시 건다(꺼져 있으면 켤 때 그 값을 쓴다) — 옛 3300~3307
  const 간격바뀜 = async (v: string) => {
    간격담기(v)
    if (!알.켜짐) return
    try { await 부르기('/watchdog-on', { 무엇: '알리미', 간격: Number(v) }); 알림담기('간격을 바꿨습니다.') }
    catch (err: any) { 알림담기('실패 — ' + err.message) }
    다시읽기()
  }

  const 지금보기 = async () => {
    도는중담기(true)
    알림담기('돌고 있습니다 — 「돌려 본 기록」에서 볼 수 있어요')
    try {
      const r = await 부르기<{ 안됨?: string }>('/watchdog-run', { 무엇: '알리미' })
      if (r.안됨) { 알림담기(r.안됨); 도는중담기(false) }
    } catch (err: any) { 알림담기('실패 — ' + err.message); 도는중담기(false) }
  }

  const 알결과 = 알.마지막

  return (
    <카드 제목="조회수 알리미">
      <귀띔>계정마다 <b>최근 글</b>을 정해진 간격으로 보고,{' '}
        <b>{'조회수가 ' + 문턱글 + '회를 넘으면'}</b> 텔레그램으로 알려 줍니다.
        계정 · 글 이름 · 조회수 · 좋아요 · 댓글 수를 함께 보냅니다.</귀띔>
      <속내 머리="언제 알리나요">
        <ol className="ml-[1.1rem] list-decimal space-y-1">
          <li>잰 때로부터 <b>{알.며칠 + '일'}</b> 이내에 올린 글만 봅니다 — 옛 글이 천천히 문턱을 넘는 것은 안 알립니다</li>
          <li>조회수가 <b>{문턱글}</b> 이상일 때 알립니다</li>
          <li><b>한 글은 한 번만</b> 알립니다 — 안 그러면 30분마다 같은 알림이 옵니다</li>
        </ol>
      </속내>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <스위치 켜짐={알.켜짐} onChange={스위치누름} aria-label="조회수 알리미 켜고 끄기" />
        <span>{알.켜짐 ? <b className="text-green-600">켜짐</b> : '꺼짐'}</span>
        <Select value={간격값} items={{ '15': '15분마다', '30': '30분마다', '60': '1시간마다', '180': '3시간마다' }}
          onValueChange={(v) => v && 간격바뀜(v)}>
          <SelectTrigger className="w-auto min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15분마다</SelectItem>
            <SelectItem value="30">30분마다</SelectItem>
            <SelectItem value="60">1시간마다</SelectItem>
            <SelectItem value="180">3시간마다</SelectItem>
          </SelectContent>
        </Select>
        <button type="button" disabled={도는중} onClick={지금보기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          지금 보기
        </button>
      </div>
      <알림줄 글={알림} />
      {알결과 ? (
        <div className="mt-2 text-sm">
          <div>마지막으로 본 때 <b>{짧은때(알결과.때)}</b> — {(알결과.판들 ?? [])
            .map((p) => (p.계정 || '첫 계정') + ' ' + (p.안됨 ? '⚠️' : p.본글 + '편'))
            .join(' · ')}</div>
          {(알결과.알린것 ?? []).length ? (
            <ul className="ml-[1.1rem] mt-1.5 list-disc text-[0.85rem]">
              {알결과.알린것.map((g, i) => (
                <li key={i}><b>{g.별칭 || g.계정 || '첫 계정'}</b> 「{g.이름}」 — 조회 {Number(g.성적?.조회수 ?? 0).toLocaleString('ko-KR')}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-muted-foreground">문턱을 넘은 새 글은 없었어요.</div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">아직 본 적이 없어요. 「지금 보기」를 눌러 보세요.</div>
      )}
    </카드>
  )
}
