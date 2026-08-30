'use client'
// 쪽들이 함께 쓰는 훅 — 계정 상태, 서버 자료(React Query), 옛 /log·/progress 폴링
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { 부르기 } from './api'

const 계정바뀜이벤트 = '계정바뀜'
const 계정읽기 = () => (typeof localStorage === 'undefined' ? '' : localStorage.getItem('계정') ?? '')

// localStorage['계정'] 을 상태로 삼는다. 계정바뀜() 이 부르는 CustomEvent 를 들어서 다시 그린다
// 초깃값은 항상 null — 서버는 localStorage 를 모르니, 첫 렌더에서 읽으면 서버 그림과 첫 그림이 달라진다(hydration mismatch).
// null 은 "아직 안 읽었다" 는 뜻이다 — 마운트 효과가 한 번 돈 뒤에야 진짜 값('' 도 값이다)이 들어간다
export function use계정(): string | null {
  const [계정, 계정담기] = useState<string | null>(null)
  useEffect(() => {
    const 다시읽기 = () => 계정담기(계정읽기())
    다시읽기()
    window.addEventListener(계정바뀜이벤트, 다시읽기)
    return () => window.removeEventListener(계정바뀜이벤트, 다시읽기)
  }, [])
  return 계정
}

// 옛 화면의 「계정 고르면 새로고침」을 캐시 무효화로 바꾼 것 — 계정고르개.tsx 가 부른다
export function 계정바뀜(client: QueryClient, 새계정: string) {
  localStorage.setItem('계정', 새계정)
  window.dispatchEvent(new Event(계정바뀜이벤트))
  client.invalidateQueries()
  미처리결과 = null // 계정을 바꾸면 남의 결과가 붙지 않게 — 갈무리해 둔 것도 비운다
}

// 계정이 아직 안 읽혔으면(null) 쏘지 않는다 — 안 그러면 첫 그림에서 엉뚱한(빈) 계정으로 한 번 쏘고
// 진짜 계정이 읽히면 다시 쏘게 된다. queryKey 도 계정별로 갈라야 다른 계정 캐시를 빌려 쓰지 않는다
export function use자료<T = any>(길: string, 옵션?: { 계정무관?: boolean; 새로고침ms?: number }) {
  const 계정 = use계정()
  return useQuery<T>({
    queryKey: 옵션?.계정무관 ? [길] : [길, 계정 ?? ''],
    queryFn: () => 부르기<T>(길, null, 계정),
    enabled: 옵션?.계정무관 ? true : 계정 !== null,
    refetchInterval: 옵션?.새로고침ms,
  })
}

// 옛 /log·/progress 폴링 방식 — 스스로 멈추지 않는다. 켜짐 을 false 로 돌리는 건 부르는 쪽 몫이다
export function use폴링<T = any>(길: string, ms: number, 켜짐: boolean): T | null {
  const 계정 = use계정()
  const [자료, 자료담기] = useState<T | null>(null)
  useEffect(() => {
    if (!켜짐) return
    let 죽었나 = false
    자료담기(null)
    const 물어보기 = async () => {
      try {
        const r = await 부르기<T>(길, null, 계정)
        if (!죽었나) 자료담기(r)
      } catch { /* 한 번 못 물어봐도 다음에 다시 묻는다 */ }
    }
    물어보기()
    const 고리 = setInterval(물어보기, ms)
    return () => { 죽었나 = true; clearInterval(고리) }
  }, [길, ms, 켜짐, 계정])
  return 자료
}

// 옛 「실행 끝나면 격자·글·저장소·초안·기록 연쇄 재호출」을 invalidateQueries 로 뭉쳤다
export function use다시그리기() {
  const client = useQueryClient()
  return () => { client.invalidateQueries() }
}

// 이 훅을 쓰는 카드가 셋이다(팔로워찾기·말투추천·말투 샘플) — 그런데 /last-result 통은 서버에 하나뿐이라
// 세 카드가 같은 통을 본다. 먼저 뜬 카드가 물어봐서 통을 비워 버리면, 정작 그 결과의 주인인 카드는
// 다시 못 본다. 그래서 내 무엇이 아닌 값은 버리지 않고 이 모듈 통(미처리결과)에 넣어 둔다 — 나중에
// 그 무엇을 가진 훅이 뜨거나 다시 확인할 때 이 통을 먼저 들여다본다.
// 계정도 함께 담아 견준다 — 계정을 바꾸면 남의 결과가 붙지 않게(계정바뀜() 이 통도 비운다)
let 미처리결과: { 무엇: string; 계정: string | null; 값: unknown } | null = null

// 새로고침해도 돌던 일을 다시 붙잡는다 — 이 일(무엇)이 이 계정으로 아직 돌고 있으면 켜짐을 켜고,
// 막 끝났으면 last-result 를 적용한다(옛 진행따라붙기·놓친결과챙기기 1620~1656).
// 다른 계정이 돌리던 일이면 화면을 억지로 그 계정으로 바꾸지 않는다 — 지금 보는 계정만 잰다
// (활동 쪽 팔로워찾기.tsx 가 먼저 쓰던 패턴을 공용으로 옮겼다)
export function use진행따라붙기<T = any>(무엇: string, 켜짐담기: (v: boolean) => void, 적용: (값: T) => void) {
  const 계정 = use계정()
  const 시도 = async () => {
    if (미처리결과 && 미처리결과.무엇 === 무엇 && 미처리결과.계정 === 계정) {
      적용(미처리결과.값 as T)
      미처리결과 = null
      return
    }
    try {
      const p = await 부르기<{ 도는중: boolean; 무엇?: string; 계정?: string }>('/progress')
      if (p.도는중 && p.무엇 === 무엇 && (p.계정 ?? '') === 계정) { 켜짐담기(true); return }
      const r = await 부르기<{ 없음?: boolean; 무엇?: string; 값?: T }>('/last-result')
      if (r.없음 || !r.값) return
      if (r.무엇 === 무엇) { 적용(r.값); return }
      미처리결과 = { 무엇: r.무엇 ?? '', 계정, 값: r.값 } // 내 몫이 아니다 — 진짜 주인을 위해 갈무리해 둔다
    } catch { /* 못 물어봐도 화면은 그대로 쓴다 */ }
  }
  useEffect(() => { 시도() }, [계정])
  return 시도
}
