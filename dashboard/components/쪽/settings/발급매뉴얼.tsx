'use client'
// 「발급 매뉴얼」 — 사용법 문서의 페이스북 앱 절(/manual?이름=페이스북앱)을 그대로 문단으로 보여 준다
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 부르기 } from '@/lib/api'

// 문서 표시(**굵게**·``·### )는 화면에서 뜻이 없다. 떼고 문단으로만 보여 준다
const 문단들 = (글: string) =>
  글.replace(/\*\*/g, '').replace(/`/g, '').split(/\n{2,}/).map((s) => s.replace(/^#+\s*/, '').trim()).filter(Boolean)

export function 발급매뉴얼() {
  const [열림, 열림담기] = useState(false)
  const [글, 글담기] = useState('')
  const [안됨, 안됨담기] = useState('')

  const 열기 = async () => {
    열림담기(true)
    if (글) return
    try {
      const r = await 부르기<{ 글: string }>('/manual?이름=페이스북앱')
      글담기(r.글)
    } catch (err) { 안됨담기((err as Error).message) }
  }

  return (
    <>
      <button
        type="button"
        onClick={열기}
        className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold"
      >
        발급 매뉴얼
      </button>
      <Dialog open={열림} onOpenChange={열림담기}>
        <DialogContent className="max-h-[80vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>발급 매뉴얼</DialogTitle>
            <DialogDescription>페이스북 앱을 만들고 이 스레드 계정을 연결하는 순서입니다.</DialogDescription>
          </DialogHeader>
          {안됨 ? <p className="text-sm font-semibold text-destructive">{안됨}</p> : null}
          <div className="flex flex-col gap-2 text-sm leading-relaxed">
            {글 ? 문단들(글).map((문단, i) => (
              <p key={i} className="whitespace-pre-wrap text-pretty">{문단}</p>
            )) : 안됨 ? null : <p className="text-muted-foreground">읽는 중...</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
