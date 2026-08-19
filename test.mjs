// 수집기와 등급 판정이 실제로 도는지 확인한다 — node test.mjs
import assert from 'node:assert/strict'
import { 게시물뽑기 } from './src/threads.mjs'
import { 등급, 줄세우기, 설정 } from './src/score.mjs'

// 스레드가 실제로 내려주는 모양을 줄여 만든 표본이다.
// 게시물은 인라인 script 안에 깊이 묻혀 있고, 껍데기 객체가 섞여 온다.
const 게시물 = {
  code: 'ABC12345', user: { username: '홍길동' },
  like_count: 100, caption: { text: '된장찌개 레시피' }, taken_at: 1787000000,
  text_post_app_info: { reshare_count: 7, repost_count: 3, direct_reply_count: 2 },
  carousel_media: [
    { image_versions2: { candidates: [{ url: 'https://cdn/a.jpg' }, { url: 'https://cdn/a-small.jpg' }] } },
    { video_versions: [{ url: 'https://cdn/b.mp4' }] },
  ],
}
const HTML = `<html><body>
<script type="application/json">{"require":[["X","handle",null,[{"__bbox":{"result":{"data":{"edges":[{"node":{"thread_items":[{"post":${JSON.stringify(게시물)}}]}}]}}}}]]]}</script>
<script type="application/json">{"data":{"media":{"id":"1","like_count":9}}}</script>
<script type="application/json">이건 JSON 이 아니다</script>
</body></html>`

// --- 뽑기 ---
const 목록 = 게시물뽑기(HTML)
assert.equal(목록.length, 1, '껍데기 객체(like_count 만 있는 것)를 게시물로 세면 안 된다')
const p = 목록[0]
assert.equal(p.code, 'ABC12345')
assert.equal(p.본문, '된장찌개 레시피')
assert.equal(p.좋아요, 100)
assert.equal(p.공유, 7)
assert.equal(p.댓글, 2)
assert.equal(p.조회수, null, '검색 응답에는 조회수가 없다')
assert.deepEqual(p.미디어, [
  { 종류: '이미지', url: 'https://cdn/a.jpg' },
  { 종류: '영상', url: 'https://cdn/b.mp4' },
], '캐러셀은 장마다, 이미지는 첫 후보(최대 해상도)를 쓴다')

assert.equal(게시물뽑기('<html></html>').length, 0, '빈 문서는 빈 목록이다')

// --- 등급 ---
assert.equal(등급({ 조회수: null, 좋아요: 10 }), null, '조회수를 모르면 등급을 지어내지 않는다')
assert.equal(등급({ 조회수: 0, 좋아요: 10 }), null, '0 으로 나누지 않는다')
assert.equal(등급({ 조회수: 4999, 좋아요: 4999 }).등급, '미달', '문턱 아래는 비율이 100% 라도 미달이다')
assert.equal(등급({ 조회수: 10000, 좋아요: 200 }).등급, '플래티넘') // 2.0%
assert.equal(등급({ 조회수: 10000, 좋아요: 120 }).등급, '골드')     // 1.2%
assert.equal(등급({ 조회수: 10000, 좋아요: 60 }).등급, '실버')      // 0.6%
assert.equal(등급({ 조회수: 10000, 좋아요: 59 }).등급, '브론즈')     // 0.59%

// 실측 표본으로 되짚기 — 이 두 개가 뒤집히면 기준이 망가진 것이다
assert.equal(등급({ 조회수: 66424, 좋아요: 3745 }).등급, '플래티넘', '조회 6.6만·좋아요 3745 는 최상위였다')
assert.equal(등급({ 조회수: 258628, 좋아요: 577 }).등급, '브론즈', '조회 25.8만이어도 반응이 없으면 브론즈다')

// --- 줄세우기 ---
const 정렬 = 줄세우기([
  { 조회수: 258628, 좋아요: 577 },
  { 조회수: 66424, 좋아요: 3745 },
  { 조회수: 100, 좋아요: 100 },
  { 조회수: null, 좋아요: 5 },
  { 조회수: 10000, 좋아요: 130 },
])
assert.deepEqual(정렬.map((x) => x.등급), ['플래티넘', '골드', '브론즈', '미달', '알수없음'],
  '문턱 미달과 조회수 모름은 등급 뒤로 밀린다')

console.log('통과 — 검사 %d개', 18)

// --- 미디어 내려받기·중복 방지 ---
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 내려받기, 썼다표시, 이미썼나, 안쓴것만 } from './src/media.mjs'

