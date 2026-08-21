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
assert.equal(등급({ 조회수: 1999, 좋아요: 1999 }).등급, '미달', '문턱 아래는 비율이 100% 라도 미달이다')

// 확산이 1차 지표다 — 팔로워를 알면 조회수÷팔로워 로 매긴다
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 400 }).등급, '플래티넘', '25배')
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 800 }).등급, '골드', '12.5배')
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 1600 }).등급, '실버', '6.25배')
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 4000 }).등급, '브론즈', '2.5배')
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 9000 }).등급, '미달', '1.1배는 안 퍼진 것이다')
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 400 }).확산, 25)

// 팔로워가 문턱 아래면 확산을 안 쓴다 — 팔로워 4명짜리가 163배로 1등을 했다 (실측)
assert.equal(등급({ 조회수: 10000, 좋아요: 200, 팔로워: 4 }).등급, '플래티넘', '확산 2500배가 아니라 비율 2.0% 로 매긴다')
assert.equal(등급({ 조회수: 10000, 좋아요: 1, 팔로워: 4 }).등급, '브론즈', '비율 0.01% — 확산이 컸어도 브론즈다')

// 팔로워를 모르면 예전 기준(좋아요÷조회수)으로 돌아간다. 검색 경로가 이 길을 탄다
assert.equal(등급({ 조회수: 10000, 좋아요: 200 }).등급, '플래티넘') // 2.0%
assert.equal(등급({ 조회수: 10000, 좋아요: 120 }).등급, '골드')     // 1.2%
assert.equal(등급({ 조회수: 10000, 좋아요: 60 }).등급, '실버')      // 0.6%
assert.equal(등급({ 조회수: 10000, 좋아요: 59 }).등급, '브론즈')     // 0.59%
assert.equal(등급({ 조회수: 10000, 좋아요: 59 }).확산, null, '팔로워를 모르면 확산은 null 이다')

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

// 같은 검색어를 하루 여러 번 두드리면 스레드가 그 단어의 결과를 1개로 줄인다.
// 목록 전체를 골고루 돌아야 한 단어가 받는 횟수가 준다
import { 돌려쓰기, 분야들 } from './src/계정.mjs'
const 요리어 = 분야들.요리.키워드
const 때 = (시, 날) => new Date(2026, 7, 날, 시)
assert.deepEqual(돌려쓰기(['가', '나']), ['가', '나'], '둘뿐이면 그대로 둔다')
assert.equal(돌려쓰기(요리어).length, 요리어.length, '목록을 자르지 않는다')

// 시각표가 0·8·12·16·20 처럼 4의 배수뿐이어도 매번 같은 자리에서 시작하면 안 된다
const 넷배수시작 = [0, 8, 12, 16, 20].map((시) => 돌려쓰기(요리어, 때(시, 20))[0])
assert.equal(new Set(넷배수시작).size, 5, `4의 배수 시각마다 다른 검색어로 시작한다 — ${넷배수시작}`)

// 건너뛰는 폭이 목록 길이와 서로소가 아니면 절반만 쓰인다. 스무 개짜리에서 2칸씩 뛰면 열 개만 돈다
const 하루치 = new Set(Array.from({ length: 24 }, (_, 시) => 돌려쓰기(요리어, 때(시, 20))[0]))
assert.ok(하루치.size >= 요리어.length - 4, `하루 안에 목록 대부분을 돈다 — ${하루치.size}/${요리어.length}`)

// 쟁여둔언니는 두 시간마다 돈다. 그 열두 시각도 서로 안 겹쳐야 한다
const 두시간마다 = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map((시) => 돌려쓰기(요리어, 때(시, 20))[0])
assert.equal(new Set(두시간마다).size, 12, `두 시간마다 도는 시각도 서로 다른 검색어로 시작한다 — ${두시간마다}`)

// 날짜가 바뀌면 같은 시각이라도 다른 자리에서 시작한다. 어제 안 쓴 단어가 오늘 쓰인다
assert.notEqual(돌려쓰기(요리어, 때(8, 20))[0], 돌려쓰기(요리어, 때(8, 21))[0], '날짜가 다르면 시작 자리가 밀린다')

console.log('통과 — 검사 %d개', 25)

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
import { 프롬프트만들기, 재구성, 링크넣기, 재료모으기, 도입고르기 } from './src/compose.mjs'
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

// 계정 이름은 실제 스레드 아이디를 쓴다. 쿠팡 꼬리표만 따로 줄인다
import { 꼬리머리, 이름꼴, 검사, 미디어뿌리 } from './src/계정.mjs'
assert.equal(꼬리머리(''), 't', '첫 계정은 지금까지 쓰던 t 그대로다')
assert.equal(꼬리머리('altteul.cart'), 'altteulc', '점을 빼고 8자로 줄인다')
assert.equal(꼬리머리('my_food_life'), 'myfoodli', '밑줄도 뺀다')
assert.ok(/^[0-9A-Za-z_-]+$/.test(꼬리머리('altteul.cart')), 'SubID 에 쓸 수 있는 문자만 남는다')
assert.ok(이름꼴.test('altteul.cart') && !이름꼴.test('Altteul') && !이름꼴.test('한글'),
  '스레드 아이디 규칙 — 소문자·숫자·점·밑줄')
