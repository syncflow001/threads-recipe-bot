'use client'
// 계정 삭제판 — 별칭을 그대로 타이핑해야 지운다(옛 설정화면-html.mjs 676~687 · 2881~2909)
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 알림줄 } from '@/components/공용/알림줄'
import { 계정바뀜 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

export function 계정삭제판({ 열림, 열림담기, 별칭, onDone }: {
  열림: boolean
  열림담기: (v: boolean) => void
  별칭: string
  onDone: () => void
}) {
  const [적은것, 적은것담기] = useState('')
  const [알림, 알림담기] = useState('')
  const [바쁨, 바쁨담기] = useState(false)
  const client = useQueryClient()

  useEffect(() => { if (열림) { 적은것담기(''); 알림담기('') } }, [열림])

  const 지우기 = async () => {
    바쁨담기(true)
    try {
      await 부르기('/account-delete', { 별칭: 적은것 })
      열림담기(false)
      계정바뀜(client, '') // 지운 계정을 계속 보고 있을 수는 없다. 첫 계정으로 돌아간다
      onDone()
    } catch (err) { 알림담기((err as Error).message) }
    finally { 바쁨담기(false) }
  }

  return (
    <Dialog open={열림} onOpenChange={열림담기}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">계정 삭제</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[0.86rem] text-amber-900 text-pretty">
          <b>{별칭}</b> 계정의 열쇠 · 말투 · 시각표 · 기록이 지워집니다.<br />
          내려받은 사진과 이미 올린 글은 그대로 남습니다.
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅅ별칭">
            확인을 위해 <b>{별칭}</b> 를 그대로 입력해 주세요
          </label>
          <input
            id="ㅅ별칭" autoComplete="off"
            className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={적은것} onChange={(e) => 적은것담기(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button" disabled={바쁨} onClick={지우기}
            className="rounded-lg border bg-destructive px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-45"
          >
            되돌릴 수 없습니다. 지웁니다
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