const 뿌리 = await mkdtemp(join(tmpdir(), 'media-'))
const 가짜fetch = (url) =>
  url.includes('깨진')
    ? Promise.resolve({ ok: false, status: 404 })
    : Promise.resolve({ ok: true, arrayBuffer: async () => new TextEncoder().encode('내용:' + url).buffer })

const 글 = {
  code: 'POST1', 작성자: '홍길동', 본문: '된장찌개',
  미디어: [{ 종류: '이미지', url: 'https://cdn/a.jpg' }, { 종류: '영상', url: 'https://cdn/b.mp4' }],
}

const r1 = await 내려받기(글, { 뿌리, fetch: 가짜fetch })
assert.deepEqual(r1.파일, ['01.jpg', '02.mp4'], '순서대로 번호를 붙이고 종류에 맞는 확장자를 쓴다')

// 스레드 이미지는 실제로 WebP 로 온다. 이름을 .jpg 로 붙이면 발행이 거부될 수 있다
const rw = await 내려받기({ code: 'WEBP1', 미디어: [
  { 종류: '이미지', url: 'https://cdn/x/a.webp' },
  { 종류: '이미지', url: 'https://cdn/y/b.jpg?stp=dst-jpg&oh=00' },
  { 종류: '영상', url: 'https://cdn/z/c' },
] }, { 뿌리, fetch: 가짜fetch })
assert.deepEqual(rw.파일, ['01.webp', '02.jpg', '03.mp4'],
  '주소에 적힌 실제 확장자를 쓰고, 못 읽으면 종류로 넘겨짚는다')
assert.deepEqual(r1.실패, [])
assert.deepEqual((await readdir(r1.폴더)).sort(), ['01.jpg', '02.mp4', 'post.json'],
  '본문을 post.json 으로 같이 남긴다')
assert.equal(JSON.parse(await readFile(join(r1.폴더, 'post.json'), 'utf8')).본문, '된장찌개')

// 실패는 삼키지 않는다
const r2 = await 내려받기({ code: 'POST2', 미디어: [{ 종류: '이미지', url: 'https://cdn/깨진.jpg' }] },
  { 뿌리, fetch: 가짜fetch })
assert.deepEqual(r2.파일, [])
assert.equal(r2.실패.length, 1, '못 받은 것은 실패 목록에 남겨 사람이 알게 한다')
assert.match(r2.실패[0].이유, /404/)

// 쓰기 전에는 안 쓴 것이다
assert.equal(await 이미썼나('POST1', 뿌리), false)
assert.deepEqual((await 안쓴것만([글, { code: 'POST2' }], 뿌리)).map((p) => p.code), ['POST1', 'POST2'])

// 쓴 뒤에는 걸러지고 다시 내려받지 않는다
await 썼다표시('POST1', 뿌리)
assert.equal(await 이미썼나('POST1', 뿌리), true)
assert.deepEqual((await 안쓴것만([글, { code: 'POST2' }], 뿌리)).map((p) => p.code), ['POST2'],
  '쓴 게시물은 후보에서 빠진다')
const r3 = await 내려받기(글, { 뿌리, fetch: 가짜fetch })
assert.equal(r3.건너뜀, '이미 쓴 것', '두 번째 내려받기는 건너뛴다')
assert.equal(await 썼다표시('POST1', 뿌리), await 썼다표시('POST1', 뿌리), '두 번 불러도 탈나지 않는다')

await rm(뿌리, { recursive: true, force: true })
console.log('통과 — 미디어 검사 12개')

// --- 재구성 ---
import { 프롬프트만들기, 재구성, 링크넣기, 재료모으기 } from './src/compose.mjs'
import { 나누기 } from './src/publish.mjs'

const 페르소나 = {
  정체성: '30대 유부녀 일상 계정',
  '자주 쓰는 표현': ['ㅋㅋ', 'ㅠㅠ'],
  '표현 사용 규칙': '소량만',
  '글 구조': ['계기', '해본 경험'],
  '레시피 규칙': '재료와 용량은 원문 그대로 둔다',
  '레시피 형식': '첫 줄은 이모지와 요리이름',
  '본문 이모지': '맨 끝에 하나만',
  말투: '친구한테 말하듯 반말',
  '지켜야 할 것': ['첫 줄에서 궁금하게'],
  '쓰지 말 것': ['존댓말'],
  '본문 길이': '3줄',
  맺음말: '저장해둬',
  '내 글 예시': ['여기에 내가 실제로 쓴 글을 붙여넣는다', '두 번째 예시.', '진짜 내 글이다. 이건 스무 자가 넘으니 프롬프트에 들어가야 한다.'],
}
const 원글 = { code: 'P1', 본문: '된장찌개 끓이는 법', 자막: '물 500ml', 이미지글자: '두부 반 모' }

