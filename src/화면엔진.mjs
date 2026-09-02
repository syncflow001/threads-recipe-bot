// 대시보드 서버가 쓰는 함수들 — 옛 설정화면.mjs 1~664줄을 그대로 복사해 내보낸 것.
// 옛 파일은 2026-08-28 에 archive/2026-08-28-옛-대시보드/ 로 옮겼다. 지금 도는 것은 이 파일이다
import './그물.mjs'   // IPv6 헛디딤 막기 (부수 효과) — 왜인지는 그 파일 머리에 있다
import { readFile, writeFile, access, readdir, unlink, stat, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { 안전쓰기 } from './장부쓰기.mjs'
import {
  수익, 발행격자, 최근글, 시각표켜기, 시각표끄기, 시각표찾기,
  길들이기켜기, 길들이기끄기, 길들이기찾기,
  성적켜기, 성적끄기, 성적찾기,
  헬스체크켜기, 헬스체크끄기, 헬스체크찾기,
  알리미켜기, 알리미끄기, 알리미찾기,
} from './대시보드.mjs'
import { 장부읽기 as 길들이기장부읽기, 설정 as 길들이기설정 } from './길들이기.mjs'
import { 읽기 as 보관함읽기, 빼기 as 보관함빼기, 보관함길, 보관기간일 } from './보관함.mjs'
import { 하루한번찍기, 장부읽기 as 팔로워장부읽기, 증감 } from './팔로워.mjs'
import {
  한판 as 성적한판, 장부읽기 as 성적장부읽기, 요약 as 성적요약,
  기본간격시간 as 성적기본간격, 기본개수 as 성적기본개수,
} from './성적.mjs'
import { 진단 as 성장진단 } from './성장.mjs'
import {
  읽기 as 목표읽기, 쓰기 as 목표쓰기, 달성 as 목표달성, 속도 as 목표속도, 최대목표,
} from './수익목표.mjs'
import { 합치기, 전환, 요일별, 달별, 달견주기, 벌이있는날 } from './수익분석.mjs'
import { 등급 as 등급매기기, 설정 as 점수설정, 등급순위 } from './score.mjs'
import {
  차림 as 활동차림, 다듬기 as 활동다듬기, 팔로워찾기옵션,
} from './활동설정.mjs'
import { 계정열쇠읽기, 첫판날짜찾기, 계정토큰읽기 } from './감시모음.mjs'
import { 장부읽기 as 활동장부읽기, 초안읽기 as 교류초안읽기, 초안버리기 as 교류초안버리기,
  옛장부옮기기 } from './교류하기.mjs'
import { 자식환경, 열쇠줄 } from './열쇠파일.mjs'
import { 쿠키주인 } from './계정벽.mjs'
import { 설정 as 알리미설정 } from './조회수알리미.mjs'
import { 초안쓰기 as 팔로우초안쓰기, 초안읽기 as 팔로우초안읽기,
  초안버리기 as 팔로우초안버리기, 설정 as 팔로우설정 } from './팔로우하기.mjs'
import { 초안읽기 as 답하기초안읽기, 초안버리기 as 답하기초안버리기 } from './답하기.mjs'
import { 정보, 정보쓰기, 정보지우기, 검사, 고침검사, 못하는것, 꼬리겹침, 이름꼴, 공유열쇠, 보일아이디, 미디어뿌리,
  분야들, 언어들, 제휴들, 수익채널, 첫계정있나, 계정길, 계정목록 as 계정목록읽기 } from './계정.mjs'
import { 계정팩, 되는조합, 고르기 as 팩고르기 } from './팩.mjs'
import { 말투추천, 퍼지는계정찾기, 한도 as 추천한도 } from './말투추천.mjs'
import { 한마디, 카드다듬기 } from './말투다듬기.mjs'
import { 꺼내기 as 보관함꺼내기 } from './보관함.mjs'
import { 재구성 } from './compose.mjs'
import { 멈춤인가, 멈추기, 풀기 } from './멈춤.mjs'
import { 막힌글들, 막힌글버리기 } from './관문.mjs'
import { 진단, 한줄답 } from './진단.mjs'
import { 기준선찍기, 이력읽기 as 도달이력읽기 } from './도달.mjs'
import { 상태읽기 as 점검상태읽기, 기록읽기 as 점검기록읽기, 전체자리 } from './점검기록.mjs'
import { extname, join, basename } from 'node:path'
import { createReadStream } from 'node:fs'

// 옛 파일에 흩어져 있던 전역 변수를 하나로 모은 것. 라우트가 상태통.계정별[계정].기록 처럼 읽고 쓴다.
// ⚠️ 도는중 은 **하나뿐이다.** 이것이 「한 번에 한 계정만 돈다」를 지킨다 — 크롬이 하나라서,
// 두 판이 겹치면 같은 글이 두 번 올라가거나 A 계정 글이 B 계정으로 나간다 (2026-08-26 실측).
// 계정마다 쪼개면 안 된다. 나눈 것은 「보여 주는 것」뿐이다 (2026-08-29)
export const 상태통 = {
  도는중: null,
  계정별: {},
  샘플도는중: false,
  대화도는중: false,
  추천도는중: false,
  후보도는중: false,
  토큰도는중: false,
  업데이트도는중: false,
}

// 계정 칸을 없으면 만들어 돌려준다. 첫 계정은 빈 문자열이 키다
export function 계정칸(계정 = '') {
  상태통.계정별[계정] ??= { 기록: [], 진행: null, 마지막결과: null }
  return 상태통.계정별[계정]
}

// 넷째 칸은 「어디서 어떻게 받나」 세 줄이다. 화면에서 이름에 마우스를 올리면 뜬다 —
// 열쇠마다 받는 곳이 달라서, 받으러 갈 때마다 사용법 문서를 뒤지게 되기 때문이다
export const 열쇠들 = [
  // 앱 ID·시크릿은 모든 계정이 함께 쓰는 하나뿐이라 표 맨 위에 둔다. 이 둘이 없으면 토큰을 아예 못 받는다
  ['THREADS_APP_ID', '토큰을 받으려면 먼저 필요', false, [
    'developers.facebook.com → 내 앱 → 앱 만들기',
    '사용 사례 Threads API → 설정에서 앱 ID·시크릿',
    'Threads 테스터에 그 계정 추가 → 스레드 앱에서 초대 수락',
  ]],
  ['THREADS_APP_SECRET', '토큰을 받으려면 먼저 필요', false, [
    'developers.facebook.com → 내 앱 → 앱 만들기',
    '사용 사례 Threads API → 설정에서 앱 ID·시크릿',
    'Threads 테스터에 그 계정 추가 → 스레드 앱에서 초대 수락',
  ]],
  ['THREADS_ACCESS_TOKEN', '스레드에 올리는 데 필요', true, [
    '메타 개발자 앱에 그 스레드 계정을 먼저 연결',
    '터미널에서 threads-login.mjs 를 돌리면 브라우저가 열린다',
    '60일마다 다시 받는다 · 허용 화면에서 항목을 다 켠다',
  ]],
  ['THREADS_USER_ID', '내 스레드 계정 번호', true, [
    '안 넣으셔도 된다',
    '토큰을 저장하면 저희가 스레드에 물어 채운다',
    '토큰이 딴 계정 것이면 그때 알려 준다',
  ]],
  ['THREADS_COOKIE', '조회수·등급을 보려면 필요', false, [
    '크롬에서 threads.com 로그인 → 오른쪽 클릭 「검사」',
    'Network 탭 → ⌘R → 목록 맨 위 → Request Headers',
    'cookie: 로 시작하는 줄의 뒷부분 전체 (아주 길다)',
  ]],
  ['COUPANG_ACCESS_KEY', '쿠팡 제휴 링크용', false, [
    'partners.coupang.com 가입 후 승인까지 기다린다',
    '「내 정보 → REST API 키 발급」',
    '두 값 중 Access Key 쪽',
  ]],
  ['COUPANG_SECRET_KEY', '쿠팡 제휴 링크용', false, [
    '위와 같은 화면의 Secret Key 쪽',
    '발급할 때 한 번만 보인다 · 놓치면 다시 발급',
    '남에게 보이면 안 되는 값이다',
  ]],
  ['BLOB_READ_WRITE_TOKEN', '영상을 같이 올리려면 필요', false, [
    'vercel.com → Storage → Blob 만들기 (무료로 시작)',
    '그 스토어의 Read/Write Token 복사',
    '영상 올릴 때만 쓴다 · 사진만이면 없어도 된다',
  ]],
  ['TELEGRAM_BOT_TOKEN', '쿠키가 죽으면 텔레그램으로 알림', false, [
    '텔레그램에서 @BotFather 를 찾아 /newbot',
    '봇 이름을 정하면 토큰을 준다',
    '만든 봇에게 말을 한 번 걸어 둔다',
  ]],
  ['TELEGRAM_CHAT_ID', '알림을 받을 내 텔레그램 번호', false, [
    '먼저 그 봇에게 아무 말이나 보낸다',
    'api.telegram.org/bot토큰/getUpdates 를 브라우저로 연다',
    'chat 의 id 숫자를 복사한다',
  ]],
]

const 있나 = (p) => access(p).then(() => true, () => false)
// 계정 열쇠는 그 계정 폴더 안에 산다. `.env.local` 은 **공용 열쇠**(쿠팡·텔레그램·앱) 자리라
// 계정 폴더로 옮기지 않는다 — 계정이 아니라 이 맥 전체의 것이다 (2026-08-29)
export const 열쇠파일 = (계정) => (계정 ? 계정길(계정, '열쇠.env') : '.env.local')
export const 말투파일 = (계정) => 계정길(계정, 'persona.json')

// ⚠️ **계정 말투와 이름이 같으면 안 된다** (2026-08-29). 뿌리의 이 파일은 어느 계정 것도 아니고
// 「말투 추천」이 새 말투를 지을 때 쓰는 **바탕 서식**이다. 옛 이름이 `persona.json` 이라
// 계정 말투(`계정/<이름>/persona.json`)와 헷갈렸다 — 회고에서 잡혔다
export const 말투바탕파일 = '말투바탕.json'

// 계정 이름은 실제 스레드 아이디다 (src/계정.mjs 와 같은 규칙)
export const 계정꼴 = 이름꼴

// 목록을 뽑는 규칙은 src/계정.mjs 하나뿐이다 — 여기서 다시 적지 않는다 (2026-08-29)
export const 계정목록 = () => 계정목록읽기()

export async function 상태(계정) {
  const 원문 = await readFile(열쇠파일(계정), 'utf8').catch(() => '')
  const 첫원문 = 계정 ? await readFile('.env.local', 'utf8').catch(() => '') : 원문
  // 값은 절대 밖으로 내보내지 않는다. 채워졌는지만 알린다
  const 열쇠 = 열쇠들.map(([이름, 설명, 필수, 받는법]) => {
    const 공유 = 공유열쇠.has(이름)
    return {
      이름, 설명, 필수, 공유, 받는법,
      // 공유 열쇠는 첫 계정 파일이 진짜다. 계정 전용 파일은 안 봐도 된다
      채움: new RegExp(`^${이름}=.+`, 'm').test(공유 ? 첫원문 : 원문),
    }
  })
  const 말투원문 = await readFile(말투파일(계정), 'utf8').catch(() => '')
  let 말투 = null
  try {
    const p = JSON.parse(말투원문)
    말투 = {
      정체성: p.정체성 ?? '',
      말투: p.말투 ?? '',
      표현: (p['자주 쓰는 표현'] ?? []).join(', '),
      // 이모지는 계정 것이다 (2026-09-02). 화면에서 고칠 수 있게 함께 내려 준다
      이모지: p['본문 이모지'] ?? '',
      예시: p['내 글 예시'] ?? [],
      뜻: p['한국어 뜻'] ?? null,
    }
  } catch {}
  let 그정보 = await 정보(계정)
  // 첫 계정은 이름이 빈 값이라 실제 아이디가 장부에 없다. 토큰이 있으면 한 번만 물어 적어 둔다.
  // /status 는 시간마다 두드리지 않으므로 이 호출이 쌓이지 않는다 — 한 번 적히면 다시 안 묻는다
  if (!계정 && !그정보.아이디) {
    await 나를알아내기(계정).catch(() => {})
    그정보 = await 정보(계정)
  }
  const 이름표 = {}
  const 아이디표 = {}
  for (const c of await 계정목록()) {
    const 그것 = await 정보(c)
    이름표[c] = 그것.별칭
    아이디표[c] = 보일아이디(c, 그것)
  }
  return {
    계정, 계정들: await 계정목록(), 이름표, 아이디표, 열쇠, 말투, 말투있나: !!말투원문,
    // 팔로우 한 판·하루 몫. 화면이 초안에 「이번 판에는 안 함」을 표시하는 데 쓴다 —
    // 화면에 숫자를 박아 두면 여기 값과 조용히 어긋난다
    팔로우몫: { 한판: 팔로우설정.한판, 하루: 팔로우설정.하루한계 },
    멈춤: await 멈춤인가(계정),
    아이디: 보일아이디(계정, 그정보),
    정보: 그정보, 못함: 못하는것(그정보),
    // 수익 화면이 「어느 채널 숫자인가」를 그리는 데 쓴다. 규칙을 화면에 또 적으면
    // 언젠가 한쪽만 바뀐다 (2026-08-30)
    수익채널: 수익채널(그정보.제휴),
    고를것: { 분야: Object.keys(분야들), 언어: Object.keys(언어들), 제휴: Object.keys(제휴들) },
    // 마법사가 단계마다 보여 줄 안내. 분야마다 다르다 — 뷰티 계정을 만드는 사람에게
    // 요리 예시를 보여 주면 말투가 요리 쪽으로 끌려간다.
    // 아직 안 열린 분야는 묶음이 없다. 없으면 그 분야는 그냥 빠진다
    분야안내: Object.fromEntries(Object.keys(분야들).flatMap((이름) => {
      try { return [[이름, 계정팩({ 분야: 이름, 언어: 그정보.언어, 제휴: '없음' }).분야팩.마법사안내]] }
      catch { return [] }
    })),
    // 어떤 분야 × 언어 조합이 실제로 되는지. 화면이 이것으로 안내하고 막는다
    되는조합: 되는조합(),
  }
}

// 있던 줄은 바꾸고 없던 줄은 붙인다. 손으로 적어 둔 주석과 다른 값은 건드리지 않는다
// 쿠키의 주인이 이 계정이 맞나 — 토큰의 나를알아내기() 와 짝이다.
//
// 왜 필요한가. 2026-08-29 에 sample_table 칸에 sample_minimi 의 쿠키가 들어가 있었다.
// 토큰은 주인을 물어봐서 「딴 계정」이라고 막는데 **쿠키는 아무 검사가 없었다.**
// 그래서 조회수가 하나도 안 와 며칠을 헛돌았고, 알림은 「쿠키가 죽었다」는 틀린 말을 했다.
//
// ⚠️ 주인을 **못 읽었을 때는 막지 않는다** (계정벽.mjs 의 규칙과 같다).
// 스레드가 화면 꼴을 바꾸면 이 검사가 열쇠 저장을 통째로 세운다 — 그건 사고를 막는 게 아니다
export async function 쿠키주인검사(계정, 쿠키, { 묻기 = 쿠키주인 } = {}) {
  if (!String(쿠키 ?? '').trim()) return { 건너뜀: '쿠키가 비어 있습니다' }
  const 기대 = 보일아이디(계정, await 정보(계정).catch(() => null))
  if (!기대) return { 건너뜀: '이 계정의 스레드 아이디를 아직 몰라 확인을 건너뛰었습니다' }
  const 진짜 = await 묻기(쿠키).catch(() => null)
  if (!진짜) return { 못읽음: '이 쿠키가 누구 것인지 확인하지 못했습니다 — 그대로 저장했습니다' }
  if (진짜 !== 기대) {
    return { 주인: 진짜, 어긋남: `이 쿠키는 "${진짜}" 계정 것입니다. "${기대}" 계정 칸에는 넣을 수 없습니다` }
  }
  return { 주인: 진짜 }
}

export async function 열쇠저장(계정, 받은것, 공유무시 = false, { 쿠키묻기 = 쿠키주인 } = {}) {
  // 공유 열쇠는 어느 계정 화면에서 넣든 첫 계정 파일에 쓴다. 한 곳만 두어야 헷갈리지 않는다
  if (!공유무시 && 계정) {
    const 공유것 = Object.fromEntries(Object.entries(받은것).filter(([k]) => 공유열쇠.has(k)))
    if (Object.keys(공유것).length) await 열쇠저장('', 공유것, true)
    받은것 = Object.fromEntries(Object.entries(받은것).filter(([k]) => !공유열쇠.has(k)))
    if (!Object.keys(받은것).length) return
  }
  // 쓰기 **전에** 쿠키 주인을 확인한다. 쓴 뒤에 알리면 이미 틀린 값이 파일에 남는다
  let 쿠키확인 = null
  if (String(받은것.THREADS_COOKIE ?? '').trim()) {
    쿠키확인 = await 쿠키주인검사(계정, 받은것.THREADS_COOKIE, { 묻기: 쿠키묻기 })
    if (쿠키확인.어긋남) throw new Error(쿠키확인.어긋남)
  }

  const 경로 = 열쇠파일(계정)
  let 원문 = await readFile(경로, 'utf8').catch(() => '')
  for (const [이름, 값] of Object.entries(받은것)) {
    if (!열쇠들.some(([n]) => n === 이름)) continue // 모르는 이름은 무시한다
    const 다듬 = String(값 ?? '').trim()
    if (!다듬) continue // 빈 칸은 "안 바꾼다" 는 뜻이다. 지우려면 파일을 직접 연다
    const 줄 = 열쇠줄(이름, 다듬)
    const 자리 = new RegExp(`^${이름}=.*$`, 'm')
    원문 = 자리.test(원문) ? 원문.replace(자리, 줄) : `${원문.replace(/\n*$/, '\n')}${줄}\n`
  }
  await 안전쓰기(경로, 원문, { mode: 0o600 })
  return 쿠키확인
}

// 스레드 User ID 는 사람이 알기 어렵다. 토큰만 있으면 스레드가 알려 준다 —
// 그래서 계정 추가 때 받지 않고 열쇠를 넣는 순간 우리가 채운다
export async function 나를알아내기(계정) {
  const 원문 = await readFile(열쇠파일(계정), 'utf8').catch(() => '')
  const 토큰 = 원문.match(/^THREADS_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (!토큰) return { 없음: '토큰이 아직 없습니다' }
  try {
    const r = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${토큰}`)
    const j = await r.json()
    if (!r.ok || !j.id) return { 없음: j?.error?.message ?? '토큰이 맞지 않습니다' }
    await 열쇠저장(계정, { THREADS_USER_ID: j.id })
    // 아이디도 적어 둔다. 첫 계정은 이름이 빈 값이라 이게 없으면 화면에 보여 줄 것이 없다
    await 정보쓰기(계정, { userId: j.id, ...(j.username ? { 아이디: j.username } : {}) })
    // 토큰이 딴 계정 것이면 글이 엉뚱한 데로 올라간다. 반드시 알린다
    const 어긋남 = 계정 && j.username && j.username !== 계정
      ? `이 토큰은 "${j.username}" 계정 것입니다. 계정 이름과 다릅니다` : null
    return { id: j.id, username: j.username, 어긋남 }
  } catch (e) { return { 없음: e.message } }
}

// ─── 프로필 사진 ──────────────────────────────────────────────────
// 스레드 공식 API 가 주소를 준다. **그 주소는 만료된다** — 메타 CDN 주소에는 만료 시각이 박혀 있고
// 미디어 주소는 하루 반이면 죽는다 (이 저장소가 실측했다). 그래서 주소를 화면에 그대로 주지 않고
// 우리 쪽에 한 장 받아 두고 그것을 보여 준다. 하루 지나면 다시 받는다
const 프로필사진길 = (계정) => join(미디어뿌리(계정), '프로필.jpg')

export async function 프로필사진챙기기(계정) {
  const 길 = 프로필사진길(계정)
  const 나이 = await stat(길).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity)
  if (나이 < 24 * 60 * 60 * 1000) return 길

  const 원문 = await readFile(열쇠파일(계정), 'utf8').catch(() => '')
  const 토큰 = 원문.match(/^THREADS_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (!토큰) throw new Error('토큰이 아직 없습니다')

  const r = await fetch(`https://graph.threads.net/v1.0/me?fields=threads_profile_picture_url&access_token=${토큰}`)
  const j = await r.json()
  const 주소 = j?.threads_profile_picture_url
  if (!주소) throw new Error(j?.error?.message ?? '프로필 사진이 없습니다')

  const 사진 = await fetch(주소)
  if (!사진.ok) throw new Error(`사진을 못 받았습니다 (${사진.status})`)
  await mkdir(미디어뿌리(계정), { recursive: true })
  await 안전쓰기(길, Buffer.from(await 사진.arrayBuffer()))
  return 길
}

// 이모지 규칙을 안 정한 계정에 깔아 주는 값. 팩이 아니라 여기 있는 까닭 —
// 이모지는 계정 것이라 팩이 못 정하는데, 빈 칸이면 프롬프트에서 줄이 통째로 빠진다
const 기본이모지 = '맨 끝에 딱 하나만. 음식과 어울리는 것으로.'

export async function 말투저장(계정, 받은것) {
  const 경로 = 말투파일(계정)
  const 바탕 = await readFile(경로, 'utf8').catch(() => null)
  const p = 바탕 ? JSON.parse(바탕) : JSON.parse(await readFile(말투바탕파일, 'utf8'))
  p.정체성 = String(받은것.정체성 ?? '').trim()
  p.말투 = String(받은것.말투 ?? '').trim()
  p['자주 쓰는 표현'] = String(받은것.표현 ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  p['내 글 예시'] = (받은것.예시 ?? []).map((s) => String(s).trim()).filter(Boolean)
  // ⚠️ 2026-09-02 — 이모지는 **계정 것**이다 (사용자 결정: 말투·이모티콘·소재는 계정).
  //    화면이 안 보내면 있던 값을 지키고, 그것도 없으면 기본값을 넣는다 —
  //    빈 칸으로 두면 프롬프트에 [본문 이모지] 줄이 통째로 빠져 이모지 규칙이 사라진다
  const 이모지 = String(받은것.이모지 ?? '').trim()
  if (이모지) p['본문 이모지'] = 이모지
  else if (!String(p['본문 이모지'] ?? '').trim()) p['본문 이모지'] = 기본이모지
  // 외국어 계정은 말투 칸이 그 언어다. 주인이 못 읽으므로 한국어 뜻을 함께 적어 둔다.
  // compose 는 모르는 칸을 안 본다 — 글에는 영향이 없고 화면에서만 쓴다
  const 뜻 = 받은것.뜻
  if (뜻 && (뜻.정체성 || 뜻.말투 || 뜻.표현)) {
    p['한국어 뜻'] = {
      정체성: String(뜻.정체성 ?? '').trim(),
      말투: String(뜻.말투 ?? '').trim(),
      표현: String(뜻.표현 ?? '').trim(),
    }
  } else if (받은것.뜻지움) {
    delete p['한국어 뜻']
  }
  await 안전쓰기(경로, JSON.stringify(p, null, 2) + '\n')
}

// ─── 말투 칸의 단추 셋 (2026-08-26) ─────────────────────────────
// 내려받기 · 샘플 보기 · 대화로 다듬기. 셋 다 **말투 파일을 건드리지 않는다** —
// 파일에 쓰는 것은 「말투 저장」뿐이다. 샘플도 대화도 화면의 값으로만 돈다

// 화면에 있는 네 칸을 말투 파일 위에 얹어 임시 페르소나를 만든다.
// 저장하지 않은 값으로도 샘플을 볼 수 있어야 한다 — 저장하고 나서야 확인되면 순서가 거꾸로다
export async function 임시페르소나(계정, 카드) {
  const ㅋ = 카드다듬기(카드)
  const 바탕 = await readFile(말투파일(계정), 'utf8').catch(() => null)
  const p = 바탕 ? JSON.parse(바탕) : JSON.parse(await readFile(말투바탕파일, 'utf8'))
  return {
    ...p,
    정체성: ㅋ.정체성,
    말투: ㅋ.말투,
    '자주 쓰는 표현': ㅋ.표현.split(',').map((v) => v.trim()).filter(Boolean),
    '내 글 예시': ㅋ.예시,
  }
}

// 샘플은 저장소 글로 만든다. 지어낸 원글로 보여 주면 실제와 다른 결이 나온다.
// **가장 좋은 글 하나로 고정한다** — 말투를 바꿔 가며 견주려면 원글이 같아야 한다
export async function 말투샘플(계정, 카드) {
  if (상태통.샘플도는중) throw new Error('샘플이 이미 돌고 있습니다. 끝날 때까지 기다려 주세요')
  const 것들 = await 보관함꺼내기({ 파일: 보관함길(계정) })
  if (!것들.length) {
    return { 안됨: '저장소에 글이 없습니다 — 「돌리기」 쪽 「저장소에 글 모으기」를 먼저 눌러 주세요' }
  }
  const 원글 = 것들[0]
  상태통.샘플도는중 = true
  try {
    진행시작('말투 샘플', 계정)
    알림담기(`저장소에서 ${원글.등급} 글 한 편을 꺼냈습니다`, 계정)
    const 묶음 = 계정팩(await 정보(계정)).분야팩
    알림담기('지금 화면의 말투로 다시 쓰는 중입니다 — 1분쯤 걸립니다', 계정)
    const 글 = await 재구성(원글, { 페르소나: await 임시페르소나(계정, 카드), 묶음 })
    const 값 = {
      본문: 글.본문, 레시피: 글.레시피, 글이름: 묶음.글이름,
      원글: { code: 원글.code, 작성자: 원글.작성자 ?? '', 등급: 원글.등급, 본문: String(원글.본문 ?? '').slice(0, 300) },
    }
    진행끝(값, 계정)
    return 값
  } finally { 상태통.샘플도는중 = false; 진행끝(undefined, 계정) }
}

// 대화는 서버가 기억하지 않는다. 화면이 이력을 들고 매번 통째로 보낸다 —
// 새로고침하면 사라지지만, 서버에 상태를 두면 계정을 바꿀 때 남의 대화가 섞인다
export async function 말투대화(계정, 몸통) {
  if (상태통.대화도는중) throw new Error('앞의 말이 아직 안 끝났습니다')
  상태통.대화도는중 = true
  try {
    const 그정보 = await 정보(계정)
    const { 분야팩, 언어팩 } = 계정팩(그정보)
    return await 한마디({
      카드: 몸통.카드, 대화: 몸통.대화, 분야팩, 언어팩, 별칭: 그정보.별칭 ?? 계정,
    })
  } finally { 상태통.대화도는중 = false }
}

// 계정을 하나 늘린다. 열쇠 서식과 말투 서식을 만들어 두면 그때부터 목록에 뜬다.
// 레시피 형식·분량 규칙은 첫 계정 것을 물려준다. 말투만 비운다 —
// 계정마다 달라야 하는 건 '누가 어떻게 말하는가' 지 레시피 생김새가 아니다
export async function 계정만들기(받은것) {
  const 값 = 검사(받은것)
  const 이름 = 값.계정
  if (await 있나(열쇠파일(이름))) throw new Error(`"${이름}" 계정이 이미 있습니다`)
  // 꼬리표 머리가 겹치면 어느 계정이 벌었는지 못 가른다
  const 겹친것 = await 꼬리겹침(이름)
  if (겹친것) throw new Error(`"${겹친것}" 계정과 쿠팡 꼬리표가 겹칩니다. 앞 8글자를 다르게 해 주세요`)
  // 팩은 파일을 하나라도 쓰기 전에 본다. 뒤에서 던지면 열쇠 파일만 남은 반쪽 계정이 생기고,
  // 그 파일 때문에 다시 시도할 때마다 "이미 있습니다" 로 막혀 빠져나갈 길이 없어진다.
  // 실제로 당했다 — 요리 × 일본어 × 아마존 재팬 을 고르자 그 꼴이 됐다 (2026-08-23)
  const 묶음 = 계정팩(값).분야팩

  const 서식 = await readFile('.env.example', 'utf8').catch(() =>
    열쇠들.map(([n]) => `${n}=`).join('\n') + '\n')
  // 공유 열쇠를 빈 줄로 넣으면 .env.local 의 값을 가린다 — 실행할 때 뒤 파일이 이기기 때문이다.
  // 이것 때문에 Blob 토큰이 빈 값으로 읽혀 영상이 통째로 안 붙었다
  const 계정것만 = 서식.split('\n').filter((l) => !공유열쇠.has(l.split('=')[0].trim())).join('\n')
  await 안전쓰기(열쇠파일(이름), 계정것만, { mode: 0o600 })

  // 말투 뼈대는 분야가 준다. 분야와 상관없이 persona.json 을 베끼면
  // 뷰티 계정이 "첫 줄은 이모지와 요리이름" 같은 요리 규칙을 물려받는다.
  // 요리 묶음은 서식이 없다 — persona.json 이 이미 요리 말투라서 그것을 그대로 쓴다
  // ⚠️ 2026-09-02 — **팩 서식을 여기 베끼지 않는다.** 전에는 `...바탕` 으로 형식 칸 아홉을
  //    새 말투 파일에 그대로 박았다. 그러면 계정 하나만 새로 만들어도 「형식은 팩 것」이라는
  //    약속이 그 자리에서 깨진다 (검수 에이전트가 잡았다). 형식은 서식깔기가 판마다 깔아 준다
  await 안전쓰기(말투파일(이름), JSON.stringify({
    _설명: `${이름} 계정의 말투만 담는다 — 정체성·말투·이모지·자주 쓰는 표현·내 글 예시. `
      + '글의 생김새와 뼈대는 분야 팩이 정한다. 이 화면에서 채우면 된다.',
    // 이모지는 계정 것이라 팩이 안 채워 준다. 비워 두면 프롬프트에서 통째로 빠지므로 기본값을 심는다
    '본문 이모지': 기본이모지,
    정체성: '',
    말투: '',
    '자주 쓰는 표현': [],
    '내 글 예시': [],
  }, null, 2) + '\n')
  await 정보쓰기(이름, 값)
  return 이름
}

// ─── 추천 키워드 ──────────────────────────────────────────────────
// 그 계정의 **분야 × 언어** 팩이 들고 있는 검색어 풀에서 셋을 준다.
// 일본어 계정에 한국어 낱말을 보여 주면 그 낱말로는 일본 글이 안 나온다
const 추천자리표 = new Map()

export async function 키워드추천(계정) {
  const 그정보 = await 정보(계정)
  const 풀 = (() => {
    try { return 팩고르기(그정보.분야, 그정보.언어).분야팩.검색어 ?? 분야들[그정보.분야]?.키워드 ?? [] }
    catch { return 분야들[그정보.분야]?.키워드 ?? [] }  // 아직 안 열린 조합이면 분야 목록으로 물러선다
  })()
  const 담긴것 = new Set((그정보.검색어 ?? []).map((v) => v.toLowerCase()))
  const 남은것 = 풀.filter((v) => !담긴것.has(v.toLowerCase()))
  // 새로고침을 누를 때마다 자리를 민다. 같은 셋이 다시 나오면 새로고침이 아니다
  const 자리 = 추천자리표.get(계정) ?? 0
  추천자리표.set(계정, 자리 + 3)
  const 시작 = 남은것.length ? ((자리 % 남은것.length) + 남은것.length) % 남은것.length : 0
  return {
    분야: 그정보.분야,
    언어: 그정보.언어,
    추천: [...남은것.slice(시작), ...남은것.slice(0, 시작)].slice(0, 3),
    예: 풀[0] ?? '',
  }
}

// ─── 오래 걸리는 찾기의 진행 상황 ──────────────────────────────────
// 1분 넘게 걸리는데 화면이 가만히 있으면 사람은 멈춘 줄 안다 (사용자가 겪었다).
// 안에서 이미 단계마다 알림을 만들고 있었는데 아무 데도 안 보냈다 — 여기 담아 화면이 가져간다

// 화면을 새로고침하면 이쪽 일은 그대로 도는데 결과를 받을 창이 없어진다.
// 그래서 **끝난 결과를 잠깐 들고 있는다** — 다시 열린 화면이 가져갈 수 있게 (10분)
const 결과보관 = 10 * 60 * 1000

export const 진행시작 = (무엇, 계정) => {
  계정칸(계정).진행 = { 무엇, 계정, 단계들: [], 시작: Date.now(), 멈춤: false }
}
export const 진행끝 = (값, 계정) => {
  const 칸 = 계정칸(계정)
  if (값 && 칸.진행) 칸.마지막결과 = { 무엇: 칸.진행.무엇, 계정, 값, 때: Date.now() }
  칸.진행 = null
}
export const 알림담기 = (글, 계정) => {
  const 칸 = 계정칸(계정)
  if (!칸.진행) return
  칸.진행.단계들.push(String(글))
  if (칸.진행.단계들.length > 40) 칸.진행.단계들.shift()
}
// 오래 걸리는 고리 안에서 이걸 부른다. 멈춤을 눌렀으면 그 자리에서 던진다
export const 멈췄나 = (계정) => { if (계정칸(계정).진행?.멈춤) throw new Error('중단했습니다') }

// 말투 추천 — 그 분야에서 잘 퍼지는 계정들을 읽어 시작점을 만들어 준다 (src/말투추천.mjs).
// 검색을 두드리는 일이라 동시에 두 번 돌지 못하게 막는다 —
// 한 단어를 하루 열몇 번 두드리면 스레드가 그 단어를 조이고 자동 발행이 빈손으로 돈다
// 「재추천」을 누를 때마다 검색어 자리를 민다. 같은 단어를 거듭 두드리면 그 단어가 조인다
let 추천자리 = 0
export async function 말투추천하기(계정) {
  if (상태통.추천도는중) throw new Error('추천이 이미 돌고 있습니다. 끝날 때까지 기다려 주세요')
  상태통.추천도는중 = true
  try {
    const 그정보 = await 정보(계정)
    // 쿠키는 그 계정 것을 먼저 쓰고, 없으면 첫 계정 것을 쓴다 —
    // 새로 만든 계정은 아직 쿠키가 없다. 조회수를 보려면 로그인 쿠키가 있어야 한다
    const 원문 = await readFile(열쇠파일(계정), 'utf8').catch(() => '')
    const 첫원문 = await readFile('.env.local', 'utf8').catch(() => '')
    const 꺼내기 = (t) => t.match(/^THREADS_COOKIE=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
    const cookie = 꺼내기(원문) || 꺼내기(첫원문)
    const 자리 = 추천자리
    추천자리 += 추천한도.검색어
    진행시작('말투 추천', 계정)
    const r = await 말투추천(그정보.분야, {
      언어: 그정보.언어, cookie, 자리, 알림: (글) => 알림담기(글, 계정), 멈췄나: () => 멈췄나(계정),
    })
    진행끝(r, 계정)   // 새로고침으로 창이 사라졌어도 결과는 남는다
    return r
  } finally { 상태통.추천도는중 = false; 진행끝(undefined, 계정) }
}

// 계정 이름 말고 나머지를 고친다. 이름은 안 받는다 — 그것은 파일·폴더·꼬리표의 이름이라
// 바꾸면 지난 수익 통계가 끊기고 폴더가 미아가 된다 (src/계정.mjs 의 고침검사 주석).
//
// 분야가 바뀌면 말투 뼈대도 새 분야 것으로 갈아 끼운다. 안 갈면 요리 계정을 뷰티로 바꿔도
// 말투 파일에 "첫 줄은 '이모지 **요리이름**'" 이 그대로 남아 지시문에 실려 나간다.
// 사람이 쓴 것(정체성·말투·표현·예시)은 그대로 지킨다 — 그건 분야가 아니라 사람의 것이다
export async function 계정고치기(계정, 받은것) {
  const 옛정보 = await 정보(계정)
  const 값 = 고침검사(받은것, 계정)
  const 분야바뀜 = 값.분야 !== 옛정보.분야
  await 정보쓰기(계정, 값)
  const 뼈대갈았나 = 분야바뀜 ? await 말투뼈대갈기(계정, 값.분야, 값.언어) : false
  return { ...(await 상태(계정)), 분야바뀜, 뼈대갈았나, 옛분야: 옛정보.분야 }
}

export async function 말투뼈대갈기(계정, 분야, 언어 = '한국어') {
  let 뼈대
  // 요리 묶음은 서식이 없다 — persona.json 이 이미 요리 말투라 그것을 뼈대로 쓴다.
  // 언어·제휴는 뼈대와 상관없어 기본값으로 부른다
  try { 뼈대 = 계정팩({ 분야, 언어, 제휴: '없음' }).분야팩.말투서식 } catch { return false }
  if (!뼈대) 뼈대 = await readFile(말투바탕파일, 'utf8').then(JSON.parse).catch(() => null)
  if (!뼈대) return false
  const 경로 = 말투파일(계정)
  const 옛 = await readFile(경로, 'utf8').then(JSON.parse).catch(() => ({}))
  await 안전쓰기(경로, JSON.stringify({
    ...뼈대,
    _설명: `${계정 || '첫'} 계정의 말투. 이 화면에서 채우면 된다.`,
    정체성: 옛.정체성 ?? '',
    말투: 옛.말투 ?? '',
    '자주 쓰는 표현': 옛['자주 쓰는 표현'] ?? [],
    '내 글 예시': 옛['내 글 예시'] ?? [],
  }, null, 2) + '\n')
  return true
}

// 계정을 지운다. 미디어는 손대지 않는다 — 지우면 되돌릴 수 없고, 원글은 남겨 둬도 해가 없다
export async function 계정지우기(계정, 확인별칭) {
  if (!계정) throw new Error('첫 계정은 지울 수 없습니다')
  const 그정보 = await 정보(계정)
  if (String(확인별칭 ?? '').trim() !== 그정보.별칭) {
    throw new Error(`지우려면 별칭 "${그정보.별칭}" 을 그대로 입력해 주세요`)
  }
  await 시각표끄기(계정).catch(() => {}) // 시각표가 없으면 실패하는 게 정상이다
  await unlink(열쇠파일(계정)).catch(() => {})
  await unlink(말투파일(계정)).catch(() => {})
  await unlink(`${계정}-persona.json.backup`).catch(() => {})
  for (const f of await readdir('logs').catch(() => [])) {
    if (f.startsWith(`${계정}-`) || f === `마지막발행-${계정}.txt`) {
      await unlink(join('logs', f)).catch(() => {})
    }
  }
  await 정보지우기(계정)
  return { 지움: 그정보.별칭 }
}

// ─── 돌리기 ────────────────────────────────────────────────────────
// 한 번에 하나만 돈다. 두 판이 겹치면 같은 글을 두 번 올릴 수 있다

// 열쇠를 물려 가며 스크립트 하나를 돌리고, 나오는 글을 기록으로 흘린다.
// 발행·길들이기·하트댓글이 다 이 자리를 쓴다 — 화면은 「돌려 본 기록」 한 칸만 본다
export function 스크립트돌리기(계정, 꼬리, { 환경 = {}, 설명 = null, 쉘 = null, 실행막기 = false } = {}) {
  // 잠금은 하나다. 어느 계정이 돌고 있는지 알려 준다 — 「왜 안 되지」를 사람이 알 수 있게
  if (상태통.도는중) {
    const 그계정 = 상태통.도는중.계정 || '첫 계정'
    return { 안됨: `이미 돌고 있습니다 (${그계정})` }
  }
  if (실행막기) return { 안됨: '검사에서는 안 돌립니다' }
  const 칸 = 계정칸(계정)
  칸.기록.length = 0
  // 공유 열쇠는 첫 계정 것을 물려받는다. 뒤 파일이 이긴다
  const 열쇠파일들 = [...(계정 ? ['.env.local'] : []), 열쇠파일(계정)]
  // 감시(헬스체크·알리미)는 `.sh` 다. 그 안에서 스스로 --env-file 을 준다 —
  // 헬스체크는 **부모 환경에 계정 열쇠가 없어야** 제대로 잰다 (인계 §7-17)
  const 인자 = 쉘 ? [쉘] : [...열쇠파일들.map((f) => `--env-file=${f}`), ...꼬리]

  // 명령 줄은 영문 그대로 둔다 (우리가 원인을 찾을 때 쓴다). 대신 **무슨 일을 하는지 한 줄**을 붙인다 —
  // 이 칸은 비개발자가 읽는다 (2026-08-24 에 사용자가 요청했다)
  칸.기록.push(`$ ${쉘 ? 'bash' : 'node'} ${인자.join(' ')}${계정 ? `   (계정 ${계정})` : ''}\n`)
  칸.기록.push(`${설명 ?? 무슨일인가(꼬리, 계정)}\n\n`)
  const 아이 = spawn(쉘 ? '/bin/bash' : process.execPath, 인자, {
    // ⚠️ **부모 환경을 그대로 물려주지 마라.** 위 주석의 사고가 그렇게 났다
    env: { ...자식환경(process.env, 열쇠파일들), ...(계정 ? { PROFILE: 계정 } : {}), ...환경 },
  })
  상태통.도는중 = { 아이, 계정 }
  const 받기 = (덩이) => {
    칸.기록.push(String(덩이))
    if (칸.기록.length > 400) 칸.기록.splice(0, 칸.기록.length - 400)
  }
  아이.stdout.on('data', 받기)
  아이.stderr.on('data', 받기)
  아이.on('close', (코드) => {
    칸.기록.push(`\n─── 끝 (종료코드 ${코드}) ───\n`)
    상태통.도는중 = null
  })
  return { 시작함: true }
}

// 한 판에 저장소를 채울 목표. 홈에서 걷는 양이 판마다 다르니 늘 채워지지는 않는다
export const 모을목표 = 10

export function 돌리기(계정, 단계, 키워드) {
  const 꼬리 = ['run.mjs', ...키워드]
  // 「모으기」는 올리지도 만들지도 않는다. 홈을 넓게 훑어 보관함만 채운다.
  if (단계 === '모으기') {
    return 스크립트돌리기(계정, 꼬리, {
      // COLLECT 를 줘야 보관함이 차 있어도 홈을 훑는다. 안 주면 아무것도 안 걷힌다 (run.mjs ①)
      // SCROLL 은 홈을 몇 번 내릴까다. 걷은 글은 전부 열어 본다 — 실측으로 홈 74편 가운데
      // 레시피가 있는 것은 3편뿐이었다. 몇 편만 열어 보면 목표 10개를 채울 길이 없다.
      // TOP 은 안 준다. 모으기에서는 쓰이지 않는다
      환경: { LIMIT: '0', SCROLL: '50', COLLECT: String(모을목표) },
      설명: `▶ ${계정 ? `@${계정} 계정으로 ` : ''}홈을 넓게 훑어 **쓸 만한 글을 저장소에 쟁여 둡니다.** `
        + `아무것도 만들지도 올리지도 않습니다. 목표는 ${모을목표}개입니다.`,
    })
  }
  if (단계 !== '보기') 꼬리.push('--받기', '--재구성')
  if (단계 === '발행') 꼬리.push('--발행')
  return 스크립트돌리기(계정, 꼬리)
}

// 무슨 일을 하는 중인지 한 줄로 알려 준다. 명령 줄만 보고는 알 수가 없다
export function 무슨일인가(꼬리, 계정) {
  const 누구 = 계정 ? `@${계정} 계정으로 ` : ''
  if (꼬리[0]?.includes('길들이기')) {
    return `▶ ${누구}스레드 홈을 훑어보고 그 언어 글 몇 편을 열어 봅니다. 아무것도 올리지 않습니다.`
  }
  const 어떻게 = 꼬리.includes('--보기만') ? ' **초안만 만듭니다 — 아무것도 올리지 않습니다.** 끝나면 활동 칸에 초안이 뜹니다.'
    : 꼬리.includes('--초안') ? ' **확인한 초안을 그대로 올립니다.**' : ' 완전 자동 — 바로 올립니다.'
  if (꼬리[0]?.includes('답하기')) {
    return `▶ ${누구}내 글에 달린 남의 댓글을 화면에서 읽고 하트·답글을 준비합니다.${어떻게}`
  }
  if (꼬리[0]?.includes('교류하기')) {
    return `▶ ${누구}남의 글에 하트 몇 개와 댓글 하나를 준비합니다.${어떻게}`
  }
  if (꼬리.includes('--발행')) {
    return `▶ ${누구}글을 모아 → 내 말투로 다시 쓰고 → **실제로 스레드에 올립니다.**`
  }
  if (꼬리.includes('--재구성')) {
    return `▶ ${누구}글을 모아 내 말투로 다시 써 봅니다. 올리지는 않습니다.`
  }
  return `▶ ${누구}지금 어떤 글이 걷히는지 보기만 합니다. 아무것도 만들지도 올리지도 않습니다.`
}

// 활동 — 사람이 단추를 누를 때만 한 판 돈다. 시각표에 걸지 않는다 (하트·댓글은 특히)
export const 활동스크립트 = {
  길들이기: 'src/길들이기.mjs', 하트댓글: 'src/교류하기.mjs',
  답하기: 'src/답하기.mjs', 팔로우: 'src/팔로우하기.mjs',
}

// 팔로우할 후보를 찾아 **초안으로 담아 둔다.** 말투 추천이 쓰는 부품 그대로다.
// 찾기만 하고 누르지는 않는다 — 사람이 목록을 보고 「이대로 팔로우」를 눌러야 나간다
// (2026-08-26, 사용자가 「팔로우도 네가 직접 해라」고 정했다. 다만 문은 하트·댓글과 같게 뒀다)
export async function 팔로우후보찾기(계정) {
  if (상태통.후보도는중) throw new Error('이미 찾고 있습니다. 끝날 때까지 기다려 주세요')
  상태통.후보도는중 = true
  try {
    const 그정보 = await 정보(계정)
    const cookie = (await readFile(열쇠파일(계정), 'utf8').catch(() => ''))
      .match(/^THREADS_COOKIE=(.+)$/m)?.[1]?.trim()
    const 자리 = 추천자리
    추천자리 += 추천한도.검색어
    진행시작('팔로워 찾기', 계정)
    const 계정들 = await 퍼지는계정찾기(그정보.분야, {
      언어: 그정보.언어, cookie, 자리, 알림: (글) => 알림담기(글, 계정), 멈췄나: () => 멈췄나(계정),
      한도옵션: 팔로워찾기옵션(추천한도, 그정보.활동설정),
    })
    const r = {
      언어: 그정보.언어,
      후보들: 계정들.map((c) => ({ 작성자: c.작성자, 팔로워: c.팔로워, 확산: c.확산 })),
    }
    // 찾은 것을 초안으로 남긴다. 화면을 새로고침해도 남아야 「이대로 팔로우」를 누를 수 있다
    if (r.후보들.length) await 팔로우초안쓰기(계정, { 언어: r.언어, 후보들: r.후보들 })
    진행끝(r, 계정)
    return r
  } finally { 상태통.후보도는중 = false; 진행끝(undefined, 계정) }
}

// ─── 서버 ──────────────────────────────────────────────────────────
const 보내기 = (res, 코드, 몸통, 종류 = 'application/json; charset=utf-8') => {
  res.writeHead(코드, { 'Content-Type': 종류, 'Cache-Control': 'no-store' })
  res.end(typeof 몸통 === 'string' ? 몸통 : JSON.stringify(몸통))
}

const 몸통읽기 = (req) =>
  new Promise((맞이, 뿌리치기) => {
    let 쌓임 = ''
    req.on('data', (덩이) => {
      쌓임 += 덩이
      if (쌓임.length > 200_000) { 뿌리치기(new Error('너무 큽니다')); req.destroy() }
    })
    req.on('end', () => { try { 맞이(JSON.parse(쌓임 || '{}')) } catch (e) { 뿌리치기(e) } })
  })

// 터미널 길들. 로그인 빼고는 전부 통행증이 있어야 한다. 화면 출력만 GET(SSE), 나머지는 POST

// ─── 점검 쪽이 쓰는 안전장치 — archive/2026-08-28-옛-대시보드/src/설정화면-안전.mjs 에서 몸통을 그대로 옮긴 것 ───
// 「전부 멈추기」 단추는 어느 계정 화면에서 눌렀든 늘 전체를 멈춘다 — 사람이 실수로
// "이 계정만 멈췄나" 헷갈리면 안 되기 때문이다
export async function 전체멈추기(뿌리 = process.cwd()) {
  await 멈추기('', 뿌리)
  return 멈춤인가('', 뿌리)
}

// 「다시 켜기」는 전체와 지금 보고 있는 계정을 함께 푼다. 단추 한 번으로 다시 도는 게 맞다
export async function 계정풀기(계정, 뿌리 = process.cwd()) {
  await 풀기('', 뿌리)
  if (계정) await 풀기(계정, 뿌리)
  return 멈춤인가(계정, 뿌리)
}

export async function 막힌글목록(계정, 뿌리 = process.cwd()) {
  return 막힌글들(뿌리, 계정)
}

// code 가 이상하면 막힌글버리기 가 던진다 — 여기서 감싸지 않는다.
// 그 검사가 보류함 밖을 못 건드리게 막는 마지막 문이라 조용히 삼키면 안 된다
export async function 막힌글지우기(계정, code, 뿌리 = process.cwd()) {
  await 막힌글버리기(code, 뿌리, 계정)
  return { 버림: true }
}

export async function 계정진단(계정, 뿌리 = process.cwd()) {
  // 아홉 줄만 돌려주면 사람이 「그래서 왜 안 올라갔나」를 스스로 읽어 내야 한다.
  // 답을 먼저 주고 근거를 뒤에 둔다
  const 것들 = await 진단(계정, { 뿌리 })
  return { 답: 한줄답(것들), 것들 }
}

// 「기준값 다시 측정」는 사람이 누른 명시적 행동이다 — 그래서 다시:true 로 덮어쓴다.
// 조회수는 그 계정 자기 토큰으로만 답한다 (실측)
export async function 기준선다시찍기(계정, 뿌리 = process.cwd()) {
  const 토큰 = await 계정토큰읽기(계정, 뿌리)
  return 기준선찍기(계정, { 다시: true, 뿌리, 토큰 })
}

// 매일 아침 감시기가 쌓아 둔 도달 이력에서 그 계정 것만, 최근 날부터 뽑는다.
// 화면은 파일에서 읽는다 — 프로세스가 다시 켜져도 남아 있어야 한다
export async function 도달추이(계정, { 뿌리 = process.cwd(), 날수 = 14 } = {}) {
  const 줄들 = (await 도달이력읽기(계정, 뿌리))
    .sort((a, b) => String(a.날짜).localeCompare(String(b.날짜)))
  return { 줄들: 줄들.slice(-날수), 마지막: 줄들[줄들.length - 1] ?? null }
}

// ─── 점검 쪽이 쓰는 화면용 읽기 ─────────────────────────────────────
// 전체자리 는 계정을 안 가리는 전체 문제다(전체점검, src/점검돌기.mjs). 그 계정 것과 늘 함께 준다
export async function 점검문제들(계정, 뿌리 = process.cwd()) {
  const [내것, 전체것] = await Promise.all([
    점검상태읽기(계정, 뿌리), 점검상태읽기(전체자리, 뿌리),
  ])
  return [...내것, ...전체것]
}

// ⚠️ 이력도 문제들과 같은 꼴로 전체 것을 합친다. 안 합치면 헬스체크 꺼짐·알리미 꺼짐처럼
// 가장 중요한 사건이 개요에는 빨갛게 뜨는데 「언제부터인가」를 볼 곳이 아무 데도 없다 (2026-08-29 검토)
export async function 점검이력(계정, 뿌리 = process.cwd()) {
  const [내것, 전체것] = await Promise.all([
    점검기록읽기(계정, 뿌리, 200),
    점검기록읽기(전체자리, 뿌리, 200),
  ])
  return [...내것, ...전체것].sort((가, 나) => String(나.때).localeCompare(String(가.때))).slice(0, 200)
}
