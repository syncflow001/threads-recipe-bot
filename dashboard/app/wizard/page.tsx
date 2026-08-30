// /wizard — 계정 연결 설정 마법사. 옆바가 없는 한 화면짜리 쪽이라 (pages) 묶음 밖에 둔다
import { 마법사 } from '@/components/마법사/마법사'

export const dynamic = 'force-dynamic'

const 하나 = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function 마법사쪽({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const q = await searchParams
  return (
    <마법사
      말투만={하나(q.말투만) === '1'}
      계정매개={하나(q.계정)}
      옛분야={하나(q.옛분야)}
      새분야={하나(q.새분야)}
    />
  )
}