const { system, user } = 프롬프트만들기(원글, 페르소나)
assert.match(user, /된장찌개 끓이는 법/)
assert.match(user, /물 500ml/, '자막도 재료로 넘긴다')
assert.match(user, /두부 반 모/, '이미지 속 글자도 넘긴다')
assert.match(system, /친구한테 말하듯 반말/)
assert.match(system, /저장해둬/)
assert.match(system, /진짜 내 글이다/, '실제 예시는 프롬프트에 들어간다')
assert.doesNotMatch(system, /두 번째 예시\./, '짧은 자리표시는 예시로 새지 않는다')
assert.doesNotMatch(system, /여기에 내가 실제로 쓴 글을/, '안 채운 예시 자리는 프롬프트에 넣지 않는다')
assert.match(system, /30대 유부녀 일상 계정/, '정체성이 프롬프트에 들어간다')
assert.match(system, /ㅋㅋ ㅠㅠ — 소량만/, '자주 쓰는 표현과 사용 규칙을 함께 넘긴다')
assert.match(system, /\[글 흐름\]/)
assert.match(system, /재료와 용량은 원문 그대로 둔다/, '레시피 보존 규칙이 프롬프트에 들어간다')
assert.match(system, /재료마다 양을 빠짐없이 적는다/, '분량을 반드시 적게 한다')
assert.match(system, /지어내지 않는다/, '없는 분량을 만들어내지는 않게 한다')
assert.match(system, /준비물과 만드는 법 사이에 빈 줄/, '문단을 나누게 해야 따로 올라간다')
assert.match(system, /\[레시피 형식\]/, '레시피 생김새도 넘긴다 — 예시 하나로는 형식이 흔들린다')
assert.match(system, /\[본문 이모지\] 맨 끝에 하나만/)

// 안 적은 항목은 빈 줄로 새지 않는다
const 최소 = 프롬프트만들기(원글, { 말투: '반말' }).system
assert.doesNotMatch(최소, /\[내가 누구인가\]|\[글 흐름\]|\[자주 쓰는 표현\]|\[레시피 형식\]|\[본문 이모지\]/)

assert.equal(재료모으기({ 본문: '가' }), '[원글]\n가', '없는 재료는 빈 칸으로 넣지 않는다')

// 레시피는 본문이 아니라 작성자가 이어 단 답글에 있다. 이걸 빠뜨리면 재료도 순서도 없는 글이 나온다
const 타래재료 = 재료모으기({ 본문: '이거 대박', 글타래: ['🛒 준비물\n또띠아 5장', '  ', null] })
assert.match(타래재료, /또띠아 5장/, '작성자가 이어 단 글을 재료로 넘긴다')
assert.match(타래재료, /레시피는 보통 여기 있다/)
assert.doesNotMatch(재료모으기({ 본문: '가', 글타래: ['', '  '] }), /이어 단 글/, '빈 글타래는 빈 절을 만들지 않는다')

// 응답을 흉내 내는 가짜 OpenAI
const 가짜LLM = (내용, ok = true) => async () => ({
  ok, status: ok ? 200 : 500,
  json: async () => ({ choices: [{ message: { content: 내용 } }] }),
  text: async () => '서버 오류',
})

const r = await 재구성(원글, { 페르소나, 키: 'k', fetch: 가짜LLM('{"본문":" 새 본문 ","레시피":" 새 레시피 "}') })
assert.deepEqual(r.본문, '새 본문'); assert.deepEqual(r.레시피, '새 레시피')
assert.equal(r.핵심재료, '', '핵심재료가 없으면 빈 문자열이다 (링크를 안 붙인다)')
const 검색어결과 = await 재구성(원글, { 페르소나, 키: 'k', fetch: 가짜LLM('{"본문":"a","레시피":"b","핵심재료":" 국산콩 두부 "}') })
assert.equal(검색어결과.핵심재료, '국산콩 두부')

