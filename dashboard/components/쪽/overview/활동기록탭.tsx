'use client'
// 활동 기록 탭 카드 — 내 활동(②의 활동기록 재사용)·스레드 유저 활동(새) 두 탭
import { 카드 } from '@/components/공용/카드'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 활동기록 } from '@/components/쪽/activity/활동기록'
import { 스레드유저활동 } from './스레드유저활동'

export function 활동기록탭() {
  return (
    <카드 제목="활동 기록" 넓게>
      <Tabs defaultValue="내">
        <TabsList>
          <TabsTrigger value="내">내 활동</TabsTrigger>
          <TabsTrigger value="스레드">스레드 유저 활동</TabsTrigger>
        </TabsList>
        <TabsContent value="내"><활동기록 본문만 /></TabsContent>
        <TabsContent value="스레드"><스레드유저활동 /></TabsContent>
      </Tabs>
    </카드>
  )
}
