// 쪽 열 개가 함께 쓰는 틀 — 옆바 + 본문
import { 옆바 } from '@/components/옆바'

export default function 쪽틀({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-w-0">
      <옆바 />
      <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
    </div>
  )
}
