// GET /first-run — 계정이 하나도 없으면 시작 화면으로, 있으면 개요로 가르는 판정
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async () => {
  const { 계정이하나도없다 } = await 엔진('계정있나')
  return 응답({ 없음: await 계정이하나도없다(뿌리()) })
})
