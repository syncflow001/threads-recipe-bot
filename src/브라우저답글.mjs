// 스레드 웹 화면으로 레시피 답글을 단다 — 미리보기 카드도, 덧붙인 사진도 없이

// 왜 브라우저인가. 링크가 든 답글에 스레드가 미리보기 카드를 붙이는데 공식 API 로는 못 끈다
// (`link_attachment` 를 빈 값으로 줘도 붙는다 — 실측). 지금까지는 링크 조각에 본문 사진을
// 한 장 같이 보내서 카드를 막았다. 사진이 딸린 답글에는 카드가 안 붙기 때문이다.
// 그 대가로 답글마다 본문에서 이미 본 사진이 한 번 더 붙었다. 웹 화면에는 카드를 지우는
// X 가 있어서, 사진도 카드도 없는 답글을 만들 수 있다 (설계서 §9).

import { 쿠키풀기, 쿠키죽음, 글열기 } from './홈수집.mjs'
import { 계정이름으로벽 } from './계정벽.mjs'

// 2026-08-21 에 실제 화면에서 잰 이름표다. 스레드가 화면을 바꾸면 여기부터 다시 잰다.
// 잴 때는 [role=button]·button·svg[aria-label] 을 전부 훑어 aria-label 을 찍어 보면 된다
const 이름표 = {
  확장: '작성 도구 확장',   // 이걸 눌러야 미리보기 카드가 화면에 보인다
  카드지우기: '삭제',        // 카드 오른쪽 위 X
  조각더하기: '스레드에 추가',
  게시: '게시',
  주제칸: '커뮤니티 또는 주제',   // 2026-09-02 — 여기에 「광고」를 넣는다
}

const 링크꼴 = /https?:\/\//

// ⚠️ 스레드 작성창은 엔터를 「게시」로 받는다. keyboard.type 에 줄바꿈이 섞이면 그 자리에서
// 글이 올라간다 — 실제로 당했다 (2026-08-21, 설계서 §9-1). 그래서 키를 하나도 안 누르고
// 붙여넣기 사건만 보낸다. 이러면 빈 줄까지 그대로 살아난다.
async function 붙여넣기(쪽, 글) {
  await 쪽.evaluate((글) => {
    const 담을것 = new DataTransfer()
    담을것.setData('text/plain', 글)
    document.activeElement.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: 담을것, bubbles: true, cancelable: true }),
    )
  }, 글)
}

// 글을 화면에서 찾을 때 쓰는 표. 스레드가 줄바꿈과 공백을 제멋대로 접으므로 다 걷어내고 비교한다
export function 확인표(조각, 길이 = 18) {
  return String(조각 ?? '').replace(/\s+/gu, '').slice(0, 길이)
}

// 올릴 것이 성한지 먼저 본다. 빈 조각을 붙여넣으면 빈 답글이 나간다
export function 조각검사(조각들) {
  if (!Array.isArray(조각들) || !조각들.length) throw new Error('올릴 조각이 없다')
  const 빈것 = 조각들.findIndex((조각) => !String(조각 ?? '').trim())
  if (빈것 >= 0) throw new Error(`${빈것 + 1}번째 조각이 비었다`)
  return 조각들
}

export function 링크있나(조각) {
  return 링크꼴.test(String(조각 ?? ''))
}

// ⚠️ `filter({ has: ... })` 의 안쪽 locator 를 바깥과 다른 뿌리에서 만들지 마라.
// `창.locator(A).filter({ has: 창.locator(B) })` 는 있는 것을 0개로 센다 (실측 2026-08-21).
// 화면에는 카드가 멀쩡히 떠 있는데 코드는 "카드가 안 떴다" 고 했다. 한 문자열 `:has()` 로 쓴다.

// 카드는 붙여넣고 1초쯤 뒤에 붙는다 (실측). 링크가 있는 조각이면 붙을 때까지 기다렸다 지운다 —
// 안 기다리고 게시하면 뒤늦게 붙은 카드가 그대로 나간다.
// 조각이 둘이어도 이 이름표를 단 단추는 하나뿐이다 — 조각을 지우는 X 는 이름이 다르다 (실측)
async function 카드지우기(창, 조각, 카드기다림) {
  const X = 창.locator(`[role="button"]:has(svg[aria-label="${이름표.카드지우기}"])`)
  if (링크있나(조각)) {
    try {
      await X.first().waitFor({ state: 'visible', timeout: 카드기다림 })
    } catch {
      return '안뜸' // 링크가 있는데 카드가 안 떴다. 막을 것이 없으니 그냥 간다
    }
  } else if (!(await X.count())) {
    return '없음'
  }
  await X.first().click()
  return '지웠다'
}

/**
 * 스레드 웹 화면으로 답글을 단다.
 * 주소는 공식 API 의 permalink 여야 한다 — `threads.com/t/{숫자번호}` 는 안 열린다 (실측).
 */
