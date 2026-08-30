'use client'
// 마법사의 걸음 하나하나 — 계정 만들기 · 말투 넷 · 언제 올릴까 · 끝(옛 설정화면-html.mjs 2559~2717)
import { useEffect, useState } from 'react'
import { 조합안내 } from '@/components/공용/조합안내'
import {
  겹침묻기, 시각고르개, 시각한줄더하기, 이틀,
  type 남의칸, type 시각칸,
} from '@/components/공용/시각고르개'
import { 말투추천 } from '@/components/쪽/persona/말투추천'
import { type 계정상태 } from '@/components/쪽/settings/계정수정판'
import { 부르기 } from '@/lib/api'
import { 연결걸음들 } from './연결단계'
import { 칸모양, 귀띔모양, type 걸음, type 걸음속성 } from './걸음틀'

// 마법사.tsx 가 이 경로로 그대로 들여오던 타입들 — 걸음틀.ts 로 옮긴 뒤에도 그대로 쓰게 한다
export type { 마법사값, 열쇠통, 걸음속성, 걸음 } from './걸음틀'

export const 단추모양 = 'rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:opacity-45'

// 이 분야는 이렇게 적더라 — 서버가 준 분야안내를 그대로 보여 준다(옛 ㅁ보기 2552~2558)
function 보기({ 상태, 분야, 칸 }: { 상태: 계정상태; 분야: string; 칸: string }) {
  const a = (상태?.분야안내 ?? {})[분야]?.[칸]
  if (!a) return null
  return (
    <>
      <p className={귀띔모양}>{a.귀띔}</p>
      <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-2 text-[0.86rem]">
        <b>이렇게</b>{'\n'}{a.예}
      </div>
    </>
  )
}

// 말투 걸음 셋이 함께 쓰는 추천 줄 — 한 번 누르면 정체성·말투·표현·예시를 한꺼번에 채운다(옛 2790~2794)
function 추천줄({ p }: { p: 걸음속성 }) {
  return (
    <말투추천
      초기화신호={p.계정}
      onApply={(r) => {
        p.고치기({
          정체성: r.정체성, 말투: r.말투, 표현: r.표현, 뜻: r.뜻 ?? null,
          예시: [0, 1, 2].map((i) => (p.값.예시[i] ?? '').trim() || r.예시들?.[i]?.본문 || ''),
        })
      }}
    />
  )
}

const 말투저장 = (p: 걸음속성) => 부르기('/persona', {
  정체성: p.값.정체성, 말투: p.값.말투, 표현: p.값.표현, 예시: p.값.예시.filter((v) => v.trim()),
  뜻: p.값.뜻 ?? null,   // 외국어 계정이면 한국어 뜻도 함께 남긴다
}, p.계정)

