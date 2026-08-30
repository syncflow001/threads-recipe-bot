// 뿌리 레이아웃 — 제공자만 얹는다. 옆바는 (쪽) 묶음 레이아웃이 그린다 (시작 화면엔 옆바가 없다)
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = { title: '스레드 자동화' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko"><body className="min-h-screen bg-background text-foreground antialiased">
      <Providers>{children}</Providers>
    </body></html>
  )
}
