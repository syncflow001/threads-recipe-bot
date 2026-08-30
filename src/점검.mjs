// 자동화가 제대로 도는지 흔적을 읽어 판정한다 — 아무것도 켜거나 끄지 않는다. 읽기만 한다.
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const 기본실행 = promisify(execFile)
const 진짜런치폴더 = join(homedir(), 'Library', 'LaunchAgents')

// 로그 표시를 사람이 읽는 한 줄로. 설계 §3-2 표 그대로다.
// ⚠️ 모르는 ‼️ 줄은 그 줄을 그대로 옮긴다. 「알 수 없음」으로 덮으면 사람이 원인을 못 찾는다
const 원인표 = [
  [/‼️\s*열쇠 파일이 없습니다/, '출입증 파일이 없습니다 — 설정에서 이 계정 열쇠를 넣어 주세요.'],
  [/⏸\s*멈춰 있습니다/, '멈춤 스위치가 켜져 있습니다.'],
  [/⏸\s*이번 판은 건너뜁니다/, '직전 발행과 너무 가까워 건너뛰었습니다.'],
  [/⏭\s*이번 판은 올린 글이 없습니다/, '쓸 만한 글이 없었습니다.'],
  [/⛔.*못 돌립니다/, '분야·언어·제휴 조합이 아직 없습니다.'],
  [/‼️\s*스레드가 허락한 권한이 모자라/, '출입증 권한이 모자랍니다 — 새로 받아야 합니다.'],
]

export function 원인찾기(로그꼬리) {
  const 글 = String(로그꼬리 ?? '')
  for (const [본, 말] of 원인표) if (본.test(글)) return 말
  // 표에 없는 ‼️ 줄은 그대로 옮긴다
  const 느낌표들 = 글.split('\n').filter((줄) => 줄.includes('‼️'))
  if (느낌표들.length) return 느낌표들[느낌표들.length - 1].replace(/^\s*‼️\s*/, '').trim()
  return '그 시각에 아예 안 떴습니다 — 예약이나 맥 잠자기를 확인하세요.'
}

// 맥이 자면 판이 밀린다. 두 판 놓친 것은 흔하고 세 판은 아니다 — 그래서 3배를 기본으로 둔다.
// 헛알람이 나면 이 배수만 고친다 (설계 §3)
export function 늦었나(마지막때, 간격초, 지금, 배수 = 3) {
  if (마지막때 == null) return true // 한 번도 안 돌았다
  return (지금 - 마지막때) > 간격초 * 1000 * 배수
}

// 같은 열쇠면 같은 문제로 본다. 이어지는 문제는 처음본때를 물려받아
// 「언제부터 이랬나」를 화면이 보여 줄 수 있게 한다
export function 견주기(옛문제들, 새문제들) {
  const 옛 = new Map((옛문제들 ?? []).map((x) => [x.열쇠, x]))
  const 새 = new Map((새문제들 ?? []).map((x) => [x.열쇠, x]))
  const 생김 = []
  for (const [열쇠, 것] of 새) {
    const 그전 = 옛.get(열쇠)
    if (그전) 것.처음본때 = 그전.처음본때 ?? 것.처음본때
    else 생김.push(것)
  }
  const 고쳐짐 = [...옛.values()].filter((x) => !새.has(x.열쇠))
  return { 생김, 고쳐짐 }
}

// 임시 런치폴더를 쓰면서 진짜 launchctl 을 부르는 조합은 언제나 사고다 (2026-08-28 실측).
// 정상 CLI(진짜 폴더 + 기본 실행)와 정상 검사(임시 폴더 + 가짜 실행)는 그대로 통과한다
function 실행고르기(받은실행, 런치폴더) {
  if (받은실행) return 받은실행
  if (런치폴더 !== 진짜런치폴더) throw new Error('런치폴더가 진짜 LaunchAgents 가 아닙니다 — 검사라면 가짜 실행 을 넘기세요')
  return 기본실행
}

// ⚠️ 화면 스위치(src/대시보드.mjs 의 간격시각표켜기)는 이름을 `${라벨앞}.${계정 || 'main'}` 로 붙인다 —
// 계정을 안 가리는 헬스체크·조회수알리미도 그래서 실제 파일이 com.threads.health.main.plist 다.
// 라벨 그대로만 찾으면 사용자가 화면에서 켠 뒤에도 「없습니다」가 영원히 남는다 (2026-08-29 검토).
// 그래서 라벨 그대로와 .main 접미를 둘 다 본다
const 라벨후보 = (라벨) => [라벨, `${라벨}.main`]

