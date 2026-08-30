'use client'
// 말투 추천 줄 — ✨ 추천받기/다시 추천 버튼과 추천 근거 목록(옛 3050~3118, 새로고침 복구 1620~1656)
import { useEffect, useState } from 'react'
import { 진행칸 } from '@/components/공용/진행칸'
import { use진행따라붙기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

export type 추천결과 = {
  정체성: string
  말투: string
  표현: string
  뜻: { 정체성: string; 말투: string; 표현: string } | null
  예시들?: { 본문: string; 작성자: string; 조회수: number; 확산?: number }[]
  본계정들: { 작성자: string; 확산: number }[]
  왜: string
}

export function 말투추천({ onApply, 초기화신호 }: { onApply: (r: 추천결과) => void; 초기화신호: unknown }) {
  const [알림, 알림담기] = useState('')
  const [나쁨, 나쁨담기] = useState(false)
  const [근거, 근거담기] = useState<추천결과['본계정들'] | null>(null)
  const [재추천보임, 재추천보임담기] = useState(false)
  const [도는중, 도는중담기] = useState(false)

  // 계정이 바뀌면 앞 계정의 추천 흔적을 지운다 — 안 지우면 새 계정 화면에 남는다(옛 2384~2386)
  useEffect(() => { 알림담기(''); 근거담기(null); 재추천보임담기(false) }, [초기화신호])

  // 추천 결과를 알림·근거·칸에 채운다 — 방금 받았든, 새로고침 뒤 다시 붙잡았든 같은 손으로 한다
  const 결과적용 = (r: 추천결과) => {
    알림담기(r.왜 || '추천을 받았습니다')
    나쁨담기(false)
    근거담기(r.본계정들)
    재추천보임담기(true)
    onApply(r)
  }

  // ⚠️ 돌던 일을 다시 붙잡는다(옛 진행따라붙기·놓친결과챙기기 1620~1656) — 새로고침 뒤뿐 아니라
  // 「이미 돌고 있습니다」 오류를 받았을 때도 같은 경로로 붙잡는다(옛 3064).
  // 다른 계정이 돌리던 일이면 화면을 억지로 그 계정으로 바꾸지 않는다 — 지금 보는 계정만 잰다
  const 진행따라붙기 = use진행따라붙기<추천결과>('말투 추천', 도는중담기, 결과적용)

  const 추천받기 = async () => {
    도는중담기(true)
    알림담기('')
    근거담기(null)
    try {
      const r = await 부르기<추천결과>('/persona-suggest', {})
      결과적용(r)
    } catch (err: any) {
      알림담기(err.message)
      나쁨담기(true)
      if (/이미 돌고/.test(err.message)) 진행따라붙기()
    } finally { 도는중담기(false) }
  }

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={도는중} onClick={추천받기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          ✨ 추천받기
        </button>
        {재추천보임 && (
          <button type="button" disabled={도는중} onClick={추천받기}
            className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
            다시 추천
          </button>
        )}
        {!도는중 && 알림 && (
          <span className={나쁨 ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold text-green-600'}>
            {알림}
          </span>
        )}
      </div>
      <진행칸 켜짐={도는중} 무엇="말투 추천" onDone={() => { 도는중담기(false); 진행따라붙기() }} />
      {근거 && 근거.length > 0 && (
        <div className="mt-2 text-sm">
          <p className="text-muted-foreground">이 계정들을 보고 뽑았습니다 (확산 = 조회수 ÷ 팔로워)</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {근거.map((c) => (
              <a key={c.작성자} href={`https://www.threads.com/@${encodeURIComponent(c.작성자)}`}
                target="_blank" rel="noopener" className="font-semibold hover:underline">
                @{c.작성자} · {c.확산}배
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