// 답글 작성창의 「커뮤니티 또는 주제」 칸에 말을 넣고 첫 후보를 고른다.
//
// ⚠️ **못 달아도 던지지 않는다.** 태그는 덤이고 글이 올라가는 것이 먼저다.
//    무엇이 어긋났는지는 돌려주는 말로 남긴다 — 조용히 지나가지 않는다
export async function 주제붙이기(창, 쪽, 말) {
  const 칸 = 창.getByRole('textbox', { name: 이름표.주제칸 }).first()
    .or(창.getByPlaceholder(이름표.주제칸).first())
  if (!(await 칸.count())) return '주제 칸을 못 찾았다'
  await 칸.click()
  await 쪽.waitForTimeout(600)
  // 한 글자씩 친다 — 붙여넣기로는 후보 목록이 안 뜬다
  await 쪽.keyboard.type(말, { delay: 90 })
  await 쪽.waitForTimeout(1500)

  // ⚠️ **후보 목록은 창 밖(포털)에 그려진다** (2026-09-03 실측 — 창 안의 `[role=option]` 은 0개고,
  // 「광고·광고대행사·광고촬영…」은 document 아래 딴 자리에 있다). 창 안에서만 찾던 옛 코드는
  // 엉뚱한 것을 집어 30초를 기다리다 죽었다.
  // 눌러 주면 깔끔하지만 **못 눌러도 실패가 아니다** — 스레드는 친 글자 그대로를 주제로 받는다
  const 후보 = 쪽.locator('[role="option"], [role="listbox"] [role="button"]')
    .filter({ hasText: new RegExp(`^${말}$`) }).first()
  await 후보.click({ timeout: 4000 }).catch(() => {})
  await 쪽.waitForTimeout(600)

  // ⚠️ **판정은 「칸에 그 말이 들어갔나」로 한다. 누르기 성공으로 재면 안 된다** —
  // 누르기가 죽은 판에서도 글에는 「광고」가 멀쩡히 붙어 있었다 (2026-09-03 실측).
  // 늘 빨간불인 신호는 신호가 아니다 ([[늘-빨간불인-신호는-신호가-아니다]])
  const 들어간것 = String((await 칸.inputValue().catch(() => '')) || (await 칸.innerText().catch(() => ''))).trim()
  if (들어간것 === 말) return `「${말}」 달았다`
  // ⚠️ **못 달았어도 답글은 나간다 — 다만 엉뚱한 주제를 달고 나가지는 않는다** (2026-09-07, 사용자가 정했다).
  //    「광고」 표시가 없어도 답글 안의 대가성 문구가 있으면 표기는 갖춰진 것이다.
  //    그런데 「광고대행사」처럼 딴 말이 반쯤 들어간 채로 올리면 그 주제로 나간다 — 칸을 비우고 나간다.
  //    비우기가 안 돼도 던지지 않는다. 글이 올라가는 것이 먼저다
  if (들어간것) {
    try { await 칸.fill('') } catch {
      try { await 칸.click(); await 쪽.keyboard.press('Meta+A'); await 쪽.keyboard.press('Backspace') } catch { /* 비우기도 덤이다 */ }
    }
  }
  return `칸에 안 들어갔다 (지금 값 "${들어간것}") — 주제 없이 올린다`
}

