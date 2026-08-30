// 뼈대가 살아 있나 — 판 번호와 계정 목록. 계정 고르개가 이걸 읽는다
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { 뿌리 } from '@/lib/뿌리'
import { 엔진 } from '@/lib/엔진'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 옆바 계정 카드가 점을 찍을 최고 심각도를 함께 실어 보낸다(과제 6, src/점검기록.mjs).
// 자리마다 파일이 갈렸으므로(2026-08-29) 모두읽기 로 한 번에 걷는다
type 점검문제 = { 심각도?: '높음' | '보통' }
const 최고심각도 = (문제들: 점검문제[]): '높음' | '보통' | undefined =>
  문제들.some((p) => p.심각도 === '높음') ? '높음' : 문제들.length ? '보통' : undefined

export async function GET() {
  const { version: 판 } = JSON.parse(await readFile(join(뿌리(), 'package.json'), 'utf8'))
  const { 장부읽기, 계정목록 } = await 엔진('계정')
  const { 전체자리 } = await 엔진('점검기록')
  const { 모두읽기 } = await 엔진('점검기록')
  // 계정 목록을 뽑는 규칙은 src/계정.mjs 하나뿐이다 — 화면이 제 규칙을 따로 갖지 않는다 (2026-08-29)
  const [장부, 이름들] = await Promise.all([장부읽기(뿌리()), 계정목록(뿌리())])
  const 점검상태 = await 모두읽기([전체자리, ...이름들], 뿌리())
  const 전체문제 = (점검상태[전체자리] ?? []) as 점검문제[]
  const 계정들 = (이름들 as string[]).map((이름: string) => {
    const 문제들 = [...((점검상태[이름] ?? []) as 점검문제[]), ...전체문제]
    return { 이름, 별칭: 장부[이름]?.별칭 ?? '', 심각도: 최고심각도(문제들), 문제수: 문제들.length }
  })
  return NextResponse.json({ 판, 계정들, 때: new Date().toISOString() })
}
