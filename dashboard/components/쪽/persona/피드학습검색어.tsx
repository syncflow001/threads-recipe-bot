'use client'
// 피드 학습 검색어 카드 — 홈에 원하는 글이 안 뜰 때 검색으로 직접 찾아 스레드를 가르친다
// (옛 HTML 971~988, JS 추천키워드그리기·검색어그리기·검색어저장/더하기/빼기 2947~3017)
import { useEffect, useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 말주머니 } from '@/components/공용/말주머니'
import { 알림줄 } from '@/components/공용/알림줄'
import { use계정, use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 상태자료 = { 정보?: { 검색어?: string[] } }
type 추천자료 = { 추천: string[]; 예: string }

export function 피드학습검색어() {
  const 계정 = use계정()
  const 상태 = use자료<상태자료>('/status')
  const [검색어목록, 검색어목록담기] = useState<string[]>([])
  const [추천, 추천담기] = useState<string[]>([])
  const [예시, 예시담기] = useState('')
  const [입력, 입력담기] = useState('')
  const [알림, 알림담기] = useState('')

  const 추천다시그리기 = async () => {
    try {
      const r = await 부르기<추천자료>('/keyword-suggest')
      예시담기(r.예 || '')
      추천담기(r.추천 ?? [])
    } catch { 추천담기([]) }
  }

  // 계정을 바꾸면 그 계정 낱말로 갈아 끼운다 — 계정마다 다른 값이다(옛 그리기(s) 2394~2397)
  useEffect(() => {
    검색어목록담기(상태.data?.정보?.검색어 ?? [])
    알림담기('')
  }, [계정, 상태.data])
  useEffect(() => { 추천다시그리기() }, [계정])

  const 저장 = async (목록: string[], 말: string) => {
    try {
      const r = await 부르기<{ 검색어: string[] }>('/keywords', { 검색어들: 목록 })
      검색어목록담기(r.검색어 ?? [])
      추천다시그리기()   // 담은 것은 추천에서 빠진다
      알림담기(말)
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
  }

  // 쉼표로 여러 개를 한꺼번에 붙여넣을 수도 있다. 낱말 안의 띈 자리는 살린다
  const 더하기 = (받은것: string) => {
    const 새것 = String(받은것 ?? '').split(',').map((v) => v.trim().replace(/\s+/g, ' ')).filter(Boolean)
    if (!새것.length) return
    const 다음 = [...검색어목록]
    let 더한수 = 0
    for (const 낱말 of 새것) {
      if (낱말.length > 30) continue
      if (다음.some((v) => v.toLowerCase() === 낱말.toLowerCase())) continue
      if (다음.length >= 30) break
      다음.push(낱말); 더한수 += 1
    }
    입력담기('')
    if (!더한수) { 알림담기('이미 있는 낱말입니다.'); return }
    저장(다음, '저장했습니다 ✓')
  }

  const 빼기 = (자리: number) => {
    const 뺀것 = 검색어목록[자리]
    저장(검색어목록.filter((_, i) => i !== 자리), `「${뺀것}」 를 뺐습니다 ✓`)
  }

  return (
    <카드 제목="피드 학습 검색어">
      <귀띔>
        글은 <b>홈 화면을 내려가며</b> 걷습니다. 그런데 <b>홈에 원하는 글이 안 뜨면</b>{' '}
        걷을 것이 없습니다. 그때 이 키워드로 <b>직접 찾아 들어가 글을 봅니다.</b>{' '}
        그러면 스레드가 «이 사람은 이런 글을 본다» 고 배워서 <b>홈에 그런 글을 띄워 줍니다.</b>
        <br />
        「활동」의 <b>언어 길들이기</b>를 돌릴 때 한 번에 <b>두 개씩 돌려 가며</b> 씁니다.{' '}
        <b>같은 키워드를 하루에 여러 번 검색하면 스레드가 그 키워드 결과를 줄입니다</b> — 그래서 여러 개 넣어 두는 것이 좋습니다.{' '}
        <b>이 계정의 분야와 언어</b>에 맞는 추천을 아래에 셋 띄워 뒀습니다. ↻ 를 누르면 다른 셋이 나옵니다.
      </귀띔>
      <label className="mb-1 block text-sm font-medium">키워드를 적고 <b>엔터</b>를 누르세요</label>
      <input
        value={입력}
        onChange={(e) => 입력담기(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); 더하기(e.currentTarget.value) } }}
        onBlur={(e) => { if (e.target.value.trim()) 더하기(e.target.value) }}
        placeholder={예시 ? `예: ${예시}` : ''}
        autoComplete="off"
        className="mb-3 w-full rounded-lg border px-2.5 py-1.5 text-sm"
      />
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">추천 키워드 — 눌러서 담으세요</span>
        <button type="button" title="다른 추천 보기" aria-label="추천 키워드 새로고침"
          onClick={추천다시그리기}
          className="rounded-md border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-1.5 py-0.5 text-xs">
          ↻
        </button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {!추천.length
          ? <span className="text-sm text-muted-foreground">추천할 것이 다 담겼습니다</span>
          : 추천.map((낱말) => <말주머니 key={낱말} 글={낱말} 종류="추천" onClick={() => 더하기(낱말)} />)}
      </div>
      <div className="mb-1 text-sm font-medium">담아 둔 키워드</div>
      <div className="flex flex-wrap gap-2">
        {!검색어목록.length
          ? <span className="text-sm text-muted-foreground">아직 없습니다 — 위에 적고 엔터를 누르세요</span>
          : 검색어목록.map((낱말, i) => <말주머니 key={낱말 + i} 글={낱말} 종류="담김" onRemove={() => 빼기(i)} />)}
      </div>
      <알림줄 글={알림} />
    </카드>
  )
}