// ① 이 계정은 무엇인가 — 여기서 계정이 실제로 만들어진다(옛 2566~2612)
const 계정걸음: 걸음 = {
  제목: '이 계정은 무엇인가',
  본문: (p) => {
    const 고를것 = p.상태?.고를것 ?? { 분야: ['요리'], 언어: ['한국어'], 제휴: ['쿠팡파트너스'] }
    const 고름 = (이름: '분야' | '언어' | '제휴') => (
      <div>
        <label className="block text-sm font-semibold" htmlFor={'ㅁ' + 이름}>{이름}</label>
        <select id={'ㅁ' + 이름} className={칸모양} value={p.값[이름]}
          onChange={(e) => p.고치기({ [이름]: e.target.value })}>
          {고를것[이름].map((v: string) => <option key={v}>{v}</option>)}
        </select>
      </div>
    )
    return (
      <>
        <p className={귀띔모양}>스레드 User ID 는 안 물어봅니다 — 열쇠를 넣으면 저희가 알아냅니다.</p>
        <div>
          <label className="block text-sm font-semibold" htmlFor="ㅁ계정">
            스레드 계정 이름 <span className="font-normal text-muted-foreground">— @ 뒤의 영문</span>
          </label>
          <input id="ㅁ계정" maxLength={30} placeholder="example.cook" autoCapitalize="off" autoComplete="off"
            className={칸모양} value={p.값.계정} onChange={(e) => p.고치기({ 계정: e.target.value })} />
        </div>
        <div className="mt-2">
          <label className="block text-sm font-semibold" htmlFor="ㅁ별칭">
            별칭 <span className="font-normal text-muted-foreground">— 화면에 보일 이름. 비우면 계정 이름을 씁니다</span>
          </label>
          <input id="ㅁ별칭" maxLength={20} placeholder="알뜰카트"
            className={칸모양} value={p.값.별칭} onChange={(e) => p.고치기({ 별칭: e.target.value })} />
        </div>
        <div className="mt-2 flex flex-col gap-2">{고름('분야')}{고름('언어')}{고름('제휴')}</div>
        <div className="mt-2">
          <조합안내 분야={p.값.분야} 언어={p.값.언어} 제휴={p.값.제휴}
            조합들={p.상태?.되는조합 ?? [{ 분야: '요리', 언어: '한국어' }]} />
        </div>
      </>
    )
  },
  저장: async (p) => {
    const 보낼것 = { 계정: p.값.계정, 별칭: p.값.별칭, 분야: p.값.분야, 언어: p.값.언어, 제휴: p.값.제휴 }
    let s: any
    try {
      s = await 부르기('/account', 보낼것)
    } catch (err) {
      // 이미 있는 계정이면 막지 않고 그 계정으로 이어서 채운다.
      // 여기서 멈추면 말투·열쇠·시각표를 끝낼 길이 아예 없어진다 — 실제로 막혔다 (2026-08-23)
      if (!/이미 있습니다/.test((err as Error).message)) throw err
      const 이름 = 보낼것.계정.trim().toLowerCase()
      // 목록에 없으면 엉뚱한 계정을 가리킨다. 그때는 원래 오류를 그대로 보여 준다
      const h = await 부르기<{ 계정들: { 이름: string }[] }>('/health')
      if (!(h.계정들 ?? []).some((c) => c.이름 === 이름)) throw err
      s = await 부르기('/status', null, 이름)
      p.이어서표시()
    }
    p.계정정하기(s.계정)
    // 이미 있는 계정이면 적어 둔 말투를 그대로 띄운다. 새 계정이면 어차피 빈 값이다
    p.고치기({
      계정: s.계정, 별칭: s.정보?.별칭 ?? p.값.별칭, 분야: s.정보?.분야 ?? p.값.분야,
      정체성: s.말투?.정체성 ?? '', 말투: s.말투?.말투 ?? '',
      표현: s.말투?.표현 ?? '', 예시: [0, 1, 2].map((i) => s.말투?.예시?.[i] ?? ''),
      뜻: s.말투?.뜻 ?? null,
    })
  },
}

