// GET /api/term/stream?번호= — 창 화면 출력 SSE (창듣기 를 Node res 없이 ReadableStream 으로 다시 짠 것, account-agnostic)
import { type NextRequest } from 'next/server'
import { 통행증확인 } from '@/lib/터미널'
import { 엔진 } from '@/lib/엔진'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const 심장박동 = 25_000

export async function GET(req: NextRequest) {
  const 문 = await 통행증확인(req)
  if (문 instanceof Response) return 문
  const { 창들 } = await 엔진('설정화면-터미널')
  const 번호 = Number(req.nextUrl.searchParams.get('번호'))
  const 창 = 창들.get(번호)

  const 인코더 = new TextEncoder()
  let 심장: ReturnType<typeof setInterval> | undefined
  let 듣는이: ((글: string | null, 코드?: number) => void) | undefined
  // 심장박동을 멈추고 듣는이를 뗀다 — abort·cancel·end 어느 길로 끝나든 한 번은 반드시 지나야
  // 인터벌·듣는이가 안 새고, 껍데기가 나중에 흘려보내는 글이 죽은 컨트롤러를 두드리지 않는다
  const 치우기 = () => { clearInterval(심장); 창?.듣는이들.delete(듣는이) }

  const 몸 = new ReadableStream({
    start(제어) {
      // 컨트롤러가 이미 닫힌 뒤에도(치우기 와 흘리기 사이 틈에) 흘리기 가 부를 수 있다 — 던지지 않고 치운다
      const 보내기 = (글: string) => {
        try { 제어.enqueue(인코더.encode(글)) } catch { 치우기() }
      }
      const 사건보내기 = (이름: string, 값: unknown) => 보내기(`event: ${이름}\ndata: ${JSON.stringify(값)}\n\n`)

      if (!창) { 사건보내기('end', { 코드: null, 없었음: true }); try { 제어.close() } catch {}; return }
      // 붙기도 전에 이미 끊긴 요청 — abort 신호는 다시 안 온다. 구독 없이 곧장 닫는다
      if (req.signal.aborted) { 치우기(); 제어.close(); return }

      사건보내기('out', 창.되감기)
      심장 = setInterval(() => 보내기(': 살아있음\n\n'), 심장박동)
      듣는이 = (글, 코드) => {
        if (글 === null) { 치우기(); 사건보내기('end', { 코드 }); try { 제어.close() } catch {}; return }
        사건보내기('out', 글)
      }
      창.듣는이들.add(듣는이)
      req.signal.addEventListener('abort', 치우기)
    },
    cancel() { 치우기() },
  })

  return new Response(몸, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
