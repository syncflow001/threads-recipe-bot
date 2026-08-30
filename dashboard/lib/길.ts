// 라우트 핸들러가 함께 쓰는 것 — 계정 파싱·응답 모양은 옛 서버(설정화면.mjs 736~747줄)와 같다
import { NextResponse, type NextRequest } from 'next/server'
import { 엔진 } from './엔진'

export const 응답 = (값: unknown, status = 200) => NextResponse.json(값, { status })
export const 안됨 = (글: string, status = 400) => 응답({ 안됨: 글 }, status)

export async function 계정에서(req: NextRequest): Promise<{ 계정: string } | NextResponse> {
  const { 계정꼴 } = await 엔진('화면엔진')
  const 계정 = (req.nextUrl.searchParams.get('profile') ?? '').trim()
  if (계정 && !계정꼴.test(계정)) return 안됨('계정 이름은 영문·숫자 8자까지입니다')
  return { 계정 }
}
export const 몸통 = (req: NextRequest) => req.json().catch(() => ({}))
// 옛 다루기() 의 try/catch 와 같다 — 엔진이 던지면 500 {안됨}
export const 감싸기 = (일: (req: NextRequest) => Promise<NextResponse>) => async (req: NextRequest) => {
  try { return await 일(req) } catch (e: any) { return 안됨(e?.message || '실패했습니다', 500) }
}