// ⑥ 말투 넷 (옛 2613~2668)
const 말투걸음들: 걸음[] = [
  {
    제목: '나를 한 줄로',
    본문: (p) => (
      <>
        <p className={귀띔모양}>
          이 계정이 누구인지 한 줄로 적어 주세요. 글 전체의 바탕이 됩니다.<br />
          <b>막막하면 「추천받기」를 눌러 보세요.</b> 이 분야에서 잘 퍼지는 계정들을 읽어 채워 드립니다.
        </p>
        <input id="ㅁ정체성" className={칸모양} value={p.값.정체성}
          onChange={(e) => p.고치기({ 정체성: e.target.value })} />
        <보기 상태={p.상태} 분야={p.값.분야} 칸="정체성" />
        <추천줄 p={p} />
      </>
    ),
    저장: 말투저장,
  },
  {
    제목: '어떻게 말하나',
    본문: (p) => (
      <>
        <textarea id="ㅁ말투" rows={5} className={칸모양} value={p.값.말투}
          onChange={(e) => p.고치기({ 말투: e.target.value })} />
        <보기 상태={p.상태} 분야={p.값.분야} 칸="말투" />
        <추천줄 p={p} />
      </>
    ),
    저장: 말투저장,
  },
  {
    제목: '자주 쓰는 표현',
    본문: (p) => (
      <>
        <input id="ㅁ표현" placeholder="쉼표로 나눠서" className={칸모양} value={p.값.표현}
          onChange={(e) => p.고치기({ 표현: e.target.value })} />
        <보기 상태={p.상태} 분야={p.값.분야} 칸="표현" />
        <추천줄 p={p} />
      </>
    ),
    저장: 말투저장,
  },
  {
    제목: '글 예시',
    건너뛸수있나: true,
    본문: (p) => (
      <>
        <p className={귀띔모양}>
          <b>이게 말투를 가장 정확하게 알려 줍니다.</b>{' '}
          앞 걸음에서 「추천받기」를 누르셨으면 <b>그 분야에서 잘 퍼진 글</b>이 채워져 있습니다.{' '}
          내가 올린 글로 바꿔 넣으셔도 됩니다.
        </p>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <label className="block text-sm font-semibold" htmlFor={'ㅁ예시' + i}>예시 {'①②③'[i]}</label>
            <textarea id={'ㅁ예시' + i} rows={3} className={칸모양} value={p.값.예시[i] ?? ''}
              onChange={(e) => p.고치기({ 예시: p.값.예시.map((v, j) => (i === j ? e.target.value : v)) })} />
          </div>
        ))}
        <보기 상태={p.상태} 분야={p.값.분야} 칸="예시" />
      </>
    ),
    저장: 말투저장,
    건너뛴뒤: <>예시 없이 갑니다. <b>글이 밋밋해질 수 있습니다</b> — 나중에 「말투」 칸에서 채워 주세요.</>,
  },
]

