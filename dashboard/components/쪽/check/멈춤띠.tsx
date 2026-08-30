'use client'
// 멈춤띠 — 자동 발행 온/오프 표시줄(옛 src/설정화면-안전.mjs 62~65 · JS 3247~3266)
import { use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 멈춤자료 = { 멈춤: { 멈춤: boolean; 어느것: string | null; 때: string | null } }

export function 멈춤띠() {
  const 상태 = use자료<멈춤자료>('/status')

  const 전부멈추기 = async () => {
    if (!confirm('모든 계정의 자동 발행을 멈춥니다. 시각표는 그대로 남습니다.')) return
    await 부르기('/halt', {})
    상태.refetch()
  }
  const 다시켜기 = async () => {
    await 부르기('/resume', {})
    상태.refetch()
  }

  if (상태.error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive md:col-span-2">
        못 읽었어요 — {(상태.error as Error).message}
      </div>
    )
  }
  if (!상태.data) return <div className="rounded-xl border p-3 text-sm md:col-span-2">확인하는 중...</div>

  const 멈춤 = 상태.data.멈춤

  return 멈춤?.멈춤 ? (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e57373] bg-[#fdecec] p-3 md:col-span-2">
      <b>정지 — 멈춰 있습니다 ({멈춤.어느것})</b>
      <button type="button" onClick={다시켜기}
        className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
        다시 켜기
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-[#e4f3ec] p-3 md:col-span-2">
      <b>자동 발행 — 돌고 있습니다</b>
      <button type="button" onClick={전부멈추기}
        className="rounded-lg bg-[#d33] px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#a82626]">
        전부 멈추기
      </button>
    </div>
  )
}