assert.equal(미디어뿌리(''), 'media', '첫 계정은 예전 폴더를 그대로 쓴다')
assert.equal(미디어뿌리('altteul.cart'), 'media/altteul.cart', '나머지는 계정 폴더로 나뉜다')
assert.throws(() => 검사({ 계정: '', 분야: '요리', 언어: '한국어', 제휴: '쿠팡파트너스' }), /계정 이름/)
assert.equal(검사({ 계정: 'ABC.d', 분야: '요리', 언어: '한국어', 제휴: '쿠팡파트너스' }).계정, 'abc.d',
  '대문자는 소문자로 바꾼다')
assert.equal(검사({ 계정: 'abc', 분야: '요리', 언어: '한국어', 제휴: '쿠팡파트너스' }).별칭, 'abc',
  '별칭을 비우면 계정 이름을 쓴다')
assert.ok(!('userId' in 검사({ 계정: 'abc', userId: '123', 분야: '요리', 언어: '한국어', 제휴: '쿠팡파트너스' })),
  'User ID 는 사람에게 안 받는다. 토큰으로 우리가 알아낸다')

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
import { 비밀재료빼기 } from './src/compose.mjs'
// 정체를 모르는 별명 재료는 그 줄만 빼고 올린다. 원글에서 그것은 준비물이 아니라
// 작성자의 광고 블록이었고 준비물은 이미 완전했다 (실측)
{
  const 킥있는것 = '🍕 **다이어트 피자**\n\n🛒 준비물\n또띠아 1장\n참치 1캔\n🔽다이어터들의 킥소스🔽\n\n👩🏻‍🍳 만드는 법\n1️⃣ 굽기'
  const 뺀것 = 비밀재료빼기(킥있는것, { 별명: '킥소스', 실제: '' })
  assert.equal(뺀것.뺀줄.length, 1)
  assert.match(뺀것.뺀줄[0], /킥소스/)
  assert.ok(!뺀것.레시피.includes('킥소스'), '별명 줄이 사라진다')
  assert.ok(뺀것.레시피.includes('또띠아 1장') && 뺀것.레시피.includes('참치 1캔'), '멀쩡한 재료는 남는다')
  assert.ok(뺀것.레시피.includes('만드는 법'), '순서도 남는다')
  assert.ok(!/\n\n\n/.test(뺀것.레시피), '빈 줄이 겹치지 않는다 — 문단이 갈리면 링크만 덩그러니 남는다')

  // 정체를 알면 그대로 둔다
  const 그대로 = 비밀재료빼기(킥있는것, { 별명: '킥소스', 실제: '초절임 식초' })
  assert.deepEqual(그대로.뺀줄, [])
  assert.equal(그대로.레시피, 킥있는것)

  // LLM 이 별명을 못 알아채도 본문에서 잡는다
  assert.equal(비밀재료빼기('🛒 준비물\n비법 소스 1스푼\n사과 1개', null).뺀줄.length, 1, '띄어쓴 별명도 잡는다')
  assert.equal(비밀재료빼기('🛒 준비물\n사과 1/2개\n식초 1스푼', null).뺀줄.length, 0,
    '멀쩡한 재료만 있으면 아무것도 안 뺀다')
  assert.equal(비밀재료빼기('🛒 준비물\n사과 1개', null).레시피, '🛒 준비물\n사과 1개')
  // 빈 값에도 안 죽는다
  assert.deepEqual(비밀재료빼기(null, null), { 레시피: '', 뺀줄: [] })
}

// 등급이 높은 것부터 고른다. 플래티넘 > 골드 > 실버 > 브론즈 > 미달
const 섞인것 = 줄세우기([
  { 좋아요: 100, 조회수: 20000 },   // 0.5% 브론즈
  { 좋아요: 500, 조회수: 20000 },   // 2.5% 플래티넘
  { 좋아요: 900, 조회수: 1000 },    // 90% 이지만 조회 미달 (문턱 2000)
  { 좋아요: 300, 조회수: 20000 },   // 1.5% 골드
  { 좋아요: 180, 조회수: 20000 },   // 0.9% 실버
])
assert.deepEqual(섞인것.map((p) => p.등급), ['플래티넘', '골드', '실버', '브론즈', '미달'],
  '비율이 아무리 높아도 미달은 맨 뒤다')

