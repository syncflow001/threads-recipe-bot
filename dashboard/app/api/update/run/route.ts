// POST /api/update/run — 업데이트하기() 를 기다리지 않고 띄운다. 화면엔진.mjs 의 진행 통에 그대로 얹는다.
// 잠금은 상태통.업데이트도는중 깃발로 둔다. ⚠️ 빌드·재시작이 대시보드 자신을 다시 켠다 —
// 「다시 켜는 중」이 마지막 진행 글이고, 화면이 잠깐 끊겼다 돌아온다는 안내는 카드 쪽에 있다
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'
import { 응답, 안됨, 감싸기 } from '@/lib/길'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = 감싸기(async () => {
  const { 상태통, 진행시작, 진행끝, 알림담기 } = await 엔진('화면엔진')
  const { 업데이트하기 } = await 엔진('업데이트')
  if (상태통.업데이트도는중) return 안됨('이미 돌고 있습니다')
  상태통.업데이트도는중 = true
  진행시작('자동 업데이트', '')
  업데이트하기({ 뿌리: 뿌리(), 진행: (글: string) => 알림담기(글, '') })
    .then((값: unknown) => 진행끝(값, ''))
    .catch((e: any) => 진행끝({ 됨: false, 까닭: e?.message || '실패했습니다' }, ''))
    .finally(() => { 상태통.업데이트도는중 = false })
  return 응답({ 시작함: true })
})
