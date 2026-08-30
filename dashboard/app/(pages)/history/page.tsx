'use client'
// 기록 쪽 — 성과측정·발행이력·팔로워추이·글별성과·발행성공률 다섯 카드(옛 기록 쪽, HTML 1000~1069)
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { use자료 } from '@/lib/hooks'
import { 성과측정, type 성적자료 } from '@/components/쪽/history/성과측정'
import { 발행이력 } from '@/components/쪽/history/발행이력'
import { 팔로워추이 } from '@/components/쪽/history/팔로워추이'
import { 글별성과 } from '@/components/쪽/history/글별성과'
import { 발행성공률, type 발행격자자료 } from '@/components/쪽/history/발행성공률'

export default function 기록() {
  const client = useQueryClient()
  const [날수, 날수담기] = useState('30')
  const 성적 = use자료<성적자료>('/score')
  const 격자 = use자료<발행격자자료>(`/schedule?days=${날수}`)

  // 지금 측정하기가 끝나면 옛 화면처럼 성적·팔로워·성장 세 자료를 다시 읽는다(옛 2188~2205)
  const 측정후 = () => {
    client.invalidateQueries({ queryKey: ['/score'] })
    client.invalidateQueries({ queryKey: ['/followers'] })
    client.invalidateQueries({ queryKey: ['/growth'] })
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">기록</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <성과측정 자료={성적.data} 에러={성적.error} 다시읽기={() => 성적.refetch()} 측정후={측정후} />
        <발행이력 날수={날수} 날수바꿈={날수담기} 자료={격자.data} 에러={격자.error} />
        <팔로워추이 />
        <글별성과 자료={성적.data} 에러={성적.error} />
        <발행성공률 자료={격자.data} 에러={격자.error} />
      </div>
    </>
  )
}
