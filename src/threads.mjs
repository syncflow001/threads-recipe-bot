// 스레드에서 게시물을 긁어오는 수집기 — 통신을 가로채지 않고 문서 요청만 쓴다

// 스레드는 요청이 "브라우저의 페이지 이동" 처럼 보일 때만 데이터를 실어 보낸다.
// 이 헤더가 없으면 껍데기만 오고 게시물이 통째로 빠진다. 실측으로 확인했다 (설계서 §2-1).
const 문서헤더 = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
  'Accept-Language': 'ko-KR,ko;q=0.9',
}

const BASE = 'https://www.threads.com'

export async function 문서받기(url, { cookie } = {}) {
  const res = await fetch(url, {
    credentials: 'include', // 확장에서는 이것만으로 쿠키가 붙는다
    headers: cookie ? { ...문서헤더, cookie } : 문서헤더,
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

// 게시물 데이터는 인라인 <script type="application/json"> 안에 들어 있다.
export function 게시물뽑기(html) {
  const 결과 = new Map()

  const 훑기 = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 30) return
    if (Array.isArray(node)) return node.forEach((v) => 훑기(v, depth + 1))

    // 이 넷을 다 가진 객체가 게시물이다. 하나라도 없으면 부분 갱신 응답 같은 껍데기다.
    if (node.code && node.user?.username && typeof node.like_count === 'number' && node.caption) {
      const tp = node.text_post_app_info ?? {}
      if (!결과.has(node.code)) {
        결과.set(node.code, {
          code: node.code,
          작성자: node.user.username,
          본문: node.caption.text ?? '',
          좋아요: node.like_count,
          공유: tp.reshare_count ?? 0,
          리포스트: tp.repost_count ?? 0,
          댓글: tp.direct_reply_count ?? 0,
          올린때: node.taken_at ?? null,
          미디어: 미디어뽑기(node),
          자막: node.transcription_data?.auto_generated_translation ?? null,
          이미지글자: node.seo_ocr_for_related_post ?? null,
          조회수: null, // 검색 응답에는 없다. 상세를 따로 불러야 채워진다
        })
      }
    }
    Object.values(node).forEach((v) => 훑기(v, depth + 1))
  }

  for (const [, body] of html.matchAll(/<script type="application\/json"[^>]*>(.*?)<\/script>/gs)) {
    try {
      훑기(JSON.parse(body.replace(/\\u003C/g, '<')))
    } catch {
      // JSON 이 아닌 블록은 그냥 넘어간다
    }
  }
  return [...결과.values()]
}

// 첫 후보만 쓴다. candidates[0] 이 가장 큰 해상도다.
function 미디어뽑기(node) {
  const 목록 = []
  const 한장 = (m) => {
    if (m.video_versions?.[0]?.url) 목록.push({ 종류: '영상', url: m.video_versions[0].url })
    else if (m.image_versions2?.candidates?.[0]?.url) 목록.push({ 종류: '이미지', url: m.image_versions2.candidates[0].url })
  }
  if (node.carousel_media?.length) node.carousel_media.forEach(한장)
  else 한장(node)
  return 목록
}

export async function 검색(키워드, opts) {
  const url = `${BASE}/search?q=${encodeURIComponent(키워드)}&serp_type=default`
  return 게시물뽑기(await 문서받기(url, opts))
}

// 상세 문서 한 번에 두 가지를 건진다.
//  - 조회수. 검색 응답에 없고 여기에만 있다. 로그인 쿠키가 없으면 null 이다
//  - 글타래. 레시피는 본문이 아니라 작성자가 자기 글에 단 답글에 있다.
//    본문만 긁으면 재료도 순서도 없는 낚시글만 손에 남는다
export async function 상세(작성자, code, opts) {
  const html = await 문서받기(`${BASE}/@${작성자}/post/${code}`, opts)
  const 조회수 = Number(html.match(/"impression_count"\s*:\s*(\d+)/)?.[1] ?? NaN)

  const 다 = 게시물뽑기(html)
  // 홈에서 걷은 글은 번호와 작성자뿐이다. 본문·좋아요·미디어를 여기서 건져 준다
  const 본글 = 다.find((p) => p.code === code) ?? null
  const 전부 = 다.filter((p) => p.code !== code && p.본문.trim())
  const 내것 = 전부.filter((p) => p.작성자 === 작성자).sort((a, b) => (a.올린때 ?? 0) - (b.올린때 ?? 0))

  // 작성자는 레시피를 이어 단 뒤, 나중에 댓글마다 답장도 단다. 그 답장까지 재료로 넘기면
  // "고마워 맛있게 해먹어" 같은 잡담이 레시피에 섞인다. self_thread_info 는 항상 null 이라
  // 쓸 수 없어서, 시간으로 가른다 — 남이 처음 댓글을 달기 전에 올라온 것만 글타래로 본다.
  const 남의첫댓글 = Math.min(
    ...전부.filter((p) => p.작성자 !== 작성자).map((p) => p.올린때 ?? Infinity),
    Infinity,
  )
  const 글타래 = 내것.filter((p) => (p.올린때 ?? 0) <= 남의첫댓글)

  return { 조회수: Number.isFinite(조회수) ? 조회수 : null, 글타래, 본글 }
}

// 상세 요청은 900KB 라 무겁다. 한꺼번에 다 부르지 않고 묶음으로 나눠 부른다.
// 확산(조회수÷팔로워)의 분모다. 프로필 문서에만 있다 — 상세 문서에는 없다 (실측)
export async function 팔로워수(작성자, opts) {
  try {
    const html = await 문서받기(`${BASE}/@${작성자}`, opts)
    const n = Number(html.match(/"follower_count"\s*:\s*(\d+)/)?.[1] ?? NaN)
    return Number.isFinite(n) ? n : null
  } catch {
    return null // 못 받으면 확산을 안 매긴다. 지어내지 않는다
  }
}

export async function 상세채우기(목록, { 묶음 = 6, ...opts } = {}) {
  for (let i = 0; i < 목록.length; i += 묶음) {
    await Promise.all(
      목록.slice(i, i + 묶음).map(async (p) => {
        try {
          const d = await 상세(p.작성자, p.code, opts)
          p.조회수 = d.조회수
          p.글타래 = d.글타래.map((x) => x.본문)
          // 비어 있는 자리만 메운다. 이미 아는 값을 덮어쓰면 검색으로 받은 것이 지워진다
          if (d.본글) for (const [칸, 값] of Object.entries(d.본글)) if (p[칸] === undefined) p[칸] = 값
        } catch {
          p.조회수 = null // 틀린 숫자를 보여주느니 비운다
          p.글타래 = []
        }
      }),
    )
  }
  return 목록
}
