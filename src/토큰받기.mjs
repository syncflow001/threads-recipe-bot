// threads-login.mjs 의 토큰 교환·검증을 함수로 뽑았다 + 크롬 프로필로 코드를 받는 자동발급(Task 2 에서 완성)

import { join } from 'node:path'
import { 계정열쇠읽기 } from './감시모음.mjs'
import { 열쇠저장 } from './화면엔진.mjs'

// 답글을 달려면 threads_manage_replies 가 있어야 한다. 없으면 본문만 올라가고 레시피 답글이 500 으로 죽는다.
// threads_manage_insights 는 내가 올린 글의 조회수를 읽는 권한이다 — 없으면 조회수가 전부 0 으로 온다
export const 필수권한 = [
  'threads_basic', 'threads_content_publish', 'threads_manage_replies', 'threads_manage_insights',
]
// 잘못 나간 글을 지우는 권한. 없어도 발행은 멀쩡히 돌기 때문에 없다고 막지 않는다
export const 더받을권한 = ['threads_delete']

export function 로그인주소(아이디, 돌아올주소) {
  const 권한 = [...필수권한, ...더받을권한].join(',')
  return (
    `https://threads.net/oauth/authorize?client_id=${아이디}` +
    `&redirect_uri=${encodeURIComponent(돌아올주소)}&response_type=code&scope=${encodeURIComponent(권한)}`
  )
}

// 'https://localhost/?code=AQBxyz#_' → 'AQBxyz'. code 가 없으면 null
export function 코드뽑기(url) {
  try {
    const 코드 = new URL(url).searchParams.get('code')
    return 코드 ? 코드.replace(/#_?$/, '') : null
  } catch {
    return null
  }
}

export async function 코드로토큰(코드, { 아이디, 비밀, 돌아올주소, 받기 = fetch } = {}) {
  const 짧은 = await 받기('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 아이디, client_secret: 비밀, code: 코드,
      grant_type: 'authorization_code', redirect_uri: 돌아올주소,
    }),
  }).then((r) => r.json())
  if (!짧은.access_token) throw new Error('토큰 받기 실패: ' + JSON.stringify(짧은).slice(0, 300))
  return { 토큰: 짧은.access_token, 사용자: 짧은.user_id }
}

// 짧은 토큰은 한 시간짜리다. 실패해도 짧은 토큰으로 계속(옛 규칙)
export async function 긴토큰(짧은토큰, 비밀, { 받기 = fetch } = {}) {
  try {
    const 긴 = await 받기(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${비밀}&access_token=${짧은토큰}`,
    ).then((r) => r.json())
    if (긴.access_token) return { 토큰: 긴.access_token, 수명일: Math.round((긴.expires_in ?? 0) / 86400) }
  } catch {
    // 짧은 토큰으로 계속
  }
  return { 토큰: 짧은토큰, 수명일: null }
}

// 허용 화면에서 권한 하나를 안 켜고 넘어갈 수 있다. 저장 전에 실제 받은 권한을 확인해 빠진 필수권한을 돌려준다
export async function 권한확인(토큰, { 받기 = fetch } = {}) {
  const 받은권한 = await 받기(`https://graph.threads.net/debug_token?input_token=${토큰}&access_token=${토큰}`)
    .then((r) => r.json()).then((j) => j?.data?.scopes ?? []).catch(() => [])
  return 필수권한.filter((p) => !받은권한.includes(p))
}

export async function 내아이디(토큰, { 받기 = fetch } = {}) {
  const 나 = await 받기(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${토큰}`)
    .then((r) => r.json()).catch(() => ({}))
  return { id: 나.id ?? null, username: 나.username ?? null }
}

// playwright cookies[] → 'a=b; c=d' (threads.com 도메인만)
export function 쿠키문자열(쿠키들) {
  return 쿠키들
    .filter((c) => c.domain?.includes('threads.com'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

// 계정별 크롬 프로필 창을 띄워 허용 화면을 누르게 하고, 돌아온 주소에서 코드를 받아
// 토큰·쿠키까지 자동으로 저장한다. 사람은 로그인하고 「허용」만 누르면 된다
// 쿠키묻기 는 검사가 갈아 끼운다 — 안 그러면 검사가 진짜 스레드를 두드린다
export async function 자동발급(계정, { 뿌리 = process.cwd(), 진행 = () => {}, 크롬, 받기 = fetch, 쿠키묻기 } = {}) {
  const 아이디 = await 계정열쇠읽기('', 'THREADS_APP_ID', 뿌리)
  const 비밀 = await 계정열쇠읽기('', 'THREADS_APP_SECRET', 뿌리)
  if (!아이디 || !비밀) throw new Error('앱없음')

  const chromium = 크롬 ?? (await import('playwright-core')).chromium
  const 돌아올주소 = process.env.THREADS_REDIRECT_URI || 'https://localhost/'
  const context = await chromium.launchPersistentContext(
    join(뿌리, '크롬프로필', 계정 || '첫계정'),
    { channel: 'chrome', headless: false, viewport: null },
  )
  try {
    진행('창을 열었어요 — 스레드에 로그인하고 허용을 눌러 주세요')
    const page = await context.newPage()
    await page.goto(로그인주소(아이디, 돌아올주소))

    try {
      // localhost 는 안 열리지만 주소는 잡힌다 — commit 이면 응답을 안 기다린다
      await page.waitForURL((u) => u.href.startsWith(돌아올주소), { timeout: 5 * 60 * 1000, waitUntil: 'commit' })
    } catch {
      throw new Error('시간초과')
    }

    const 도착주소 = page.url()
    if (도착주소.includes('error=')) throw new Error('거부')
    const 코드 = 코드뽑기(도착주소)
    if (!코드) throw new Error('거부')

    const 짧은 = await 코드로토큰(코드, { 아이디, 비밀, 돌아올주소, 받기 })
    const 긴 = await 긴토큰(짧은.토큰, 비밀, { 받기 })
    const 빠진것 = await 권한확인(긴.토큰, { 받기 })
    if (빠진것.length) throw new Error('권한부족:' + 빠진것.join(','))

    const 나 = await 내아이디(긴.토큰, { 받기 })
    if (계정 && 나.username && 나.username !== 계정) throw new Error('딴계정:' + 나.username)

    const 쿠키 = 쿠키문자열(await context.cookies(['https://www.threads.com']))

    // 토큰과 쿠키는 **따로** 저장한다. 허용 화면에서 계정을 바꿔 고르면
    // 토큰은 고른 계정 것인데 브라우저 쿠키는 로그인해 둔 계정 것이라 둘이 갈린다.
    // 그때 한꺼번에 저장하면 토큰까지 같이 날아간다 — 쓸 수 있는 토큰을 버릴 이유가 없다
    await 열쇠저장(계정, { THREADS_ACCESS_TOKEN: 긴.토큰, THREADS_USER_ID: 나.id })
    let 쿠키있음 = true
    let 쿠키탈 = null
    try {
      await 열쇠저장(계정, { THREADS_COOKIE: 쿠키 }, false, 쿠키묻기 ? { 쿠키묻기 } : {})
    } catch (e) {
      쿠키있음 = false
      쿠키탈 = e.message   // 「이 쿠키는 "OOO" 계정 것입니다」
    }

    return { 사용자: 나.username, 권한: 필수권한, 쿠키있음, 쿠키탈 }
  } finally {
    await context.close()
  }
}
