// 사람이 손대야 할 일을 텔레그램으로 알린다 — 쿠키 만료처럼 두면 계속 멈춰 있는 것만 보낸다

import { readFile, writeFile } from 'node:fs/promises'

export const 기본기록 = 'logs/알림기록.json'
// 같은 일로 계속 울리면 아무도 안 읽는다. 한 종류는 이 시간 안에 한 번만 보낸다
export const 기본잠잠시간 = 6 * 60 * 60 * 1000

async function 기록읽기(파일) {
  try {
    const 것 = JSON.parse(await readFile(파일, 'utf8'))
    return 것 && typeof 것 === 'object' ? 것 : {}
  } catch {
    return {} // 아직 없으면 빈 기록이다
  }
}

// 알림이 실패해도 발행을 멈추지 않는다. 던지지 말고 무슨 일이 있었는지 돌려준다.
// 텔레그램이 죽었다고 글이 안 올라가면 그게 더 나쁘다
export async function 알리기(글, {
  종류 = '일반',
  토큰 = process.env.TELEGRAM_BOT_TOKEN,
  방번호 = process.env.TELEGRAM_CHAT_ID,
  기록파일 = 기본기록,
  잠잠시간 = 기본잠잠시간,
  지금 = Date.now(),
  시도횟수 = 3,
  쉬기 = (ms) => new Promise((r) => setTimeout(r, ms)),
  fetch: 가져오기 = fetch,
} = {}) {
  if (!글?.trim()) return { 보냄: false, 까닭: '내용이 비었다' }
  if (!토큰 || !방번호) return { 보냄: false, 까닭: '텔레그램 열쇠가 없다' }

  const 기록 = await 기록읽기(기록파일)
  // 보낸 적이 없으면 무조건 보낸다. 0 을 기본값으로 두면 첫 알림이 막힌다 — 검사가 잡았다
  const 지난번 = 기록[종류]
  if (지난번 != null && 지금 - 지난번 < 잠잠시간) {
    return { 보냄: false, 까닭: `조금 전에 같은 알림을 보냈다 (${Math.round((지금 - 지난번) / 60000)}분 전)` }
  }

  // 텔레그램으로 가는 길이 자주 끊긴다 — 몇 분 사이에 두 번 겪었다 (ETIMEDOUT).
  // 알림은 놓치면 계정이 조용히 멈춰 있는 것을 아무도 모르게 되므로 몇 번 다시 걸어 본다.
  // 4xx 는 우리 잘못이라(토큰·번호가 틀렸다) 다시 걸어도 같은 답이 온다 — 바로 그만둔다
  let 마지막까닭 = ''
  for (let 번째 = 1; 번째 <= 시도횟수; 번째 += 1) {
    try {
      const res = await 가져오기(`https://api.telegram.org/bot${토큰}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: 방번호, text: 글, disable_web_page_preview: true }),
      })
      if (res.ok) {
        // 보낸 뒤에만 적는다. 실패한 것을 적으면 다음 판이 조용히 건너뛴다
        await writeFile(기록파일, `${JSON.stringify({ ...기록, [종류]: 지금 }, null, 1)}\n`)
        return { 보냄: true, 시도: 번째 }
      }
      마지막까닭 = `텔레그램 ${res.status}: ${(await res.text()).slice(0, 120)}`
      if (res.status >= 400 && res.status < 500) return { 보냄: false, 까닭: 마지막까닭 }
    } catch (e) {
      마지막까닭 = `보내지 못했다: ${e.message}`
    }
    if (번째 < 시도횟수) await 쉬기(1500 * 번째)
  }
  return { 보냄: false, 까닭: `${마지막까닭} (${시도횟수}번 시도)` }
}

// 화면에도 남기고 텔레그램으로도 보낸다. 기록에 안 남으면 나중에 되짚을 수가 없다
export async function 알리고찍기(글, 옵션 = {}) {
  console.error(글)
  const r = await 알리기(글, 옵션)
  if (!r.보냄) console.error(`   (텔레그램 못 보냄 — ${r.까닭})`)
  return r
}
