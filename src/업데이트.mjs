// 공개 저장소 최신 판을 받아 코드·문서만 덮는다. 장부·열쇠·미디어·프로필은 절대 안 덮는다
import './그물.mjs'   // IPv6 헛디딤 막기 (부수 효과) — 왜인지는 그 파일 머리에 있다
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { 알리기 } from './알림.mjs'

const 기본실행 = promisify(execFile)

export const 저장소 = 'kimleader/threads-recipe-bot'
export const 기록파일 = 'logs/업데이트기록.json'
export const 업데이트라벨 = 'com.threads.update'

// 덮으면 안 되는 것들. 사람이 쌓은 것(장부·열쇠·사진·로그인)은 코드가 아니다
// ⚠️ **`계정/` 이 맨 앞이다.** 2026-08-29 폴더 개편으로 출입증(`계정/<이름>/열쇠.env`)과
// 사진(`계정/<이름>/media/`)이 그 안으로 들어갔다. 옛 목록은 `.env` 로 **시작하는** 것과
// 뿌리 `media/` 만 지켜서 새 자리를 하나도 못 지켰다 (검증 에이전트가 잡았다)
export const 보존 = ['계정/', '.env', 'persona.', '말투바탕.json', '.json', '.jsonl',
  'media/', '크롬프로필/', 'node_modules/', 'logs/',
  '.설정화면열쇠', '.git/', '업데이트백업/', 'dashboard/node_modules/', 'dashboard/.next/']

// `.json` 을 통째로 지키면 설정 json 까지 옛것으로 남는다 — 이 여섯만 예외로 덮는다
const 덮는설정 = /^(package\.json|package-lock\.json|tsconfig[^/]*\.json|components\.json)$/

// 상대경로는 posix 꼴('a/b.json')로 받는다.
// node_modules/ 와 .git/ 은 어느 깊이에 있든 지키고, 나머지 폴더는 뿌리에서만 잰다.
//
// ⚠️ **보존 목록에서 뽑아 쓴다.** 전에는 여기 따로 적어 두어 `보존` 에 폴더를 더해도
// 실제로는 안 지켜졌다 — `계정/` 을 보존에 넣었는데 출입증과 사진이 그대로 덮이는
// 상태였다 (2026-08-29 검증에서 잡혔다). 두 목록이 갈라질 자리를 없앤다
const 뿌리폴더 = 보존.filter((v) => v.endsWith('/'))