export async function 올라가있나(라벨, { 실행, 유아이디 = process.getuid() }) {
  for (const 것 of 라벨후보(라벨)) {
    try { await 실행('launchctl', ['print', `gui/${유아이디}/${것}`]); return true } catch {}
  }
  return false
}

// 있으면 실제로 있는 라벨을, 없으면 null 을 돌려준다
async function 있는라벨(런치폴더, 라벨) {
  for (const 것 of 라벨후보(라벨)) {
    if (await stat(join(런치폴더, `${것}.plist`)).then(() => true, () => false)) return 것
  }
  return null
}

const plist있나 = async (런치폴더, 라벨) => (await 있는라벨(런치폴더, 라벨)) != null

// plutil 로 plist 를 JSON 으로 바꿔 읽는다. 못 읽으면(형식이 이상하거나 검사가 가짜 실행을 줬으면) null
async function plist읽기(런치폴더, 라벨, 실행) {
  const 진짜라벨 = await 있는라벨(런치폴더, 라벨)
  if (진짜라벨 == null) return null
  try {
    const { stdout } = await 실행('plutil', ['-convert', 'json', '-o', '-', join(런치폴더, `${진짜라벨}.plist`)])
    return JSON.parse(stdout)
  } catch { return null }
}

const mtime = (경로) => stat(경로).then((s) => s.mtimeMs, () => null)

const 이틀 = (n) => String(n).padStart(2, '0')
export const 날짜글 = (d) => `${d.getFullYear()}-${이틀(d.getMonth() + 1)}-${이틀(d.getDate())}`
const 지금이소 = (지금) => new Date(지금).toISOString()

// 오늘 자동발행이 예정대로 올라갔는지 잰다.
// ⚠️ 원문(전문)도 함께 돌려준다 — 자동발행.sh 는 「‼️ 열쇠 파일이 없습니다」를 ═══ 머리글 **앞**에 찍어
// 판 조각에 안 들어온다. 그 꼬리를 안 읽으면 원인이 엉뚱하게 「아예 안 떴습니다」로 나온다 (설계 §3-1)
async function 오늘의판들(계정, 뿌리, 지금) {
  const d = new Date(지금)
  const 파일명 = `${계정 ? 계정 + '-' : ''}${d.getFullYear()}-${이틀(d.getMonth() + 1)}.log`
  const 전문 = await readFile(join(뿌리, 'logs', 파일명), 'utf8').catch(() => null)
  // ⚠️ 파일이 없으면 「그 달에 한 번도 안 돌았다」다 — 자동발행.sh 는 매 판 머리글을 찍는다.
  // 조용히 넘기면 §0 이 잡겠다던 「아예 안 떴다」를 통째로 놓친다 (2026-08-29 검토)
  const 글 = 전문 ?? ''
  const 판들 = 글.split(/^═══ /m).slice(1).map((c) => {
    const 때 = c.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
    if (!때) return null
    const 결과 = /✅ (올렸다|한 편 올렸습니다)/.test(c) ? '올림'
      : /⏸/.test(c) ? '건너뜀'
        : /‼️/.test(c) ? '실패' : '못올림'
    return { 날짜: `${때[1]}-${때[2]}-${때[3]}`, 시: Number(때[4]), 분: Number(때[5]), 결과, 조각: c }
  }).filter(Boolean)
  return { 전문, 판들 }
}