// 도입 돌려쓰기 — 훅이 하나로 굳으면 아홉 편 연속 같은 첫 문장이 나간다. 실제로 겪었다
{
  const 유형 = ['자신감', '비법', '값되묻기', '권유', '내기억', '계기']
  // 같은 글은 늘 같은 도입 (다시 돌려도 결과가 안 흔들린다)
  assert.equal(도입고르기(유형, 'AbC123'), 도입고르기(유형, 'AbC123'))
  // 글이 다르면 도입이 갈린다 — 한 가지로 쏠리지 않는다
  const 씨앗 = ['DbiZqXYE0Dc', 'DCbB6vHppNr', 'DVqalhNoAts', 'C8xQwErTyUi', 'DzZaBbCcDdE', 'DqW1eR2tY3u', 'DmN4bV5cX6z', 'DpO7iU8yT9r']
  const 나온것 = new Set(씨앗.map((c) => 도입고르기(유형, c)))
  assert.ok(나온것.size >= 3, `도입이 ${나온것.size}가지뿐 — 쏠렸다`)
  // 유형이 없으면 조용히 비운다. 지시문에 빈 줄이 새면 안 된다
  assert.equal(도입고르기([], 'x'), '')
  assert.equal(도입고르기(undefined, 'x'), '')
  // 지시문에 실제로 실린다
  const 지시 = 프롬프트만들기({ ...원글, code: 'AbC123' }, { 말투: '반말', '도입 유형': 유형 }).system
  assert.match(지시, /\[도입\] 첫 줄을 이렇게 연다/)
  assert.match(지시, /다른 도입 방식을 섞지 않는다/)
  // 도입 설명을 그대로 베껴 쓴 글이 실제로 나갔다 — "비법 공개 — … (조회 7만)" 이 본문에 실렸다
  assert.match(지시, /이 설명을 글에 그대로 쓰지 마라/)
  // 유형 문자열에 라벨이나 괄호 설명이 붙으면 LLM 이 그것까지 옮겨 적는다
  // 계정마다 말투 파일이 있다. 공개 패키지에는 persona.json 하나뿐이라 있는 것만 본다
  const { readFile: 말투읽기 } = await import('node:fs/promises')
  for (const f of ['persona.json', 'persona.jaengyeo.unni.json']) {
    let 글 = null
    try { 글 = await 말투읽기(f, 'utf8') } catch { continue }
    const p = JSON.parse(글)
    for (const 줄 of p['도입 유형'] ?? []) {
      assert.ok(!줄.includes('—'), `${f}: 도입 유형에 라벨이 있다 — "${줄}"`)
      assert.ok(!/[()]/.test(줄), `${f}: 도입 유형에 괄호 설명이 있다 — "${줄}"`)
    }
  }
}

console.log('통과 — 재구성 검사 76개')


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

// 영상을 못 올렸으면 그 표를 남겨야 한다. run.mjs 가 이걸 보고 반쪽짜리 글을 안 올린다.
// 토큰을 빈 값으로 주면 그물을 타지 않고 바로 실패한다
import { 영상갈아끼우기 } from './src/blob.mjs'
const 갈린것 = await 영상갈아끼우기([메타이미지, 메타영상], { 받은폴더: '/없는폴더', code: 'X', 토큰: '' })
assert.equal(갈린것[0].우리가올림, undefined, '이미지는 손대지 않는다')
assert.equal(갈린것[1].우리가올림, undefined, '못 올린 영상에는 우리가올림 표가 안 붙는다')
assert.ok(갈린것[1].올리기실패, '못 올린 까닭을 남긴다')

// 답글 권한이 없으면 본문만 올라가고 레시피가 죽는다. 올리기 전에 잡아야 한다
import { 빠진권한, 필요권한 } from './src/publish.mjs'
const 가짜 = (권한들) => async () => ({ json: async () => ({ data: { scopes: 권한들 } }) })
assert.deepEqual(await 빠진권한('t', 가짜(필요권한)), [], '다 있으면 통과한다')
assert.deepEqual(await 빠진권한('t', 가짜(['threads_basic', 'threads_content_publish'])),
  ['threads_manage_replies'], '답글 권한이 없으면 잡아낸다')
assert.deepEqual(await 빠진권한('t', 가짜([])), [], '못 물어봤으면 막지 않는다 — 그물이 끊겼을 수 있다')
assert.deepEqual(await 빠진권한('t', async () => { throw new Error('끊김') }), [], '오류가 나도 막지 않는다')

// 스레드 글은 500자까지다. 레시피가 그보다 길면 통째로 거부당한다 (실제로 558자에서 막혔다)
import { 글자한도 } from './src/publish.mjs'
assert.equal(글자한도, 490, '한도 500 에 여유를 둔다. 자바스크립트는 이모지를 여러 자로 세니 실제로는 더 남는다')

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
assert.ok(둘.every((c) => c.length <= 글자한도))

// 재료 목록 한가운데를 자르면 못 읽는다. 빈 줄이 없으면 줄 단위로 자른다
const 줄들 = Array.from({ length: 30 }, (_, i) => `재료${i} 100g`).join('\n')
const 여럿 = 나누기(줄들)
assert.ok(여럿.every((c) => c.length <= 글자한도))
assert.ok(여럿.every((c) => !/^\d+g/.test(c)), '줄 중간에서 끊기지 않는다')
assert.equal(여럿.join('\n'), 줄들, '나눠도 내용은 그대로다')

