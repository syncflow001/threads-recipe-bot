'use client'
// 「자동발급」 — 설정 쪽에서는 아래 터미널에서 threads-login.mjs 를 돌린다(본 크롬 + 코드 자동 채움).
// 마법사에서는 터미널이 없어 POST /token/auto(플레이라이트 크롬)로 받는다. 진행은 /progress, 결과는 /last-result
import { useState } from 'react'
import { 진행칸 } from '@/components/공용/진행칸'
import { useRouter } from 'next/navigation'
import { use계정, use다시그리기, use진행따라붙기 } from '@/lib/hooks'
import { 대기명령넣기 } from '@/lib/대기명령'
import { 터미널로보내기 } from '@/lib/터미널명령'
import { 복사하기 } from '@/lib/복사'
import { 부르기 } from '@/lib/api'

type 발급결과 = { 사용자?: string; 권한?: string[]; 쿠키있음?: boolean; 쿠키탈?: string | null; 안됨?: string }

// 마법사 안에서는 터미널 단추를 감춘다 — 처음 쓰는 사람을 관리자 도구로 보내면 길을 잃는다
export function 자동발급({ 터미널단추 = true }: { 터미널단추?: boolean } = {}) {
  const [도는중, 도는중담기] = useState(false)
  const [알림, 알림담기] = useState('')
  const [나쁨, 나쁨담기] = useState(false)
  const [베낀것, 베낀것담기] = useState('')
  const 다시그리기 = use다시그리기()
  const 계정 = use계정()
  const 길잡이 = useRouter()

  // 「자동발급」 — 이 쪽 맨 아래 터미널에서 threads-login.mjs 를 돌린다 (2026-08-30 일원화).
  // 그 도구가 **본 크롬**을 열고, 허용을 누르면 크롬 주소창을 지켜보다 코드를 제 손으로 채운다.
  // 사람이 주소를 복사할 일이 없다. 자동화 권한이 없으면 붙여넣는 길이 그대로 남아 있다
  const 명령 = 'node --env-file=.env.local threads-login.mjs ' + (계정 ?? '')
  const 터미널로받기 = () => {
    if (터미널단추) { 터미널로보내기(명령); return }   // 설정 쪽 — 아래 터미널이 받는다
    대기명령넣기(명령)                                  // 마법사 — 터미널이 없으니 관리자 도구로 간다
    길잡이.push('/admin')
  }

  // 「수동발급」 — 명령을 클립보드에 담아 준다. 터미널이 안 받아 줄 때나
  // 맥 터미널 앱에서 직접 돌리고 싶을 때 쓴다 (2026-08-30 사용자 요청)
  const 손으로받기 = async () => {
    const 됐나 = await 복사하기(명령)
    베낀것담기(됐나 ? '베꼈' : '못베낌')
  }

  const 결과적용 = (값: 발급결과) => {
    if (값?.안됨) { 알림담기(값.안됨); 나쁨담기(true); return }
    // 토큰은 받았는데 쿠키가 딴 계정 것일 수 있다 — 허용 화면에서 계정을 바꿔 고르면 그렇게 된다.
    // 그때 조용히 넘기면 조회수가 통째로 안 와 며칠을 헛돈다 (2026-08-29 실측)
    if (값?.쿠키탈) {
      알림담기(`토큰은 받았어요 — @${값?.사용자 ?? ''}. 다만 쿠키는 저장하지 않았습니다: ${값.쿠키탈}` +
        ' 크롬에서 이 계정으로 로그인한 뒤 다시 눌러 주세요.')
      나쁨담기(true)
      다시그리기()
      return
    }
    알림담기(`받았어요 — @${값?.사용자 ?? ''}. 60일 뒤에 다시 받아요.`)
    나쁨담기(false)
    다시그리기() // 열쇠가 채워졌으니 표의 ✓ 를 다시 읽는다
  }

  const 진행따라붙기 = use진행따라붙기<발급결과>('토큰 자동발급', 도는중담기, 결과적용)

  const 받기 = async () => {
    도는중담기(true)
    알림담기('')
    나쁨담기(false)
    try {
      await 부르기<{ 시작함: boolean }>('/token/auto', {})
    } catch (err) {
      const 말 = (err as Error).message
      알림담기(말)
      나쁨담기(true)
      도는중담기(false)
      if (/이미 돌고/.test(말)) 진행따라붙기()
    }
  }

  return (
    <div className="my-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={도는중}
          onClick={터미널단추 ? 터미널로받기 : 받기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          자동발급
        </button>
        <span className="text-[0.86rem] text-muted-foreground">
          {터미널단추
            ? <>늘 쓰는 <b>크롬</b>이 열려요. <b>허용</b>만 누르면 아래 터미널이 코드를 저절로 받아 넣습니다. 60일마다 다시 받아요.</>
            : <>크롬 창이 열리면 <b>이 계정으로</b> 로그인해 허용을 눌러 주세요. 60일마다 다시 받아요.</>}
        </span>
      </div>
      {!도는중 && 알림 && (
        <div className={나쁨 ? 'mt-1 text-sm font-semibold text-destructive' : 'mt-1 text-sm font-semibold text-green-600'}>
          {알림}
        </div>
      )}
      <진행칸 켜짐={도는중} 무엇="토큰 자동발급" 중단없이 onDone={() => { 도는중담기(false); 진행따라붙기() }} />
      {터미널단추 && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
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
      )}
    </div>
  )
}
