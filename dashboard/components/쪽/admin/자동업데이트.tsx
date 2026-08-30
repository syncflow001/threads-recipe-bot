'use client'
// 자동 업데이트 카드 — 지금 판·최신 판·매일 11:00 확인 스위치·지금 확인/지금 업데이트·최근 기록 다섯 줄
import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import { 스위치 } from '@/components/공용/스위치'
import { 진행칸 } from '@/components/공용/진행칸'
import { use자료, use다시그리기, use진행따라붙기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 짧은때 } from '@/lib/글자'

type 기록줄 = { 때: string; 판전: string; 판후: string; 결과: string; 까닭?: string }
type 업데이트자료 = {
  지금판: string; 최신판: string | null; 새판있음: boolean; 마지막확인: string | null; 켜짐: boolean; 기록: 기록줄[]
}
type 업데이트결과 = { 됨?: boolean; 판전?: string; 판후?: string; 다시켜기실패?: boolean; 안됨?: string; 까닭?: string }

// 서버가 제 몸을 다시 켜서 /progress·/last-result 가 비어 버릴 때를 대비한 길 — 기록 한 줄에서 알림을 재구성한다
const 기록알림 = (줄: 기록줄): { 글: string; 종류: '좋음' | '나쁨' } | null => {
  if (줄.결과 === '됨') return { 글: `${줄.판전} → ${줄.판후} 업데이트했어요.`, 종류: '좋음' }
  if (줄.결과 === '됨-다시켜기실패') {
    return { 글: '업데이트는 됐는데 대시보드를 다시 켜지 못했어요 — 직접 다시 켜 주세요.', 종류: '나쁨' }
  }
  if (줄.결과 === '되돌림' || 줄.결과 === '되돌리기실패') return { 글: 줄.까닭 ?? '', 종류: '나쁨' }
  return null
}

export function 자동업데이트() {
  const { data } = use자료<업데이트자료>('/update', { 계정무관: true })
  const queryClient = useQueryClient()
  const 다시그리기 = use다시그리기()
  const [도는중, 도는중담기] = useState(false)
  const [바쁨, 바쁨담기] = useState(false)
  const [알림, 알림담기] = useState('')
  const [종류, 종류담기] = useState<'좋음' | '나쁨' | undefined>()
  const 시작때 = useRef<number | null>(null)
  const 알림떴나 = useRef(false)

  const 결과적용 = (값: 업데이트결과) => {
    도는중담기(false)
    알림떴나.current = true
    if (값?.다시켜기실패) {
      알림담기('업데이트는 됐는데 대시보드를 다시 켜지 못했어요 — 직접 다시 켜 주세요.')
      종류담기('나쁨')
    } else if (값?.됨) {
      알림담기(`${값.판전} → ${값.판후} 업데이트했어요.`)
      종류담기('좋음')
    } else {
      const 까닭 = 값?.까닭 ?? 값?.안됨 ?? ''
      알림담기(까닭)
      // 「이미 최신」·「제작자 저장소」는 잘못된 게 아니다. 빨갛게 보이면 사용자가 겁먹는다
      종류담기(/이미 최신|제작자 저장소/.test(까닭) ? '좋음' : '나쁨')
    }
    다시그리기()
  }

  const 진행따라붙기 = use진행따라붙기<업데이트결과>('자동 업데이트', 도는중담기, 결과적용)

  // /progress·/last-result 가 서버 재시작으로 비었으면 /update 기록에서 대신 찾는다
  const 기록에서찾기 = async () => {
    if (알림떴나.current || 시작때.current == null) return
    await queryClient.invalidateQueries({ queryKey: ['/update'] })
    const 새자료 = queryClient.getQueryData<업데이트자료>(['/update'])
    const 최근 = 새자료?.기록.at(-1)
    if (!최근 || new Date(최근.때).getTime() < 시작때.current) return
    const 알림정보 = 기록알림(최근)
    if (알림정보) { 알림담기(알림정보.글); 종류담기(알림정보.종류) }
  }

  const 확인하기 = async () => {
    바쁨담기(true); 알림담기(''); 종류담기(undefined)
    try {
      const r = await 부르기<{ 최신판: string | null; 새판있음: boolean; 안됨?: string }>('/update/check', {})
      if (r.안됨) { 알림담기(r.안됨); 종류담기('나쁨') }
      else { 알림담기(r.새판있음 ? `새 판 ${r.최신판} 이 있어요.` : '이미 최신 판이에요.'); 종류담기('좋음') }
      다시그리기()
    } catch (err) { 알림담기((err as Error).message); 종류담기('나쁨') }
    finally { 바쁨담기(false) }
  }

  const 업데이트하기 = async () => {
    if (!confirm('지금 업데이트해요. 1~2분 걸리고 화면이 잠깐 끊겨요. 계속할까요?')) return
    시작때.current = Date.now(); 알림떴나.current = false
    도는중담기(true); 알림담기(''); 종류담기(undefined)
    try {
      await 부르기<{ 시작함: boolean }>('/update/run', {})
    } catch (err) {
      const 말 = (err as Error).message
      알림담기(말); 종류담기('나쁨'); 도는중담기(false)
      if (/이미 돌고/.test(말)) 진행따라붙기()
    }
  }

  const 스위치누르기 = async () => {
    await 부르기(data?.켜짐 ? '/update/off' : '/update/on', {})
    다시그리기()
  }

  // 카드마다 으뜸 단추 하나만 꽉 찬 초록이다. 나머지는 테두리만 — 어디를 먼저 눌러야 할지가 보인다
  const 으뜸단추 = 'rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45'
  const 단추 = 'rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45'
  const 새판있나 = !!data?.새판있음

  return (
    <카드 제목="자동 업데이트">
      <귀띔>
        지금 판 <b>{data?.지금판 ?? '…'}</b> · 최신 판 <b>{data?.최신판 ?? '아직 확인 안 함'}</b>
        {data?.마지막확인 ? <> · 마지막 확인 {짧은때(data.마지막확인)}</> : null}
      </귀띔>

      <div className="flex items-center gap-2">
        <스위치 켜짐={!!data?.켜짐} onChange={스위치누르기} aria-label="매일 11:00 에 저절로 확인" />
        <span className="text-sm">매일 11:00 에 저절로 확인</span>
      </div>
      {!data?.켜짐 && (
        <p className="mt-1 text-[0.86rem] text-muted-foreground">
          지금 꺼져 있어요. 스위치를 켜면 매일 11:00 에 확인해요.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={바쁨 || 도는중} onClick={확인하기} className={단추}>지금 확인</button>
        {새판있나 && (
          <button type="button" disabled={도는중} onClick={업데이트하기} className={으뜸단추}>지금 업데이트</button>
        )}
      </div>
      <p className="mt-1 text-[0.86rem] text-muted-foreground">곧 화면이 잠깐 끊겼다 돌아와요.</p>

      <진행칸
        켜짐={도는중} 무엇="자동 업데이트" 중단없이
        onDone={async () => { 도는중담기(false); await 진행따라붙기(); await 기록에서찾기() }}
      />
      <알림줄 글={알림} 종류={종류} />

      {!!data?.기록.length && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-[0.86rem]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pr-3 font-normal">때</th>
                <th className="pr-3 font-normal">판</th>
                <th className="font-normal">결과</th>
              </tr>
            </thead>
            <tbody>
              {data.기록.slice().reverse().map((줄, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 pr-3 whitespace-nowrap">{짧은때(줄.때)}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{줄.판전} → {줄.판후}</td>
                  <td className="py-1">{줄.결과}{줄.까닭 ? ` — ${줄.까닭}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </카드>
  )
}
