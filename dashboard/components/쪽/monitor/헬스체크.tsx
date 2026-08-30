'use client'
// 헬스체크 카드 — 계정 열쇠 점검. 스위치·간격·지금 재보기(옛 HTML 1077~1096, JS 3245~3327)
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

const 경고칸 = 'rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm'

export function 헬스체크({ 자료, 에러, 다시읽기 }: { 자료?: 감시자료; 에러?: unknown; 다시읽기: () => void }) {
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

  if (에러) return <카드 제목="헬스체크 — 계정 열쇠 점검"><알림줄 글={'못 읽었어요 — ' + (에러 as Error).message} 종류="나쁨" /></카드>
  if (!자료) return <카드 제목="헬스체크 — 계정 열쇠 점검">확인하는 중…</카드>

  const 헬 = 자료.헬스체크
  const 간격값 = 간격 ?? String(헬.간격시간)

  const 스위치누름 = async () => {
    try {
      if (헬.켜짐) { await 부르기('/watchdog-off', { 무엇: '헬스체크' }); 알림담기('껐습니다.') }
      else { await 부르기('/watchdog-on', { 무엇: '헬스체크', 간격: Number(간격값) }); 알림담기('켰습니다.') }
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 다시읽기() }
  }

  // 간격을 바꾸면 켜져 있을 때만 다시 건다(꺼져 있으면 켤 때 그 값을 쓴다) — 옛 3300~3307
  const 간격바뀜 = async (v: string) => {
    간격담기(v)
    if (!헬.켜짐) return
    try { await 부르기('/watchdog-on', { 무엇: '헬스체크', 간격: Number(v) }); 알림담기('간격을 바꿨습니다.') }
    catch (err: any) { 알림담기('실패 — ' + err.message) }
    다시읽기()
  }

  const 지금재보기 = async () => {
    도는중담기(true)
    알림담기('돌고 있습니다 — 「돌려 본 기록」에서 볼 수 있어요')
    try {
      const r = await 부르기<{ 안됨?: string }>('/watchdog-run', { 무엇: '헬스체크' })
      if (r.안됨) { 알림담기(r.안됨); 도는중담기(false) }
    } catch (err: any) { 알림담기('실패 — ' + err.message); 도는중담기(false) }
  }

  const 헬결과 = 헬.마지막

  return (
    <카드 제목="헬스체크 — 계정 열쇠 점검">
      <귀띔><b>계정 열쇠가 온전한지, 계정끼리 섞이지 않았는지</b> 정해진 간격마다 스스로 잽니다.
        이상이 있을 때만 텔레그램으로 알립니다 — <b>조용하면 정상입니다.</b></귀띔>
      <속내 머리="무엇을 재나요">
        <ol className="ml-[1.1rem] list-decimal space-y-1">
          <li>열쇠가 <b>잘리지 않고</b> 들어가는지 (파일에 적힌 길이와 실제로 들어가는 길이를 견줍니다)</li>
          <li>두 계정이 <b>같은 열쇠</b>를 쓰고 있지 않은지</li>
          <li>우리가 파일에서 직접 읽는 값이 <b>파일과 같은지</b></li>
          <li>쿠키의 <b>진짜 주인</b>이 그 계정인지 — 스레드에게 직접 묻습니다</li>
        </ol>
        <p className="mt-2">실제로 글을 올리거나 활동하지 않습니다. <b>재기만 합니다.</b></p>
      </속내>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <스위치 켜짐={헬.켜짐} onChange={스위치누름} aria-label="헬스체크 켜고 끄기" />
        <span>{헬.켜짐 ? <b className="text-green-600">켜짐</b> : '꺼짐'}</span>
        <Select value={간격값} items={{ '1': '1시간마다', '3': '3시간마다', '6': '6시간마다', '12': '12시간마다' }}
          onValueChange={(v) => v && 간격바뀜(v)}>
          <SelectTrigger className="w-auto min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1시간마다</SelectItem>
            <SelectItem value="3">3시간마다</SelectItem>
            <SelectItem value="6">6시간마다</SelectItem>
            <SelectItem value="12">12시간마다</SelectItem>
          </SelectContent>
        </Select>
        <button type="button" disabled={도는중} onClick={지금재보기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          지금 재보기
        </button>
      </div>
      <알림줄 글={알림} />
      {!자료.텔레그램있나 && (
        <div className={경고칸 + ' mt-2'}>텔레그램 열쇠가 없어 <b>알림이 안 갑니다.</b> 「세팅 → 열쇠」에서 넣어 주세요.</div>
      )}
      {헬결과 ? (
        헬결과.탈.length ? (
          <div className={경고칸 + ' mt-2'}>
            <b>{헬결과.탈.length}가지 이상</b> <span className="text-muted-foreground">{짧은때(헬결과.때)}</span>
            <ul className="ml-[1.1rem] mt-1.5 list-disc">
              {헬결과.탈.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        ) : (
          <div className="mt-2 text-sm">마지막으로 잰 때 <b>{짧은때(헬결과.때)}</b> — 계정 {헬결과.계정수}개, <b className="text-green-600">이상 없음</b></div>
        )
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">아직 잰 적이 없어요. 「지금 재보기」를 눌러 보세요.</div>
      )}
    </카드>
  )
}
