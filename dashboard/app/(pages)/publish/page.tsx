'use client'
// 발행 쪽 — 빠른 실행 · 돌려 본 기록 · 저장소 세 카드(옛 발행 쪽, HTML 819~846 · JS 1892~1977·3331~3398)
import { useEffect, useState } from 'react'
import { 부르기 } from '@/lib/api'
import { use계정, use다시그리기 } from '@/lib/hooks'
import { 빠른실행 } from '@/components/쪽/publish/빠른실행'
import { 돌려본기록 } from '@/components/쪽/publish/돌려본기록'
import { 저장소 } from '@/components/쪽/publish/저장소'

export default function 발행() {
  const 계정 = use계정()
  const 다시그리기 = use다시그리기()
  const [실행중, 실행중담기] = useState(false)

  // 새로고침 뒤에도 이미 돌던 일이 있으면 다시 붙잡는다(옛 3400~3408 의 「보기시작」)
  // 계정이 아직 안 읽혔으면(null) 기다린다 — 안 그러면 엉뚱한 계정으로 한 번 물어보게 된다
  useEffect(() => {
    if (계정 === null) return
    부르기<{ 도는중: boolean }>('/log', null, 계정).then((r) => { if (r.도는중) 실행중담기(true) }).catch(() => {})
  }, [계정])

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">발행</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <빠른실행 실행중={실행중} 실행중담기={실행중담기} />
        <돌려본기록 실행중={실행중} onDone={() => { 실행중담기(false); 다시그리기() }} />
        <저장소 />
      </div>
    </>
  )
}
