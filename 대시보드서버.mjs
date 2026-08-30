// 새 대시보드를 옛 서버와 같은 규칙으로 켠다. 127.0.0.1 은 언제나, BIND 가 오면 그것도. 0.0.0.0 은 막는다
// 환경: PORT(기본 7788) · BIND(쉼표로 여럿) · NOOPEN=1 이면 브라우저를 안 연다
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.NODE_ENV ??= 'production'

// 테일스케일 주소만 묶으면 테일스케일이 꺼졌을 때 이 컴퓨터에서도 못 연다 — 그래서 127.0.0.1 은 언제나 함께 묶는다
export function 묶을곳들(bind = process.env.BIND || '') {
  return [...new Set(['127.0.0.1', ...String(bind).split(',')])]
    .map((v) => v.trim()).filter(Boolean)
}

// 0.0.0.0 으로 열면 같은 와이파이의 아무나 들어와 열쇠를 바꿀 수 있다
export function 막힌주소인가(곳들) {
  return 곳들.some((v) => v === '0.0.0.0' || v === '::')
}

export async function 켜기({ 포트 = Number(process.env.PORT) || 7788, 곳들 = 묶을곳들(), 뿌리 = process.cwd(), 열기 = process.env.NOOPEN !== '1' } = {}) {
  const require = createRequire(join(뿌리, 'dashboard', 'package.json'))
  const next = require('next')
  const app = next({ dir: join(뿌리, 'dashboard'), dev: false, hostname: 곳들[0], port: 포트 })
  await app.prepare()
  const handle = app.getRequestHandler()

  const 서버들 = await Promise.all(곳들.map((곳) => new Promise((resolve, reject) => {
    const 서버 = createServer(handle)
    서버.once('error', reject)
    서버.listen(포트, 곳, () => resolve(서버))
  })))

  // 열쇠말은 dashboard/lib/뿌리.ts 의 열쇠말읽기 와 같은 규칙으로 읽기만 한다.
  // 없으면 만들지 않는다 — 첫 요청이 만들게 둔다
  const 있던것 = await readFile(join(뿌리, '.설정화면열쇠'), 'utf8').catch(() => '')
  const 열쇠말 = 있던것.trim()
  const 열쇠말있나 = /^[0-9a-f]{32,}$/.test(열쇠말)
  const 주소들 = 곳들.map((곳) => 열쇠말있나 ? `http://${곳}:${포트}/?k=${열쇠말}` : `http://${곳}:${포트}`)

  if (열기) execFile('open', [주소들[0]], () => {})

  // NOOPEN(=launchd, 파일 로그)일 땐 열쇠말을 가려 찍는다 — 로그 파일에 실제 열쇠가 안 남는다.
  // 직접 두 번 클릭했을 때(터미널)는 실제 열쇠를 그대로 찍는다
  const 찍을것 = 열기 ? 주소들 : 곳들.map((곳) => 열쇠말있나 ? `http://${곳}:${포트}/?k=…` : `http://${곳}:${포트}`)
  console.log(찍을것.map((v) => `  ${v}`).join('\n'))
  if (!열쇠말있나) console.log('열쇠말은 아직 없습니다 — 위 주소를 처음 열 때 만들어집니다.')

  return { 서버들, 주소들 }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const 곳들 = 묶을곳들()
  if (막힌주소인가(곳들)) {
    console.error('BIND 를 0.0.0.0 으로 열지 마세요. 같은 와이파이의 아무나 들어옵니다.')
    process.exit(1)
  }
  await 켜기({ 곳들 })
}