// 꼬리표 — 문자를 넓히면 남이 수수료를 가로챌 수 있다
import { 꼬리표, SUBID_최대길이 } from './src/coupang.mjs'
assert.equal(꼬리표('Dacui_1gT3T'), 'tDacui_1gT3T')
assert.throws(() => 꼬리표('a&lptag=HACKED'), /쓸 수 없는 문자/, '& 는 수수료 탈취 통로다')
assert.throws(() => 꼬리표('a b'), /쓸 수 없는 문자/, '공백은 단축을 조용히 망가뜨린다')
assert.throws(() => 꼬리표('x'.repeat(SUBID_최대길이)), /최대 길이/)

// 로켓 아닌 상품은 아예 후보가 아니다. 쿠팡의 장점이 로켓이라 그 밖은 걸 이유가 없다
import { 고르기 } from './src/coupang.mjs'
const 상품 = (이름, 가격, 로켓배송) => ({ 이름, 가격, 로켓배송, url: 'u' })
assert.equal(고르기([상품('국산콩 두부', 3000, false)], '두부'), null, '로켓이 없으면 링크를 안 건다')
assert.equal(고르기([], '두부'), null)
assert.equal(
  고르기([상품('수제 두부', 3000, false), 상품('풀무원 두부', 4000, true)], '두부').이름,
  '풀무원 두부', '비로켓이 더 알맞아 보여도 로켓만 고른다')

// 실제로 검색 1등에 업소용 29,000원짜리 고추장이 올라왔다. 집밥 레시피에는 안 맞는다
assert.equal(
  고르기([상품('업소용 대용량 태양초 고추장', 29000, true), 상품('청정원 태양초 고추장', 8830, true)], '고추장').이름,
  '청정원 태양초 고추장', '업소용은 감점한다')
assert.equal(
  고르기([상품('떡볶이떡 1kg x 10개', 27720, true), 상품('떡볶이떡', 8660, true), 상품('떡볶이떡', 9000, true)], '떡볶이떡').가격,
  8660, '혼자 유난히 비싸면 대개 대용량이다')

// 키워드가 더 맞는 쪽을 고르되, 같으면 쿠팡 관련도 순서를 존중한다
assert.equal(
  고르기([상품('두부', 3000, true), 상품('국산콩 두부', 3100, true)], '국산콩 두부').이름,
  '국산콩 두부', '검색어와 더 맞는 쪽을 고른다')
assert.equal(
  고르기([상품('두부 A', 3000, true), 상품('두부 B', 3000, true)], '두부').이름,
  '두부 A', '동점이면 쿠팡이 준 순서를 따른다')
// 원글 자막의 '물 500ml' 가 결과에 없으니 빠짐으로 잡히는 게 맞다
assert.deepEqual(r.수량경고, { 추가됨: [], 빠짐: ['500ml'], 깨짐: [] }, '재료에 있던 분량이 결과에서 빠지면 알린다')

// LLM 이 분량을 바꾸거나 글자를 깨뜨리는 일이 실제로 있었다 ("1스푼" → "1스푤")
import { 수량대조 } from './src/compose.mjs'
// 실제로 당한 사례다. "1스푼" 이 원문에 셋, 결과에 둘이면 집합끼리는 똑같아 보인다.
// 깨진 "1스푤" 을 잡는 것은 '숫자+한글' 훑기뿐이다
const 셋둘 = 수량대조('설탕 1스푼\n참기름 1스푼\n식초 1스푼', '설탕 1스푼\n참기름 1스푼\n식초 1스푤')
assert.deepEqual(셋둘.빠짐, [], '집합끼리는 사라진 걸 못 본다 — 그래서 깨짐이 필요하다')
assert.deepEqual(셋둘.깨짐, ['1스푤'], '깨진 글자를 잡아낸다')
// 조사가 붙었을 뿐인 것은 안 잡는다. 경고가 시끄러우면 아무도 안 읽는다
assert.deepEqual(수량대조('5분 담가둔다', '5분만 담가둬').깨짐, [], '조사만 붙은 것은 깨진 게 아니다')
assert.deepEqual(수량대조('사과 1개 넣기', '사과 1개랑 오이').깨짐, [], '랑도 조사다')
assert.deepEqual(수량대조('고춧가루2스푼 설탕 3스푼', '고춧가루 2스푼\n설탕 3스푼'), { 추가됨: [], 빠짐: [], 깨짐: [] },
  '띄어쓰기가 달라도 같은 분량이면 통과한다')
assert.deepEqual(수량대조('참기름 1스푼', '참기름 1스푤'), { 추가됨: [], 빠짐: ['1스푼'], 깨짐: ['1스푤'] },
  '단위가 깨지면 결과에서는 안 걸린다. 원문 쪽이 사라진 것으로 잡아야 보인다')