// 한 줄이 한도를 넘으면 어쩔 수 없이 자른다 — 그래도 한도는 지킨다
assert.ok(나누기(문단(1200)).every((c) => c.length <= 글자한도))

// 제목 한 줄만 담긴 채로 끊으면 "🥗 샐러드 드레싱 4종" 만 있는 답글이 나간다 — 실제로 그랬다.
// 뒤 문단이 한도를 넘어 줄 단위로 쪼개질 때도 앞머리를 혼자 내보내면 안 된다
const 긴재료 = Array.from({ length: 26 }, (_, i) => `재료${i} 1T (큰술) — 어느 무리`).join('\n')
const 제목붙은것 = 나누기(`🥗 드레싱 4종\n\n🛒 준비물\n${긴재료}\n\n👩🏻‍🍳 만드는 법\n1️⃣ 섞는다`)
assert.ok(제목붙은것.every((c) => c.length >= 80), `제목만 있는 조각을 안 만든다 — ${제목붙은것.map((c) => c.length)}`)
assert.ok(제목붙은것[0].startsWith('🥗 드레싱 4종'), '제목은 첫 조각 맨 앞에 남는다')
assert.ok(제목붙은것[0].includes('🛒 준비물'), '제목과 준비물이 한 조각에 같이 간다')
assert.ok(제목붙은것.every((c) => c.length <= 글자한도))
assert.ok(제목붙은것.join('\n').replace(/\n+/g, '\n').includes('재료25 1T (큰술) — 어느 무리'), '재료가 새지 않는다')

console.log('통과 — 발행 검사 29개')

// 보관함 — 홈에서 건진 글을 쟁여 뒀다가 나중에 꺼내 쓴다
{
  const { 담기, 꺼내기, 빼기, 읽기 } = await import('./src/보관함.mjs')
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const 방 = await mkdtemp(join(tmpdir(), '보관함-'))
  const 파일 = join(방, '보관함.json')
  const 하루 = 24 * 60 * 60 * 1000
  const 지금 = 1_800_000_000_000

  // 없는 파일은 빈 보관함이다. 없는 것은 고장이 아니다
  assert.deepEqual(await 읽기(파일), [])
  assert.deepEqual(await 꺼내기({ 파일 }), [])

  assert.deepEqual(
    await 담기([{ code: 'a', 등급: '골드', 비율: 0.013 }, { code: 'b', 등급: '미달', 비율: 0.09 }], { 파일, 지금 }),
    { 새것: 2, 전체: 2 },
  )

  // 같은 글을 다시 담아도 늘지 않는다. 조회수는 나중에 잰 값이 이긴다
  assert.deepEqual(await 담기([{ code: 'a', 등급: '플래티넘', 조회수: 999 }], { 파일, 지금: 지금 + 하루 }), { 새것: 0, 전체: 2 })
  const 갱신됨 = (await 읽기(파일)).find((p) => p.code === 'a')
  assert.equal(갱신됨.등급, '플래티넘')
  assert.equal(갱신됨.조회수, 999)
  assert.equal(갱신됨.건진때, 지금, '건진때는 처음 값을 지킨다')
  assert.equal(갱신됨.갱신때, 지금 + 하루)

  // 미달은 안 꺼낸다. 좋은 등급이 앞에 온다
  assert.deepEqual((await 꺼내기({ 파일, 지금 })).map((p) => p.code), ['a'])
  await 담기([{ code: 'c', 등급: '실버', 비율: 0.007 }], { 파일, 지금 })
  assert.deepEqual((await 꺼내기({ 파일, 지금 })).map((p) => p.code), ['a', 'c'])

  // 오래된 것은 안 꺼낸다 — 미디어 주소가 하루 반이면 죽는다 (실측)
  assert.deepEqual(await 꺼내기({ 파일, 지금: 지금 + 15 * 하루 }), [])

  // 쓴 글은 뺀다. 안 빼면 다음에 또 1등으로 올라온다
  assert.equal(await 빼기(['a'], { 파일 }), 2)
  assert.deepEqual((await 꺼내기({ 파일, 지금 })).map((p) => p.code), ['c'])

  // code 없는 것은 조용히 건너뛴다
  assert.deepEqual(await 담기([{ 등급: '골드' }, null], { 파일, 지금 }), { 새것: 0, 전체: 2 })
  await rm(방, { recursive: true, force: true })
}
console.log('통과 — 보관함 검사 14개')

