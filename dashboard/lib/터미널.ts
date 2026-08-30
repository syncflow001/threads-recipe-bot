// 관리자 도구 터미널 문 — 2026-08-30 사용자 지시로 **항상 열려 있다.**
// 전에는 이 맥 로그인 비밀번호를 물어 통행증 쿠키를 주었다(설정화면.mjs 664~700 터미널다루기).
// 지금은 대시보드 열쇠말(`?k=`) 하나가 유일한 문이다 — 그 문을 지난 사람은 터미널도 바로 쓴다.
// ⚠️ 이 터미널은 이 맥에 아무 명령이나 내린다. 열쇠말이 새면 터미널까지 함께 열린다
import { type NextRequest, type NextResponse } from 'next/server'

export async function 통행증확인(_req: NextRequest): Promise<NextResponse | { 통행증: string }> {
  return { 통행증: '열림' }
}

export const 통행증쿠키 = (값: string) => ({ name: 'term', value: 값, path: '/', httpOnly: true, sameSite: 'strict' as const })