assert.deepEqual(수량대조('두부 1모', '두부 2모'), { 추가됨: ['2모'], 빠짐: ['1모'], 깨짐: [] },
  '분량을 바꾸면 추가·빠짐으로 잡힌다. 단위가 멀쩡하니 깨진 것은 아니다')
assert.deepEqual(수량대조('냉면육수 1/2팩', '냉면육수 1/2팩'), { 추가됨: [], 빠짐: [], 깨짐: [] }, '분수도 그대로면 통과한다')
const 경고결과 = await 재구성({ ...원글, 글타래: ['소면 1인분'] }, { 페르소나, 키: 'k', fetch: 가짜LLM('{"본문":"x","레시피":"소면 2인분"}') })
assert.deepEqual(경고결과.수량경고, { 추가됨: ['2인분'], 빠짐: ['1인분', '500ml'], 깨짐: [] },
  '재구성 결과에 경고가 실려 나온다 (500ml 는 원글 자막에 있던 것)')

// 빈 글이 발행까지 흘러가면 안 된다
for (const [이름, 내용] of [
  ['본문이 빈 경우', '{"본문":"  ","레시피":"ok"}'],
  ['레시피가 빈 경우', '{"본문":"ok","레시피":""}'],
  ['키가 빠진 경우', '{"본문":"ok"}'],
]) {
  await assert.rejects(() => 재구성(원글, { 페르소나, 키: 'k', fetch: 가짜LLM(내용) }), /비었다/, 이름)
}
await assert.rejects(() => 재구성(원글, { 페르소나, 키: 'k', fetch: 가짜LLM('설명하자면...') }), /JSON 이 아닌/)
await assert.rejects(() => 재구성(원글, { 페르소나, 키: 'k', fetch: 가짜LLM('x', false) }), /OpenAI 500/)
await assert.rejects(() => 재구성(원글, { 페르소나, 키: '' }), /OPENAI_API_KEY/)

// 레시피가 없는 글은 아예 LLM 에 넘기지 않는다 — 스레드가 영상 자막을 안 주므로 메울 방법이 없다
import { 레시피있나 } from './src/compose.mjs'
assert.equal(레시피있나({ 글타래: ['고춧가루 2스푼', '설탕 3스푼\n소면 1인분'] }), true)
assert.equal(레시피있나({ 글타래: ['요리 순서는 영상을 참고해주세요!'] }), false, '순서가 영상에만 있는 글은 뺀다')
assert.equal(레시피있나({ 글타래: ['두부 1모'] }), false, '분량 하나뿐이면 레시피로 보지 않는다')
assert.equal(레시피있나({ 글타래: [] }), false)
// 스레드 글에는 폭 없는 문자가 잔뜩 섞여 있다. 씻어내지 않으면 멀쩡한 레시피가 걸러진다
assert.equal(레시피있나({ 글타래: ['두부 1\u200B모 설탕 2\uFE0F스푼 소면 1인분'] }), true,
  '제로폭 공백과 이모지 변형 선택자가 끼어도 분량을 읽는다')
assert.deepEqual(수량대조('두부 1모', '두부 1\u200B모'), { 추가됨: [], 빠짐: [], 깨짐: [] },
  '폭 없는 문자 차이를 분량이 바뀐 것으로 오해하지 않는다')
assert.equal(레시피있나({}), false, '글타래를 못 받은 글도 뺀다')

// 링크는 LLM 이 아니라 우리가 붙인다. 자리 넷을 다 지켜야 한다
import { 대가성문구, 광고표기 } from './src/compose.mjs'
assert.equal(링크넣기('레시피', []), '레시피', '링크가 없으면 광고 표기도 문구도 안 붙인다')
assert.ok(!링크넣기('레시피', []).includes(광고표기), '광고가 아닌 글에 광고 표기를 붙이지 않는다')

const 레시피본 = `🍞 **식빵 프렌치토스트**

🛒 준비물
식빵 4장
계란 2알

👩🏻‍🍳 만드는 법

1️⃣ 계란을 푼다

바삭하게 굽는 게 포인트야`
const 소개줄 = '👇 식빵은 두꺼운 걸 써야 겉바속촉이야 👇'
const 붙임 = 링크넣기(레시피본, [{ 이름: '식빵', url: 'https://link.coupang.com/a' }], { 소개: 소개줄 })