// 알림 — 쿠키가 죽으면 텔레그램으로 부른다. 못 보내도 발행은 계속돼야 한다
{
  const { 알리기 } = await import('./src/알림.mjs')
  const { mkdtemp, rm, readFile } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const 방 = await mkdtemp(join(tmpdir(), '알림-'))
  const 기록파일 = join(방, '알림기록.json')
  const 열쇠 = { 토큰: 'T', 방번호: '99', 기록파일 }
  const 보낸것 = []
  const 가짜 = (ok = true, 몸 = '{"ok":true}') => async (url, opt) => {
    보낸것.push({ url, 몸: JSON.parse(opt.body) })
    return { ok, status: ok ? 200 : 401, text: async () => 몸 }
  }

  // 열쇠가 없으면 조용히 안 보낸다. 던지지 않는다 — 알림 때문에 발행이 죽으면 안 된다
  assert.equal((await 알리기('x', { 기록파일 })).보냄, false)
  assert.match((await 알리기('x', { 기록파일 })).까닭, /열쇠/)
  assert.equal((await 알리기('  ', { ...열쇠, fetch: 가짜() })).보냄, false, '빈 내용은 안 보낸다')

  // 보낸다
  const r = await 알리기('쿠키가 죽었다', { ...열쇠, 종류: '쿠키', 지금: 1000, fetch: 가짜() })
  assert.equal(r.보냄, true)
  assert.match(보낸것[0].url, /api\.telegram\.org\/botT\/sendMessage/)
  assert.equal(보낸것[0].몸.chat_id, '99')
  assert.equal(보낸것[0].몸.text, '쿠키가 죽었다')

  // 같은 종류로 곧바로 또 부르면 안 보낸다. 두 시간마다 울리면 아무도 안 읽는다
  const 두번째 = await 알리기('또', { ...열쇠, 종류: '쿠키', 지금: 1000 + 60_000, fetch: 가짜() })
  assert.equal(두번째.보냄, false)
  assert.equal(보낸것.length, 1, '잠잠시간 안에는 아예 안 부른다')

  // 종류가 다르면 보낸다
  assert.equal((await 알리기('딴것', { ...열쇠, 종류: '다른일', 지금: 1000 + 60_000, fetch: 가짜() })).보냄, true)
  // 잠잠시간이 지나면 다시 보낸다
  assert.equal((await 알리기('또', { ...열쇠, 종류: '쿠키', 지금: 1000 + 7 * 3600_000, fetch: 가짜() })).보냄, true)

  // 텔레그램이 거절하면 기록에 안 남긴다 — 남기면 다음 판이 조용히 건너뛴다
  const 실패 = await 알리기('x', { ...열쇠, 종류: '새것', 지금: 9e12, fetch: 가짜(false, 'nope') })
  assert.equal(실패.보냄, false)
  assert.match(실패.까닭, /401/)
  assert.equal(JSON.parse(await readFile(기록파일, 'utf8')).새것, undefined, '실패는 기록에 안 남는다')

  // 통신이 터져도 던지지 않는다
  const 터짐 = await 알리기('x', { ...열쇠, 종류: '터짐', 지금: 9e12, fetch: async () => { throw new Error('끊김') } })
  assert.equal(터짐.보냄, false)
  assert.match(터짐.까닭, /끊김/)

  // 통신이 끊기면 다시 걸어 본다 — 몇 분 사이에 두 번 끊겼다 (실측).
  // 알림을 놓치면 계정이 조용히 멈춘 것을 아무도 모른다
  let 부른수 = 0
  const 두번실패 = async () => {
    부른수 += 1
    if (부른수 < 3) throw new Error('ETIMEDOUT')
    return { ok: true, status: 200, text: async () => '{}' }
  }
  const 되살아남 = await 알리기('x', { ...열쇠, 종류: '끊김', 지금: 8e12, fetch: 두번실패, 쉬기: async () => {} })
  assert.equal(되살아남.보냄, true, '두 번 끊겨도 세 번째에 간다')
  assert.equal(되살아남.시도, 3)

  // 네 번째는 없다. 무한정 매달리면 발행이 멈춘다
  부른수 = 0
  const 계속끊김 = await 알리기('x', { ...열쇠, 종류: '계속', 지금: 8.5e12, fetch: async () => { 부른수 += 1; throw new Error('ETIMEDOUT') }, 쉬기: async () => {} })
  assert.equal(계속끊김.보냄, false)
  assert.equal(부른수, 3, '세 번만 걸어 본다')
  assert.match(계속끊김.까닭, /3번 시도/)

  // 토큰이 틀리면(4xx) 다시 걸어도 같은 답이다. 한 번에 그만둔다
  부른수 = 0
  const 틀린토큰 = await 알리기('x', { ...열쇠, 종류: '401', 지금: 8.6e12, 쉬기: async () => {},
    fetch: async () => { 부른수 += 1; return { ok: false, status: 401, text: async () => 'unauthorized' } } })
  assert.equal(틀린토큰.보냄, false)
  assert.equal(부른수, 1, '4xx 는 다시 안 건다')

  // 5xx 는 저쪽 사정이라 다시 걸어 본다
  부른수 = 0
  await 알리기('x', { ...열쇠, 종류: '502', 지금: 8.7e12, 쉬기: async () => {},
    fetch: async () => { 부른수 += 1; return { ok: false, status: 502, text: async () => 'bad gateway' } } })
  assert.equal(부른수, 3, '5xx 는 다시 건다')

  await rm(방, { recursive: true, force: true })
}
console.log('통과 — 알림 검사 22개')

