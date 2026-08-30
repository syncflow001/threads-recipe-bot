'use client'
// 켜졌는지 한눈에 보여주는 작은 딱지(옛 .켜짐표)
import { cn } from '@/lib/utils'

export function 켜짐표({ 켜짐, 켜짐글 = 'ON', 꺼짐글 = 'OFF' }: {
  켜짐: boolean
  켜짐글?: string
  꺼짐글?: string
}) {
  return (
    <span className={cn(
      'ml-1 inline-block rounded-md px-1.5 py-0.5 align-middle text-[0.7rem] font-bold',
      켜짐 ? 'bg-green-100 text-green-900' : 'bg-muted text-muted-foreground',
    )}>
      {켜짐 ? 켜짐글 : 꺼짐글}
    </span>
  )
}