export async function 브라우저로답글달기({
  주소,
  조각들,
  쿠키 = process.env.THREADS_COOKIE,
  계정 = '?',
  띄우기 = false,      // 눈으로 보고 싶을 때만 참으로 준다
  찍을곳,              // 주면 단계마다 화면을 찍는다. 무엇이 어긋났는지 뒤에서 볼 수 있다
  카드기다림 = 15000,
  주제달기 = null,     // 「커뮤니티 또는 주제」 칸에 넣을 말. null 이면 안 단다
  chromium,
} = {}) {
  조각검사(조각들)
  if (!주소) throw new Error('답글을 달 글 주소가 없다')
  if (!쿠키?.trim()) throw new 쿠키죽음(계정)

  // ⚠️ **나가기 직전의 벽.** 이 쿠키가 정말 그 계정 것인지 스레드에게 직접 묻는다.
  // 2026-08-26 에 `sample_dinner` 로 누른 답글이 `example.cook` 로 달렸다 (src/계정벽.mjs).
  // 열쇠가 어디서 어떻게 새든 여기서 걸린다
  await 계정이름으로벽(계정, 쿠키, { 알림: (m) => console.error(`  ${m}`) })

  const { chromium: 크로미움 } = chromium ? { chromium } : await import('playwright-core')
  const 브라우저 = await 크로미움.launch({ headless: !띄우기, channel: 'chrome' })
  const 찍기 = async (쪽, 이름) => { if (찍을곳) await 쪽.screenshot({ path: `${찍을곳}/${이름}.png` }).catch(() => {}) }

  try {
    const 판 = await 브라우저.newContext({ viewport: { width: 1280, height: 1200 }, locale: 'ko-KR' })
    await 판.addCookies(쿠키풀기(쿠키))
    const 쪽 = await 판.newPage()
    await 글열기(쪽, 주소)
    await 쪽.waitForTimeout(4000)

    // 쿠키가 죽어도 로그인 화면이 안 뜬다 (실측). '있어야 할 것' 으로 판정한다 —
    // 답글 칸이 보이면 살아 있는 것이다
    const 답글칸 = 쪽.locator('[contenteditable="true"]').first()
    try {
      await 답글칸.waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      throw new 쿠키죽음(계정)
    }

    await 답글칸.click()
    await 쪽.waitForTimeout(1200)
    // 확장을 눌러야 미리보기 카드가 화면에 나온다. 안 누르면 카드가 있는지조차 알 수 없다
    await 쪽.locator(`[role="button"]:has(svg[aria-label="${이름표.확장}"])`).first().click()
    const 창 = 쪽.locator('[role="dialog"]').last()
    await 창.waitFor({ state: 'visible', timeout: 15000 })

    const 카드결과 = []
    for (const [번, 조각] of 조각들.entries()) {
      if (번 > 0) {
        // 조각을 이어 붙이면 한 글타래가 된다. 새 칸에 저절로 focus 가 간다
        await 창.getByText(이름표.조각더하기, { exact: true }).first().click()
        await 쪽.waitForTimeout(1200)
      }
      await 붙여넣기(쪽, 조각)
      await 쪽.waitForTimeout(1500)
      카드결과.push(await 카드지우기(창, 조각, 카드기다림))
    }
    // ⚠️ 2026-09-02 — 답글에 **주제 태그 「광고」**를 단다 (사용자가 정했다).
    //
    // 스레드가 공식으로 주는 광고 표시라 많은 계정이 이걸 쓴다. 다만 **본문의 `[광고]` 는 그대로 둔다** —
    // 브라우저 자동화는 조용히 실패한다. 스레드가 화면을 바꿔 태그가 안 붙어도 아무도 모르는데,
    // 그때 `[광고]` 까지 뺐으면 **광고 표기가 통째로 사라진다.** 되돌릴 수 없는 위험이다.
    // 실측상 답글 안의 광고 표기 위치는 조회수를 안 가르므로(상위 88% 대 하위 79%)
    // 네 글자를 남겨도 손해가 없다 (docs/조사-제휴답글-형식.md §4).
    //
    // **실패해도 던지지 않는다.** 태그는 덤이고 글이 올라가는 것이 먼저다
    const 주제결과 = 주제달기 ? await 주제붙이기(창, 쪽, 주제달기).catch((e) => `못 달았다 — ${e.message.slice(0, 60)}`) : '안 함'
    await 찍기(쪽, '1-올리기직전')

    await 창.getByRole('button', { name: 이름표.게시, exact: true }).click()
    await 쪽.waitForTimeout(6000)
    await 찍기(쪽, '2-올린뒤')

    // ⑧ 단추를 눌렀다고 올라간 것이 아니다. 화면을 다시 읽어 확인한다.
    // 이 저장소는 "초록불인데 실제 경로는 죽어 있는" 사례를 반복해 겪었다.
    // 한 번 더 열어 본 뒤에 실패라고 말한다 — 잠깐 안 그려진 것으로 사람을 부르면 안 된다.
    // 헛경보가 잦으면 아무도 안 읽는다
    // 세 번째는 20초 — 남의 글(댓글이 많은 페이지)은 갓 단 댓글이 늦게 그려진다.
    // 9초로는 실제로 붙은 댓글을 「안 보인다」고 했다 (2026-08-26, 즈보라 실측). 헛경보는 초안을 두 번 올리게 한다
    let 못찾은것 = []
    for (const 번째 of [1, 2, 3]) {
      await 글열기(쪽, 주소)
      await 쪽.waitForTimeout(번째 === 1 ? 5000 : 번째 === 2 ? 9000 : 20000)
      const 글자 = (await 쪽.evaluate(() => document.body.innerText)).replace(/\s+/gu, '')
      못찾은것 = 조각들.map((조각, 번) => ({ 번, 표: 확인표(조각) })).filter(({ 표 }) => !글자.includes(표))
      if (!못찾은것.length) break
    }
    await 찍기(쪽, '3-확인')
    if (못찾은것.length) {
      throw new Error(`답글 ${못찾은것.length}조각이 화면에 안 보인다 (${못찾은것.map((v) => `${v.번 + 1}번째`).join(', ')})`)
    }
    // ⚠️ **주제결과를 반드시 돌려준다** (2026-09-03 실측으로 찾았다).
    // 위에서 재 놓고 여기서 안 돌려줘서 `publish.mjs` 의 `r.주제결과` 가 늘 undefined 였고,
    // run.mjs 의 `if (주제태그 && 주제결과 && …)` 가 통째로 안 걸렸다 —
    // **브라우저로 나가는 모든 발행에서 「광고 표시가 안 붙었습니다」 알림이 죽어 있었다.**
    // 광고 표시는 이 주제 태그 하나뿐이라(본문 [광고] 를 뺐다) 조용히 실패하면
    // 광고 표시 없는 글이 남는다 ([[알림을-붙였으면-실패를-만들어-울려-본다]])
    return { 올린조각수: 조각들.length, 카드결과, 주제결과 }
  } finally {
    await 브라우저.close()
  }
}