// 홈수집 — 쿠키 한 줄을 브라우저가 받는 모양으로 바꾼다
{
  const { 쿠키풀기, 쿠키죽음, 홈에서걷기 } = await import('./src/홈수집.mjs')
  const 푼것 = 쿠키풀기('sessionid=abc; ds_user_id=123; 빈칸=  ')
  assert.equal(푼것.length, 3)
  assert.deepEqual(푼것[0], { name: 'sessionid', value: 'abc', domain: '.threads.com', path: '/', secure: true })
  assert.equal(푼것[1].value, '123')
  // 값에 = 가 들어 있어도 첫 = 에서만 가른다
  assert.equal(쿠키풀기('a=b=c')[0].value, 'b=c')
  // = 없는 조각은 버린다. 빈 줄도 버린다
  assert.deepEqual(쿠키풀기('쓰레기; ; a=1').map((c) => c.name), ['a'])
  assert.deepEqual(쿠키풀기(''), [])
  assert.deepEqual(쿠키풀기(undefined), [])

  // 쿠키가 아예 없으면 브라우저를 띄우기도 전에 쿠키죽음이다
  await assert.rejects(() => 홈에서걷기({ 쿠키: '', 계정: '시험' }), (e) => {
    assert.ok(e instanceof 쿠키죽음)
    assert.equal(e.계정, '시험')
    assert.match(e.message, /쿠키가 죽었다/)
    return true
  })
}
console.log('통과 — 홈수집 검사 9개')


