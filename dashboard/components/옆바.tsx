'use client'
// 쪽 단추 열 개와 계정 고르개. 폰에서는 가로로 미는 한 줄이 된다
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Coins, Upload, Activity, UserRound, ListOrdered, HeartPulse, ShieldCheck, Settings, Wrench } from 'lucide-react'
import { 계정고르개 } from './계정고르개'
import { 계정카드 } from './계정카드'
import { cn } from '@/lib/utils'

// 길(경로)은 영문이어야 한다 — Next 16 의 세그먼트 캐시가 경로를 btoa() 로
// 인코딩하는데, btoa 는 한글(Latin-1 밖 문자)을 못 받아 빌드가 죽는다.
// 눈에 보이는 이름만 한글로 두고 URL 은 ASCII 로 간다
export const 쪽들 = [
  { 이름: '개요', 길: '/overview', 아이콘: LayoutGrid },
  { 이름: '수익', 길: '/revenue', 아이콘: Coins },
  { 이름: '발행', 길: '/publish', 아이콘: Upload },
  { 이름: '활동', 길: '/activity', 아이콘: Activity },
  { 이름: '페르소나', 길: '/persona', 아이콘: UserRound },
  { 이름: '기록', 길: '/history', 아이콘: ListOrdered },
  { 이름: '모니터링', 길: '/monitor', 아이콘: HeartPulse },
  { 이름: '점검', 길: '/check', 아이콘: ShieldCheck },
  { 이름: '설정', 길: '/settings', 아이콘: Settings },
  { 이름: '관리자 도구', 길: '/admin', 아이콘: Wrench },
] as const

export function 옆바() {
  const 지금 = usePathname()
  return (
    <aside className="border-b md:border-b-0 md:border-r bg-card md:w-56 md:min-h-screen">
      <div className="p-3 md:p-4 space-y-3"><계정고르개 /><계정카드 /></div>
      <nav aria-label="쪽" className="flex md:flex-col gap-1 px-2 pb-2 overflow-x-auto whitespace-nowrap">
        {쪽들.map(({ 이름, 길, 아이콘 }) => (
          <Link key={길} href={길} aria-current={지금 === 길 ? 'page' : undefined}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent',
              지금 === 길 && 'bg-accent font-semibold')}>
            <아이콘 className="size-4 shrink-0" aria-hidden />{이름}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
