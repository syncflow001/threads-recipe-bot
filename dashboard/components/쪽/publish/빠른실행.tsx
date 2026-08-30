'use client'
// 빠른 실행 카드 — 모으기·발행 단추와 멈추기(옛 HTML 819~825, JS 3331~3341·3346)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 부르기 } from '@/lib/api'

export function 빠른실행({ 실행중, 실행중담기 }: { 실행중: boolean; 실행중담기: (v: boolean) => void }) {
  const [보내는중, 보내는중담기] = useState(false)

  const 시작하기 = async (단계: string) => {
    if (단계 === '발행'
      && !confirm('저장소에서 등급이 제일 높은 글 한 편을 지금 올립니다. 계속할까요?')) return
    보내는중담기(true)
    try {
      const r = await 부르기<{ 안됨?: string }>('/run', { 단계 })
      if (r.안됨) { alert(r.안됨); return }
      실행중담기(true)
    } catch (err: any) { alert(err.message) }
    finally { 보내는중담기(false) }
  }

  const 멈추기 = () => 부르기('/stop', {}).catch(() => {})

  return (
    <카드 제목="빠른 실행">
      <귀띔>누르면 바로 시작해요. 뭘 하고 있는지는 옆 「돌려 본 기록」에 뜹니다.</귀띔>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={실행중 || 보내는중} onClick={() => 시작하기('모으기')}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          저장소에 글 모으기
          <span className="block text-xs font-normal text-primary-foreground/85">홈을 넓게 훑어 쓸 만한 글 10개를 쟁여 둬요</span>
        </button>
        <button type="button" disabled={실행중 || 보내는중} onClick={() => 시작하기('발행')}
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-left text-sm font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-45">
          지금 1건 업로드
          <span className="block text-xs font-normal text-destructive/80">저장소에서 등급이 제일 높은 글 하나를 지금 올려요</span>
        </button>
        <button type="button" disabled={!실행중} onClick={멈추기}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          멈추기
        </button>
      </div>
    </카드>
  )
}
