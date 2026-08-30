// 마법사 걸음이 공유하는 타입 · 작은 스타일 — 걸음들·연결단계가 서로 안 물고 이 파일만 본다(순환 import 제거)
import { type ReactNode } from 'react'
import { type 시각칸 } from '@/components/공용/시각고르개'
import { type 계정상태 } from '@/components/쪽/settings/계정수정판'

export type 마법사값 = {
  계정: string; 별칭: string; 분야: string; 언어: string; 제휴: string
  정체성: string; 말투: string; 표현: string; 예시: string[]
  // 외국어 계정이면 추천이 한국어 뜻도 함께 준다(옛 2764)
  뜻: { 정체성: string; 말투: string; 표현: string } | null
  칸들: 시각칸[]
}

// 열쇠 값은 이 통에만 담긴다 — localStorage 에 절대 안 적는다
export type 열쇠통 = Record<string, string>

export type 걸음속성 = {
  값: 마법사값
  고치기: (조각: Partial<마법사값>) => void
  열쇠: 열쇠통
  열쇠고치기: (조각: 열쇠통) => void
  상태: 계정상태
  계정: string
  계정정하기: (이름: string) => void
  이어서표시: () => void
  알림담기: (글: ReactNode, 종류?: '좋음' | '나쁨') => void
  알림잇기: (글: ReactNode) => void
  켠시각: number[]
  켠시각담기: (시각들: number[]) => void
}

export type 걸음 = {
  제목: string
  건너뛸수있나?: boolean
  건너뛴뒤?: ReactNode
  마지막?: boolean
  본문: (p: 걸음속성) => ReactNode
  저장?: (p: 걸음속성) => Promise<void>
}

export const 칸모양 = 'mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm'
export const 귀띔모양 = 'mb-2 text-[0.88rem] text-pretty text-muted-foreground'