assert.ok(붙임.startsWith(광고표기), '① 광고 표기가 맨 앞에 온다')
assert.ok(붙임.trimEnd().endsWith(대가성문구), '④ 대가성 문구가 맨 아래에 온다')
assert.ok(붙임.indexOf(소개줄) < 붙임.indexOf('link.coupang.com'), '② 소개 한 줄이 링크 바로 위에 온다')
assert.ok(!/소개줄[\s\S]*?\n\s*\n[\s\S]*?link\.coupang/.test(붙임.replace(소개줄, '소개줄')),
  '소개와 링크 사이에 빈 줄이 없다 — 나뉘면 링크만 남는다')
assert.ok(붙임.indexOf('계란 2알') < 붙임.indexOf('link.coupang.com'), '③ 링크는 준비물 뒤에 온다')
assert.ok(붙임.indexOf('link.coupang.com') < 붙임.indexOf('만드는 법'), '③ 링크는 만드는 법 앞에 온다')

// 나뉜 뒤에도 자리가 지켜져야 한다. 조각이 갈리면서 어긋나는 게 진짜 위험이다
const 조각 = 나누기(붙임)
assert.ok(조각[0].startsWith(광고표기), '첫 답글의 첫 줄이 광고 표기다')
const 링크조각 = 조각.filter((c) => c.includes('link.coupang.com'))
assert.equal(링크조각.length, 1)
assert.ok(링크조각[0].includes(소개줄), '링크가 실린 조각에 소개 한 줄이 함께 있다')
assert.ok(링크조각[0].includes('준비물'), '링크는 준비물 조각에 실린다')
assert.ok(조각.at(-1).includes(대가성문구), '대가성 문구는 마지막 조각에 있다')

// 만드는 법을 못 찾아도 링크를 버리지 않는다
const 한문단 = 링크넣기('그냥 한 문단', [{ 이름: '식빵', url: 'https://x/a' }], { 소개: '이게 좋아' })
assert.ok(한문단.startsWith(광고표기) && 한문단.trimEnd().endsWith(대가성문구))
assert.ok(한문단.includes('이게 좋아\nhttps') || 한문단.includes('이게 좋아\n식빵 https://x/a'))

// 소개가 비어도 링크는 살아야 한다
assert.ok(링크넣기(레시피본, [{ 이름: '식빵', url: 'https://x/a' }]).includes('식빵 https://x/a'))

// 상품 이름은 한 번, 주소는 두 줄. 합쳐지거나 한 줄이 사라지면 안 된다
const 상품이름 = '풀무원 국산콩 두부'
const 주소 = 'https://link.coupang.com/a'
const 두줄붙임 = 링크넣기(레시피본, [상품이름, 주소, 주소], { 소개: 소개줄 })
assert.equal(두줄붙임.split('\n').filter((l) => l.includes('link.coupang.com')).length, 2,
  '주소가 두 줄로 들어간다')
assert.equal(두줄붙임.split('\n').filter((l) => l.trim() === 상품이름).length, 1,
  '상품 이름은 한 번만 나온다')
assert.ok(!/👉/.test(두줄붙임), '상품 이름 앞에 손가락을 붙이지 않는다')
const 두줄조각 = 나누기(두줄붙임).filter((c) => c.includes('link.coupang.com'))
assert.equal(두줄조각.length, 1, '두 줄이 서로 다른 답글로 갈라지지 않는다')
assert.equal(두줄조각[0].split('\n').filter((l) => l.includes('link.coupang.com')).length, 2,
  '나뉜 뒤에도 한 조각 안에 두 줄이 다 있다')
assert.ok(두줄조각[0].includes(`${소개줄}\n${상품이름}\n${주소}\n${주소}`),
  '소개 → 이름 → 주소 → 주소 순서로 붙는다')

// 원글이 단위를 머리말에 한 번만 쓰고 숫자만 나열하기도 한다. 풀어 쓴 것은 잘한 일이다
const 머리말원문 = '🫙 양념장(큰술)\n고추가루 2.5, 고추장 1.5, 간장 1'
const 풀어씀 = 수량대조(머리말원문, '고추가루 2.5큰술\n고추장 1.5큰술\n간장 1큰술')
assert.deepEqual(풀어씀.추가됨, [], '단위를 풀어 쓴 것은 지어낸 게 아니다')
assert.deepEqual(풀어씀.깨짐, [], '풀어 쓴 것을 깨졌다고 하지 않는다')
// 그래도 진짜 깨진 글자는 그대로 잡아야 한다
assert.deepEqual(수량대조(머리말원문, '고추가루 2.5큰숱').깨짐, ['2.5큰숱'], '깨진 글자는 여전히 잡는다')

