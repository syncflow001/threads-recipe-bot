// 터진 글에만 쿠팡 링크를 뒤늦게 단다 — 30시간 안에 1만 조회를 넘긴 글이 그 대상이다

// ⚠️ **왜 있나 (2026-09-06 실측).** 발행 때마다 링크를 달았더니 하루 6~25편에 링크가 붙었는데
// 쿠팡 클릭은 링크 글이 0편이던 때(하루 8~20)와 **똑같았다.** 우리 글 한 편당 클릭은 0에 가깝다.
// 예외는 `sample.unni` 글이 4만 조회로 터진 날 하루 — 234클릭. **클릭은 조회수가 만든다.**
// 그러니 모든 글에 광고를 다는 것은 도달만 깎고 얻는 것이 없다.
//
// 그래서 발행은 늘 깨끗하게(링크 없음·광고 표시 없음·재료 공개) 하고,
// **조회수 알리미가 30분마다 재다가 문턱을 넘긴 글에만** 링크 답글을 하나 더 단다.
// 문턱은 사용자가 정했다 — **올린 지 30시간 이내 · 조회수 1만 이상** (조회수알리미.mjs 의 설정).
//
// 한 글에 한 번만 단다. 두 겹으로 막는다 —
//   ① `재구성.json` 의 `발행.늦은링크` (우리 기록)
//   ② 달기 직전에 스레드에서 그 글의 답글에 이미 링크가 있는지 본다 (실제)
// 기록이 「없음」이어도 실제로는 달렸을 수 있다 — 두 번 달면 손으로 지워야 한다

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { 계정길, 꼬리머리 } from './계정.mjs'
import { 안전쓰기 } from './장부쓰기.mjs'
import { 계정열쇠읽기 } from './감시모음.mjs'
import { 글주소받기 as 글주소받기원본, 나누기 } from './publish.mjs'
import { 브라우저로답글달기 as 답글달기원본 } from './브라우저답글.mjs'
import { 상세 as 상세원본 } from './threads.mjs'

// 쿠팡·토스 같은 제휴 링크 꼴. 이미 달렸는지 볼 때 쓴다
export const 링크꼴 = /link\.coupang\.com|coupa\.ng|coual\.com|tosshop|amzn\.to|amazon\.|a\.r10\.to|hb\.afl\.rakuten/i

export const 기록길 = (계정, code, 뿌리 = process.cwd()) =>
  join(뿌리, 계정길(계정, 'media', '쓴것', code, '재구성.json'))

// 달아야 하나 — **순수 함수.** 여기서 갈리는 까닭을 말로 돌려준다.
// 「안 단다」가 조용하면 왜 안 달렸는지 아무도 모른다 (2026-09-05 의 「고장이 아닙니다」가 그랬다)
export function 달아야하나(글, { 조회수, 지금 = Date.now(), 문턱 = 10000, 시간 = 30, 계정정보, 제휴팩 } = {}) {
  const 발 = 글?.발행 ?? {}
  if (!발.본문번호) return { 단다: false, 까닭: '아직 안 올라간 글' }
  if (발.늦은링크?.단때) return { 단다: false, 까닭: '이미 달았다' }
  if (계정정보?.링크넣기 === false) return { 단다: false, 까닭: '이 계정은 링크를 끈 상태' }
  if (!제휴팩?.링크만들기) return { 단다: false, 까닭: '제휴가 「없음」' }
  if (!String(글?.핵심재료 ?? '').trim()) return { 단다: false, 까닭: '핵심재료를 못 골랐던 글' }
  const t = Date.parse(발.올린때 ?? '')
  if (!Number.isFinite(t) || t > 지금) return { 단다: false, 까닭: '올린 때를 모른다' }
  if (지금 - t > 시간 * 3600 * 1000) return { 단다: false, 까닭: `올린 지 ${시간}시간이 지났다` }
  if (Number(조회수 ?? 0) < 문턱) return { 단다: false, 까닭: `조회수 ${Number(조회수 ?? 0).toLocaleString('ko-KR')} — 문턱 ${문턱.toLocaleString('ko-KR')} 미달` }
  return { 단다: true, 까닭: '' }
}

// 답글 한 조각. 링크와 대가성 문구 사이에 **빈 줄을 두지 않는다** — 빈 줄로 나뉘면
// 「링크만 있고 고지가 없는 조각」이 생길 수 있다 (쿠팡팩 주석 그대로)
export function 답글글월({ 핵심재료, url, 언어팩, 제휴팩 }) {
  const 말 = 언어팩?.늦은링크말
  const 머리 = typeof 말 === 'function' ? 말(핵심재료) : `${핵심재료} 👇`
  return [언어팩?.광고표기, 머리, url, 제휴팩?.대가성문구].filter((v) => v != null && String(v).trim()).join('\n')
}

