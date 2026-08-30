'use client'
// 대화로 말투 다듬기 — 클로드가 고친 카드는 눌러야 칸에 들어간다. 서버는 대화를 기억하지 않는다(옛 3184~3239)
import { useEffect, useRef, useState } from 'react'
import { 알림줄 } from '@/components/공용/알림줄'
import { 부르기 } from '@/lib/api'

export type 카드값 = { 정체성: string; 말투: string; 표현: string; 예시: string[] }
type 말풍선자료 = { 누구: '나' | '클로드'; 글: string }

export function 대화다듬기({ 지금카드, onApply, 초기화신호 }: {
  지금카드: () => 카드값
  onApply: (카드: 카드값) => void
  초기화신호: unknown
}) {
  const [대화, 대화담기] = useState<말풍선자료[]>([])
  const [받은카드, 받은카드담기] = useState<카드값 | null>(null)
  const [입력, 입력담기] = useState('')
  const [보내는중, 보내는중담기] = useState(false)
  const [알림, 알림담기] = useState('')
  const 대화칸 = useRef<HTMLDivElement>(null)

  // 계정이 바뀌면 앞 계정의 대화 흔적을 지운다(옛 2384~2386)
  useEffect(() => { 대화담기([]); 받은카드담기(null); 알림담기('') }, [초기화신호])
  useEffect(() => { if (대화칸.current) 대화칸.current.scrollTop = 대화칸.current.scrollHeight })

  const 카드적용 = () => {
    if (!받은카드) return
    onApply(받은카드)
    받은카드담기(null)
    알림담기('위 칸에 넣었습니다. 「말투 저장」을 눌러야 파일에 남습니다.')
  }

  const 한마디보내기 = async () => {
    const 글 = 입력.trim()
    if (!글) return
    const 새대화: 말풍선자료[] = [...대화, { 누구: '나', 글 }]
    대화담기(새대화)
    받은카드담기(null)
    입력담기('')
    보내는중담기(true)
    알림담기('생각하는 중입니다')
    try {
      const r = await 부르기<{ 답: string; 카드: 카드값 | null }>('/persona-chat', { 대화: 새대화, 카드: 지금카드() })
      대화담기([...새대화, { 누구: '클로드', 글: r.답 }])
      받은카드담기(r.카드)
      알림담기(r.카드 ? '' : '고칠 것이 없다고 합니다.')
    } catch (err: any) {
      // 못 보낸 말은 이력에 남기지 않는다 — 다음에 또 보내진다
      알림담기(err.message)
    } finally { 보내는중담기(false) }
  }

  const 카드줄들: [string, string][] = 받은카드
    ? ([['나를 한 줄로', 받은카드.정체성], ['말투', 받은카드.말투], ['표현', 받은카드.표현],
      ['예시', (받은카드.예시 || []).join(' / ')]] as [string, string][])
      .filter(([, v]) => String(v || '').trim())
    : []

  return (
    <div className="mt-4 rounded-xl border p-3">
      <div className="mb-1 font-semibold">💬 대화하면서 말투 다듬기</div>
      <p className="mb-2 text-[0.88rem] text-pretty text-muted-foreground">
        「좀 더 담백하게」 「존댓말로 바꿔줘」 처럼 말하면 위 네 칸을 고쳐 줍니다.{' '}
        <b>고친 카드는 눌러야 칸에 들어갑니다</b> — 저절로 바뀌지 않습니다.{' '}
        칸에 들어간 뒤 <b>「말투 저장」을 눌러야</b> 파일에 남습니다.
      </p>
      <div ref={대화칸} className="mb-2 max-h-64 space-y-2 overflow-y-auto">
        {대화.map((ㄷ, i) => (
          <div key={i}
            className={ㄷ.누구 === '클로드'
              ? 'w-fit max-w-[85%] rounded-lg bg-muted px-2.5 py-1.5 text-sm'
              : 'ml-auto w-fit max-w-[85%] rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm'}>
            {ㄷ.글}
          </div>
        ))}
        {받은카드 && (
          <div className="rounded-lg border p-2.5 text-sm">
            <dl className="space-y-1">
              {카드줄들.map(([이름, 값]) => (
                <div key={이름}>
                  <dt className="text-xs font-semibold text-muted-foreground">{이름}</dt>
                  <dd>{값}</dd>
                </div>
              ))}
            </dl>
            <button type="button" onClick={카드적용}
              className="mt-2 rounded-md border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2 py-1 text-xs font-semibold">
              이 카드로 바꾸기
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input value={입력} onChange={(e) => 입력담기(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') 한마디보내기() }}
          placeholder="예) 존댓말 말고 반말로. 이모지는 끝에 하나만"
          className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm" />
        <button type="button" onClick={한마디보내기} disabled={보내는중}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          보내기
        </button>
        <button type="button" onClick={() => { 대화담기([]); 받은카드담기(null); 알림담기('') }}
          className="rounded-md border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2 py-1.5 text-xs font-semibold">
          대화 비우기
        </button>
      </div>
      <알림줄 글={알림} />
    </div>
  )
}