// 한 계정을 재서 이상 목록을 낸다. 파일을 안 쓴다 — 읽기만 한다 (설계 §3)
export async function 계정점검(계정, { 뿌리, 지금 = Date.now(), 실행, 런치폴더, 계정정보 = {} } = {}) {
  const 실제실행 = 실행고르기(실행, 런치폴더)
  const 유아이디 = process.getuid()
  const 문제들 = []
  const 새문제 = (갈래, 무엇, 원인, 심각도, 열쇠) =>
    문제들.push({ 갈래, 무엇, 원인, 심각도, 열쇠, 처음본때: 지금이소(지금) })

  const 뒷자리 = 계정 || 'main'
  const 자동라벨 = `com.threads.auto.${뒷자리}`
  const 성적라벨 = `com.threads.score.${뒷자리}`
  const 길들이기라벨 = `com.threads.tame.${뒷자리}`

  // 예약살았나 — plist 파일이 있는 라벨만 launchd 에 살아 있는지 잰다
  for (const [이름, 라벨] of [['자동발행', 자동라벨], ['성적', 성적라벨], ['길들이기', 길들이기라벨]]) {
    if (!(await plist있나(런치폴더, 라벨))) continue
    if (!(await 올라가있나(라벨, { 실행: 실제실행, 유아이디 }))) {
      새문제('예약살았나', `${이름} 예약(${라벨})이 launchd 에 안 올라가 있습니다.`, '', '높음', `예약살았나:${라벨}`)
    }
  }

  // 있어야할것 — 자동발행·성적은 계정마다 반드시 있어야 한다. 길들이기는 사용자 결정이라 안 본다
  for (const [이름, 라벨] of [['자동발행', 자동라벨], ['성적', 성적라벨]]) {
    if (!(await plist있나(런치폴더, 라벨))) {
      새문제('있어야할것', `${이름} 예약(${라벨}) plist 가 없습니다.`, '', '높음', `있어야할것:${라벨}`)
    }
  }

  // 켜뒀는데안돎 — 길들이기는 plist 가 있을 때만 「도나」를 본다
  if (await plist있나(런치폴더, 길들이기라벨)) {
    const 로그경로 = join(뿌리, 'logs', `길들이기${계정 ? '-' + 계정 : ''}-${날짜글(new Date(지금)).slice(0, 7)}.log`)
    if (늦었나(await mtime(로그경로), 10800, 지금)) {
      새문제('켜뒀는데안돎', '길들이기가 3시간 넘게 흔적이 없습니다.', '', '보통', `켜뒀는데안돎:${길들이기라벨}`)
    }
  }

  // 발행 — 오늘 지난 칸 중 「올림」이 아닌 것. 예정(plist)도 로그도 있어야 잴 수 있다
  if (await plist있나(런치폴더, 자동라벨)) {
    const 오늘칸들 = ((await plist읽기(런치폴더, 자동라벨, 실제실행))?.StartCalendarInterval ?? [])
      .map((x) => ({ 시: Number(x.Hour) || 0, 분: Number(x.Minute) || 0 }))
    const { 전문, 판들 } = await 오늘의판들(계정, 뿌리, 지금)
    const 오늘 = 날짜글(new Date(지금))
    for (const { 시, 분 } of 오늘칸들) {
      // 예정 칸을 판과 맞출 때 2시간 창을 쓴다 — 맥이 자다 깨면 판이 밀려 찍히기 때문이다
      const 지났나 = new Date(`${오늘}T${이틀(시)}:${이틀(분)}:00`) < new Date(지금)
      if (!지났나) continue
      const 판 = 판들.find((r) => r.날짜 === 오늘 && r.시 >= 시 && r.시 < 시 + 2)
      if (판?.결과 === '올림') continue
      // 판을 못 찾았으면 로그 꼬리를 읽는다 — 머리글 앞에 찍힌 ‼️ 가 거기 있다
      새문제('발행', `${이틀(시)}:${이틀(분)} 판이 ${판 ? 판.결과 : '기록없음'} 상태입니다.`,
        원인찾기(판?.조각 ?? (전문 ?? '').slice(-2000)), '높음', `발행:${오늘} ${이틀(시)}:${이틀(분)}`)
    }
  }

  // 마지막으로돈때 — 성적 plist 가 있을 때만 「6시간 넘게 안 돌았나」를 본다.
  // plist 자체가 없는 건 「있어야할것」이 이미 잡는다 — 여기서 또 재면 「설치 안 함」을
  // 「돌다가 늦어짐」으로 잘못 말하게 된다 (계정 '' 은 접두어 없이 성적-YYYY-MM.log 다)
  if (await plist있나(런치폴더, 성적라벨)) {
    const 성적로그 = join(뿌리, 'logs', `성적${계정 ? '-' + 계정 : ''}-${날짜글(new Date(지금)).slice(0, 7)}.log`)
    if (늦었나(await mtime(성적로그), 21600, 지금)) {
      새문제('마지막으로돈때', '성적이 6시간 넘게 흔적이 없습니다.', '', '보통', `마지막으로돈때:${성적라벨}`)
    }
  }

  // 열쇠 — 헬스체크결과.json 이 없으면 확인 못 함이라 조용히 넘긴다
  const 헬스글 = await readFile(join(뿌리, '헬스체크결과.json'), 'utf8').catch(() => null)
  if (헬스글 != null) {
    const 이름 = 계정 || '(첫 계정)'
    try {
      const 헬스 = JSON.parse(헬스글)
      for (const 탈줄 of (헬스.탈 ?? []).filter((t) => t.startsWith(`${이름} `))) {
        새문제('열쇠', 탈줄, '', '높음', `열쇠:${계정}:${탈줄}`)
      }
    } catch {}
  }

  void 계정정보 // 지금은 판정에 안 쓴다 — 화면이 사람 말로 보여줄 때(별칭 등) 쓸 자리
  return 문제들
}

