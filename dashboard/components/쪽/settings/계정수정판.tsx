'use client'
// 계정 수정판 — 별칭·분야·언어·제휴 넷만 고친다(옛 설정화면-html.mjs 653~674 · 2524~2545 · 2825~2879)
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 알림줄 } from '@/components/공용/알림줄'
import { 조합안내, 경고칸 } from '@/components/공용/조합안내'
import { use다시그리기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

export type 계정상태 = {
  계정: string
  아이디?: string
  정보: { 별칭?: string; 분야?: string; 언어?: string; 제휴?: string }
  고를것?: { 분야: string[]; 언어: string[]; 제휴: string[] }
  되는조합?: { 분야: string; 언어: string }[]
  // 아래 둘은 마법사가 쓴다 — /status 가 함께 주는 필드다(components/마법사/걸음틀.ts)
  분야안내?: Record<string, Record<string, { 귀띔: string; 예: string }>>
  열쇠?: { 이름: string; 설명?: string; 필수?: boolean; 공유?: boolean; 받는법?: string[]; 채움?: boolean }[]
}

const 고르개 = 'mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm'

export function 계정수정판({ 열림, 열림담기, 상태, onDone }: {
  열림: boolean
  열림담기: (v: boolean) => void
  상태: 계정상태
  onDone: (별칭: string) => void
}) {
  const 옛분야 = 상태.정보?.분야 ?? ''
  const [별칭, 별칭담기] = useState(상태.정보?.별칭 ?? '')
  const [분야, 분야담기] = useState(옛분야)
  const [언어, 언어담기] = useState(상태.정보?.언어 ?? '')
  const [제휴, 제휴담기] = useState(상태.정보?.제휴 ?? '')
  const [알림, 알림담기] = useState('')
  const [바쁨, 바쁨담기] = useState(false)
  const 다시그리기 = use다시그리기()
  const router = useRouter()

  // 판을 열 때마다 지금 계정 값으로 다시 채운다 — 앞 계정 값이 남으면 엉뚱한 것을 저장한다
  useEffect(() => {
    if (!열림) return
    별칭담기(상태.정보?.별칭 ?? '')
    분야담기(상태.정보?.분야 ?? '')
    언어담기(상태.정보?.언어 ?? '')
    제휴담기(상태.정보?.제휴 ?? '')
    알림담기('')
    // 판이 열려 있는 동안 /status 가 새로 와도 적던 것을 덮지 않는다 — 열 때 한 번만 채운다
  }, [열림]) // eslint-disable-line react-hooks/exhaustive-deps

  const 고를것 = 상태.고를것 ?? { 분야: [], 언어: [], 제휴: [] }
  const 조합들 = 상태.되는조합 ?? [{ 분야: '요리', 언어: '한국어' }]

  const 저장 = async () => {
    바쁨담기(true)
    try {
      const s = await 부르기<{ 분야바뀜?: boolean; 계정: string; 옛분야?: string }>('/account-edit', { 별칭, 분야, 언어, 제휴 })
      다시그리기()
      열림담기(false)
      // 뼈대는 서버가 갈아 끼웠다. 이어서 말투를 새 분야 예시로 다시 받는다.
      // 그때는 알림을 안 띄운다 — 옛 화면도 마법사로 넘어가며 알림을 건너뛰었다(옛 2866~2873)
      // 마법사가 「분야를 X → Y 로 바꿨습니다」 를 띄우려면 옛 분야도 함께 넘겨야 한다(옛 2874)
      if (s.분야바뀜) {
        router.push('/wizard?말투만=1&계정=' + encodeURIComponent(s.계정 ?? '') +
          '&옛분야=' + encodeURIComponent(s.옛분야 ?? '') + '&새분야=' + encodeURIComponent(분야))
      }
      else onDone(별칭)
    } catch (err) { 알림담기((err as Error).message) }
    finally { 바쁨담기(false) }
  }

  return (
    <Dialog open={열림} onOpenChange={열림담기}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>계정 수정</DialogTitle>
        </DialogHeader>
        <p className="text-[0.88rem] text-pretty text-muted-foreground">
          말투 · 열쇠 · 발행 시각은 「세팅」 쪽에서 고쳐요. 여기서 바꾸는 건 이 넷뿐입니다.
        </p>

        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅈ계정">스레드 계정 이름</label>
          <input
            id="ㅈ계정" disabled className={고르개 + ' text-muted-foreground'}
            value={상태.아이디 ? '@' + 상태.아이디 : '(아직 모릅니다 — 토큰을 넣으면 채워집니다)'}
            readOnly
          />
        </div>
        <div className={경고칸}>
          <b>계정 이름은 바꿀 수 없습니다.</b>{' '}
          이 이름이 열쇠 파일 · 말투 파일 · 사진 폴더 · 기록 · 발행 시각표,
          그리고 <b>쿠팡 꼬리표</b>의 이름이기도 합니다.
          바꾸면 지금까지 쌓인 수익 통계가 끊깁니다. 이름을 바꾸려면 계정을 새로 만들어야 합니다.
        </div>

        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅈ별칭">
            별칭 <span className="font-normal text-muted-foreground">— 화면에 보일 이름</span>
          </label>
          <input id="ㅈ별칭" maxLength={20} className={고르개} value={별칭} onChange={(e) => 별칭담기(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅈ분야">계정 분야</label>
          <select id="ㅈ분야" className={고르개} value={분야} onChange={(e) => 분야담기(e.target.value)}>
            {고를것.분야.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅈ언어">사용 언어</label>
          <select id="ㅈ언어" className={고르개} value={언어} onChange={(e) => 언어담기(e.target.value)}>
            {고를것.언어.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅈ제휴">제휴 마케팅</label>
          <select id="ㅈ제휴" className={고르개} value={제휴} onChange={(e) => 제휴담기(e.target.value)}>
            {고를것.제휴.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        <조합안내 분야={분야} 언어={언어} 제휴={제휴} 조합들={조합들} 머리말="고칠 수는 있지만" />

        {분야 !== 옛분야 && (
          <div className={경고칸}>
            <b>분야를 {옛분야} → {분야} 로 바꿉니다.</b><br />
            글 쓰는 규칙이 통째로 바뀌므로 <b>말투도 새 분야에 맞게 다시 잡아야 합니다.</b><br />
            고치고 나면 말투 설정을 이어서 진행합니다. 적어 두신 정체성·말투·표현·예시는 그대로 남습니다.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button" disabled={바쁨} onClick={저장}
            className="rounded-lg border-transparent bg-primary transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            이대로 고치기
          </button>
          <button
            type="button" onClick={() => 열림담기(false)}
            className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold"
          >
            취소
          </button>
        </div>
        <알림줄 글={알림} 종류="나쁨" />
      </DialogContent>
    </Dialog>
  )
}
