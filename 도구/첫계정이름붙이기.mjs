// 이름 없는 첫 계정(.env.local · persona.json · 장부의 "" 키)을 <이름> 계정으로 옮긴다. 기본은 마른 판.
//   node 도구/첫계정이름붙이기.mjs example.cook            ← 무엇을 옮길지만 찍는다
//   node 도구/첫계정이름붙이기.mjs example.cook --실행     ← 옮긴다(자동 발행·성적 launchd 를 먼저 내린다)
//   node 도구/첫계정이름붙이기.mjs --되돌리기 첫계정백업/2026-08-28-1530
//   node 도구/첫계정이름붙이기.mjs --글계정고치기 example.cook          ← 이미 옮겨진 뒤 재구성.json 의
//   node 도구/첫계정이름붙이기.mjs --글계정고치기 example.cook --실행    발행.계정 "" 만 이름으로 (마른 판이 기본)
import { readFile, writeFile, rename, mkdir, rmdir, readdir, stat, copyFile, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { 이름꼴 } from '../src/계정.mjs'
import { 안전쓰기 } from '../src/장부쓰기.mjs'

const 기본실행 = promisify(execFile)
const 진짜런치폴더 = join(homedir(), 'Library', 'LaunchAgents')

// 실행 을 안 넘겼다 = 진짜 launchctl 을 쓰겠다는 뜻이다. 그런데 런치폴더가 임시 폴더면 사고다 —
// plist 파일은 임시 폴더에 나도, launchctl load 는 라벨로 진짜 launchd 에 job 을 등록한다.
// 임시 런치폴더 + 진짜 실행 조합이 실제로 유령 예약을 진짜 시스템에 남긴 적이 있다(2026-08-28,
// 검사가 이 조합으로 돌아 com.threads.auto.example.cook 등이 진짜 launchd 에 등록됐었다 — 교훈 참고).
// 정상 CLI(진짜 런치폴더 + 진짜 실행)와 정상 검사(임시 런치폴더 + 가짜 실행)는 그대로 통과한다
function 실행고르기(받은실행, 런치폴더) {
  if (받은실행) return 받은실행
  if (런치폴더 !== 진짜런치폴더) {
    throw new Error('런치폴더가 진짜 LaunchAgents 가 아닌데 실행 을 안 넘겼다 — 검사라면 가짜 실행 을 넘기세요')
  }
  return 기본실행
}

// .env.local 안에서 계정 전용인 세 줄. 나머지(THREADS_APP_ID 같은 공유 열쇠)는 그대로 둔다
const 계정키들 = ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID', 'THREADS_COOKIE']

// "" 키를 옮기는 장부 다섯
const 다섯장부 = ['계정정보.json', '팔로워장부.json', '글성적장부.json', '도달기준선.json', '길들이기장부.json']

// media 에서 계정별로 옮길 조각들. 미디어지문.json 은 계정별 중복 막이 장부다(계획 표는 「전체 공용」
// 이라 적었지만 실측이 틀렸다 — src/미디어지문.mjs:35 · run.mjs:54 · src/계정.mjs:153, 안 옮기면
// 지문이 빈 채로 시작해 이미 올린 사진을 다시 올린다)
const 미디어조각들 = ['쓴것', '받은것', '프로필.jpg', '미디어지문.json']

// 자동 발행·성적 launchd 의 옛 라벨 ↔ 새 라벨
const 라벨쌍 = (이름) => [
  { 옛라벨: 'com.example.threads', 새라벨: `com.threads.auto.${이름}` },
  { 옛라벨: 'com.threads.score.main', 새라벨: `com.threads.score.${이름}` },
]

const 존재 = (경로) => stat(경로).then(() => true, () => false)
const 목록읽기 = (경로) => readdir(경로).catch(() => [])
const 둘자리 = (n) => String(n).padStart(2, '0')
const 지금꼬리만들기 = (d) =>
  `${d.getFullYear()}-${둘자리(d.getMonth() + 1)}-${둘자리(d.getDate())}-${둘자리(d.getHours())}${둘자리(d.getMinutes())}`

// .env.local 원문을 계정 전용 세 줄과 나머지로 나눈다. 세 키가 다 있어야 나눈다 — 하나라도 없으면
// 계정것 '' 을 돌려주고 원문을 그대로 남은것으로 준다 (섣불리 반쪽만 뜯어내지 않는다)
export function 열쇠세줄나누기(원문) {
  const 글 = String(원문 ?? '')
  const 다있나 = 계정키들.every((k) => new RegExp(`^${k}=`, 'm').test(글))
  if (!다있나) return { 계정것: '', 남은것: 글 }
  const 줄들 = 글.split('\n')
  const 계정줄인가 = (줄) => 계정키들.some((k) => 줄.startsWith(`${k}=`))
  return {
    계정것: `${줄들.filter(계정줄인가).join('\n')}\n`,
    남은것: 줄들.filter((줄) => !계정줄인가(줄)).join('\n'),
  }
}

// 장부 객체의 "" 키를 이름으로 바꾼다. 이름 키가 이미 있으면 두 계정 기록이 섞이니 멈춘다
export function 키바꾸기(장부객체, 이름, 파일명 = '') {
  if (Object.prototype.hasOwnProperty.call(장부객체, 이름)) {
    throw new Error(`이미 있다: ${파일명 || 이름}`)
  }
  const { '': 값, ...나머지 } = 장부객체
  return 값 === undefined ? { ...나머지 } : { ...나머지, [이름]: 값 }
}

// 글(재구성.json) 하나의 발행.계정 이 "" 일 때만 이름으로 바꾼 새 객체를 돌려준다(불변 — 원본은 안 건드린다).
// 발행 칸이 없거나(발행 안 된 초안) 계정이 이미 다른 값이면(남의 계정 글일 수 있다) 바꿀 게 없다는 뜻으로
// null 을 돌려준다 — 대시보드.mjs·성적.mjs·도달.mjs 세 곳이 발행.계정 을 정확히 견주므로 첫 계정 이름을
// 옮길 때 이 칸도 같이 옮겨야 성적·도달·최근글이 안 멈춘다
export function 글계정바꾸기(글객체, 이름) {
  if (!글객체?.발행 || 글객체.발행.계정 !== '') return null
  return { ...글객체, 발행: { ...글객체.발행, 계정: 이름 } }
}

// 되돌리기 용 — 위와 반대 방향(이름 → ""). 조건이 뒤집혀 헷갈리니 대칭 함수를 하나 더 둔다
export function 글계정되돌리기(글객체, 이름) {
  if (!글객체?.발행 || 글객체.발행.계정 !== 이름) return null
  return { ...글객체, 발행: { ...글객체.발행, 계정: '' } }
}

// 쓴것폴더 아래 모든 <code>/재구성.json 을 읽어 바꾸기함수 가 null 이 아닌 것만 골라 돌려준다.
// 쓰기는 안 한다(호출부가 재구성글쓰기 로 한다) — 마른 판에서 개수만 셀 때도 이 함수를 그대로 쓴다
async function 재구성글고치기(쓴것폴더, 바꾸기함수) {
  const 코드들 = await 목록읽기(쓴것폴더)
  const 후보 = []
  for (const code of 코드들) {
    const 경로 = join(쓴것폴더, code, '재구성.json')
    const 글 = await readFile(경로, 'utf8').then((글) => JSON.parse(글)).catch(() => null)
    const 새글 = 글 && 바꾸기함수(글)
    if (새글) 후보.push({ code, 경로, 새글 })
  }
  return 후보
}

// 재구성글고치기 의 결과를 실제로 안전쓰기 로 저장한다. 원본과 서식을 최대한 맞추려 했으나(원본도
// JSON.stringify(글, null, 2) 로 쓰인다 — run.mjs:390), 발행.계정 한 칸 말고는 값이 안 바뀌므로 안전하다
async function 재구성글쓰기(후보들) {
  for (const { 경로, 새글 } of 후보들) await 안전쓰기(경로, JSON.stringify(새글, null, 2))
}

// 이미 옮겨진 media/<이름>/쓴것 의 재구성.json 발행.계정 "" 를 이름으로 고친다 — 도구 ①의 이관을
// 놓쳐 성적·도달·최근글이 멈춘 계정을 나중에 손으로 메꾸는 길. 마른 판이 기본이다
export async function 글계정고치기(이름, { 뿌리 = process.cwd(), 마른판 = true } = {}) {
  const 쓴것폴더 = join(뿌리, 'media', 이름, '쓴것')
  const 후보 = await 재구성글고치기(쓴것폴더, (글) => 글계정바꾸기(글, 이름))
  if (!마른판) await 재구성글쓰기(후보)
  return { 고칠것: 후보.map((c) => c.code) }
}

// 옮길 것 목록 — 순수 함수. I/O 는 호출하는 쪽(옮기기)이 미리 훑어 파일목록 으로 건네준다
//   파일목록 = { 최상위, logs, media, launchd } — 각 폴더의 readdir 결과
export function 옮길목록(뿌리, 이름, 파일목록) {
  const { 최상위 = [], logs = [], media = [], launchd = [], 글기록후보수 = 0 } = 파일목록 ?? {}
  const 항목들 = []

  항목들.push({
    무엇: '.env.local 스레드 열쇠',
    에서: '.env.local',
    으로: `.env.${이름}`,
    방법: 최상위.includes('.env.local') ? '새로쓰기' : '없음',
  })
  항목들.push({
    무엇: 'persona.json',
    에서: 'persona.json',
    으로: `persona.${이름}.json`,
    방법: 최상위.includes('persona.json') ? '복사' : '없음',
  })
  항목들.push({
    무엇: '보관함.json',
    에서: '보관함.json',
    으로: `보관함.${이름}.json`,
    방법: 최상위.includes('보관함.json') ? '이동' : '없음',
  })
  for (const 조각 of 미디어조각들) {
    항목들.push({
      무엇: `media/${조각}`,
      에서: `media/${조각}`,
      으로: `media/${이름}/${조각}`,
      방법: media.includes(조각) ? '이동' : '없음',
    })
  }
  항목들.push({
    무엇: `media/${이름}/쓴것 의 재구성.json 발행.계정`,
    에서: '발행.계정 ""',
    으로: `발행.계정 "${이름}" (${글기록후보수}편)`,
    방법: 글기록후보수 > 0 ? '글계정고치기' : '없음',
  })
  항목들.push({
    무엇: '활동장부.main.jsonl',
    에서: '활동장부.main.jsonl',
    으로: `활동장부.${이름}.jsonl`,
    방법: 최상위.includes('활동장부.main.jsonl') ? '이동' : '없음',
  })
  항목들.push({
    무엇: '알림기록.main.jsonl',
    에서: '알림기록.main.jsonl',
    으로: `알림기록.${이름}.jsonl`,
    방법: 최상위.includes('알림기록.main.jsonl') ? '이동' : '없음',
  })
  항목들.push({
    무엇: 'logs/마지막발행.txt',
    에서: 'logs/마지막발행.txt',
    으로: `logs/마지막발행-${이름}.txt`,
    방법: logs.includes('마지막발행.txt') ? '이동' : '없음',
  })
  for (const f of logs.filter((f) => /^\d{4}-\d{2}\.log$/.test(f))) {
    항목들.push({ 무엇: `logs/${f}`, 에서: `logs/${f}`, 으로: `logs/${이름}-${f}`, 방법: '이동' })
  }
  for (const f of logs.filter((f) => /^성적-\d{4}-\d{2}\.log$/.test(f))) {
    const 달 = f.replace(/^성적-/, '')
    항목들.push({ 무엇: `logs/${f}`, 에서: `logs/${f}`, 으로: `logs/성적-${이름}-${달}`, 방법: '이동' })
  }
  for (const 장부 of 다섯장부) {
    항목들.push({
      무엇: `${장부} "" 키`,
      에서: `${장부}[""]`,
      으로: `${장부}["${이름}"]`,
      방법: 최상위.includes(장부) ? '키바꾸기' : '없음',
    })
  }
  for (const { 옛라벨, 새라벨 } of 라벨쌍(이름)) {
    항목들.push({
      무엇: `launchd ${옛라벨}`,
      에서: 옛라벨,
      으로: 새라벨,
      방법: launchd.includes(`${옛라벨}.plist`) ? 'launchd' : '없음',
    })
  }
  return 항목들
}

// plist 글에서 딱 세 곳만 바꾼다 — Label · ProgramArguments 끝에 계정 인자 · 로그 파일 이름.
// 시각(StartCalendarInterval)·간격(StartInterval)·WorkingDirectory 는 손대지 않는다
export function plist바꾸기(옛글, { 새라벨, 이름 }) {
  // 정규식이 헛돌면(=plist 꼴이 달라졌으면) 조용히 지나치지 않는다 — 계정 인자 없는 plist 가
  // 올라가면 자동발행.sh 가 빈 PROFILE 로 돌며 열쇠 빠진 첫 계정 꼴로 조용히 멈춘다. 그게 제일 나쁘다
  const 라벨바뀜 = 옛글.replace(/(<key>Label<\/key><string>)[^<]*(<\/string>)/, `$1${새라벨}$2`)
  if (라벨바뀜 === 옛글) throw new Error(`plist 꼴이 예상과 다르다: ${새라벨} (Label 을 못 찾았다)`)

  const 인자넣음 = 라벨바뀜.replace(
    /(<string>[^<]*\.sh<\/string>)(\s*)<\/array>/,
    (전체, sh줄, 사이) => `${sh줄}\n    <string>${이름}</string>${사이}</array>`,
  )
  if (인자넣음 === 라벨바뀜) throw new Error(`plist 꼴이 예상과 다르다: ${새라벨} (ProgramArguments 를 못 찾았다)`)

  let 새글 = 인자넣음.replace(
    /(<key>StandardOutPath<\/key><string>[^<]*\/logs\/[^.<]*)(\.out<\/string>)/,
    `$1-${이름}$2`,
  )
  새글 = 새글.replace(
    /(<key>StandardErrorPath<\/key><string>[^<]*\/logs\/[^.<]*)(\.err<\/string>)/,
    `$1-${이름}$2`,
  )
  return 새글
}

export async function 옮기기(이름, {
  뿌리 = process.cwd(),
  실행: 받은실행 = null,
  지금 = new Date(),
  마른판 = true,
  런치폴더 = 진짜런치폴더,
} = {}) {
  const 실행 = 실행고르기(받은실행, 런치폴더)
  if (!이름꼴.test(이름)) throw new Error('계정 이름은 영문 소문자·숫자·점·밑줄만 됩니다')

  const envLocal경로 = join(뿌리, '.env.local')
  const 새env경로 = join(뿌리, `.env.${이름}`)
  if (await 존재(새env경로)) throw new Error(`이미 있다: .env.${이름}`)

  const envLocal글 = await readFile(envLocal경로, 'utf8').catch(() => '')
  const { 계정것, 남은것 } = 열쇠세줄나누기(envLocal글)
  if (!계정것) throw new Error('스레드 열쇠 세 줄(ACCESS_TOKEN·USER_ID·COOKIE)이 다 있어야 옮길 수 있습니다')

  const 파일목록 = {
    최상위: await 목록읽기(뿌리),
    logs: await 목록읽기(join(뿌리, 'logs')),
    media: await 목록읽기(join(뿌리, 'media')),
    launchd: await 목록읽기(런치폴더),
    // media 를 옮기기 전(원래 자리)에 미리 세어 둔다 — 옮긴다고 재구성.json 내용이 바뀌진 않으므로
    // 마른 판 숫자와 실제로 고쳐질 개수가 같다
    글기록후보수: (await 재구성글고치기(join(뿌리, 'media', '쓴것'), (글) => 글계정바꾸기(글, 이름))).length,
  }

  // ① 장부 다섯에 이름 키가 이미 있는지 — rename 을 하나라도 하기 전에 전부 미리 검사한다.
  // 뒤(⑤)에서 발견하면 이미 launchd·env·persona·보관함·활동장부·media·logs 가 다 옮겨진 뒤라
  // 계정정보.json 이 원래 자리에서 사라진 채로 던지게 된다 — 그건 절반만 옮긴 채 멈추는 것이다
  for (const 장부 of 다섯장부.filter((장부) => 파일목록.최상위.includes(장부))) {
    const 객체 = JSON.parse(await readFile(join(뿌리, 장부), 'utf8'))
    if (Object.prototype.hasOwnProperty.call(객체, 이름)) throw new Error(`이미 있다: ${장부}`)
  }

  const 목록 = 옮길목록(뿌리, 이름, 파일목록)
  if (마른판) return { 목록 }

  // ③⑥ launchd 선검증 — 두 쌍(자동발행·성적) 다 새 글을 **먼저 전부** 만들어 본다. 하나라도 plist 꼴이
  // 안 맞으면 여기서 던진다 — 이 시점엔 백업폴더조차 아직 안 만들었다. 아무것도 안 건드린 채로 멈춘다.
  // 쌍이 둘이라 순차로 하나씩 커밋하면 앞선 쌍이 이미 올라간 채로 뒤쪽에서 던질 수 있어 미리 다 만든다
  const launchd쌍들 = []
  for (const { 옛라벨, 새라벨 } of 라벨쌍(이름)) {
    if (!파일목록.launchd.includes(`${옛라벨}.plist`)) continue
    const 옛경로 = join(런치폴더, `${옛라벨}.plist`)
    const 옛글 = await readFile(옛경로, 'utf8')
    launchd쌍들.push({ 옛라벨, 새라벨, 옛경로, 새글: plist바꾸기(옛글, { 새라벨, 이름 }) })
  }

  const 백업폴더 = join(뿌리, '첫계정백업', 지금꼬리만들기(지금))
  await mkdir(join(백업폴더, 'launchd'), { recursive: true })
  await 안전쓰기(join(백업폴더, '정보.json'), JSON.stringify({ 이름, 때: 지금.toISOString() }, null, 2) + '\n')

  try {
    const 언로드경고 = []
    for (const { 옛라벨, 새라벨, 옛경로, 새글 } of launchd쌍들) {
      const 되나 = await 실행('launchctl', ['unload', 옛경로]).then(() => true, () => false)
      if (!되나) 언로드경고.push(옛라벨) // 안 올라가 있던 정상 상황과 진짜 실패를 구분 못 하니 던지지 않고 화면에만 남긴다
      await rename(옛경로, join(백업폴더, 'launchd', `${옛라벨}.plist`))
      const 새경로 = join(런치폴더, `${새라벨}.plist`)
      await writeFile(새경로, 새글)
      await 실행('launchctl', ['load', 새경로])
    }

    // ④ .env — 원문 전부를 백업에, 세 줄만 .env.<이름> 에, 나머지는 .env.local 에 그대로
    await rename(envLocal경로, join(백업폴더, '.env.local'))
    await 안전쓰기(새env경로, 계정것, { mode: 0o600 })
    await 안전쓰기(envLocal경로, 남은것, { mode: 0o600 })

    // persona.json — 원본은 서식으로 그대로 두고 복사만 한다
    if (파일목록.최상위.includes('persona.json')) {
      await copyFile(join(뿌리, 'persona.json'), join(뿌리, `persona.${이름}.json`))
    }

    // 보관함 · 활동장부 · 알림기록 — 원본 → 백업(rename), 백업 → 새 자리(copy)
    const 단순이동 = [
      ['보관함.json', `보관함.${이름}.json`, 파일목록.최상위.includes('보관함.json')],
      ['활동장부.main.jsonl', `활동장부.${이름}.jsonl`, 파일목록.최상위.includes('활동장부.main.jsonl')],
      ['알림기록.main.jsonl', `알림기록.${이름}.jsonl`, 파일목록.최상위.includes('알림기록.main.jsonl')],
    ]
    for (const [파일, 새이름, 있음] of 단순이동) {
      if (!있음) continue
      const 백업경로 = join(백업폴더, 파일)
      await rename(join(뿌리, 파일), 백업경로)
      await copyFile(백업경로, join(뿌리, 새이름))
    }

    // logs — 마지막발행.txt · 있는 달의 YYYY-MM.log · 성적-YYYY-MM.log 전부
    const logs이동 = []
    if (파일목록.logs.includes('마지막발행.txt')) logs이동.push(['마지막발행.txt', `마지막발행-${이름}.txt`])
    for (const f of 파일목록.logs.filter((f) => /^\d{4}-\d{2}\.log$/.test(f))) logs이동.push([f, `${이름}-${f}`])
    for (const f of 파일목록.logs.filter((f) => /^성적-\d{4}-\d{2}\.log$/.test(f))) {
      logs이동.push([f, `성적-${이름}-${f.replace(/^성적-/, '')}`])
    }
    for (const [파일, 새이름] of logs이동) {
      const 백업경로 = join(백업폴더, 파일)
      await rename(join(뿌리, 'logs', 파일), 백업경로)
      await copyFile(백업경로, join(뿌리, 'logs', 새이름))
    }

    // media — 사진 폴더는 곧장 새 자리로 옮기고(rename), 백업엔 무엇을 옮겼는지 목록만 남긴다.
    // ⚠️ 목록은 rename 루프를 돌기 **전에** 먼저 쓴다 — 조각 일부만 옮긴 채 죽어도 되돌리기가
    // (존재 확인으로) 그 조각을 찾아 되돌릴 수 있어야 한다. 루프가 다 끝난 뒤에 쓰면 중간에 죽었을 때
    // 목록 자체가 없어 고아가 된다
    const 옮긴미디어 = 미디어조각들.filter((조각) => 파일목록.media.includes(조각))
    if (옮긴미디어.length) {
      await mkdir(join(뿌리, 'media', 이름), { recursive: true })
      await 안전쓰기(join(백업폴더, 'media목록.json'), JSON.stringify(옮긴미디어, null, 2) + '\n')
      for (const 조각 of 옮긴미디어) await rename(join(뿌리, 'media', 조각), join(뿌리, 'media', 이름, 조각))
    }

    // ④-이관 글기록 — media 를 옮긴 뒤 그 안 재구성.json 의 발행.계정 "" 를 이름으로. 안 옮기면
    // 대시보드.mjs·성적.mjs·도달.mjs 가 발행.계정 을 정확히 견주다 이 계정 글을 전부 걸러 성적·도달이 멈춘다
    await 재구성글쓰기(
      await 재구성글고치기(join(뿌리, 'media', 이름, '쓴것'), (글) => 글계정바꾸기(글, 이름)),
    )

    // ⑤ 장부 다섯 — 원본 → 백업(rename), 백업에서 읽어 키바꾸기 → 안전쓰기(원래 자리에)
    for (const 장부 of 다섯장부) {
      if (!파일목록.최상위.includes(장부)) continue
      const 경로 = join(뿌리, 장부)
      const 백업경로 = join(백업폴더, 장부)
      await rename(경로, 백업경로)
      const 객체 = JSON.parse(await readFile(백업경로, 'utf8'))
      let 새객체 = 키바꾸기(객체, 이름, 장부)
      if (장부 === '계정정보.json' && 새객체[이름] && !새객체[이름].아이디) {
        새객체 = { ...새객체, [이름]: { ...새객체[이름], 아이디: 이름 } }
      }
      await 안전쓰기(경로, JSON.stringify(새객체, null, 2) + '\n')
    }

    return {
      백업폴더,
      옮긴: 목록.filter((m) => m.방법 !== '없음'),
      건너뛴: 목록.filter((m) => m.방법 === '없음'),
      언로드경고,
    }
  } catch (에러) {
    에러.백업폴더 = 백업폴더
    throw 에러
  }
}

// 백업폴더 안 것을 제자리로. 옮겨져 새 자리에 있던 것은 백업폴더/되돌림전/ 으로 치운다(지우지 않는다)
export async function 되돌리기(백업폴더, {
  뿌리 = process.cwd(),
  실행: 받은실행 = null,
  런치폴더 = 진짜런치폴더,
} = {}) {
  const { 이름 } = JSON.parse(await readFile(join(백업폴더, '정보.json'), 'utf8'))
  const 실행 = 실행고르기(받은실행, 런치폴더)
  const 되돌림전 = join(백업폴더, '되돌림전')
  await mkdir(되돌림전, { recursive: true })

  // launchd — 새 것 unload(+치우기), 옛 것을 백업에서 되살려 load.
  // ⚠️ 여기서 무엇이 실패해도(예: 이미 올라가 있어 load 가 던져도) 뒤의 파일 복원은 계속 돈다 —
  // 파일이 제자리로 돌아오는 것이 예약이 되살아나는 것보다 먼저다. 예약은 사람이 다시 켤 수 있어도
  // 파일은 그렇지 않다. 실패는 모아서 결과와 화면에 시끄럽게 남긴다
  const 런치경고 = []
  for (const { 옛라벨, 새라벨 } of 라벨쌍(이름)) {
    try {
      const 옛백업 = join(백업폴더, 'launchd', `${옛라벨}.plist`)
      const 옛경로 = join(런치폴더, `${옛라벨}.plist`)
      if (!(await 존재(옛백업))) {
        // 백업엔 없는데 런치폴더에 옛 plist 가 남아 있으면 — 옮기기가 unload 는 했는데 rename 전에
        // 죽은 경우다. 이미 파일은 제자리이니 다시 올리기만 하면 된다(메인 분기와 대칭으로 먼저 내린다)
        if (await 존재(옛경로)) {
          await 실행('launchctl', ['unload', 옛경로]).catch(() => {})
          await 실행('launchctl', ['load', 옛경로])
        }
        continue
      }
      const 새경로 = join(런치폴더, `${새라벨}.plist`)
      if (await 존재(새경로)) {
        await 실행('launchctl', ['unload', 새경로]).catch(() => {})
        await rename(새경로, join(되돌림전, `${새라벨}.plist`))
      }
      await copyFile(옛백업, 옛경로)
      // 되돌리기를 두 번 부를 때(먼저 번이 중간에 실패했을 때 등) 옛 plist 가 이미 올라가 있을 수 있다 —
      // 먼저 내려야 load 가 "이미 있다"로 안 던진다
      await 실행('launchctl', ['unload', 옛경로]).catch(() => {})
      await 실행('launchctl', ['load', 옛경로])
    } catch (에러) {
      런치경고.push(`${옛라벨}: ${에러.message}`)
    }
  }

  // .env — 새로 만든 .env.<이름> 을 치우고, 원래 .env.local 을 백업에서 되살린다
  const 새env = join(뿌리, `.env.${이름}`)
  if (await 존재(새env)) await rename(새env, join(되돌림전, `.env.${이름}`))
  const envLocal백업 = join(백업폴더, '.env.local')
  if (await 존재(envLocal백업)) {
    if (await 존재(join(뿌리, '.env.local'))) await rename(join(뿌리, '.env.local'), join(되돌림전, '.env.local'))
    await copyFile(envLocal백업, join(뿌리, '.env.local'))
    await chmod(join(뿌리, '.env.local'), 0o600).catch(() => {})
  }

  // persona — 복사본만 치운다(원본은 손댄 적이 없다)
  const personaNew = join(뿌리, `persona.${이름}.json`)
  if (await 존재(personaNew)) await rename(personaNew, join(되돌림전, `persona.${이름}.json`))

  // 보관함 · 활동장부 · 알림기록
  for (const [원래이름, 새이름] of [
    ['보관함.json', `보관함.${이름}.json`],
    ['활동장부.main.jsonl', `활동장부.${이름}.jsonl`],
    ['알림기록.main.jsonl', `알림기록.${이름}.jsonl`],
  ]) {
    const 백업경로 = join(백업폴더, 원래이름)
    if (!(await 존재(백업경로))) continue
    const 새경로 = join(뿌리, 새이름)
    if (await 존재(새경로)) await rename(새경로, join(되돌림전, 새이름))
    await copyFile(백업경로, join(뿌리, 원래이름))
  }

  // logs
  for (const f of await 목록읽기(백업폴더)) {
    if (!/^(마지막발행\.txt|\d{4}-\d{2}\.log|성적-\d{4}-\d{2}\.log)$/.test(f)) continue
    const 새이름 = f === '마지막발행.txt'
      ? `마지막발행-${이름}.txt`
      : f.startsWith('성적-') ? `성적-${이름}-${f.replace(/^성적-/, '')}` : `${이름}-${f}`
    const 새경로 = join(뿌리, 'logs', 새이름)
    if (await 존재(새경로)) await rename(새경로, join(되돌림전, 새이름))
    await copyFile(join(백업폴더, f), join(뿌리, 'logs', f))
  }

  // media — 목록에 적힌 것만 새 자리에서 제자리로
  const media목록경로 = join(백업폴더, 'media목록.json')
  if (await 존재(media목록경로)) {
    for (const 조각 of JSON.parse(await readFile(media목록경로, 'utf8'))) {
      const 새자리 = join(뿌리, 'media', 이름, 조각)
      if (await 존재(새자리)) await rename(새자리, join(뿌리, 'media', 조각))
    }
    await rmdir(join(뿌리, 'media', 이름)).catch(() => {}) // 다 옮겨 빈 폴더만 남았으면 치운다
  }

  // 글기록 발행.계정 — media 를 되돌린 뒤 그 안 재구성.json 의 발행.계정 이 이름 인 것을 "" 로.
  // ⚠️ 여기서 실패해도 뒤(장부 다섯 등)의 파일 복원은 계속 돌아야 한다 — launchd 되돌리기와 같은 이유다
  const 글기록경고 = []
  try {
    await 재구성글쓰기(
      await 재구성글고치기(join(뿌리, 'media', '쓴것'), (글) => 글계정되돌리기(글, 이름)),
    )
  } catch (에러) {
    글기록경고.push(에러.message)
  }

  // 장부 다섯
  for (const 장부 of 다섯장부) {
    const 백업경로 = join(백업폴더, 장부)
    if (!(await 존재(백업경로))) continue
    const 지금경로 = join(뿌리, 장부)
    if (await 존재(지금경로)) await rename(지금경로, join(되돌림전, 장부))
    await copyFile(백업경로, 지금경로)
  }

  return { 되돌림전, 이름, 런치경고, 글기록경고 }
}

// ─── 명령줄 ────────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const 인자 = process.argv.slice(2)
  try {
    if (인자[0] === '--되돌리기') {
      const 백업폴더 = 인자[1]
      if (!백업폴더) throw new Error('되돌릴 백업 폴더 경로를 주세요')
      const 결과 = await 되돌리기(백업폴더, { 뿌리: process.cwd() })
      console.log(`되돌렸다 — ${결과.이름} 계정을 원래대로. 옮겨져 있던 것은 ${결과.되돌림전} 에 남았다.`)
      if (결과.런치경고?.length) {
        console.log(`⚠️ launchd 를 못 되살렸다: ${결과.런치경고.join(' / ')} (launchctl list 로 확인하세요)`)
      }
      if (결과.글기록경고?.length) {
        console.log(`⚠️ 글기록 발행.계정 을 못 되돌렸다: ${결과.글기록경고.join(' / ')}`)
      }
    } else if (인자[0] === '--글계정고치기') {
      const 이름 = 인자[1]
      if (!이름) throw new Error('계정 이름을 주세요 (예: example.cook)')
      const 실행할것 = 인자.includes('--실행')
      const 결과 = await 글계정고치기(이름, { 뿌리: process.cwd(), 마른판: !실행할것 })
      if (!실행할것) {
        console.log(`[마른 판] media/${이름}/쓴것 의 발행.계정 "" → "${이름}" 로 고칠 것 ${결과.고칠것.length}편`)
        console.log('\n--실행 을 붙이면 실제로 고칩니다.')
      } else {
        console.log(`고쳤다 — media/${이름}/쓴것 의 발행.계정 "" → "${이름}" (${결과.고칠것.length}편)`)
      }
    } else {
      const 이름 = 인자[0]
      if (!이름) throw new Error('계정 이름을 주세요 (예: example.cook)')
      const 실행할것 = 인자.includes('--실행')
      const 결과 = await 옮기기(이름, { 뿌리: process.cwd(), 마른판: !실행할것 })
      if (!실행할것) {
        const 목록 = 결과.목록
        console.log(`[마른 판] "${이름}" 로 옮길 것 ${목록.filter((m) => m.방법 !== '없음').length}개` +
          ` · 없는 것 ${목록.filter((m) => m.방법 === '없음').length}개\n`)
        for (const 항목 of 목록) console.log(`  ${항목.방법.padEnd(6)} | ${항목.무엇} → ${항목.으로}`)
        console.log('\n--실행 을 붙이면 실제로 옮깁니다. (자동 발행·성적 launchd 를 먼저 내립니다)')
      } else {
        console.log(`옮겼다 — 백업: ${결과.백업폴더}`)
        console.log(`옮긴 것 ${결과.옮긴.length}개 · 건너뛴 것 ${결과.건너뛴.length}개`)
        if (결과.언로드경고?.length) {
          console.log(`⚠️ launchctl unload 가 실패했다: ${결과.언로드경고.join(', ')} (launchctl list 로 확인하세요)`)
        }
      }
    }
  } catch (에러) {
    console.error(`[X] ${에러.message}`)
    if (에러.백업폴더) {
      console.error('   ⚠️ 옮기는 도중에 멈췄습니다. 되돌리려면 이렇게 칩니다.')
      console.error(`   node 도구/첫계정이름붙이기.mjs --되돌리기 ${에러.백업폴더}`)
    }
    process.exitCode = 1
  }
}
