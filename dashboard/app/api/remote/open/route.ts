// POST /api/remote/open — 크롬 원격 데스크톱 지원 페이지를 맥에서 연다. account-agnostic
import { execFile } from 'node:child_process'
import { 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = 감싸기(async () => {
  // 콜백을 안 주면 실패가 'error' 이벤트로 튀어 서버가 죽는다. 못 열어도 화면은 살아 있어야 한다
  execFile('open', ['https://remotedesktop.google.com/support'], () => {})
  return 응답({ 열림: true })
})