// 미디어 지문 — 원글 번호도 요리 이름도 다른데 같은 파일인 글을 잡는다.
// 실측: 치즈폭탄 또띠아파이가 원글 다섯 개에서 나왔고 그중 하나는 요리 이름조차 비어 있었다
{
  const { 다른비트수, 이미올린미디어, 미디어적기, 지문만들기, 그림해시들, 소리해시, 바이트해시 } =
    await import('./src/미디어지문.mjs')
  const { mkdtemp, rm, writeFile, mkdir } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const 방 = await mkdtemp(join(tmpdir(), '지문-'))
  const 하루 = 86400000
  const 지금 = 1_800_000_000_000

  assert.equal(다른비트수('1010', '1010'), 0)
  assert.equal(다른비트수('1010', '0101'), 4)
  // 길이가 다르거나 없으면 비교하지 않는다 — 0 을 돌려주면 아무거나 다 걸린다
  assert.equal(다른비트수('1010', '101'), Infinity)
  assert.equal(다른비트수(null, '1010'), Infinity)
  assert.equal(다른비트수('', ''), Infinity)

  // 빈 지문은 아무것도 막지 않는다. 막으면 미디어 못 받은 글이 전부 걸린다
  assert.equal(await 이미올린미디어({ 바이트: [], 그림: [], 소리: [] }, { 뿌리: 방, 지금 }), null)
  await 미디어적기({ 바이트: [], 그림: [], 소리: [] }, 'EMPTY', { 뿌리: 방, 지금 })
  assert.equal(await 이미올린미디어({ 바이트: ['aa'], 그림: [] }, { 뿌리: 방, 지금 }), null, '빈 지문은 적히지도 않는다')

  // 바이트가 같으면 확실하다
  await 미디어적기({ 바이트: ['해시가', '둘'], 그림: ['1100110011001100110011001100110011001100110011001100110011001100'] }, 'AAA', { 뿌리: 방, 지금 })
  const 바 = await 이미올린미디어({ 바이트: ['둘'], 그림: [] }, { 뿌리: 방, 지금 })
  assert.equal(바?.code, 'AAA')
  assert.equal(바.까닭, '같은 파일')

  // 형식만 바뀐 사진은 그림해시가 잡는다 (webp↔jpg 가 실제로 0비트 차이였다)
  const 살짝다름 = '1100110011001100110011001100110011001100110011001100110011001101'
  const 그 = await 이미올린미디어({ 바이트: ['처음보는것'], 그림: [살짝다름] }, { 뿌리: 방, 지금 })
  assert.equal(그?.까닭, '같은 그림')

  // 많이 다르면 안 걸린다 — 다른 요리까지 막으면 쓸 수가 없다
  const 아주다름 = '0011001100110011001100110011001100110011001100110011001100110011'
  assert.equal(await 이미올린미디어({ 바이트: ['x'], 그림: [아주다름] }, { 뿌리: 방, 지금 }), null)

  // 오래된 것은 안 본다
  assert.equal(await 이미올린미디어({ 바이트: ['둘'], 그림: [] }, { 뿌리: 방, 지금: 지금 + 31 * 하루 }), null)

  // 실제 파일로 — 같은 바이트면 같은 해시다
  const 폴더 = join(방, '글하나')
  await mkdir(폴더, { recursive: true })
  await writeFile(join(폴더, '01.bin'), 'AAAA')
  await writeFile(join(폴더, 'post.json'), '{}')
  const 지문 = await 지문만들기(폴더)
  assert.equal(지문.바이트.length, 1, 'json 은 지문에서 뺀다')
  assert.equal(지문.바이트[0], await 바이트해시(join(폴더, '01.bin')))
  // 그림이 아닌 파일은 그림해시도 소리해시도 없다
  assert.deepEqual(await 그림해시들(join(폴더, '01.bin')), [])
  assert.equal(await 소리해시(join(폴더, '01.bin')), null)
  // 없는 폴더는 빈 지문이다. 던지지 않는다
  assert.deepEqual(await 지문만들기(join(방, '없는폴더')), { 바이트: [], 그림: [], 소리: [] })

  // 소리로도 가린다 — 화면을 잘라내도 소리는 안 바뀐다. 20% 크롭이 0/39 비트였다
  {
    const 소리A = '101010101010101010101010101010101010101'
    const 살짝 = '101010101010101010101010101010101010100'   // 1비트 다름
    const 딴것 = '000111000111000111000111000111000111000'
    await 미디어적기({ 바이트: [], 그림: [], 소리: [소리A] }, 'SOUND', { 뿌리: 방, 지금 })
    const s1 = await 이미올린미디어({ 바이트: [], 그림: [], 소리: [살짝] }, { 뿌리: 방, 지금 })
    assert.equal(s1?.까닭, '같은 소리')
    assert.equal(await 이미올린미디어({ 바이트: [], 그림: [], 소리: [딴것] }, { 뿌리: 방, 지금 }), null)
    // 소리만 있고 그림이 없어도 적히고 걸린다
    assert.equal((await 이미올린미디어({ 바이트: [], 그림: [], 소리: [소리A] }, { 뿌리: 방, 지금 }))?.code, 'SOUND')
  }

  await rm(방, { recursive: true, force: true })
}

  // 밝기값 64개로 해시를 만든다. 사진과 영상이 같은 잣대를 쓴다
  {
    const { 밝기로해시, 장면해시들 } = await import('./src/미디어지문.mjs')
    // 오른쪽 이웃과 견주므로 9×8 = 72개를 받아 64비트를 만든다
    assert.equal(밝기로해시(null), null)
    assert.equal(밝기로해시([1, 2, 3]), null, '칸 수가 안 맞으면 안 만든다')
    assert.equal(밝기로해시(Array(64).fill(128)), null, '8×8 로는 못 만든다')
    // 한 색으로 꽉 찬 것은 아무 데나 걸린다. 지문으로 쓰지 않는다
    assert.equal(밝기로해시(Array(72).fill(128)), null)
    // 한 방향으로만 기울어진 것도 아무 데나 걸린다. 그것도 안 쓴다
    const 한쪽기울기 = []
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 9; x += 1) 한쪽기울기.push(255 - x * 20)
    assert.equal(밝기로해시(한쪽기울기), null)

    // 줄마다 방향이 다른 그림은 제대로 지문이 나온다
    const 얼룩 = []
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 9; x += 1) 얼룩.push(y % 2 === 0 ? 255 - x * 20 : x * 20)
    }
    const 값 = 밝기로해시(얼룩)
    assert.equal(값.length, 64)
    assert.equal(값.slice(0, 8), '1'.repeat(8), '어두워지는 줄은 1')
    assert.equal(값.slice(8, 16), '0'.repeat(8), '밝아지는 줄은 0')

    // 밝기를 통째로 낮춰도 기울기는 그대로다 — 차이해시를 쓰는 까닭이다.
    // 평균해시였다면 파스타와 잔치국수가 4비트 차이로 걸렸다 (실측)
    assert.equal(밝기로해시(얼룩.map((v) => v / 3)), 값)
    // 영상이 아니면 장면을 안 뽑는다
    assert.deepEqual(await 장면해시들('없는파일.jpg'), [])
    // ffmpeg 이 없거나 못 읽어도 던지지 않는다. 이 겹만 조용히 논다
    assert.deepEqual(await 장면해시들('없는파일.mp4'), [])
  }


console.log('통과 — 미디어지문 검사 28개')

