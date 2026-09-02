'use client'
// 섀도우밴 살피기 카드 — 켜고 끄기 · 계정별 마지막 판정 · 「설명」 팝업
// (모니터링 쪽, 점검 카드와 같은 결. 2026-08-31)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { 글그리기 } from '@/components/공용/글그리기'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 짧은때 } from '@/lib/글자'

type 신호 = { 이름: string; 빛: '초록' | '노랑' | '빨강'; 말: string }
type 줄 = { 때: string; 등급: '괜찮음' | '덜잼' | '주의' | '의심' | '못잼'; 신호들: 신호[]; 기준선탈?: string | null }
type 자료꼴 = { 켜짐: boolean; 간격시간: number; 것들: { 계정: string; 별칭: string; 마지막: 줄 | null }[] }

const 등급빛: Record<string, string> = {
  괜찮음: 'bg-green-100 text-green-900',
  덜잼: 'bg-muted text-muted-foreground',
  주의: 'bg-amber-100 text-amber-900',
  의심: 'bg-red-100 text-red-900',
  못잼: 'bg-muted text-muted-foreground',
}
// 「의심」 은 흔적이 나쁘다는 뜻이지 걸렸다는 뜻이 아니다. 배지 옆에 늘 이 말을 붙인다
const 등급말: Record<string, string> = {
  괜찮음: '', 덜잼: '신호 하나만 쟀어요', 주의: '흔적이 하나 나빠요',
  의심: '흔적이 나빠요 — 앱에서 계정 상태를 보세요', 못잼: '',
}
const 신호빛: Record<string, string> = { 초록: 'text-green-600', 노랑: 'text-amber-600', 빨강: 'text-destructive' }

export function 섀도우밴() {
  const 자료 = use자료<자료꼴>('/shadow', { 계정무관: true })
  const [알림, 알림담기] = useState('')
  const [열림, 열림담기] = useState(false)
  const [설명, 설명담기] = useState('')

  const 스위치누름 = async () => {
    try {
      if (자료.data?.켜짐) { await 부르기('/shadow-off'); 알림담기('껐습니다.') }
      else { await 부르기('/shadow-on', { 간격시간: 24 }); 알림담기('켰습니다. 하루에 한 번 살펴봅니다.') }
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 자료.refetch() }
  }

  const 설명열기 = async () => {
    열림담기(true)
    if (설명) return
    try { 설명담기((await 부르기<{ 글: string }>('/manual?이름=섀도우밴')).글) }
    catch (err: any) { 설명담기('설명을 못 읽었습니다 — ' + err.message) }
  }

  return (
    <카드 제목="섀도우밴 — 조용히 덜 퍼지고 있나">
      <귀띔>
        하루에 한 번, <b>로그인 안 한 남의 눈으로</b> 내 계정을 봅니다. 견줄 상대는 <b>어제까지의 나</b>예요.
        <b>단정하지는 않습니다</b> — 진짜 확인은 앱의 「계정 상태」 화면뿐이에요.
        무엇을 어떻게 재는지는 <b>설명</b>을 눌러 보세요.
      </귀띔>

      {자료.error ? (
        <알림줄 글={'못 읽었어요 — ' + (자료.error as Error).message} 종류="나쁨" />
      ) : !자료.data ? (
        <div className="text-sm text-muted-foreground">확인하는 중...</div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <스위치 켜짐={자료.data.켜짐} onChange={스위치누름} aria-label="섀도우밴 살피기 켜고 끄기" />
            <span>{자료.data.켜짐 ? <b className="text-green-600">켜짐</b> : '꺼짐'}</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={설명열기}
              className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1 text-sm font-semibold"
            >
              설명
            </button>
          </div>
          <알림줄 글={알림} />

          {자료.data.켜짐
            ? <div className="mt-2 text-sm text-muted-foreground">{자료.data.간격시간}시간마다 살펴봅니다.</div>
            : <div className="mt-2 text-sm text-muted-foreground">꺼져 있으면 노출이 죽어도 아무도 안 알려 줍니다.</div>}

          <div className="mt-3 flex flex-col gap-1.5">
            {자료.data.것들.map((c) => (
              <div key={c.계정 || 'main'} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="break-all">{c.별칭}</b>
                  <span className={'rounded-md px-1.5 py-0.5 text-[0.7rem] font-bold ' + (등급빛[c.마지막?.등급 ?? '못잼'])}>
                    {c.마지막?.등급 ?? '아직 안 잼'}
                  </span>
                  {c.마지막 && <span className="text-[0.8rem] text-muted-foreground">{짧은때(c.마지막.때)}</span>}
                  {c.마지막 && 등급말[c.마지막.등급]
                    ? <span className="text-[0.8rem] text-muted-foreground">{등급말[c.마지막.등급]}</span> : null}
                </div>
                {c.마지막?.기준선탈 ? (
                  <div className="mt-1 rounded-md border-l-4 border-amber-400 bg-amber-50 px-2 py-1 text-[0.82rem] text-amber-900">
                    📏 <b>도달 기준선을 못 믿겠어요</b> — {c.마지막.기준선탈}{' '}
                    그동안 도달 신호를 안 씁니다. <b>점검</b> 쪽 도달 칸에서 「기준선 다시 찍기」를 눌러 주세요.
                  </div>
                ) : null}
                {c.마지막?.신호들?.length ? (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {c.마지막.신호들.map((s, i) => (
                      <span key={i} className="text-[0.82rem]">
                        <span className={신호빛[s.빛] + ' font-semibold'}>{s.이름}</span>
                        <span className="text-muted-foreground"> — {s.말}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={열림} onOpenChange={열림담기}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>섀도우밴 — 왜 걸리고, 어떻게 피하고, 걸리면 어떻게 하나</DialogTitle>
          </DialogHeader>
          {설명 ? <글그리기 글={설명} /> : <div className="text-sm text-muted-foreground">불러오는 중…</div>}
        </DialogContent>
      </Dialog>
    </카드>
  )
}
