'use client'
// 화면 전체가 함께 쓰는 제공자 — 서버 자료 캐시(React Query) 하나
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
