// 열쇠말 문 — ?k= 한 번이면 쿠키를 심고, 그다음은 쿠키로 본다. 다른 곳에서 온 요청은 막는다
import { NextResponse, type NextRequest } from 'next/server'
import { 열쇠말읽기 } from '@/lib/뿌리'

const 막기 = () =>
  new NextResponse('<h1>주소가 맞지 않습니다</h1><p>터미널에 찍힌 주소를 그대로 열어 주세요.</p>',
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } })

export async function proxy(req: NextRequest) {
  const 열쇠말 = await 열쇠말읽기()
  const url = req.nextUrl
  if (url.pathname === '/' && url.searchParams.get('k') === 열쇠말) {
    const 가기 = NextResponse.redirect(new URL('/', req.url))
    gate(가기, 열쇠말)
    return 가기
  }
  if (req.cookies.get('gate')?.value !== 열쇠말) return 막기()
  // 브라우저가 붙이는 Origin 이 우리 주소가 아니면 딴 사이트가 보낸 것이다
  const 출처 = req.headers.get('origin')
  if (출처 && URL.parse(출처)?.host !== req.headers.get('host')) {
    return NextResponse.json({ 안됨: '다른 곳에서 온 요청입니다' }, { status: 403 })
  }
  return NextResponse.next()
}

function gate(res: NextResponse, 열쇠말: string) {
  res.cookies.set('gate', 열쇠말, { path: '/', httpOnly: true, sameSite: 'strict' })
}

// _next 정적 파일은 문 밖 — 403 화면도 CSS 가 있어야 한다
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
