// 대시보드에 보여줄 것을 모은다 — 수익 · 발행 현황 · 최근 올린 글
import { readFile, readdir, stat, writeFile, unlink, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { 실적 } from './coupang.mjs'

const 실행 = promisify(execFile)
const 이틀 = (n) => String(n).padStart(2, '0')
const 날짜글 = (d) => `${d.getFullYear()}-${이틀(d.getMonth() + 1)}-${이틀(d.getDate())}`
const 쿠팡날짜 = (d) => `${d.getFullYear()}${이틀(d.getMonth() + 1)}${이틀(d.getDate())}`

// ─── 수익 ──────────────────────────────────────────────────────────
// 쿠팡을 화면 새로고침마다 부르면 금방 막힌다. 5분은 아까 받은 값을 그대로 쓴다
// 일수마다 따로 담는다. 하나로 두면 90일을 부른 뒤 14일을 불러도 90일 것이 나온다
const 수익캐시 = new Map()

export async function 수익({ 일수 = 14, 캐시초 = 300 } = {}) {
  const 담긴것 = 수익캐시.get(일수)
  if (담긴것 && Date.now() - 담긴것.때 < 캐시초 * 1000) return 담긴것.값

  const 오늘 = new Date()
  const 처음 = new Date(오늘)
  처음.setDate(처음.getDate() - (일수 - 1))
  const 달처음 = new Date(오늘.getFullYear(), 오늘.getMonth(), 1)
  const 시작 = 처음 < 달처음 ? 처음 : 달처음

  let 줄 = []
  let 안됨 = null
  try {
    줄 = await 실적(쿠팡날짜(시작), 쿠팡날짜(오늘))
  } catch (e) {
    안됨 = e.message
  }

  // 거래액·취소도 살린다. 쿠팡이 주는데 여태 버리고 있었다 (docs/coupang-api-facts.md §12-2).
  // 취소가 늘면 수수료가 왜 안 느는지 그걸로만 설명된다
  const 빈칸 = () => ({ 수수료: 0, 클릭: 0, 주문: 0, 거래액: 0, 취소: 0 })
  const 날짜별 = new Map()
  for (const r of 줄) {
    const 이전 = 날짜별.get(r.날짜) ?? 빈칸()
    날짜별.set(r.날짜, {
      수수료: 이전.수수료 + r.수수료,
      클릭: 이전.클릭 + r.클릭,
      주문: 이전.주문 + r.주문,
      거래액: 이전.거래액 + (r.거래액 ?? 0),
      취소: 이전.취소 + (r.취소 ?? 0),
    })
  }

  const 최근 = []
  for (let i = 일수 - 1; i >= 0; i--) {
    const d = new Date(오늘)
    d.setDate(d.getDate() - i)
    const 키 = 날짜글(d)
    최근.push({ 날짜: 키, ...(날짜별.get(키) ?? 빈칸()) })
  }

  const 이번달키 = 날짜글(오늘).slice(0, 7)
  const 지난달날 = new Date(오늘.getFullYear(), 오늘.getMonth() - 1, 1)
  const 지난달키 = 날짜글(지난달날).slice(0, 7)
  const 모으기 = (키앞) => {
    const 것 = 빈칸()
    for (const [k, v] of 날짜별) {
      if (!k.startsWith(키앞)) continue
      것.수수료 += v.수수료; 것.클릭 += v.클릭; 것.주문 += v.주문
      것.거래액 += v.거래액; 것.취소 += v.취소
    }
    return 것
  }
  const 이번달것 = 모으기(이번달키)
  const 값 = {
    안됨,
    오늘: 날짜별.get(날짜글(오늘))?.수수료 ?? 0,
    이번달: 이번달것.수수료,
    클릭: 이번달것.클릭,
    주문: 이번달것.주문,
    거래액: 이번달것.거래액,
    취소: 이번달것.취소,
    // 지난달은 받아 온 날수가 그만큼 될 때만 뜻이 있다. 14일치만 받으면 조각이다
    지난달: 일수 >= 60 ? 모으기(지난달키) : null,
    최근,
    일수,
    // 쿠팡이 subId 를 비워서 돌려준다 (실측). 채워지면 계정별로 가를 수 있다
    계정별가능: 줄.some((r) => r.꼬리표),
  }
  수익캐시.set(일수, { 때: Date.now(), 값 })
  return 값
}

// ─── 발행 현황 ─────────────────────────────────────────────────────
// 예정 시각은 LaunchAgent 에서 읽는다. 라벨이 아니라 '우리 자동발행.sh 를 부르는가' 로 찾는다 —
// 배포판은 라벨이 다르기 때문이다
export async function 시각표들() {
  const 곳 = join(homedir(), 'Library', 'LaunchAgents')
  let 파일들 = []
  try { 파일들 = (await readdir(곳)).filter((f) => f.endsWith('.plist')) } catch { return [] }

  const 모음 = []
  for (const f of 파일들) {
    try {
      const { stdout } = await 실행('plutil', ['-convert', 'json', '-o', '-', join(곳, f)])
      const d = JSON.parse(stdout)
      const 인자 = (d.ProgramArguments ?? []).map(String)
      if (!인자.some((a) => a.includes('자동발행.sh'))) continue
      // 인자 맨 뒤가 계정 이름이다. 경로가 아니면 계정으로 본다. 없으면 첫 계정이다
      const 끝 = 인자[인자.length - 1]
      const 그계정 = 인자.length > 2 && !끝.includes('/') ? 끝 : ''
      const 칸들 = d.StartCalendarInterval ?? []
      모음.push({
        계정: 그계정,
        경로: join(곳, f),
        라벨: d.Label ?? f.replace(/\.plist$/, ''),
        시각들: [...new Set(칸들.map((x) => Number(x.Hour) || 0))].sort((a, b) => a - b),
        // 칸마다 시와 분을 따로 고른다 (2026-08-24). 같은 시각에 여러 계정이 동시에 터지면
        // 같은 IP 로 몰려 서로 조이고, 크롬이 한꺼번에 여러 개 뜬다
        칸들: 칸다듬기(칸들.map((x) => ({ 시: Number(x.Hour) || 0, 분: Number(x.Minute) || 0 }))),
        분: Number(칸들[0]?.Minute) || 0,
      })
    } catch {}
  }
  return 모음
}

export async function 시각표찾기(계정) {
  return (await 시각표들()).find((t) => t.계정 === 계정) ?? null
}

// 발행이 겹치지 않게 계정마다 다른 분을 준다. 15분씩 벌려 네 자리를 둔다 —
// 한 판이 1~3분이라 15분이면 절대 안 겹친다.
// **남이 쓰는 분을 피해 고른다.** 계정이 늘어도 저절로 흩어진다
export const 분자리 = [2, 17, 32, 47]

export async function 빈분고르기(계정, 이미쓴것 = null) {
  const 남들 = (이미쓴것 ?? await 시각표들()).filter((t) => t.계정 !== 계정)
  const 쓰인것 = new Map()
  for (const t of 남들) 쓰인것.set(t.분, (쓰인것.get(t.분) ?? 0) + 1)
  const 빈자리 = 분자리.find((m) => !쓰인것.has(m))
  if (빈자리 !== undefined) return 빈자리
  // 네 자리가 다 찼으면 제일 덜 붐비는 자리에 붙인다
  return [...분자리].sort((a, b) => (쓰인것.get(a) ?? 0) - (쓰인것.get(b) ?? 0))[0]
}

export const 예정시각 = async (계정) => (await 시각표찾기(계정))?.시각들 ?? []

// 화면에서 자동 발행을 켜고 끈다. 맥의 시스템 폴더에 파일을 넣고 launchctl 을 부른다.
// 칸 하나가 「몇 시 몇 분」이다. 옛 꼴("8, 12, 16")로 들어오면 분은 밖에서 정해 준다
export const 칸다듬기 = (받은것, 기본분 = 0) => {
  const 날것 = Array.isArray(받은것)
    ? 받은것.map((c) => ({ 시: Number(c?.시), 분: Number(c?.분 ?? 기본분) }))
    : String(받은것 ?? '').split(/[^0-9]+/).filter(Boolean)
      .map((n) => ({ 시: Number(n), 분: 기본분 }))
  const 성한것 = 날것
    .filter((c) => Number.isFinite(c.시) && Number.isFinite(c.분))
    // 24시는 0시다. 그 밖에 범위를 벗어난 값은 버린다 — 25시를 1시로 접으면 사람이 놀란다
    .map((c) => ({ 시: c.시 === 24 ? 0 : Math.trunc(c.시), 분: Math.trunc(c.분) }))
    .filter((c) => c.시 >= 0 && c.시 <= 23 && c.분 >= 0 && c.분 <= 59)
  // 같은 시각을 두 번 적어도 한 번만 돈다
  const 통 = new Map(성한것.map((c) => [c.시 * 60 + c.분, c]))
  const 칸들 = [...통.values()].sort((a, b) => (a.시 - b.시) || (a.분 - b.분))
  if (!칸들.length) throw new Error('올릴 시각을 하나는 골라 주세요')
  if (칸들.length > 12) throw new Error('하루 12번을 넘기지 마세요')
  return 칸들
}

const 시각다듬기 = (받은것) => 칸다듬기(받은것).map((c) => c.시)

// 붙은 시각끼리 몇 시간 벌어지는지. 조사에서 최소 4시간을 권했다 — 어기면 알리되 막지는 않는다.
// 시각만 받아도 되고 칸(시·분)을 받아도 된다
const 분으로 = (것) => (typeof 것 === 'number' ? 것 * 60 : 것.시 * 60 + 것.분)

export const 좁은간격 = (것들) => {
  if (것들.length < 2) return null
  const 분들 = 것들.map(분으로).sort((a, b) => a - b)
  const 사이 = 분들.map((m, i) => ((분들[(i + 1) % 분들.length] - m) + 1440) % 1440)
  const 최소 = Math.min(...사이) / 60
  return 최소 < 4 ? Number(최소.toFixed(2)) : null
}

// 겹쳐 올리는 것을 막는 간격. 예정 간격보다 30분 짧게 잡는다 —
// 150분으로 못 박아 두면 2시간마다 도는 시각표가 한 번 걸러 막힌다 (실제로 그랬다)
export const 띄울분 = (것들) => {
  if (것들.length < 2) return Math.max(30, 24 * 60 - 30)
  const 분들 = 것들.map(분으로).sort((a, b) => a - b)
  const 최소 = Math.min(...분들.map((m, i) => ((분들[(i + 1) % 분들.length] - m) + 1440) % 1440))
  return Math.max(30, 최소 - 30)
}

const plist글 = (라벨, 스크립트, 계정, 칸들, 기록폴더) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${라벨}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${스크립트}</string>${계정 ? `\n    <string>${계정}</string>` : ''}
  </array>
  <key>WorkingDirectory</key><string>${기록폴더}</string>
  <key>StartCalendarInterval</key>
  <array>
${칸들.map((c) => `    <dict><key>Hour</key><integer>${c.시}</integer><key>Minute</key><integer>${c.분}</integer></dict>`).join('\n')}
  </array>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${기록폴더}/logs/launchd${계정 ? '-' + 계정 : ''}.out</string>
  <key>StandardErrorPath</key><string>${기록폴더}/logs/launchd${계정 ? '-' + 계정 : ''}.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>LANG</key><string>ko_KR.UTF-8</string>
    <key>GAP_MIN</key><string>${띄울분(칸들)}</string>
  </dict>
</dict>
</plist>
`

export async function 시각표켜기(계정, 받은것, 뿌리 = process.cwd(), 받은분 = null) {
  const 스크립트 = join(뿌리, '자동발행.sh')
  if (!(await stat(스크립트).catch(() => null))) throw new Error('자동발행.sh 를 못 찾았습니다')
  await chmod(스크립트, 0o755).catch(() => {})

  // 이미 있으면 그 파일을 그대로 쓴다. 새로 만들면 같은 일을 하는 시각표가 둘이 된다
  const 있던것 = await 시각표찾기(계정)
  const 라벨 = 있던것?.라벨 ?? `com.threads.auto.${계정 || 'main'}`
  const 경로 = 있던것?.경로 ?? join(homedir(), 'Library', 'LaunchAgents', `${라벨}.plist`)

  // 옛 꼴("8, 12, 16")로 들어오면 분은 우리가 정한다 — 계정마다 다른 자리를 준다.
  // 한 번 정한 분은 껐다 켜도 그대로다. 바뀌면 사람이 언제 올라가는지 못 외운다
  const 기본분 = 받은분 ?? 있던것?.분 ?? await 빈분고르기(계정)
  const 칸들 = 칸다듬기(받은것, 기본분)

  await writeFile(경로, plist글(라벨, 스크립트, 계정, 칸들, 뿌리))
  await 실행('launchctl', ['unload', 경로]).catch(() => {}) // 처음이면 실패하는 게 정상이다
  await 실행('launchctl', ['load', 경로])
  return { 칸들, 시각들: [...new Set(칸들.map((c) => c.시))], 분: 칸들[0].분, 라벨, 좁은간격: 좁은간격(칸들) }
}

export async function 시각표끄기(계정) {
  const 있던것 = await 시각표찾기(계정)
  if (!있던것) throw new Error('켜져 있는 시각표가 없습니다')
  await 실행('launchctl', ['unload', 있던것.경로]).catch(() => {})
  await unlink(있던것.경로)
  return { 껐음: true }
}

// ─── 언어 피드 길들이기 ────────────────────────────────────────────
// 켜 두면 몇 시간마다 그 계정으로 홈을 열어 그 언어 글을 보고 나온다 (src/길들이기.mjs).
// 자동 발행 시각표와 같은 장치를 쓴다 — 라벨이 아니라 **어느 스크립트를 부르는가**로 찾는다
async function 간격시각표찾기(스크립트이름, 계정) {
  const 곳 = join(homedir(), 'Library', 'LaunchAgents')
  let 파일들 = []
  try { 파일들 = (await readdir(곳)).filter((f) => f.endsWith('.plist')) } catch { return null }

  for (const f of 파일들) {
    try {
      const { stdout } = await 실행('plutil', ['-convert', 'json', '-o', '-', join(곳, f)])
      const d = JSON.parse(stdout)
      const 인자 = (d.ProgramArguments ?? []).map(String)
      if (!인자.some((a) => a.includes(스크립트이름))) continue
      const 끝 = 인자[인자.length - 1]
      const 그계정 = 인자.length > 2 && !끝.includes('/') ? 끝 : ''
      if (그계정 !== 계정) continue
      return {
        경로: join(곳, f),
        라벨: d.Label ?? f.replace(/\.plist$/, ''),
        간격초: Number(d.StartInterval) || 0,
        간격시간: Math.round((Number(d.StartInterval) || 0) / 3600) || null,
      }
    } catch {}
  }
  return null
}

export const 길들이기찾기 = (계정) => 간격시각표찾기('길들이기.sh', 계정)
export const 성적찾기 = (계정) => 간격시각표찾기('성적.sh', 계정)

// 정각을 못 박지 않는다. StartInterval 은 켠 때를 기준으로 돌아 계정마다 저절로 어긋난다.
// 자동 발행과 같은 시각에 겹쳐 브라우저가 둘 떠 있는 것도 이렇게 줄어든다
// 몇 시간마다 한 번 도는 일감. 길들이기와 성적 찍기가 같은 꼴이라 속을 나눈다 —
// 세 번째 복붙에서 뽑았다. 자동발행(시각 지정)과 감시(요일 지정)는 꼴이 달라 여기 안 넣는다
// ⚠️ **초로 받는다.** 조회수 알리미는 30분마다 도는데 시간 단위로는 못 적는다 (2026-08-26)
const 간격plist글 = (라벨, 스크립트, 계정, 간격초, 뿌리, 로그이름) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${라벨}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${스크립트}</string>${계정 ? `\n    <string>${계정}</string>` : ''}
  </array>
  <key>WorkingDirectory</key><string>${뿌리}</string>
  <key>StartInterval</key><integer>${간격초}</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${뿌리}/logs/${로그이름}${계정 ? '-' + 계정 : ''}.out</string>
  <key>StandardErrorPath</key><string>${뿌리}/logs/${로그이름}${계정 ? '-' + 계정 : ''}.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>LANG</key><string>ko_KR.UTF-8</string>
  </dict>
</dict>
</plist>
`

// 간격은 꼴이 정한 단위로 받는다 — 시간(3600초)이 보통이고, 알리미만 분(60초)이다
async function 간격시각표켜기(꼴, 계정, 간격, 뿌리 = process.cwd()) {
  const 단위초 = 꼴.단위초 ?? 3600
  const 시간 = Math.min(꼴.최대시간, Math.max(1, Math.round(Number(간격) || 꼴.기본시간)))
  const 스크립트 = join(뿌리, 꼴.파일)
  if (!(await stat(스크립트).catch(() => null))) throw new Error(`${꼴.파일} 을 못 찾았습니다`)
  await chmod(스크립트, 0o755).catch(() => {})

  // 이미 있으면 그 파일을 그대로 쓴다. 새로 만들면 같은 일을 하는 시각표가 둘이 된다
  const 있던것 = await 간격시각표찾기(꼴.파일, 계정)
  const 라벨 = 있던것?.라벨 ?? `${꼴.라벨앞}.${계정 || 'main'}`
  const 경로 = 있던것?.경로 ?? join(homedir(), 'Library', 'LaunchAgents', `${라벨}.plist`)

  await writeFile(경로, 간격plist글(라벨, 스크립트, 계정, 시간 * 단위초, 뿌리, 꼴.로그))
  await 실행('launchctl', ['unload', 경로]).catch(() => {}) // 처음이면 실패하는 게 정상이다
  await 실행('launchctl', ['load', 경로])
  return { 켜짐: true, 라벨, 간격시간: 시간 }
}

const 길들이기꼴 = { 파일: '길들이기.sh', 라벨앞: 'com.threads.tame', 로그: '길들이기', 기본시간: 3, 최대시간: 12 }
// 성적은 조회수가 하루에도 몇 번 움직이므로 24시간까지 늘려 둔다
const 성적꼴 = { 파일: '성적.sh', 라벨앞: 'com.threads.score', 로그: '성적', 기본시간: 6, 최대시간: 24 }

// 헬스체크 — 계정 열쇠가 온전한가를 잰다. 계정을 안 가리고 한 번에 다 본다
const 헬스꼴 = { 파일: '헬스체크.sh', 라벨앞: 'com.threads.health', 로그: '헬스체크', 기본시간: 3, 최대시간: 24 }
// 조회수 알리미 — **분 단위**다. 30분마다 본다 (사용자가 정했다)
const 알리미꼴 = { 파일: '조회수알리미.sh', 라벨앞: 'com.threads.viewalert', 로그: '조회수알리미', 기본시간: 30, 최대시간: 720, 단위초: 60 }
// 점검 — 알리미와 같은 분 단위 꼴이다. 계정을 안 가리고 한 번에 다 본다 (src/점검돌기.mjs 의 한판)
const 점검꼴 = { 파일: '점검.sh', 라벨앞: 'com.threads.inspect', 로그: '점검', 기본시간: 30, 최대시간: 720, 단위초: 60 }
// 섀도우밴 살피기 — 하루 한 번이면 넉넉하다. 노출이 죽는 것은 몇 시간 단위로 오르내리지 않는다.
// 자주 두드리면 로그인 안 한 요청이 잦아져 오히려 눈에 띈다 (2026-08-30)
const 섀도우꼴 = { 파일: '섀도우밴.sh', 라벨앞: 'com.threads.shadow', 로그: '섀도우밴', 기본시간: 24, 최대시간: 168 }

export const 헬스체크찾기 = () => 간격시각표찾기('헬스체크.sh', '')
export const 헬스체크켜기 = (간격시간 = 3, 뿌리 = process.cwd()) =>
  간격시각표켜기(헬스꼴, '', 간격시간, 뿌리)
export const 헬스체크끄기 = () => 간격시각표끄기('헬스체크.sh', '', '헬스체크가 꺼져 있습니다')

export const 알리미찾기 = () => 간격시각표찾기('조회수알리미.sh', '')
export const 알리미켜기 = (간격분 = 30, 뿌리 = process.cwd()) =>
  간격시각표켜기(알리미꼴, '', 간격분, 뿌리)
export const 알리미끄기 = () => 간격시각표끄기('조회수알리미.sh', '', '조회수 알리미가 꺼져 있습니다')

export const 점검찾기 = () => 간격시각표찾기('점검.sh', '')
export const 점검켜기 = (간격분 = 30, 뿌리 = process.cwd()) =>
  간격시각표켜기(점검꼴, '', 간격분, 뿌리)
export const 점검끄기 = () => 간격시각표끄기('점검.sh', '', '점검이 꺼져 있습니다')

export const 섀도우찾기 = () => 간격시각표찾기('섀도우밴.sh', '')
export const 섀도우켜기 = (간격시간 = 24, 뿌리 = process.cwd()) =>
  간격시각표켜기(섀도우꼴, '', 간격시간, 뿌리)
export const 섀도우끄기 = () => 간격시각표끄기('섀도우밴.sh', '', '섀도우밴 살피기가 꺼져 있습니다')

export const 길들이기켜기 = (계정, 간격시간 = 3, 뿌리 = process.cwd()) =>
  간격시각표켜기(길들이기꼴, 계정, 간격시간, 뿌리)
export const 성적켜기 = (계정, 간격시간 = 6, 뿌리 = process.cwd()) =>
  간격시각표켜기(성적꼴, 계정, 간격시간, 뿌리)

async function 간격시각표끄기(스크립트이름, 계정, 없을때) {
  const 있던것 = await 간격시각표찾기(스크립트이름, 계정)
  if (!있던것) throw new Error(없을때)
  await 실행('launchctl', ['unload', 있던것.경로]).catch(() => {})
  await unlink(있던것.경로)
  return { 켜짐: false }
}

export const 길들이기끄기 = (계정) =>
  간격시각표끄기('길들이기.sh', 계정, '켜져 있는 길들이기가 없습니다')
export const 성적끄기 = (계정) =>
  간격시각표끄기('성적.sh', 계정, '켜져 있는 성적 찍기가 없습니다')

// ─── 감시 ──────────────────────────────────────────────────────────
// 계정별이 아니라 하나만 둔다 — 감시기는 모든 계정을 한 번에 훑는다.
// 자동 발행 시각표에 얹지 않는 이유가 핵심이다. 얹으면 자동 발행이 멈춘 순간
// 감시도 같이 멈춘다 — 정확히 잡아야 할 바로 그때다
export const 감시라벨 = 'com.threads.watch'

export async function 감시찾기() {
  const 곳 = join(homedir(), 'Library', 'LaunchAgents')
  let 파일들 = []
  try { 파일들 = (await readdir(곳)).filter((f) => f.endsWith('.plist')) } catch { return null }

  for (const f of 파일들) {
    try {
      const { stdout } = await 실행('plutil', ['-convert', 'json', '-o', '-', join(곳, f)])
      const d = JSON.parse(stdout)
      if (!(d.ProgramArguments ?? []).map(String).some((a) => a.includes('감시.sh'))) continue
      return { 경로: join(곳, f), 라벨: d.Label ?? f.replace(/\.plist$/, '') }
    } catch {}
  }
  return null
}

// 아침과 주간을 한 파일에 담는다. StartCalendarInterval 에 요일(Weekday)을 주면
// 그 요일에만 돈다 — 일요일 09:00 과 매일 08:10 을 한 시각표에 넣을 수 있다
const 감시plist글 = (라벨, 스크립트, 뿌리) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${라벨}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${스크립트}</string>
    <string>자동</string>
  </array>
  <key>WorkingDirectory</key><string>${뿌리}</string>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>10</integer></dict>
    <dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${뿌리}/logs/감시.out</string>
  <key>StandardErrorPath</key><string>${뿌리}/logs/감시.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>LANG</key><string>ko_KR.UTF-8</string>
  </dict>
</dict>
</plist>
`

export async function 감시켜기(뿌리 = process.cwd()) {
  const 스크립트 = join(뿌리, '감시.sh')
  if (!(await stat(스크립트).catch(() => null))) throw new Error('감시.sh 를 못 찾았습니다')
  await chmod(스크립트, 0o755).catch(() => {})

  const 있던것 = await 감시찾기()
  const 라벨 = 있던것?.라벨 ?? 감시라벨
  const 경로 = 있던것?.경로 ?? join(homedir(), 'Library', 'LaunchAgents', `${라벨}.plist`)

  await writeFile(경로, 감시plist글(라벨, 스크립트, 뿌리))
  await 실행('launchctl', ['unload', 경로]).catch(() => {}) // 처음이면 실패하는 게 정상이다
  await 실행('launchctl', ['load', 경로])
  return { 켜짐: true, 라벨 }
}

export async function 감시끄기() {
  const 있던것 = await 감시찾기()
  if (!있던것) throw new Error('켜져 있는 감시가 없습니다')
  await 실행('launchctl', ['unload', 있던것.경로]).catch(() => {})
  await unlink(있던것.경로)
  return { 켜짐: false }
}

// 기록에서 판마다 (때, 결과) 를 뽑는다. 머리글이 '═══ [계정] 2026-08-19 13:00:01 ═══' 꼴이다
async function 판들(계정, 뿌리 = process.cwd()) {
  const 이름 = (d) => `${계정 ? 계정 + '-' : ''}${d.getFullYear()}-${이틀(d.getMonth() + 1)}.log`
  const 오늘 = new Date()
  const 지난달 = new Date(오늘.getFullYear(), 오늘.getMonth() - 1, 1)
  let 글 = ''
  for (const d of [지난달, 오늘]) {
    글 += await readFile(join(뿌리, 'logs', 이름(d)), 'utf8').catch(() => '')
  }
  const 조각 = 글.split(/^═══ /m).slice(1)
  return 조각.map((c) => {
    const 때 = c.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
    if (!때) return null
    // 셋을 뭉뚱그리면 "왜 안 올라갔나" 를 알 수 없다. 건너뜀은 일부러 그런 것이고
    // 실패는 손봐야 하는 것이며, 못올림은 그때 쓸 글이 없었다는 뜻이다
    // ⚠️ 옛 기록에는 「✅ 올렸다」, 새 기록에는 「✅ 한 편 올렸습니다」 가 찍힌다 (08-24 에 말을 쉽게 고쳤다).
    // 둘 다 받아야 지난 판이 격자에서 사라지지 않는다
    const 결과 = /✅ (올렸다|한 편 올렸습니다)/.test(c) ? '올림'
      : /⏸/.test(c) ? '건너뜀'
        : /‼️/.test(c) ? '실패' : '못올림'
    return { 날짜: `${때[1]}-${때[2]}-${때[3]}`, 시: Number(때[4]), 분: Number(때[5]), 결과 }
  }).filter(Boolean)
}

export async function 발행격자(계정, { 일수 = 7, 뿌리 = process.cwd() } = {}) {
  const 모든시각표 = await 시각표들()
  const 그시각표 = 모든시각표.find((t) => t.계정 === 계정) ?? null
  const 칸들 = 그시각표?.칸들 ?? []
  const 시각들 = 칸들.map((c) => c.시)
  const 기록 = await 판들(계정, 뿌리)
  const 지금 = new Date()

  const 줄 = []
  for (let i = 0; i < 일수; i++) {
    const d = new Date(지금)
    d.setDate(d.getDate() - i)
    const 날짜 = 날짜글(d)
    const 칸 = 칸들.map(({ 시, 분 }) => {
      // 예정 시각부터 두 시간 안에 돈 판을 그 칸의 결과로 본다.
      // 맥이 자다 깨서 늦게 도는 일이 있어 정각만 보면 놓친다
      const 판 = 기록.find((r) => r.날짜 === 날짜 && r.시 >= 시 && r.시 < 시 + 2)
      if (판) return { 시, 분, 상태: 판.결과, 때: `${이틀(판.시)}:${이틀(판.분)}` }
      const 지났나 = new Date(`${날짜}T${이틀(시)}:${이틀(분)}:00`) < 지금
      return { 시, 분, 상태: 지났나 ? '기록없음' : '아직' }
    })
    줄.push({ 날짜, 요일: '일월화수목금토'[d.getDay()], 칸 })
  }
  return {
    시각들, 칸들, 분: 그시각표?.분 ?? 0, 줄,
    // 아직 시각표가 없는 계정에 권할 분. 남이 안 쓰는 자리를 준다
    추천분: 그시각표?.분 ?? await 빈분고르기(계정, 모든시각표),
    // 다른 계정이 쓰는 자리. 같은 시·분을 고르면 화면이 미리 묻는다
    남들: 모든시각표.filter((t) => t.계정 !== 계정)
      .map((t) => ({ 계정: t.계정, 칸들: t.칸들 })),
  }
}

// ─── 최근 올린 글 ──────────────────────────────────────────────────
const 사진꼴 = /\.(jpe?g|png|webp|gif)$/i

export async function 최근글(계정, { 개수 = 20, 뿌리 = process.cwd() } = {}) {
  // ⚠️ 계정마다 미디어 자리가 다르다 — 첫 계정만 media/쓴것 이고 나머지는 media/<계정>/쓴것 이다.
  // 여기서 media/쓴것 만 읽던 탓에 쟁여둔언니가 43편을 올렸는데도 화면은 늘 0편이었다 (2026-08-25 실측)
  const 쓴곳 = join(뿌리, 계정 ? join('media', 계정) : 'media', '쓴것')
  let 폴더 = []
  try { 폴더 = await readdir(쓴곳) } catch { return [] }

  const 모음 = []
  for (const code of 폴더) {
    const 곳 = join(쓴곳, code)
    const 글 = await readFile(join(곳, '재구성.json'), 'utf8').then(JSON.parse).catch(() => null)
    if (!글) continue
    // 옛 글에는 발행 기록이 없다. 그때는 첫 계정이 올린 것이다
    const 그계정 = 글.발행?.계정 ?? ''
    if (그계정 !== 계정) continue

    const 때 = 글.발행?.올린때 ?? await stat(곳).then((s) => s.mtime.toISOString()).catch(() => '')
    const 파일들 = await readdir(곳).catch(() => [])
    모음.push({
      code,
      올린때: 때,
      사진: 파일들.find((f) => 사진꼴.test(f)) ?? null,
      본문: String(글.본문 ?? '').slice(0, 160),
      상품이름: 글.상품?.이름 ?? null,
      상품주소: 글.상품?.url ?? null,
      글주소: 글.발행?.본문번호 ? `https://www.threads.com/t/${글.발행.본문번호}` : null,
    })
  }
  return 모음.sort((a, b) => String(b.올린때).localeCompare(String(a.올린때))).slice(0, 개수)
}
