'use client'
// 마법사의 연결 걸음 넷 — 페이스북 앱 · 스레드 계정 · 텔레그램 · 쿠팡(설계서 §3 표 2~5번)
import { 완료표 } from '@/components/공용/완료표'
import { 열쇠도움 } from '@/components/공용/열쇠도움'
import { 발급매뉴얼 } from '@/components/쪽/settings/발급매뉴얼'
import { 자동발급 } from '@/components/쪽/settings/자동발급'
import { 텔레그램 } from '@/components/쪽/settings/텔레그램'
import { 부르기 } from '@/lib/api'
import { 칸모양, 귀띔모양, type 걸음, type 걸음속성 } from './걸음틀'

// 열쇠 한 칸. 값은 화면 상태에만 담기고 localStorage 에는 절대 안 적힌다
function 열쇠칸({ p, 이름, 꼬리, 여러줄 }: { p: 걸음속성; 이름: string; 꼬리?: string; 여러줄?: boolean }) {
  const 그것 = (p.상태?.열쇠 ?? []).find((k: any) => k.이름 === 이름)
  const 값 = p.열쇠[이름] ?? ''
  const 바꾸기 = (v: string) => p.열쇠고치기({ [이름]: v })
  return (
    <div className="mt-2">
      <div className="text-sm font-semibold break-all">
        <열쇠도움 이름={이름} 받는법={그것?.받는법} />
        <label className="font-normal text-muted-foreground" htmlFor={이름}>
          {꼬리 ? ' ' + 꼬리 : ''}<완료표 보임={!!그것?.채움} />
        </label>
      </div>
      {여러줄
        ? <textarea id={이름} rows={3} autoComplete="off" className={칸모양} value={값} onChange={(e) => 바꾸기(e.target.value)} />
        : <input id={이름} type="password" autoComplete="off" className={칸모양} value={값} onChange={(e) => 바꾸기(e.target.value)} />}
    </div>
  )
}

// 적어 넣은 열쇠만 보낸다. 하나도 없으면 부르지 않는다
const 열쇠저장 = async (p: 걸음속성, 이름들: string[]) => {
  const 몸통: Record<string, string> = {}
  for (const 이름 of 이름들) if ((p.열쇠[이름] ?? '').trim()) 몸통[이름] = p.열쇠[이름].trim()
  if (!Object.keys(몸통).length) return
  const s = await 부르기<{ 나?: { 틀림?: string; 어긋남?: string } }>('/keys', 몸통, p.계정)
  p.열쇠고치기(Object.fromEntries(이름들.map((이름) => [이름, ''])))
  const 틀림 = s.나?.틀림 ?? s.나?.어긋남
  if (틀림) throw new Error(틀림)
}

// ② 페이스북 앱 연결 — 앱 ID·시크릿은 모든 계정이 함께 쓴다
const 페이스북걸음: 걸음 = {
  제목: '페이스북 앱 연결',
  본문: (p) => (
    <>
      <p className={귀띔모양}>
        스레드에 글을 올리려면 <b>페이스북 개발자 앱</b>이 하나 있어야 합니다.{' '}
        <b>이 둘은 모든 계정이 함께 씁니다</b> — 한 번만 넣으면 됩니다.{' '}
        어디서 받는지 모르시면 「발급 매뉴얼」을 눌러 순서대로 따라 하세요.
      </p>
      <발급매뉴얼 />
      <열쇠칸 p={p} 이름="THREADS_APP_ID" />
      <열쇠칸 p={p} 이름="THREADS_APP_SECRET" />
    </>
  ),
  저장: (p) => 열쇠저장(p, ['THREADS_APP_ID', 'THREADS_APP_SECRET']),
}

// ③ 스레드 계정 연결 — 자동발급이 먼저다. 안 되면 손으로 붙여넣는다(옛 「열쇠 넣기」 2648~2668)
const 스레드걸음: 걸음 = {
  제목: '스레드 계정 연결',
  건너뛸수있나: true,
  본문: (p) => (
    <>
      <p className={귀띔모양}>
        이 계정으로 글을 올리려면 스레드 토큰이 필요합니다.{' '}
        <b>「자동발급」을 누르면 크롬 창이 열립니다.</b> 그 창에서 이 계정으로 로그인하고 허용만 눌러 주세요.
      </p>
      <자동발급 터미널단추={false} />
      <details className="mt-2 rounded-lg border p-2">
        <summary className="cursor-pointer text-sm font-semibold">열쇠 넣기 — 자동발급이 안 될 때</summary>
        <p className={귀띔모양 + ' mt-2'}>
          받은 토큰을 여기 붙여넣으세요. <b>값은 파일에만 저장되고 화면으로 다시 나오지 않습니다.</b>
        </p>
        <열쇠칸 p={p} 이름="THREADS_ACCESS_TOKEN" />
        <열쇠칸 p={p} 이름="THREADS_COOKIE" 꼬리="— 조회수·수집에 씁니다" 여러줄 />
      </details>
    </>
  ),
  저장: (p) => 열쇠저장(p, ['THREADS_ACCESS_TOKEN', 'THREADS_COOKIE']),
  건너뛴뒤: <>열쇠 없이 갑니다. <b>이 계정은 아직 글을 못 올립니다</b> — 「열쇠」 칸에서 채워 주세요.</>,
}

// ④ 텔레그램 연결 — 설정 쪽 카드를 그대로 얹는다. 저장·시험은 그 카드가 한다
const 텔레그램걸음: 걸음 = {
  제목: '텔레그램 연결',
  건너뛸수있나: true,
  본문: () => (
    <>
      <p className={귀띔모양}>
        쿠키가 죽거나 발행이 막혔을 때 <b>텔레그램으로 알려 줍니다.</b>{' '}
        아래 칸을 채우고 「저장」을 누른 뒤 「시험 메시지 보내기」로 확인해 보세요. 나중에 해도 됩니다.
      </p>
      <텔레그램 />
    </>
  ),
}

// ⑤ 쿠팡 연결 — 제휴 링크를 만드는 데 쓴다. 없어도 글은 올라간다
const 쿠팡걸음: 걸음 = {
  제목: '쿠팡 연결',
  건너뛸수있나: true,
  본문: (p) => (
    <>
      <p className={귀띔모양}>
        쿠팡 파트너스 열쇠를 넣으면 <b>글에 제휴 링크를 붙입니다.</b>{' '}
        아직 승인 전이면 건너뛰세요 — 링크 없이도 글은 올라갑니다.
      </p>
      <열쇠칸 p={p} 이름="COUPANG_ACCESS_KEY" />
      <열쇠칸 p={p} 이름="COUPANG_SECRET_KEY" />
    </>
  ),
  저장: (p) => 열쇠저장(p, ['COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY']),
}

// 이미 채워진 공유 열쇠는 다시 묻지 않는다(설계서 §3 「있으면 건너뜀」)
export function 연결걸음들({ 페북, 텔레 }: { 페북: boolean; 텔레: boolean }): 걸음[] {
  return [
    ...(페북 ? [] : [페이스북걸음]),
    스레드걸음,
    ...(텔레 ? [] : [텔레그램걸음]),
    쿠팡걸음,
  ]
}
