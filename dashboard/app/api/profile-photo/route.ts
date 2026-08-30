// GET /profile-photo — 옛 설정화면.mjs 1005~1012줄 그대로. 비-JSON, 실패 시 404
import { readFile } from 'node:fs/promises'
import { type NextRequest, NextResponse } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const { 프로필사진챙기기 } = await 엔진('화면엔진')
  try {
    const 길 = await 프로필사진챙기기(r.계정)
    const 바이트 = await readFile(길)
    return new NextResponse(바이트, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (e: any) { return 안됨(e.message, 404) }
})