// 레시피 판정 — 분량만 세면 요리가 아닌 글이 새어 든다.
// "GROK 으로 전자책 만들기, 프롬프트 8종" 이 번호 목록을 분량으로 인정받아 발행됐다 (실측)
{
  const { 레시피있나 } = await import('./src/compose.mjs')
  const 전자책 = { 글타래: [
    '1. 고부가가치 전자책 아웃라인 설계 프롬프트 — 10개 챕터, 세부 소주제 3~5개',
    '2. 챕터 초안 작성 프롬프트 — 톤 3가지 중 선택',
    '3. 사례 삽입 프롬프트 — 미니 사례 2개 추가',
    '4. 가독성 편집 프롬프트 5개, 제목 10개 생성',
  ] }
  assert.equal(레시피있나(전자책), false, '숫자 목록만 있는 글은 레시피가 아니다')

  // 불을 안 쓰는 레시피도 통과해야 한다 — 조리 동작으로 재면 드레싱이 통째로 막힌다
  const 드레싱 = { 글타래: ['올리브오일 2큰술 간장 1큰술 식초 1큰술 레몬즙 1큰술 알룰로스 1큰술 참기름 0.5큰술'] }
  assert.equal(레시피있나(드레싱), true, '섞기만 하는 레시피도 요리다')

  const 볶음 = { 글타래: ['🛒 준비물\n돼지고기 300g\n양파 1개\n고추장 2큰술\n간장 1큰술\n\n1. 팬에 볶는다'] }
  assert.equal(레시피있나(볶음), true)

  // 분량이 모자라면 재료가 많아도 아니다
  assert.equal(레시피있나({ 글타래: ['간장 설탕 마늘 양파를 넣고 볶는다'] }), false, '분량이 없으면 레시피가 아니다')
  // 재료가 한 가지뿐이면 아니다 — 숫자가 우연히 맞는 글을 막는다
  assert.equal(레시피있나({ 글타래: ['감자 3개 사서 5개 담고 2개 남김'] }), false)
  assert.equal(레시피있나({ 글타래: [] }), false)
  assert.equal(레시피있나({}), false)
}

  // 재료와 분량만 보면 요리가 아닌 글이 줄줄이 통과한다 (실측 — 다섯 중 넷).
  // 레시피는 '무엇을' 이 아니라 '어떻게' 를 알려 주는 글이다
  const 가짜들 = [
    ['맛집 후기', ['어제 간 집 삼겹살 2인분에 소주 1병, 계란찜 1개 시켰는데 소금간이 딱이었음. 마늘도 3쪽 서비스']],
    ['장보기 자랑', ['오늘 마트에서 두부 2모, 계란 1판, 우유 2개, 버터 1개 사왔다. 설탕도 1kg 담음']],
    ['다이어트 기록', ['아침 계란 2개, 점심 닭 200g, 저녁 두부 1모. 소금 안 쓰고 3주 했더니 5kg 빠짐']],
    ['식당 메뉴판', ['김치찌개 9000원 2인분, 계란말이 8000원 1개, 공기밥 1000원 2개, 소주 5000원']],
    ['요리 도구 홍보', ['에어프라이어 1대로 감자 300g, 고구마 2개, 치즈 1장까지 다 됩니다 후기 500개']],
  ]
  for (const [이름, 타래] of 가짜들) assert.equal(레시피있나({ 글타래: 타래 }), false, `${이름} 은 레시피가 아니다`)

  // 순서 표시만 있어도 레시피다 — 조리 동작을 요구하면 무침·드레싱이 막힌다
  assert.equal(레시피있나({ 글타래: ['🧡재료🧡 도라지 300g 오이 1개 고춧가루 1.5T 고추장 1T\n🧡순서🧡 1.쓴맛빼기 2.절이기'] }), true)
  // 번호 목록이 셋 이상이면 만드는 차례로 본다
  assert.equal(레시피있나({ 글타래: ['두부 1모 간장 2큰술 설탕 1큰술\n1. 썬다\n2. 굽는다\n3. 졸인다'] }), true)
  // 계량이 촘촘하면 순서가 없어도 레시피다 (드레싱처럼 섞기만 하는 글)
  assert.equal(레시피있나({ 글타래: ['올리브오일 2큰술 간장 1큰술 식초 1큰술 레몬즙 1큰술 알룰로스 1큰술 참기름 0.5큰술'] }), true)


  // 조리 계량과 장보기 단위가 섞인 진짜 레시피 — 단위만 세면 이게 막힌다. 실제로 막혔다
  assert.equal(레시피있나({ 글타래: ['두부 1모, 계란 2개, 대파 1단, 소금 약간, 후추 약간, 올리브오일 3t, 버터 15g'] }), true,
    '어림말("약간")이 있으면 레시피다 — 장보기·메뉴판은 이렇게 안 쓴다')
  // 조리 계량이 촘촘하면 어림말이 없어도 레시피다
  assert.equal(레시피있나({ 글타래: ['돼지고기 300g 양파 1개 대파 1대 마늘 5쪽 간장 2큰술 설탕 1큰술 후추'] }), true)
  // 재료만 늘어놓은 장보기 자랑은 아니다
  assert.equal(레시피있나({ 글타래: ['마트에서 두부 2모 계란 1판 우유 2개 버터 1개 설탕 1kg 마늘 3쪽 사왔다'] }), false)
  // **구매말로 막지 않는다.** "쿠팡에서 사왔어, 링크 줄게" 하면서 레시피를 적는 글이 흔하다 —
  // 우리 글이 바로 그 꼴이다. 조리말·순서가 있으면 구매말이 있어도 레시피다
  assert.equal(레시피있나({ 글타래: [
    '이거 쿠팡에서 사왔는데 진짜 좋아 링크 줄게\n두부 1모 계란 2개 대파 1단 간장 2큰술\n1. 썬다\n2. 굽는다\n3. 졸인다',
  ] }), true, '사왔다가 있어도 레시피면 통과한다')
  assert.equal(레시피있나({ 글타래: ['김치찌개 9000원 2인분, 계란말이 8000원 1개, 공기밥 1000원 2개, 소주 5000원'] }), false)

console.log('통과 — 레시피 판정 검사 19개')
