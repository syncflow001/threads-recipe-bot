'use client'
// 어느 계정을 보고 있나. 옛 화면과 같은 localStorage['계정'] 을 쓴다
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 부르기 } from '@/lib/api'
import { 계정바뀜 } from '@/lib/hooks'

type 건강 = { 판: string; 계정들: { 이름: string; 별칭: string }[] }

// shadcn SelectItem 은 빈 문자열 value 를 받지 않는다 — 이름 없는 첫 계정을 이 값으로 대신 쓰고
// localStorage['계정'] 에 적을 때만 '' 로 되돌린다
const 첫계정값 = '__첫계정__'
const 라벨 = (c: { 이름: string; 별칭: string }) => c.별칭 || (c.이름 ? c.이름 : '첫 계정')

export function 계정고르개() {
  const client = useQueryClient()
  const { data } = useQuery({ queryKey: ['health'], queryFn: () => 부르기<건강>('/health') })
  const [고른, 고르기] = useState('')
  useEffect(() => {
    if (!data?.계정들?.length) return
    const 있던 = localStorage.getItem('계정') ?? ''
    const 값 = data.계정들.some((c) => c.이름 === 있던) ? 있던 : data.계정들[0].이름
    고르기(값 || 첫계정값); localStorage.setItem('계정', 값)
  }, [data])
  if (!data) return <div className="text-sm text-muted-foreground">계정 읽는 중…</div>
  return (
    // items 를 안 주면 base-ui SelectValue 가 트리거에 라벨 대신 원래 value 문자열을 그대로 보여준다
    <Select value={고른} items={Object.fromEntries((data.계정들 ?? []).map((c) => [c.이름 || 첫계정값, 라벨(c)]))}
      onValueChange={(v) => {
        if (!v) return
        const 값 = v === 첫계정값 ? '' : v
        고르기(v); 계정바뀜(client, 값)
      }}>
      <SelectTrigger aria-label="계정 고르기"><SelectValue placeholder="계정" /></SelectTrigger>
      {/* 목록 폭은 트리거의 1.5배 — 트리거 폭에 맞추면 긴 계정 이름이 잘린다 */}
      <SelectContent className="w-[calc(var(--anchor-width)*1.5)]">
        {(data.계정들 ?? []).map((c) => (
          <SelectItem key={c.이름} value={c.이름 || 첫계정값}>{라벨(c)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
