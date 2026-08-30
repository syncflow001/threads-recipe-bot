'use client'
// 터미널 판 — 창 나누기·창 수·잠그기와 창 격자(옛 설정화면-터미널.mjs 172~180 · 237~243 · 288~335)
import { useEffect, useRef, useState } from 'react'
import { 귀띔 } from '@/components/공용/카드'
import { 터미널창 } from './터미널창'
import { 부르기 } from '@/lib/api'

// 옛 설정화면-터미널.mjs 의 최대창. 서버도 1~4 만 받는다
const 최대 = 4

export function 터미널판({ 처음창들, 명령, 명령표 = 0, 다닫음 }: {
  처음창들: number[]; 명령: string | null; 명령표?: number; 다닫음?: () => void
}) {
  const [창들, 창들담기] = useState<number[]>([])

  // 마운트할 때 — 서버가 기억하는 창을 되살리고, 하나도 없으면 하나 연다.
  // 대기명령이 있으면 새 창을 하나 더 열어 거기에 친다(옛 명령치기)
  useEffect(() => {
    let 죽었나 = false
    const 것들 = [...처음창들]
    const 열기 = async () => {
      let 번호 = 1
      while (것들.includes(번호)) 번호++
      if (번호 > 최대) return null
      await 부르기('/term/open', { 번호 })
      것들.push(번호)
      return 번호
    }
    ;(async () => {
      if (!것들.length) await 열기()
      const 보낼창 = 명령 ? (await 열기()) ?? Math.max(...것들) : null
      if (죽었나) return
      창들담기([...것들].sort((a, b) => a - b))
      if (명령 && 보낼창) {
        await new Promise((r) => setTimeout(r, 900)) // 셸 프롬프트가 뜰 시간
        await 부르기('/term/input', { 번호: 보낼창, 글: 명령 + '\r' }).catch(() => {})
      }
    })().catch((err) => { if (!죽었나) alert((err as Error).message) })
    return () => { 죽었나 = true }
    // 마운트 때 한 번만 — 되살리기와 대기명령은 다시 돌면 안 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 마운트 뒤에 명령이 새로 들어오면 마지막 창에 친다. 설정 쪽 「자동발급」 이 여기로 보낸다 (2026-08-30).
  // 마운트 때 이미 보낸 것은 위 useEffect 가 맡는다 — 여기서 또 보내면 두 번 돈다
  // 번호로 센다 — 같은 명령을 다시 눌러도 다시 돌아야 하기 때문이다
  const 보낸표 = useRef(명령표)
  useEffect(() => {
    if (!명령 || !창들.length || 보낸표.current === 명령표) return
    보낸표.current = 명령표
    부르기('/term/input', { 번호: Math.max(...창들), 글: 명령 + '\r' }).catch(() => {})
  }, [명령, 명령표, 창들])

  const 창열기 = async () => {
    let 번호 = 1
    while (창들.includes(번호)) 번호++
    if (번호 > 최대) return
    try {
      await 부르기('/term/open', { 번호 })
      창들담기((v) => [...v, 번호].sort((a, b) => a - b))
    } catch (err) { alert((err as Error).message) }
  }

  const 창닫기 = async (번호: number) => {
    창들담기((v) => v.filter((n) => n !== 번호))
    await 부르기('/term/close', { 번호 }).catch(() => {})
  }

  // 비밀번호를 뗐으니(2026-08-30) 이건 잠그는 게 아니라 창을 다 닫는 것이다
  const 다닫기 = async () => {
    창들담기([])
    await 부르기('/term/logout', {}).catch(() => {})
    다닫음?.()
  }

  const 격자 = 창들.length >= 3
    ? 'md:grid-cols-2 md:grid-rows-2 min-h-[70vh]'
    : 창들.length === 2 ? 'md:grid-cols-2 min-h-[60vh]' : 'min-h-[60vh]'

  return (
    <div>
      <귀띔>
        이 칸은 <b>이 맥에 직접 명령을 내리는 진짜 터미널</b>이에요.
        맥 터미널 앱과 같은 것이라 <b>파일을 지우는 명령도 막지 않아요.</b>
        대시보드 주소를 아는 사람은 여기까지 바로 들어옵니다 — 주소를 남에게 보여 주지 마세요.
      </귀띔>
      <div className="mb-2 mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={창들.length >= 최대}
          onClick={창열기}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          창 나누기
        </button>
        <span className="text-[0.86rem] text-muted-foreground">{창들.length} / {최대}</span>
        <span className="flex-1" />
        <button type="button" onClick={다닫기} className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1 text-sm font-semibold">
          창 모두 닫기
        </button>
      </div>
      <div className={'grid grid-cols-1 gap-2 ' + 격자}>
        {창들.map((번호) => <터미널창 key={번호} 번호={번호} 닫기={() => 창닫기(번호)} />)}
      </div>
    </div>
  )
}