export function 보존인가(상대경로) {
  const 길 = String(상대경로).replaceAll('\\', '/').replace(/^\.?\//, '')
  const 이름 = 길.slice(길.lastIndexOf('/') + 1)
  // node_modules/ · .git/ 안은 이름이 무엇이든 손대지 않는다. 설정 json 예외보다 먼저 잰다 —
  // 안 그러면 node_modules/foo/package.json 이 덮여 남의 묶음이 망가진다
  if (/(^|\/)(node_modules|\.git)\//.test(길)) return true
  if (뿌리폴더.some((앞) => 길.startsWith(앞))) return true
  if (덮는설정.test(이름)) return false
  if (이름 === '.설정화면열쇠') return true
  if (이름.startsWith('.env') || 이름.startsWith('persona.')) return true
  return 이름.endsWith('.json') || 이름.endsWith('.jsonl')
}

// 'v1.9.0' 과 '1.10.0' 을 글자로 재면 순서가 뒤집힌다. 마디마다 숫자로 잰다
export function 판비교(지금, 최신) {
  const 쪼개기 = (것) => {
    const [뼈대, 꼬리 = ''] = String(것 ?? '').replace(/^v/, '').split('-')
    return { 마디: 뼈대.split('.').map((n) => Number.parseInt(n, 10) || 0), 꼬리 }
  }
  const 앞 = 쪼개기(지금)
  const 뒤 = 쪼개기(최신)
  for (let i = 0; i < Math.max(앞.마디.length, 뒤.마디.length); i += 1) {
    const a = 앞.마디[i] ?? 0
    const b = 뒤.마디[i] ?? 0
    if (b > a) return 1
    if (b < a) return -1
  }
  // 뼈대가 같으면 꼬리(-rc1 · -beta) 붙은 쪽이 아래다. 시험판을 정식판보다 새것으로 보면 안 된다
  if (앞.꼬리 === 뒤.꼬리) return 0
  if (!앞.꼬리) return -1
  if (!뒤.꼬리) return 1
  return 뒤.꼬리 > 앞.꼬리 ? 1 : -1
}

const 깃허브머리 = { Accept: 'application/vnd.github+json', 'User-Agent': 'threads-recipe-bot-updater' }

// 새벽에 도는 일이라 던지면 아무도 못 본다. 못 알아내면 null 을 돌려준다
export async function 최신판알아보기({ 받기 = fetch } = {}) {
  try {
    const 릴리스 = await 받기(`https://api.github.com/repos/${저장소}/releases/latest`, { headers: 깃허브머리 })
    if (릴리스.ok) {
      const 것 = await 릴리스.json()
      if (것?.tag_name) return { 판: String(것.tag_name).replace(/^v/, ''), zip: 것.zipball_url, 때: 것.published_at }
    }
    // 릴리스를 안 만들어 두는 판도 있다 — 태그로 물러선다
    const 태그 = await 받기(`https://api.github.com/repos/${저장소}/tags`, { headers: 깃허브머리 })
    if (!태그.ok) return null
    const 목록 = await 태그.json()
    const 첫 = Array.isArray(목록) ? 목록[0] : null
    return 첫?.name ? { 판: String(첫.name).replace(/^v/, ''), zip: 첫.zipball_url } : null
  } catch {
    return null
  }
}

// 깃허브 zip 은 <owner>-<repo>-<sha>/ 한 겹으로 싸여 있다. 그 안쪽을 돌려준다
export async function 받아풀기(zip주소, 임시폴더, { 받기 = fetch, 풀기 = 기본실행 } = {}) {
  const 답 = await 받기(zip주소, { headers: 깃허브머리 })
  if (!답.ok) throw new Error(`새 판을 못 받았습니다 (${답.status})`)
  const zip경로 = join(임시폴더, '판.zip')
  await writeFile(zip경로, Buffer.from(await 답.arrayBuffer()))

  const 풀린곳 = join(임시폴더, '풀림')
  await mkdir(풀린곳, { recursive: true })
  await 풀기('/usr/bin/unzip', ['-q', '-o', zip경로, '-d', 풀린곳])

  const 겹들 = (await readdir(풀린곳, { withFileTypes: true })).filter((것) => 것.isDirectory())
  if (겹들.length !== 1) throw new Error(`zip 안 뿌리 폴더가 ${겹들.length} 개입니다`)
  return join(풀린곳, 겹들[0].name)
}

// 새뿌리에 있는 것만 덮는다. 옛 뿌리에만 있는 파일은 지우지 않는다 —
// 지우기는 나중 일이다. 잘못 지우면 되돌릴 수가 없다
export async function 덮기(새뿌리, 뿌리, { 백업폴더 }) {
  const 덮은 = []
  const 건너뛴 = []

  const 걷기 = async (상대) => {
    const 것들 = await readdir(join(새뿌리, 상대 || '.'), { withFileTypes: true })
    for (const 것 of 것들) {
      const 길 = 상대 ? `${상대}/${것.name}` : 것.name
      if (것.isDirectory()) {
        // 보존 폴더는 들어가지도 않는다 — 안의 파일 이름과 상관없이 통째로 건너뛴다
        if (!보존인가(`${길}/무엇`)) await 걷기(길)
        continue
      }
      if (!것.isFile()) continue
      if (보존인가(길)) { 건너뛴.push(길); continue }

      const 목표 = join(뿌리, 길)
      if (await stat(목표).catch(() => null)) {
        await mkdir(dirname(join(백업폴더, 길)), { recursive: true })
        await copyFile(목표, join(백업폴더, 길))
      }
      await mkdir(dirname(목표), { recursive: true })
      await copyFile(join(새뿌리, 길), 목표)
      덮은.push(길)
    }
  }

  await 걷기('')
  return { 덮은, 건너뛴 }
}

export async function 되돌리기(백업폴더, 뿌리) {
  const 걷기 = async (상대) => {
    const 것들 = await readdir(join(백업폴더, 상대 || '.'), { withFileTypes: true })
    for (const 것 of 것들) {
      const 길 = 상대 ? `${상대}/${것.name}` : 것.name
      if (것.isDirectory()) { await 걷기(길); continue }
      if (!것.isFile()) continue
      await mkdir(dirname(join(뿌리, 길)), { recursive: true })
      await copyFile(join(백업폴더, 길), join(뿌리, 길))
    }
  }
  await 걷기('')
}

// 덮은 뒤에 해야 하는 일. 여기서 막히면 새 판이 못 도는 것이므로 되돌려야 한다
export async function 뒤처리(뿌리, { 실행 = 기본실행 } = {}) {
  const 단계들 = [
    ['묶음 받기', 'npm', ['install'], { cwd: 뿌리 }],
    ['화면 묶음 받기', 'npm', ['install'], { cwd: join(뿌리, 'dashboard') }],
    ['화면 빌드', 'node', ['dashboard/node_modules/next/dist/bin/next', 'build', 'dashboard'], { cwd: 뿌리 }],
  ]
  for (const [이름, 명령, 인자, 옵션] of 단계들) {
    try {
      await 실행(명령, 인자, 옵션)
    } catch (e) {
      throw new Error(`${이름} 에서 막혔습니다: ${e.message}`)
    }
  }
}

// 다시 켜는 것은 따로 둔다. 새 판은 멀쩡히 깔렸는데 켜기만 막혔다고 되돌리면 손해다
export async function 다시켜기(뿌리, { 실행 = 기본실행 } = {}) {
  await 실행('launchctl', ['kickstart', '-k', `gui/${process.getuid()}/com.threads.dashboard`], { cwd: 뿌리 })
}

export async function 기록읽기(뿌리) {
  try {
    const 것 = JSON.parse(await readFile(join(뿌리, 기록파일), 'utf8'))
    return Array.isArray(것) ? 것 : []
  } catch {
    return [] // 아직 없으면 빈 기록이다
  }
}

export async function 기록쓰기(뿌리, 줄) {
  const 줄들 = [...await 기록읽기(뿌리), 줄].slice(-50)
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(뿌리, 기록파일), `${JSON.stringify(줄들, null, 1)}\n`)
  return 줄들
}

const 지금판읽기 = async (뿌리) => {
  try {
    return JSON.parse(await readFile(join(뿌리, 'package.json'), 'utf8')).version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export async function 업데이트하기({
  뿌리 = process.cwd(), 받기 = fetch, 실행 = 기본실행, 알림 = 알리기, 지금판, 진행 = () => {},
} = {}) {
  // 제작자 저장소에는 공개판 올리기 도구가 있다. 여기서 자기를 덮으면 작업 중인 것이 날아간다.
  // 깃허브를 부르기도 전에, 기록도 남기지 않고 그냥 돌아선다
  // ⚠️ 2026-09-01 — 도구를 도구/ 폴더로 옮겼다. 여기가 옛 이름을 보면 표시를 못 찾아
  //    **제작자 저장소가 자기를 덮는다.** 옛 이름도 함께 본다 — 아직 안 옮긴 사본이 있을 수 있다
  const 제작자표시 = await Promise.all(['도구/공개판올리기.mjs', '도구.공개판올리기.mjs']
    .map((길) => stat(join(뿌리, 길)).then(() => true).catch(() => false)))
  if (제작자표시.some(Boolean)) {
    return { 됨: false, 까닭: '제작자 저장소에서는 자동 업데이트를 하지 않아요.' }
  }

  const 판전 = 지금판 ?? await 지금판읽기(뿌리)
  const 적기 = (결과, 까닭, 판후 = 판전) =>
    기록쓰기(뿌리, { 때: new Date().toISOString(), 판전, 판후, 결과, 까닭 })

  const 알리기옵션 = { 종류: '업데이트', 잠잠시간: 0 } // 업데이트는 드물다. 6시간 잠잠에 눌려 되돌림 알림을 놓치면 안 된다

  진행('최신 판 확인 중')
  const 최신 = await 최신판알아보기({ 받기 })
  // 매일 도는 일이라 「이미 최신」·「확인 못 함」까지 적으면 50줄이 그것으로만 찬다. 진짜 시도만 남긴다
  if (!최신) return { 됨: false, 까닭: '최신 판을 확인하지 못했어요.' }
  if (판비교(판전, 최신.판) <= 0) return { 됨: false, 까닭: '이미 최신' }

  const 백업폴더 = join(뿌리, '업데이트백업', String(판전))
  let 새뿌리
  try {
    진행('받는 중')
    // 임시폴더는 지우지 않는다. 무엇을 받았는지 나중에 들여다볼 수 있어야 한다 (OS 가 치운다)
    새뿌리 = await 받아풀기(최신.zip, await mkdtemp(join(tmpdir(), '업데이트-')), { 받기 })
  } catch (e) {
    // 아직 아무것도 안 덮었다. 되돌릴 것도 없다
    const 까닭 = `새 판을 받지 못했어요 — ${e.message}`
    await 적기('실패', 까닭, 최신.판)
    await 알림(`업데이트 실패 — ${까닭}`, 알리기옵션)
    return { 됨: false, 까닭 }
  }

  try {
    진행('덮는 중')
    await mkdir(백업폴더, { recursive: true })
    await 덮기(새뿌리, 뿌리, { 백업폴더 })
  } catch (e) {
    // 덮다 말았다 — 반쯤 덮인 채로 두지 않는다
    try {
      await 되돌리기(백업폴더, 뿌리)
    } catch (막힌까닭) {
      // 되돌리기까지 막히면 반쯤 덮인 채로 남는다. 조용히 넘기면 사람이 영영 모른다
      const 까닭 = `새 판을 덮다가도 되돌리다가도 막혔어요 — ${e.message}`
      await 적기('되돌리기실패', 까닭, 최신.판)
      await 알림(`${까닭} 업데이트백업/${판전}/ 을 손으로 복사해 주세요. (${막힌까닭.message})`, 알리기옵션)
      return { 됨: false, 되돌림: false, 되돌리기실패: true, 까닭 }
    }
    const 까닭 = `새 판을 덮다가 막혔어요 — ${e.message}`
    await 적기('실패', 까닭, 최신.판)
    await 알림(`업데이트 실패 — ${까닭}`, 알리기옵션)
    return { 됨: false, 까닭 }
  }

  try {
    진행('빌드하는 중')
    await 뒤처리(뿌리, { 실행 })
  } catch (e) {
    try {
      await 되돌리기(백업폴더, 뿌리)
    } catch (막힌까닭) {
      const 까닭 = `업데이트도 되돌리기도 실패했어요 — ${e.message}`
      await 적기('되돌리기실패', 까닭, 최신.판)
      await 알림(`${까닭} 업데이트백업/${판전}/ 을 손으로 복사해 주세요. (${막힌까닭.message})`, 알리기옵션)
      return { 됨: false, 되돌림: false, 되돌리기실패: true, 까닭 }
    }
    // 옛 판으로 다시 빌드해 화면을 살린다. 이것마저 막히면 화면이 안 뜨므로 사람에게 말해 준다
    진행('빌드하는 중')
    let 다시빌드못함 = ''
    try {
      await 뒤처리(뿌리, { 실행 })
    } catch {
      다시빌드못함 = ' 옛 판 다시 빌드도 막혔어요 — 관리자 도구 터미널에서 `node dashboard/node_modules/next/dist/bin/next build dashboard` 를 돌려 주세요.'
    }
    진행('다시 켜는 중')
    await 다시켜기(뿌리, { 실행 }).catch(() => {})
    const 까닭 = `업데이트 실패 — 옛 판으로 되돌렸어요. (${e.message})${다시빌드못함}`
    await 적기('되돌림', 까닭, 최신.판)
    await 알림(까닭, 알리기옵션)
    return { 됨: false, 되돌림: true, 까닭 }
  }

  // 여기까지 왔으면 새 판은 멀쩡히 깔렸다. 켜기가 막혀도 되돌리지 않는다 — 사람이 한 번 누르면 된다
  진행('다시 켜는 중')
  try {
    await 다시켜기(뿌리, { 실행 })
  } catch (e) {
    const 까닭 = `업데이트는 됐는데 대시보드를 다시 켜지 못했어요 — 직접 다시 켜 주세요. (${e.message})`
    await 적기('됨-다시켜기실패', 까닭, 최신.판)
    await 알림(까닭, 알리기옵션)
    return { 됨: true, 판전, 판후: 최신.판, 다시켜기실패: true }
  }

  await 적기('됨', '', 최신.판)
  await 알림(`${판전} → ${최신.판} 업데이트했어요`, 알리기옵션)
  return { 됨: true, 판전, 판후: 최신.판 }
}

// ─── 매일 11:00 확인 (launchd) ──────────────────────────────────
const plist경로 = () => join(homedir(), 'Library', 'LaunchAgents', `${업데이트라벨}.plist`)

// 이 맥에서 지금 도는 node 로 적는다. 경로를 박아 두면 homebrew node 를 쓰는 맥에서 launchd 가 못 찾는다
export const 업데이트plist글 = (뿌리) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${업데이트라벨}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${join(뿌리, '업데이트.mjs')}</string>
  </array>
  <key>WorkingDirectory</key><string>${뿌리}</string>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>11</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${뿌리}/logs/launchd-update.out</string>
  <key>StandardErrorPath</key><string>${뿌리}/logs/launchd-update.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>LANG</key><string>ko_KR.UTF-8</string>
  </dict>
</dict>
</plist>
`

export async function 매일확인켜기(뿌리 = process.cwd(), { 실행 = 기본실행 } = {}) {
  const 경로 = plist경로()
  await mkdir(dirname(경로), { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(경로, 업데이트plist글(뿌리))
  await 실행('launchctl', ['unload', 경로]).catch(() => {}) // 처음이면 실패하는 게 정상이다
  await 실행('launchctl', ['load', 경로])
  return { 켜짐: true, 경로 }
}

export async function 매일확인끄기({ 실행 = 기본실행 } = {}) {
  const 경로 = plist경로()
  await 실행('launchctl', ['unload', 경로]).catch(() => {})
  await unlink(경로).catch(() => {})
  return { 켜짐: false }
}

export async function 매일확인켜졌나() {
  return Boolean(await stat(plist경로()).catch(() => null))
}
