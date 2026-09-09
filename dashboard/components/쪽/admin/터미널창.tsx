'use client'
// 터미널 창 하나 — xterm 을 붙이고 SSE 로 화면을 받아 그리고 키 입력을 서버로 보낸다(옛 설정화면-터미널.mjs 245~286)
import { useEffect, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import { 부르기 } from '@/lib/api'

export function 터미널창({ 번호, 닫기 }: { 번호: number; 닫기: () => void }) {
  const 몸 = useRef<HTMLDivElement>(null)
  const [끝남, 끝남담기] = useState(false)

  useEffect(() => {
    let 죽었나 = false
    let 치우기 = () => {}
    // xterm 은 브라우저에서만 산다 — 이 쪽을 열 때만 내려받는다(다른 쪽을 무겁게 안 한다)
    ;(async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      if (죽었나 || !몸.current) return
      const 터미널 = new Terminal({
        cursorBlink: true, fontSize: 13, scrollback: 3000,
        theme: { background: '#1e1e1e' }, allowProposedApi: true,
      })
      const 맞춤부품 = new FitAddon()
      터미널.loadAddon(맞춤부품)
      터미널.open(몸.current)

      // 키 입력은 순서가 생명이라 한 줄로 세워 보낸다 — fetch 는 먼저 보낸 것이 먼저 닿는다고 보장하지 않는다
      let 줄 = Promise.resolve()
      터미널.onData((글) => {
        줄 = 줄.then(() => 부르기('/term/input', { 번호, 글 })).then(() => {}).catch(() => {})
      })

      let 지난크기 = ''
      const 맞춤 = () => {
        if (!몸.current || 몸.current.offsetWidth === 0) return
        맞춤부품.fit()
        const 크기 = 터미널.cols + 'x' + 터미널.rows
        if (크기 === 지난크기) return
        지난크기 = 크기
        부르기('/term/resize', { 번호, cols: 터미널.cols, rows: 터미널.rows }).catch(() => {})
      }
      const 지켜보개 = new ResizeObserver(() => 맞춤())
      지켜보개.observe(몸.current)

      const 흐름 = new EventSource('/api/term/stream?번호=' + 번호)
      흐름.addEventListener('out', (e) => 터미널.write(JSON.parse((e as MessageEvent).data)))
      흐름.addEventListener('end', (e) => {
        const { 코드 } = JSON.parse((e as MessageEvent).data)
        터미널.write('\r\n[셸이 끝났습니다' + (코드 == null ? '' : ' · 종료코드 ' + 코드) + '. 닫기를 누르세요]\r\n')
        끝남담기(true)
        흐름.close()
      })

      const 시계 = setTimeout(() => { 맞춤(); 터미널.focus() }, 50)
      치우기 = () => { clearTimeout(시계); 지켜보개.disconnect(); 흐름.close(); 터미널.dispose() }
    })()
    return () => { 죽었나 = true; 치우기() }
  }, [번호])

  return (
    <div className="flex min-h-[16rem] flex-col overflow-hidden rounded-[10px] border bg-[#1e1e1e]">
      <div className={'flex items-center gap-2 px-2.5 py-1 text-[0.85rem] text-[#ddd] ' + (끝남 ? 'bg-[#4a2b2b]' : 'bg-[#2b2b2b]')}>
        <b className="flex-1 font-semibold">터미널 {번호}</b>
        {/* ⚠️ 2026-09-08 — Ctrl+C 는 **터미널 안을 먼저 눌러 초점을 줘야** 먹는다 (실측).
            단추를 눌러 명령을 보낸 사람은 초점이 단추에 있어서, Ctrl+C 를 눌러도 아무 일이 안 났다.
            그래서 초점과 상관없이 도는 것을 멈추는 단추를 둔다 — 보내는 것은 같은 \x03 이다 */}
        <button
          type="button"
          title="돌고 있는 명령을 멈춥니다 (Ctrl+C 와 같아요)"
          onClick={() => { 부르기('/term/input', { 번호, 글: '\x03' }).catch(() => {}) }}
          disabled={끝남}
          className="rounded border border-[#666] px-1.5 py-0.5 text-[0.78rem] font-semibold text-[#ddd] hover:bg-[#444] disabled:opacity-40"
        >
          멈추기
        </button>
        <button type="button" title="닫기" onClick={닫기} className="px-1 text-base text-[#bbb] hover:text-white">✕</button>
      </div>
      <div ref={몸} className="min-h-0 flex-1 p-1 [&_.xterm]:h-full" />
    </div>
  )
}