// 계정을 안 가리는 자동화 셋(헬스체크·조회수 알리미·감시)을 잰다. 계정마다 여덟 번 되풀이하지 않는다
export async function 전체점검({ 뿌리, 지금 = Date.now(), 실행, 런치폴더, 계정들 = [] }) {
  const 실제실행 = 실행고르기(실행, 런치폴더)
  const 유아이디 = process.getuid()
  const 문제들 = []
  const 새문제 = (갈래, 무엇, 심각도, 열쇠) =>
    문제들.push({ 갈래, 무엇, 원인: '', 심각도, 열쇠: `전체:${열쇠}`, 처음본때: 지금이소(지금) })

  // 헬스체크·조회수 알리미는 반드시 있어야 한다. 감시는 이미 켜져 있는 게 지금 상태라 있어야할것으로는 안 본다
  const 대상들 = [
    { 이름: '헬스체크', 라벨: 'com.threads.health', 필요: true },
    { 이름: '조회수알리미', 라벨: 'com.threads.viewalert', 필요: true },
    { 이름: '감시', 라벨: 'com.threads.watch', 필요: false },
  ]
  for (const { 이름, 라벨, 필요 } of 대상들) {
    if (!(await plist있나(런치폴더, 라벨))) {
      if (필요) 새문제('있어야할것', `${이름} 예약(${라벨}) plist 가 없습니다.`, '높음', `있어야할것:${라벨}`)
      continue
    }
    if (!(await 올라가있나(라벨, { 실행: 실제실행, 유아이디 }))) {
      새문제('예약살았나', `${이름} 예약(${라벨})이 launchd 에 안 올라가 있습니다.`, '높음', `예약살았나:${라벨}`)
    }
  }

  // 감시가 하루(3배) 넘게 흔적이 없나 — plist 가 있을 때만 잰다
  if (await plist있나(런치폴더, 'com.threads.watch')) {
    if (늦었나(await mtime(join(뿌리, 'logs', '감시.log')), 86400, 지금)) {
      새문제('마지막으로돈때', '감시가 하루 넘게 흔적이 없습니다.', '보통', '마지막으로돈때:감시')
    }
  }

  // ⚠️ 열쇠 섞임 — 「TOKEN 을(를) A · B 가 함께 쓰고 있습니다」는 어느 계정 이름으로도 안 시작해
  // 계정점검의 `이름 ` 걸러내기에 아무 데도 안 걸린다. A 열쇠로 B 글이 나가는 사고라(2026-08-26)
  // 놓치면 안 된다 — 아는 계정 이름 어느 것으로도 안 시작하는 탈줄은 여기서 전체 문제로 올린다
  const 헬스글 = await readFile(join(뿌리, '헬스체크결과.json'), 'utf8').catch(() => null)
  if (헬스글 != null) {
    try {
      const 이름들 = [...(계정들 ?? []), ''].map((c) => c || '(첫 계정)')
      for (const 탈줄 of (JSON.parse(헬스글).탈 ?? [])) {
        if (이름들.some((이름) => String(탈줄).startsWith(`${이름} `))) continue
        새문제('열쇠', 탈줄, '높음', `열쇠:${탈줄}`)
      }
    } catch {}
  }

  return 문제들
}
