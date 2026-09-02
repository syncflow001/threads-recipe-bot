// GET /revenue-detail — 옛 설정화면.mjs 888~904줄 그대로
import { type NextRequest } from 'next/server'
import { 엔진 } from '@/lib/엔진'
import { 계정에서, 응답, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = 감싸기(async (req: NextRequest) => {
  const r = await 계정에서(req); if (r instanceof Response) return r
  const 일수 = Math.min(180, Math.max(7, Number(req.nextUrl.searchParams.get('days')) || 30))
  const { 수익 } = await 엔진('대시보드')
  const { 읽기: 목표읽기, 달성: 목표달성, 속도: 목표속도, 최대목표 } = await 엔진('수익목표')
  const { 합치기, 전환, 요일별, 달별, 달견주기, 벌이있는날 } = await 엔진('수익분석')
  const { 정보, 수익채널 } = await 엔진('계정')
  // 목표는 **그 숫자를 실제로 받아오는 채널**에 붙는다 (2026-08-31)
  const 채널 = 수익채널((await 정보(r.계정).catch(() => null))?.제휴)
  const 값 = await 수익({ 일수 })
  const 월목표 = await 목표읽기(undefined, 채널.출처)
  const 달성 = 값.안됨 ? null : 목표달성(값.이번달, 월목표)
  const 달들 = 달별(값.최근)
  return 응답({
    ...값,
    월목표, 최대목표, 달성, 속도: 목표속도(달성), 수익채널: 채널,
    전환: 값.안됨 ? null : 전환(합치기(값.최근)),
    기간합: 합치기(값.최근),
    요일: 값.안됨 ? null : 요일별(값.최근),
    달들,
    달견주기: 달들.length >= 2 ? 달견주기(달들[달들.length - 1], 달들[달들.length - 2]) : null,
    벌이: 벌이있는날(값.최근),
  })
})
