// 계정마다 다른 정보를 담고 꺼낸다 — 별칭·스레드 번호·분야·언어·제휴사
import { readFile, writeFile, unlink, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const 장부 = '계정정보.json'

// 계정이 달라도 같은 열쇠. 첫 계정(.env.local)에 한 번만 넣어 두면 나머지가 물려받는다 —
// 실행할 때 --env-file 을 둘 준다. 뒤 파일(계정 전용)이 이긴다.
// 복사해 두지 않는 이유는 하나다. 나중에 값을 바꿀 때 한 곳만 고치면 되기 때문이다
export const 공유열쇠 = new Set([
  'OPENAI_API_KEY', 'OPENAI_MODEL',
  'COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY',
  'BLOB_READ_WRITE_TOKEN',
  'THREADS_APP_ID', 'THREADS_APP_SECRET',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
])

// 계정 이름은 실제 스레드 아이디다 (@ 뒤의 영문). 파일 이름과 폴더 이름이 된다.
// 스레드 아이디 규칙과 같게 — 영문 소문자·숫자·점·밑줄, 30자까지
export const 이름꼴 = /^[a-z0-9._]{1,30}$/

// 쿠팡 SubID 는 [0-9A-Za-z_-] 20자까지고 글번호가 11자다. 계정 이름이 점을 담거나 길면 못 쓴다.
// 그래서 꼬리표에 쓸 머리는 따로 줄인다 — altteul.cart → altteulc
export function 꼬리머리(계정) {
  if (!계정) return 't' // 첫 계정이 지금까지 써 온 값이다. 바꾸면 지난 통계와 끊긴다
  const 줄인것 = String(계정).replace(/[^0-9A-Za-z]/g, '').slice(0, 8)
  return 줄인것 || 't'
}

// 둘만 돌려주면 그 둘이 조였을 때 그 판은 빈손으로 끝난다. 순서만 돌려주고
// 몇 개를 실제로 두드릴지는 아래에서 정한다 — 넉넉히 걷히면 거기서 멈춘다
export const 돌려쓰기 = (목록, 때 = new Date()) => {
  if (목록.length <= 2) return 목록
  // 시각을 그대로 4로 나누면 시각표가 0·8·12·16·20 처럼 4의 배수뿐일 때 늘 같은 값이 나온다.
  // 건너뛰는 폭은 목록 길이와 서로소여야 목록 전체를 돈다 — 2칸씩 뛰면 20개짜리 목록에서
  // 짝수 자리 열 개만 쓴다. 날짜를 더해 어제 안 쓴 자리가 오늘 쓰이게 밀어 준다.
  // 목록 길이도 아무 값이나 쓰면 안 된다 — 스무 개면 0시와 20시가 같은 자리를 집는다.
  // 스물셋처럼 24 와 어긋나는 길이여야 하루 안에 겹치지 않는다 (test.mjs 가 지킨다)
  const 시작 = (때.getHours() * 3 + 때.getDate()) % 목록.length
  return [...목록.slice(시작), ...목록.slice(0, 시작)]
}

// 분야마다 무엇을 찾고 어떻게 쓰는지가 다르다. 지금은 요리 하나만 채워져 있다.
// 새 분야를 넣으려면 여기 한 덩이를 더 쓰고 src/compose.mjs 의 지시문을 그 분야 것으로 갈아 끼운다
export const 분야들 = {
  // 한 단어를 하루 몇 번만 두드려도 스레드가 그 단어의 결과를 1개로 줄인다. 되돌아오는 데 하루가 넘게 걸린다 —
  // 실제로 여덟 중 여섯이 한꺼번에 조여서 자동 발행이 며칠간 빈손으로 돌았다. 풀이 넓어야 한 단어가 받는 횟수가 준다
  요리: {
    이름: '요리',
    키워드: [
      '레시피', '요리', '집밥', '한식', '자취요리', '간단요리', '반찬', '저녁메뉴',
      '김치찌개', '에어프라이어', '자취밥', '요리레시피', '간단레시피', '오늘뭐먹지',
      '백종원레시피', '밥반찬', '술안주', '아침메뉴', '다이어트식단', '초간단요리',
      '집들이음식', '도시락반찬', '냉장고털이',
    ],
    됨: true,
  },
  뷰티: { 이름: '뷰티', 키워드: ['화장품', '스킨케어', '메이크업'], 됨: false },
  IT: { 이름: 'IT', 키워드: ['개발', 'IT', '앱추천'], 됨: false },
  육아: { 이름: '육아', 키워드: ['육아', '아기', '이유식'], 됨: false },
  일상: { 이름: '일상', 키워드: ['일상', '브이로그'], 됨: false },
  캠핑: { 이름: '캠핑', 키워드: ['캠핑', '차박', '백패킹'], 됨: false },
  도서: { 이름: '도서', 키워드: ['책추천', '독서', '书'], 됨: false },
  AI: { 이름: 'AI', 키워드: ['AI', '챗지피티', '생성형AI'], 됨: false },
}

export const 언어들 = {
  한국어: { 이름: '한국어', 코드: 'ko', 됨: true },
  일본어: { 이름: '일본어', 코드: 'ja', 됨: false },
  영어: { 이름: '영어', 코드: 'en', 됨: false },
}

export const 제휴들 = {
  쿠팡파트너스: { 이름: '쿠팡파트너스', 됨: true },
  '아마존 재팬': { 이름: '아마존 재팬', 됨: false },
  '아마존 US': { 이름: '아마존 US', 됨: false },
  없음: { 이름: '없음', 됨: true },
}

const 기본값 = {
  별칭: '첫 계정',
  // userId 는 사람이 넣지 않는다. 토큰을 넣으면 스레드가 알려 준다 (설정화면.mjs 의 나를알아내기)
  userId: '',
  분야: '요리',
  언어: '한국어',
  제휴: '쿠팡파트너스',
}

export async function 장부읽기(뿌리 = process.cwd()) {
  return readFile(join(뿌리, 장부), 'utf8').then(JSON.parse).catch(() => ({}))
}

const 장부쓰기 = (값, 뿌리 = process.cwd()) =>
  writeFile(join(뿌리, 장부), JSON.stringify(값, null, 2) + '\n')

// 한 계정의 정보. 장부에 없으면 기본값으로 본다 — 첫 계정은 장부가 생기기 전부터 돌고 있었다
export async function 정보(계정, 뿌리 = process.cwd()) {
  const 전부 = await 장부읽기(뿌리)
  return { ...기본값, ...(전부[계정] ?? {}), 계정 }
}

export async function 정보쓰기(계정, 값, 뿌리 = process.cwd()) {
  const 전부 = await 장부읽기(뿌리)
  전부[계정] = { ...기본값, ...(전부[계정] ?? {}), ...값 }
  delete 전부[계정].계정 // 열쇠가 곧 계정이다. 안에 또 넣지 않는다
  await 장부쓰기(전부, 뿌리)
  return { ...전부[계정], 계정 }
}

// 꼬리표 머리가 겹치면 어느 계정이 벌었는지 못 가른다. 미리 막는다
export async function 꼬리겹침(계정, 뿌리 = process.cwd()) {
  const 머리 = 꼬리머리(계정)
  const 전부 = await 장부읽기(뿌리)
  for (const 딴계정 of Object.keys(전부)) {
    if (딴계정 !== 계정 && 꼬리머리(딴계정) === 머리) return 딴계정
  }
  return null
}

export async function 정보지우기(계정, 뿌리 = process.cwd()) {
  const 전부 = await 장부읽기(뿌리)
  delete 전부[계정]
  await 장부쓰기(전부, 뿌리)
}

// 미디어는 계정마다 나눈다. 분야가 다르면 겹칠 일이 없고, 같은 분야끼리도
// 각자 뽑은 글을 각자 관리하는 편이 헷갈리지 않는다 (사용자가 정했다).
// 첫 계정은 예전부터 media/ 를 써 왔다. 그대로 둔다 — 옮기다 잃는 것이 더 나쁘다
export const 미디어뿌리 = (계정) => (계정 ? join('media', 계정) : 'media')

export function 검사(값) {
  const 계정 = String(값.계정 ?? '').trim().toLowerCase()
  if (!계정) throw new Error('스레드 계정 이름을 넣어 주세요 (@ 뒤의 영문)')
  if (!이름꼴.test(계정)) throw new Error('계정 이름은 영문 소문자·숫자·점·밑줄만 됩니다')
  if (계정 === 'local' || 계정 === 'example') throw new Error(`"${계정}" 은 쓸 수 없는 이름입니다`)
  const 별칭 = String(값.별칭 ?? '').trim()
  if (별칭.length > 20) throw new Error('별칭은 20자까지입니다')
  if (!분야들[값.분야]) throw new Error('없는 분야입니다')
  if (!언어들[값.언어]) throw new Error('없는 언어입니다')
  if (!제휴들[값.제휴]) throw new Error('없는 제휴사입니다')
  return { 계정, 별칭: 별칭 || 계정, 분야: 값.분야, 언어: 값.언어, 제휴: 값.제휴 }
}

// 아직 코드가 없는 것을 고르면 무엇이 안 되는지 알린다. 조용히 요리 글을 뱉으면 안 된다
export function 못하는것(정보) {
  const 말 = []
  if (!분야들[정보.분야]?.됨) 말.push(`분야 "${정보.분야}" 는 아직 글을 못 씁니다 (지금은 요리만)`)
  if (!언어들[정보.언어]?.됨) 말.push(`언어 "${정보.언어}" 는 아직 못 씁니다 (지금은 한국어만)`)
  if (!제휴들[정보.제휴]?.됨) 말.push(`"${정보.제휴}" 는 아직 링크를 못 만듭니다 (지금은 쿠팡만)`)
  return 말
}
