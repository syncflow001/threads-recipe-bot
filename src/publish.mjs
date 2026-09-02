// 스레드 공식 API 로 글을 올린다 — 본문을 올리고 레시피를 답글로 이어 단다
import './그물.mjs'   // IPv6 헛디딤 막기 (부수 효과) — 왜인지는 그 파일 머리에 있다
import { 브라우저로답글달기 } from './브라우저답글.mjs'

const API = 'https://graph.threads.net/v1.0'

const 부르기 = async (path, 몸통, 토큰) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...몸통, access_token: 토큰 }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`스레드 ${res.status}: ${JSON.stringify(json).slice(0, 200)}`)
  return json
}

// 스레드 발행은 두 걸음이다. 담아 두고(컨테이너) 그다음에 내보낸다.
// 담기만 하면 계정에 아무것도 안 보인다 — 권한 시험에 쓸 수 있다.
export async function 담기(사용자, 내용, 토큰 = process.env.THREADS_ACCESS_TOKEN) {
  if (!토큰) throw new Error('THREADS_ACCESS_TOKEN 이 없다')
  const { id } = await 부르기(`/${사용자}/threads`, 내용, 토큰)
  if (!id) throw new Error('컨테이너 번호를 못 받았다')
  return id
}

// 스레드는 미디어를 자기가 받아 와서 처리한다. 영상은 그게 몇 초 걸린다.
// 다 되기 전에 묶거나 내보내면 400 "슬라이드 하위 요소 오류" 가 난다.
export async function 익기기다리기(컨테이너, { 토큰 = process.env.THREADS_ACCESS_TOKEN, 최대초 = 90 } = {}) {
  for (let 지난 = 0; 지난 < 최대초; 지난 += 3) {
    const r = await fetch(`${API}/${컨테이너}?fields=status,error_message&access_token=${토큰}`)
    const j = await r.json().catch(() => ({}))
    if (j.status === 'FINISHED') return true
    if (j.status === 'ERROR' || j.status === 'EXPIRED') {
      throw new Error(`미디어 처리 실패(${j.status}): ${j.error_message ?? ''}`)
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error(`미디어가 ${최대초}초 안에 준비되지 않았다`)
}

export async function 내보내기(사용자, 컨테이너, 토큰 = process.env.THREADS_ACCESS_TOKEN) {
  const { id } = await 부르기(`/${사용자}/threads_publish`, { creation_id: 컨테이너 }, 토큰)
  if (!id) throw new Error('게시물 번호를 못 받았다')
  return id
}


// 답글을 달려면 threads_manage_replies 가 있어야 한다. 없으면 본문만 올라가고
// 레시피 답글이 500 으로 죽어 반쪽짜리 글이 남는다. 올리기 전에 미리 본다 —
// 본문이 나간 뒤에 알면 이미 늦다
export const 필요권한 = ['threads_basic', 'threads_content_publish', 'threads_manage_replies']
export async function 빠진권한(토큰 = process.env.THREADS_ACCESS_TOKEN, 가져오기 = fetch) {
  const 받은것 = await 가져오기(`https://graph.threads.net/debug_token?input_token=${토큰}&access_token=${토큰}`)
    .then((r) => r.json()).then((j) => j?.data?.scopes ?? []).catch(() => [])
  // 못 물어봤으면 막지 않는다. 그물이 잠깐 끊겼다고 발행을 멈출 이유는 없다
  return 받은것.length ? 필요권한.filter((p) => !받은것.includes(p)) : []
}

// 열쇠 파일의 계정 번호가 실제와 다르면 **모든 발행이 죽는다.**
// 실제로 겪었다 — 끝자리 하나가 다른 번호(…172 vs …171)가 들어 있어 하루 낮부터
// `Object with ID … does not exist` 로 판마다 빈손이었다 (2026-08-24).
// 사람이 손으로 넣을 수 있는 값이니 발행 전에 스레드에게 직접 물어 본다. 한 판에 한 번만 묻는다
// ⚠️ **캐시는 토큰마다 따로다.** 전에는 모듈에 하나뿐이라, 한 프로세스에서 두 계정을
// 다루면 **먼저 물어본 계정 번호가 뒤 계정에도 쓰였다** — 남의 계정으로 글이 올라간다.
// 지금은 계정마다 프로세스가 따로라 안 터졌을 뿐이다 (2026-08-30 실측)
const 내번호캐시 = new Map()

// 토큰이 가리키는 계정 번호와 아이디를 한 번에 묻는다. 요청 하나로 둘 다 얻는다
async function 토큰주인(토큰, 가져오기 = fetch) {
  try {
    const j = await 가져오기(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${토큰}`)
      .then((r) => r.json())
    return { 번호: j?.id ? String(j.id) : null, 아이디: j?.username ?? null }
  } catch { return { 번호: null, 아이디: null } } // 못 물어봤으면 넣어 둔 값을 그대로 쓴다
}

export async function 내계정번호(토큰 = process.env.THREADS_ACCESS_TOKEN, 가져오기 = fetch) {
  if (내번호캐시.has(토큰)) return 내번호캐시.get(토큰)
  const { 번호 } = await 토큰주인(토큰, 가져오기)
  if (번호) 내번호캐시.set(토큰, 번호)
  return 번호
}

// ⚠️ **나가기 직전의 벽 — 토큰 쪽이다.** 쿠키에는 벽이 있었는데(src/계정벽.mjs) 토큰에는 없었다.
// 열쇠 파일에 남의 토큰이 들어가면 스레드 API 가 **그 계정으로 글을 올린다** —
// 하트나 댓글과 달리 되돌리기가 가장 어려운 침범이다.
//
// 쿠키 벽과 같은 규칙을 쓴다 — **주인을 못 읽었을 때는 막지 않는다.** 그물이 잠깐 끊겼다고
// 발행을 통째로 세우면 사고를 막는 게 아니라 프로그램을 죽이는 것이다.
// 돌려주는 값은 실제 계정 번호다. 열쇠 파일 번호가 틀려도 이 값으로 올리기 위해서다
export async function 토큰벽(계정, 토큰 = process.env.THREADS_ACCESS_TOKEN, {
  가져오기 = fetch, 알림 = () => {},
} = {}) {
  const { 번호, 아이디 } = await 토큰주인(토큰, 가져오기)
  if (번호) 내번호캐시.set(토큰, 번호)
  if (!아이디) { 알림('⚠️ 토큰 주인을 확인하지 못했다 — 그대로 올린다'); return 번호 }

  const { 정보, 보일아이디 } = await import('./계정.mjs')
  const 기대 = 보일아이디(계정, await 정보(계정).catch(() => null))
  if (!기대) { 알림('⚠️ 이 계정의 스레드 아이디를 몰라 확인을 건너뛴다'); return 번호 }
  if (아이디 !== 기대) {
    const { 딴계정 } = await import('./계정벽.mjs')
    throw new 딴계정(기대, 아이디)
  }
  return 번호
}

// 메타는 자기 CDN 의 영상 주소를 발행 재료로 받지 않는다 (실측 — 같은 파일도 메타 밖
// 주소로 주면 통과한다). 이미지는 받는다. 그래서 영상은 미리 걸러 낸다.
// 영상을 올리려면 우리가 어딘가에 올려 공개 주소를 만들어야 한다 — 부품이 하나 늘어난다.
const 메타CDN = /cdninstagram\.com|fbcdn\.net/
export function 올릴수있는것(미디어 = []) {
  const 쓸것 = 미디어.filter((m) => m.종류 !== '영상' || !메타CDN.test(m.url))
  return { 쓸것, 버린영상: 미디어.length - 쓸것.length }
}

// 스레드는 파일 업로드를 안 받는다. 인터넷에서 열리는 주소를 주면 저쪽이 가서 받아온다.
// 그래서 내려받은 파일이 아니라 원본 주소를 그대로 넘긴다.
function 미디어몸통(미디어, 글) {
  if (!미디어?.length) return { media_type: 'TEXT', text: 글 }
  if (미디어.length === 1) {
    const m = 미디어[0]
    return m.종류 === '영상'
      ? { media_type: 'VIDEO', video_url: m.url, text: 글 }
      : { media_type: 'IMAGE', image_url: m.url, text: 글 }
  }
  return null // 여러 장은 CAROUSEL 이라 따로 담아야 한다
}

// 여러 장은 한 장씩 먼저 담아 두고 그 번호들을 묶는다.
async function 여러장담기(사용자, 미디어, 글, 토큰) {
  const 자식 = []
  for (const m of 미디어.slice(0, 20)) {
    자식.push(await 담기(사용자, {
      media_type: m.종류 === '영상' ? 'VIDEO' : 'IMAGE',
      ...(m.종류 === '영상' ? { video_url: m.url } : { image_url: m.url }),
      is_carousel_item: true,
    }, 토큰))
  }
  // 한 장이라도 덜 익은 채로 묶으면 통째로 거부당한다
  for (const c of 자식) await 익기기다리기(c, { 토큰 })
  return 담기(사용자, { media_type: 'CAROUSEL', children: 자식, text: 글 }, 토큰)
}

// 본문 → 레시피 답글. 사장님 계정이 하는 방식 그대로다.
// 본문이 올라간 뒤 답글이 실패하면 본문만 남는다 — 그 사실을 숨기지 않고 알린다.
export async function 글올리기(
  { 본문, 레시피, 미디어 = [] },
  { 사용자 = process.env.THREADS_USER_ID, 토큰, 답글통로 = 'api', 쿠키, 계정, 주제태그 = null } = {},
) {
  if (!사용자) throw new Error('THREADS_USER_ID 가 없다')
  const { 쓸것: 미디어쓸것, 버린영상 } = 올릴수있는것(미디어)
  const 몸통 = 미디어몸통(미디어쓸것, 본문)
  const 컨테이너 = 몸통 ? await 담기(사용자, 몸통, 토큰) : await 여러장담기(사용자, 미디어쓸것, 본문, 토큰)
  if (미디어쓸것.length) await 익기기다리기(컨테이너, { 토큰 })
  const 본문번호 = await 내보내기(사용자, 컨테이너, 토큰)

  const 조각들 = 나누기(레시피)
  if (!조각들.length) return { 본문번호, 답글번호들: [], 버린영상 }

  // 웹 화면으로 다는 길. 미리보기 카드를 X 로 지우므로 사진을 억지로 붙일 필요가 없다 (설계서 §9).
  // 여기서 던지지 않는다 — 본문은 이미 올라갔다. 던지면 부르는 쪽이 발행 기록을 못 남기고
  // 다음 판에 같은 글이 또 올라간다. 실패는 답글오류로 알린다
  if (답글통로 === '브라우저') {
    try {
      const 주소 = await 글주소받기(본문번호, 토큰)
      // ⚠️ 주제 태그는 **링크가 든 답글에만** 단다. 광고가 아닌 글에 광고 표시를 붙이지 않는다
      const 광고인가 = 조각들.some((조각) => 링크꼴.test(조각))
      const r = await 브라우저로답글달기({ 주소, 조각들, 쿠키, 계정, 주제달기: 광고인가 ? 주제태그 : null })
      return { 본문번호, 답글번호들: [], 버린영상, 통로: '브라우저', 조각수: r.올린조각수, 카드결과: r.카드결과, 주제결과: r.주제결과 }
    } catch (e) {
      return { 본문번호, 답글번호들: [], 버린영상, 통로: '브라우저', 답글오류: e.message }
    }
  }

  // 글만 있는 답글에 주소가 들어가면 스레드가 제멋대로 미리보기 카드를 붙인다.
  // 끄는 설정은 없다 (실측 — link_attachment 를 빈 값으로 줘도 그대로 붙는다).
  // 사진이 하나라도 딸린 답글에는 안 붙으므로, 링크가 든 조각에 사진을 함께 보낸다.
  // 사진이 먼저다. 없으면 영상이라도 붙인다 — 카드만 안 뜨면 되니까
  const 붙일것 = 미디어쓸것.find((m) => m.종류 !== '영상') ?? 미디어쓸것[0]
  const 링크든조각 = (조각) => 링크꼴.test(조각)
  const 미리보기붙음 = !붙일것 && 조각들.some(링크든조각)

  // 앞 조각에 이어 달아야 하나의 글타래가 된다
  const 답글번호들 = []
  let 앞 = 본문번호
  try {
    for (const 조각 of 조각들) {
      앞 = await 답글달기(사용자, 조각, 앞, 토큰, { 매체: 링크든조각(조각) ? 붙일것 : undefined })
      답글번호들.push(앞)
    }
    // ⚠️ 2026-09-02 — **API 통로는 주제 태그를 못 단다.** 스레드 API 에 그 칸이 없다.
    //    광고 표시가 주제 태그 하나뿐이라, 링크가 든 답글이 API 로 나가면
    //    **광고 표시가 없는 글**이 된다. 부르는 쪽이 알림을 띄울 수 있게 그 사실을 돌려준다
    const 주제결과 = 주제태그 && 조각들.some((조각) => 링크꼴.test(조각))
      ? 'API 통로라 주제를 못 단다 (REPLY_VIA=api)' : '안 함'
    return { 본문번호, 답글번호들, 버린영상, 미리보기붙음, 주제결과 }
  } catch (e) {
    // 본문은 이미 올라갔다. 몇 조각까지 붙었는지 숨기지 않는다
    return { 본문번호, 답글번호들, 버린영상, 미리보기붙음, 답글오류: e.message, 주제결과: '안 함' }
  }
}

// 주소가 든 조각을 찾는다. 쿠팡이든 토스든 붙는 주소는 다 미리보기를 부른다
const 링크꼴 = /https?:\/\//

// 웹 화면으로 답글을 달려면 진짜 글 주소가 필요하다.
// `threads.com/t/{숫자 글번호}` 는 「페이지가 없습니다」로 뜬다 (실측 2026-08-21).
// 공식 API 가 permalink 를 준다 — 이 값은 대시보드의 「글 보기」 링크에도 쓴다
export async function 글주소받기(본문번호, 토큰 = process.env.THREADS_ACCESS_TOKEN, 가져오기 = fetch) {
  const j = await 가져오기(`${API}/${본문번호}?fields=permalink&access_token=${토큰}`)
    .then((r) => r.json()).catch(() => ({}))
  if (!j?.permalink) throw new Error(`글 주소를 못 받았다: ${JSON.stringify(j).slice(0, 150)}`)
  return j.permalink
}

// 막 올린 글에 바로 답글을 달면 "미디어를 찾을 수 없음"(4279009) 이 난다.
// 스레드가 그 글을 답글 받을 수 있는 상태로 만드는 데 몇 초 걸린다 — 특히 캐러셀·영상이 그렇다.
async function 답글달기(사용자, 글, 앞번호, 토큰, { 매체, 최대시도 = 6 } = {}) {
  const 몸통 = !매체
    ? { media_type: 'TEXT', text: 글, reply_to_id: 앞번호 }
    : 매체.종류 === '영상'
      ? { media_type: 'VIDEO', video_url: 매체.url, text: 글, reply_to_id: 앞번호 }
      : { media_type: 'IMAGE', image_url: 매체.url, text: 글, reply_to_id: 앞번호 }
  let 마지막
  for (let 번 = 0; 번 < 최대시도; 번++) {
    try {
      // 미디어가 붙으면 스레드가 받아 오는 데 시간이 걸린다. 익기 전에 내보내면 거부당한다
      const 컨테이너 = await 담기(사용자, 몸통, 토큰)
      if (매체) await 익기기다리기(컨테이너, { 토큰 })
      return await 내보내기(사용자, 컨테이너, 토큰)
    } catch (e) {
      마지막 = e
      if (!/4279009|does not exist/.test(e.message)) throw e // 다른 오류는 기다려도 안 낫는다
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
  throw 마지막
}

// 스레드 글은 500자까지다. 레시피는 그보다 길기 쉬우니 이어지는 답글로 나눈다.
// 재료 목록 한가운데를 자르면 못 읽으니 빈 줄 → 줄바꿈 순으로 자연스러운 자리를 찾는다.
// 스레드 한도는 500자다. 자바스크립트가 재는 길이는 이모지를 여러 자로 세니 늘 실제보다 크다 —
// 그래서 490 이어도 스레드 쪽 셈은 그보다 적다. 450 은 너무 빡빡해 재료 목록이 엉뚱한 데서 갈렸다.
export const 글자한도 = 490

// 준비물과 만드는 법은 서로 다른 답글로 올린다. 읽는 사람이 재료를 보며 따라 하기 쉽고,
// 한 조각이 길어져 엉뚱한 자리에서 잘리는 것도 막는다.
const 절머리 = /^\s*(?:[🛒🧾🥣👩🧑🍳📝✨]|재료|준비물|만드는|만들기|조리|레시피)/u
const 최소조각 = 80 // 이보다 짧으면 앞 조각에 붙인다. 제목만 있는 답글을 만들지 않는다

export function 나누기(글, 한도 = 글자한도) {
  const 남은 = String(글 ?? '').trim()
  if (!남은) return []

  // ⚠️ 2026-09-02 — **절 단위로 강제로 끊지 않는다.** 한도 안에 들어가면 한 조각으로 보낸다.
  //
  // 옛 코드는 「준비물과 만드는 법은 따로 올라가야 한다」며 길이가 남아도 끊었다.
  // 답글에 링크를 단 레시피 글 146편을 걷어 보니 정반대였다 —
  // **86%가 답글 하나로 끝내고, 나누면 조회수 0.62배**(540 대 827회)다.
  // 나눈 19편은 답글 합이 475자라 한 답글에 들어가는데도 나눴고, 그것이 손해였다.
  // (docs/조사-제휴답글-형식.md)
  const 조각 = []
  let 담을것 = ''
  const 밀어넣기 = () => { if (담을것.trim()) 조각.push(담을것.trim()); 담을것 = '' }

  for (const 문단 of 남은.split(/\n\s*\n/)) {
    const 붙였을때 = 담을것 ? `${담을것}\n\n${문단}` : 문단
    if (붙였을때.length <= 한도) { 담을것 = 붙였을때; continue }
    // 제목 한 줄만 담긴 채로 끊으면 "🥗 샐러드 드레싱 4종" 만 있는 답글이 나간다 — 실제로 그랬다.
    // 그럴 땐 내보내지 말고 다음 문단과 줄 단위로 섞어 채운다
    const 짧다 = 담을것.length < 최소조각
    if (!짧다) {
      밀어넣기()
      if (문단.length <= 한도) { 담을것 = 문단; continue }
    }
    // 문단 하나가 한도를 넘으면 줄 단위로 더 쪼갠다.
    // 앞머리를 이어 붙일 때는 첫 줄만 빈 줄로 띄운다 — 절 제목과 목록이 붙어 버리면 못 읽는다
    let 첫줄 = 짧다 && Boolean(담을것)
    for (const 줄 of 문단.split('\n')) {
      const 다시 = 담을것 ? `${담을것}${첫줄 ? '\n\n' : '\n'}${줄}` : 줄
      첫줄 = false
      if (다시.length <= 한도) 담을것 = 다시
      else { 밀어넣기(); 담을것 = 줄.slice(0, 한도) }
    }
  }
  밀어넣기()
  return 조각
}

export const 글주소 = (사용자이름, 번호) => `https://www.threads.com/@${사용자이름}/post/${번호}`