// 큰술 = T = 15ml, 작은술 = t = 티스푼 = 5ml. 표기만 다른 것을 다르다고 하면 안 된다
assert.deepEqual(수량대조('설탕 2큰술', '설탕 2T (큰술)'), { 추가됨: [], 빠짐: [], 깨짐: [] },
  '큰술과 T 는 같은 분량이다')
assert.deepEqual(수량대조('소금 1작은술', '소금 1t (작은술)'), { 추가됨: [], 빠짐: [], 깨짐: [] },
  '작은술과 t 는 같은 분량이다')
assert.deepEqual(수량대조('킥소스 1티스푼', '킥소스 1t (작은술)'), { 추가됨: [], 빠짐: [], 깨짐: [] },
  '티스푼도 작은술과 같다')
assert.deepEqual(수량대조('설탕 2큰술', '설탕 2t (작은술)').빠짐, ['2T'],
  '큰술을 작은술로 바꾸면 3배 차이다. 반드시 잡아야 한다')

// 실적 조회 — 날짜 꼴이 틀리면 부르기 전에 막는다 (엉뚱한 기간을 조용히 받아오면 더 나쁘다)
import { 실적 } from './src/coupang.mjs'
await assert.rejects(() => 실적('2026-08-01', '20260819'), /YYYYMMDD/)
await assert.rejects(() => 실적('20260801', '8/19'), /YYYYMMDD/)

// 계정을 여럿 굴릴 때 어느 계정이 벌었는지 갈라야 한다
assert.equal(꼬리표('DcM3fQ4jd3G'), 'tDcM3fQ4jd3G', '계정을 안 주면 지금까지 쓰던 t 그대로다')
assert.equal(꼬리표('DcM3fQ4jd3G', 'b'), 'bDcM3fQ4jd3G', '계정 머리글자가 앞에 붙는다')
assert.notEqual(꼬리표('DcM3fQ4jd3G', 'b'), 꼬리표('DcM3fQ4jd3G'), '계정이 다르면 꼬리표도 다르다')
assert.throws(() => 꼬리표('DcM3fQ4jd3G', 'verylongname'), /최대 길이/,
  `계정 이름이 길면 SubID 가 ${SUBID_최대길이}자를 넘는다`)
assert.throws(() => 꼬리표('DcM3fQ4jd3G', '둘째'), /쓸 수 없는 문자/,
  '계정 이름은 영문·숫자만 된다. 한글을 쓰면 여기서 걸린다')
assert.throws(() => 꼬리표('DcM3fQ4jd3G', 'a&b'), /쓸 수 없는 문자/,
  '& 가 들어가면 남이 자기 제휴 ID 를 끼워 넣을 수 있다')

// 비밀재료 — 별명만 있고 정체를 모르면 그 글을 쓰지 않는다
import { 비밀재료막힘 } from './src/compose.mjs'
const 킥레시피 = '🛒 준비물\n사과 1/2개\n킥소스 1티스푼'
assert.ok(비밀재료막힘(킥레시피, { 별명: '킥소스', 실제: '' }), '정체를 모르면 막는다')
assert.equal(비밀재료막힘(킥레시피, { 별명: '킥소스', 실제: '초절임 식초' }), null, '정체를 알면 통과한다')
// LLM 이 비밀재료를 통째로 놓쳐도 레시피 본문에서 잡아야 한다. 그게 진짜 위험이다
assert.ok(비밀재료막힘(킥레시피, { 별명: '', 실제: '' }), 'LLM 이 못 알아채도 본문에서 잡는다')
assert.ok(비밀재료막힘(킥레시피, null), '비밀재료 칸이 아예 없어도 잡는다')
assert.ok(비밀재료막힘('🛒 준비물\n비법 소스 1스푼', null), '띄어쓴 별명도 잡는다')
assert.equal(비밀재료막힘('🛒 준비물\n사과 1/2개\n식초 1스푼', null), null,
  '멀쩡한 재료만 있으면 막지 않는다')

// 등급이 높은 것부터 고른다. 플래티넘 > 골드 > 실버 > 브론즈 > 미달
const 섞인것 = 줄세우기([
  { 좋아요: 100, 조회수: 20000 },   // 0.5% 브론즈
  { 좋아요: 500, 조회수: 20000 },   // 2.5% 플래티넘
  { 좋아요: 900, 조회수: 1000 },    // 90% 이지만 조회 미달
  { 좋아요: 300, 조회수: 20000 },   // 1.5% 골드
  { 좋아요: 180, 조회수: 20000 },   // 0.9% 실버
])
assert.deepEqual(섞인것.map((p) => p.등급), ['플래티넘', '골드', '실버', '브론즈', '미달'],
  '비율이 아무리 높아도 미달은 맨 뒤다')