// 실제로 단다. 링크는 **이때** 만든다 — 발행 때마다 만들면 95%가 헛일이다
export async function 달기(계정, code, {
  뿌리 = process.cwd(), 조회수, 언어팩, 제휴팩, 지금 = Date.now(),
  열쇠읽기 = 계정열쇠읽기, 글주소받기 = 글주소받기원본, 답글달기 = 답글달기원본, 상세 = 상세원본,
  알림 = () => {},
} = {}) {
  const 길 = 기록길(계정, code, 뿌리)
  const 글 = await readFile(길, 'utf8').then(JSON.parse).catch(() => null)
  if (!글) return { 달았다: false, 까닭: '기록이 없다' }

  const [토큰, 쿠키] = await Promise.all([
    열쇠읽기(계정, 'THREADS_ACCESS_TOKEN', 뿌리), 열쇠읽기(계정, 'THREADS_COOKIE', 뿌리),
  ])
  if (!토큰 || !쿠키) return { 달았다: false, 까닭: '토큰이나 쿠키가 없다' }

  const 주소 = await 글주소받기(글.발행.본문번호, 토큰)
  const m = String(주소).match(/@([^/]+)\/post\/([^/?#]+)/)
  if (!m) return { 달았다: false, 까닭: `글 주소를 못 읽었다: ${주소}` }

  // ② 실제로 이미 달렸나. 기록보다 스레드가 먼저다
  const 지금글 = await 상세(m[1], m[2], { cookie: 쿠키 }).catch(() => null)
  if ((지금글?.글타래 ?? []).some((t) => 링크꼴.test(String(t.본문 ?? '')))) {
    await 적기(길, 글, { 단때: new Date(지금).toISOString(), 조회수, 까닭: '이미 달려 있어 기록만 맞췄다' })
    return { 달았다: false, 까닭: '이미 달려 있다 (기록만 맞췄다)' }
  }

  const 상품 = await 제휴팩.링크만들기(글.핵심재료, code, { 머리: 꼬리머리(계정) })
  if (!상품) {
    // 다음 30분에 또 찾아봐야 헛일이다. 없었다고 적어 두면 다시 안 온다
    await 적기(길, 글, { 단때: new Date(지금).toISOString(), 조회수, 상품없음: true })
    return { 달았다: false, 까닭: `"${글.핵심재료}" 는 로켓배송 상품이 없다` }
  }

  const 글월 = 답글글월({ 핵심재료: 글.핵심재료, url: 상품.url, 언어팩, 제휴팩 })
  const 조각들 = 나누기(글월)
  알림(`  ${code} 링크 답글을 답니다 — "${글.핵심재료}" → ${상품.이름 ?? 상품.url}`)
  const r = await 답글달기({ 주소, 조각들, 쿠키, 계정, 주제달기: 언어팩?.주제태그 ?? null })

  await 적기(길, 글, {
    단때: new Date(지금).toISOString(), 조회수, 상품, 조각수: r.올린조각수, 주제결과: r.주제결과 ?? '',
  })
  return { 달았다: true, 상품, 주제결과: r.주제결과 ?? '', 주소 }
}

async function 적기(길, 글, 늦은링크) {
  글.발행 = { ...글.발행, 늦은링크 }
  await 안전쓰기(길, JSON.stringify(글, null, 2))
}

// ── 달았다·못 달았다 알림 스위치 (2026-09-07, 사용자가 시켰다) ────────────────
//
// 계정이 아니라 **이 맥 전체의 규칙**이라 뿌리 `알림설정.json` 에 둔다 (발행간격.json 과 같은 자리).
// 기본은 켜짐 — 파일이 없거나 깨져도 알림은 온다. 조용히 꺼지는 쪽이 더 위험하다
export const 알림설정파일 = (뿌리 = process.cwd()) => join(뿌리, '알림설정.json')
export const 알림기본 = { 늦은링크: true }

export async function 알림설정읽기(뿌리 = process.cwd()) {
  const 것 = await readFile(알림설정파일(뿌리), 'utf8').then(JSON.parse).catch(() => ({}))
  return { ...알림기본, ...(것 && typeof 것 === 'object' ? 것 : {}) }
}

export async function 알림설정쓰기(값, 뿌리 = process.cwd()) {
  const 지금것 = await 알림설정읽기(뿌리)
  const 새것 = { ...지금것, ...값 }
  await 안전쓰기(알림설정파일(뿌리), `${JSON.stringify(새것, null, 2)}\n`)
  return 새것
}

// 「실패」로 부를 것 — 이미 달려 있던 것은 실패가 아니다
export const 실패인가 = (결과) => !결과?.달았다 && !/이미 달려/.test(String(결과?.까닭 ?? ''))

