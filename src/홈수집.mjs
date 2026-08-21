// 스레드 홈 화면을 내려가며 글을 걷는다 — 검색이 조여도 영향을 안 받는 수집 경로

// 왜 브라우저가 필요한가. 홈 문서를 그냥 받아 오면 4~5개가 끝이고 다시 불러도 안 늘어난다 (실측).
// 다음 묶음은 스크롤해야 붙는데, 스레드는 **화면에 보이는 탭**에서만 그것을 불러온다.
// 헤드리스 브라우저는 언제나 visible 로 잡혀서 창을 띄우지 않고도 돈다 — 그래서 이 길을 쓴다.
// 맥에 이미 깔린 크롬을 그대로 쓴다 (channel: 'chrome'). 브라우저를 따로 내려받지 않는다.

export class 쿠키죽음 extends Error {
  constructor(계정) {
    super(`[${계정}] 스레드 쿠키가 죽었다 — 홈을 열었는데 로그인 상태가 아니다`)
    this.name = '쿠키죽음'
    this.계정 = 계정
  }
}

// "a=1; b=2" 한 줄을 브라우저가 받는 모양으로 바꾼다
export function 쿠키풀기(한줄, 도메인 = '.threads.com') {
  return String(한줄 ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.includes('='))
    .map((s) => {
      const 자리 = s.indexOf('=')
      return { name: s.slice(0, 자리), value: s.slice(자리 + 1), domain: 도메인, path: '/', secure: true }
    })
}

// 브라우저 안에서 도는 함수다. 바깥 변수를 쓰면 안 된다 —
// 문자열로 넘어가서 페이지 안에서 새로 평가되기 때문이다
async function 페이지에서걷기({ 스크롤수, 기다림 }) {
  const 모음 = new Map()
  const 줍기 = () => {
    for (const 칸 of document.querySelectorAll('[data-pressable-container]')) {
      const 주소 = [...칸.querySelectorAll('a[href*="/post/"]')]
        .map((a) => a.getAttribute('href'))
        .find((h) => /^\/@[^/]+\/post\/[A-Za-z0-9_-]+/.test(h))
      if (!주소) continue
      const m = 주소.match(/^\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/)
      if (!모음.has(m[2])) 모음.set(m[2], m[1])
    }
  }
  줍기()
  let 헛돈횟수 = 0
  for (let i = 0; i < 스크롤수; i += 1) {
    const 전 = 모음.size
    document.documentElement.scrollTop += window.innerHeight * 0.85
    await new Promise((r) => setTimeout(r, 기다림))
    줍기()
    // 더 안 나오면 그만둔다. 끝까지 긁는 것이 목적이 아니다
    헛돈횟수 = 모음.size === 전 ? 헛돈횟수 + 1 : 0
    if (헛돈횟수 >= 8) break
  }
  return [...모음].map(([code, 작성자]) => ({ code, 작성자 }))
}

export async function 홈에서걷기({
  쿠키,
  계정 = '?',
  스크롤수 = 40,
  기다림 = 700,
  띄우기 = false, // 눈으로 보고 싶을 때만 참으로 준다
  chromium,
} = {}) {
  if (!쿠키?.trim()) throw new 쿠키죽음(계정)
  const { chromium: 크로미움 } = chromium ? { chromium } : await import('playwright-core')

  const 브라우저 = await 크로미움.launch({ headless: !띄우기, channel: 'chrome' })
  try {
    const 판 = await 브라우저.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' })
    await 판.addCookies(쿠키풀기(쿠키))
    const 쪽 = await 판.newPage()
    await 쪽.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await 쪽.waitForTimeout(3500)

    // 쿠키가 죽어도 로그인 화면이 안 뜬다. `5xx Server Error` 한 줄만 온다 (실측).
    // 그래서 "없는 것" 을 찾지 않고 "있어야 할 것" 으로 판정한다 —
    // 글쓰기 칸이 보이거나 글이 실제로 그려졌으면 살아 있는 것이다.
    // 한 번 더 열어 보고 나서 죽었다고 말한다. 잠깐 맛이 간 것으로 사람을 부르면 안 된다
    const 살았나 = () => 쪽.evaluate(() => ({
      글수: document.querySelectorAll('[data-pressable-container]').length,
      글쓰기칸: /새로운 소식이 있나요|무슨 생각|What's new/.test(document.body.innerText),
    }))
    let 상태 = await 살았나()
    if (!상태.글쓰기칸 && 상태.글수 === 0) {
      await 쪽.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
      await 쪽.waitForTimeout(4000)
      상태 = await 살았나()
    }
    if (!상태.글쓰기칸 && 상태.글수 === 0) throw new 쿠키죽음(계정)

    return await 쪽.evaluate(페이지에서걷기, { 스크롤수, 기다림 })
  } finally {
    await 브라우저.close()
  }
}