// ⑦ 언제 올릴까 — 들어오자마자 자동 배정으로 칸을 채운다. 켜는 것은 사용자가 누른다(옛 2669~2700 · 설계서 §3)
function 시각칸고르기(p: 걸음속성) {
  const [남의칸들, 남의칸들담기] = useState<남의칸[]>([])
  const [기본분, 기본분담기] = useState(0)
  const [바쁨, 바쁨담기] = useState(false)

  useEffect(() => {
    let 죽었나 = false
    const 채우기 = async () => {
      try {
        const g = await 부르기<{ 남들?: 남의칸[]; 추천분?: number }>('/schedule', null, p.계정)
        if (죽었나) return
        남의칸들담기(g.남들 ?? [])
        기본분담기(g.추천분 ?? 0)
      } catch { /* 못 받아도 고르는 것은 된다 */ }
      try {
        const r = await 부르기<{ 칸들: 시각칸[]; 밀림?: { 바란시: number; 시: number }[] }>(
          '/schedule/auto', { 이미: p.값.칸들 }, p.계정)
        if (죽었나) return
        p.고치기({ 칸들: r.칸들 })
        // 앞 걸음을 건너뛴 경고가 떠 있으면 덮지 않고 뒤에 잇는다
        p.알림잇기(
          '다른 계정과 3분 이상 떨어진 자리로 채웠어요. 「자동 발행 켜기」를 누르면 그때부터 돌아요.' +
          (r.밀림 ?? []).map((m) => ` ${m.바란시}시는 자리가 없어 ${m.시}시로 옮겼어요.`).join(''))
      } catch (err) { p.알림담기((err as Error).message, '나쁨') }
    }
    채우기()
    return () => { 죽었나 = true }
    // 걸음에 들어올 때 한 번만 채운다 — 고치던 칸을 덮지 않는다
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const 더하기 = () => {
    const 새것 = 시각한줄더하기(p.값.칸들, 기본분)
    if (!새것) { p.알림담기('하루 12번을 넘기지 마세요.'); return }
    p.고치기({ 칸들: 새것 })
  }

  const 켜기 = async () => {
    if (!p.값.칸들.length) { p.알림담기('올릴 시각을 하나는 골라 주세요', '나쁨'); return }
    if (!겹침묻기(p.값.칸들, 남의칸들)) {
      p.알림담기('겹치는 시각이 있어 멈췄습니다. 시각을 바꾸거나 건너뛰세요', '나쁨')
      return
    }
    if (!confirm('이 계정의 자동 발행을 켭니다. 정해진 시각마다 실제로 글이 올라갑니다. 계속할까요?')) return
    바쁨담기(true)
    try {
      const r = await 부르기<{ 시각들: number[]; 칸들: 시각칸[] }>('/schedule-on', { 칸들: p.값.칸들 }, p.계정)
      p.고치기({ 칸들: r.칸들.map((c) => ({ ...c })) })
      p.켠시각담기(r.시각들 ?? [])
      p.알림담기('켰습니다. ' + r.칸들.map((c) => 이틀(c.시) + ':' + 이틀(c.분)).join(' · '), '좋음')
    } catch (err) { p.알림담기((err as Error).message, '나쁨') }
    finally { 바쁨담기(false) }
  }

  return (
    <>
      <p className={귀띔모양}>
        시와 분을 골라 주세요. <b>조사에서는 하루 1~3편, 최소 4시간 간격을 권합니다.</b><br />
        <b>다른 계정과 같은 시·분은 피해 주세요</b> — 같은 순간에 둘이 올라가면 서로 조입니다.
      </p>
      <시각고르개 칸들={p.값.칸들} 남의칸들={남의칸들} onChange={(새것) => p.고치기({ 칸들: 새것 })} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={단추모양} onClick={더하기}>＋ 시각 추가</button>
        <button type="button" disabled={바쁨} onClick={켜기}
          className="rounded-lg border-transparent bg-primary transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-45">
          {p.켠시각.length ? '이 시각으로 다시 켜기' : '자동 발행 켜기'}
        </button>
      </div>
      <p className="mt-2 text-[0.86rem] text-muted-foreground">
        켜지 않고 「다음」으로 가도 됩니다. 나중에 설정 쪽 「발행 시각」에서 켜면 됩니다.
      </p>
    </>
  )
}

const 시각걸음: 걸음 = {
  제목: '언제 올릴까',
  건너뛸수있나: true,
  본문: (p) => <시각칸고르기 {...p} />,
  건너뛴뒤: <>시각표 없이 갑니다. <b>자동으로 안 올라갑니다</b> — 「발행 현황」 아래에서 켜 주세요.</>,
}

// ⑧ 끝 (옛 2701~2716)
const 끝걸음 = (말투만: boolean): 걸음 => ({
  제목: '끝났습니다',
  마지막: true,
  본문: (p) => (
    <div className="py-4 text-center">
      <div className="text-4xl">🎉</div>
      {말투만 ? (
        <>
          <p className="mt-2"><b>{p.값.별칭 || p.계정 || '첫 계정'}</b> 의 말투를 <b>{p.값.분야}</b> 에 맞게 고쳤습니다.</p>
          <p className={귀띔모양}>다음 판부터 새 말투로 글을 씁니다.</p>
        </>
      ) : (
        <>
          <p className="mt-2"><b>{p.값.별칭 || p.계정 || '첫 계정'}</b> 계정 준비가 끝났습니다.</p>
          {p.켠시각.length
            ? <p className={귀띔모양}>{p.켠시각.join('시 · ')}시에 자동으로 올라갑니다.</p>
            : <p className={귀띔모양}>아직 자동 발행은 꺼져 있습니다.</p>}
        </>
      )}
      <p className={귀띔모양}>먼저 왼쪽 「빠른 실행」에서 <b>저장소에 글 모으기</b>로 쓸 글을 채워 보세요.</p>
    </div>
  ),
})

// 분야를 바꾸면 말투 단계만 다시 밟는다. 계정 만들기·연결·시각표는 이미 끝난 일이다(옛 2718~2720)
export function 걸음들({ 말투만, 건너뛸것 }: {
  말투만: boolean
  건너뛸것: { 페북: boolean; 텔레: boolean }
}): 걸음[] {
  if (말투만) return [...말투걸음들, 끝걸음(true)]
  return [계정걸음, ...연결걸음들(건너뛸것), ...말투걸음들, 시각걸음, 끝걸음(false)]
}
