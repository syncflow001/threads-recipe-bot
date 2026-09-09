'use client'
// 「쿠키 자동발급」 — 설정 쪽 아래 터미널에서 도구/쿠키받기.mjs 를 돌린다 (2026-09-08 사용자 요청).
// 그 도구가 이 계정용 크롬 창을 열고, 로그인만 하면 쿠키를 꺼내 열쇠 파일에 넣고 답글까지 읽히는지 재 준다.
// 토큰의 자동발급.tsx 와 같은 길(터미널로보내기 · 복사하기)을 탄다 — 새 API 를 만들지 않는다
import { useState } from 'react'
import { use계정 } from '@/lib/hooks'
import { 터미널로보내기 } from '@/lib/터미널명령'
import { 복사하기 } from '@/lib/복사'

export function 쿠키자동발급() {
  const 계정 = use계정()
  const [베낀것, 베낀것담기] = useState('')
  const [눌렀나, 눌렀나담기] = useState(false)
  const 명령 = 'node 도구/쿠키받기.mjs ' + (계정 ?? '')
  const 손으로받기 = async () => 베낀것담기((await 복사하기(명령)) ? '베꼈' : '못베낌')

  // ⚠️ 2026-09-08 — **누른 뒤 아무 말이 없으면 사람은 다시 누른다.** 실제로 일곱 번 눌렀다.
  //    터미널에서 앞 판이 로그인을 기다리는 동안 다시 누르면, 친 글자가 그 판의 입력으로 들어가
  //    **아무 일도 안 난다.** 무엇을 기다리는지 여기서 말해 준다
  const 받기 = () => { 터미널로보내기(명령); 눌렀나담기(true) }

  return (
    <div className="my-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={받기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold"
        >
          자동발급
        </button>
        <span className="text-[0.86rem] text-muted-foreground">
          <b>지금 쓰고 있는 크롬</b>에서 이 계정 로그인을 찾아 저절로 넣어요. 이미 로그인돼 있으면
          <b>창 하나 안 열고 누르기만 하면 끝</b>입니다. 넣은 뒤 답글까지 읽히는지 재 줍니다.<br />
          어디에도 그 계정 로그인이 없을 때만 <b>이 계정 전용 크롬 창</b>이 열려요. 거기서 로그인하면 바로 넣습니다.
          <b>게스트 창은 쓸 수 없어요</b> — 게스트는 쿠키를 저장하지 않습니다.
        </span>
      </div>
      {눌렀나 && (
        <div className="mt-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-sm">
          <b>아래 터미널에서 돌고 있어요.</b> 크롬에 이 계정 로그인이 있으면 몇 초 안에 「넣었습니다」가 뜹니다.
          없으면 <b>이 계정 전용 크롬 창</b>이 열려요 — 그 창에서 이 계정으로 로그인하면 바로 넣습니다.
          10분 동안 기다립니다.
          <br />
          끝날 때까지 <b>다시 누르지 마세요</b> — 다시 눌러도 아무 일도 일어나지 않아요.
          그만두려면 터미널 창 오른쪽 위의 <b>「멈추기」</b> 를 누르세요.
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={손으로받기}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold"
        >
          수동발급
        </button>
        <span className="text-[0.86rem] text-muted-foreground">
          명령을 <b>복사</b>만 해 드려요. 아래 터미널에 붙여넣고 <b>엔터</b>를 치세요.
        </span>
      </div>
      {베낀것 === '베꼈' && (
        <p className="mt-1 text-sm font-semibold text-green-600">복사했어요 — 아래 터미널에 붙여넣으세요.</p>
      )}
      {베낀것 === '못베낌' && (
        <div className="mt-1">
          <p className="text-sm font-semibold text-destructive">복사가 막혔어요 — 아래 글을 직접 골라 복사하세요.</p>
          <code className="mt-1 block overflow-x-auto rounded-md border bg-muted/40 px-2 py-1.5 text-[0.8rem] select-all">{명령}</code>
        </div>
      )}
    </div>
  )
}