console.log('통과 — 재구성 검사 59개')


// --- 발행 ---
import { 올릴수있는것 } from './src/publish.mjs'

// 메타는 자기 CDN 의 영상 주소를 발행 재료로 안 받는다. 같은 파일도 메타 밖 주소면 통과한다
const 메타영상 = { 종류: '영상', url: 'https://scontent-ssn1-1.cdninstagram.com/o1/v/x.mp4?oh=1' }
const 메타이미지 = { 종류: '이미지', url: 'https://scontent-ssn1-1.cdninstagram.com/v/a.webp?oh=1' }
const 남의영상 = { 종류: '영상', url: 'https://example.com/b.mp4' }

assert.deepEqual(올릴수있는것([메타이미지]), { 쓸것: [메타이미지], 버린영상: 0 }, '이미지는 메타 CDN 이어도 통과한다')
assert.deepEqual(올릴수있는것([메타영상]), { 쓸것: [], 버린영상: 1 }, '메타 CDN 영상은 뺀다')
assert.deepEqual(올릴수있는것([남의영상]), { 쓸것: [남의영상], 버린영상: 0 }, '메타 밖 영상은 그대로 쓴다')
assert.deepEqual(올릴수있는것([메타영상, 메타이미지]).쓸것, [메타이미지], '섞여 있으면 영상만 뺀다')
assert.deepEqual(올릴수있는것(), { 쓸것: [], 버린영상: 0 })

// 스레드 글은 500자까지다. 레시피가 그보다 길면 통째로 거부당한다 (실제로 558자에서 막혔다)
import { 글자한도 } from './src/publish.mjs'
assert.equal(글자한도, 450, '한도 500 에 여유를 둔다 — 이모지·링크가 늘어나도 안 걸리게')

// 준비물과 만드는 법은 따로 올라가야 읽는 사람이 재료를 보며 따라 할 수 있다
const 재료들 = Array.from({ length: 9 }, (_, i) => `재료${i} ${i + 1}스푼`).join('\n')
const 레시피꼴 = `🍲 **된장찌개**\n\n🛒 준비물\n${재료들}\n\n👩🏻‍🍳 만드는 법\n1️⃣ 끓인다\n2️⃣ 넣는다`
const 절나눔 = 나누기(레시피꼴)
assert.equal(절나눔.length, 2, '길이가 남아도 준비물과 만드는 법은 갈라진다')
assert.ok(절나눔[0].includes('준비물') && !절나눔[0].includes('만드는 법'))
assert.ok(절나눔[1].includes('만드는 법') && !절나눔[1].includes('준비물'))
assert.ok(절나눔[0].startsWith('🍲'), '제목만 있는 조각을 따로 만들지 않는다 — 앞에 붙인다')
assert.equal(절나눔.join('\n\n'), 레시피꼴, '나눠도 내용은 그대로다')
assert.deepEqual(나누기(''), [], '빈 글은 답글을 안 만든다')
assert.deepEqual(나누기('짧다'), ['짧다'], '한도 안이면 한 조각이다')

const 문단 = (n) => 'ㄱ'.repeat(n)
const 둘 = 나누기(`${문단(300)}\n\n${문단(300)}`)
assert.equal(둘.length, 2, '빈 줄에서 나눈다')
assert.ok(둘.every((c) => c.length <= 450))

// 재료 목록 한가운데를 자르면 못 읽는다. 빈 줄이 없으면 줄 단위로 자른다
const 줄들 = Array.from({ length: 30 }, (_, i) => `재료${i} 100g`).join('\n')
const 여럿 = 나누기(줄들)
assert.ok(여럿.every((c) => c.length <= 450))
assert.ok(여럿.every((c) => !/^\d+g/.test(c)), '줄 중간에서 끊기지 않는다')
assert.equal(여럿.join('\n'), 줄들, '나눠도 내용은 그대로다')

// 한 줄이 한도를 넘으면 어쩔 수 없이 자른다 — 그래도 한도는 지킨다
assert.ok(나누기(문단(1200)).every((c) => c.length <= 450))

console.log('통과 — 발행 검사 17개')
