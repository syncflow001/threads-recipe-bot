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

const 잠깐 = (ms) => new Promise((r) => setTimeout(r, ms))

// 부팅 직후에는 테일스케일 주소가 아직 이 컴퓨터에 안 붙어 있다 (EADDRNOTAVAIL — 2026-09-07 재부팅 실측).
// 그때 그냥 죽으면 Next 가 거부를 삼켜 **127.0.0.1 만 열린 반쪽 서버**가 남고, 폰에서는 못 연다.
// 그래서 「아직 없는 주소」일 때만 기다렸다 다시 묶는다. 다른 오류는 그대로 던진다
export async function 묶기(handle, 포트, 곳, { 최대시도 = 60, 쉬기 = 5000 } = {}) {
  for (let 번 = 1; ; 번++) {
    try {
      return await new Promise((resolve, reject) => {
        const 서버 = createServer(handle)
        서버.once('error', reject)
        서버.listen(포트, 곳, () => resolve(서버))
      })
    } catch (오류) {
      if (오류?.code !== 'EADDRNOTAVAIL' || 번 >= 최대시도) throw 오류
      console.log(`  ${곳} 은 아직 없는 주소입니다 (${번}/${최대시도}) — ${쉬기 / 1000}초 뒤 다시 묶습니다`)
      await 잠깐(쉬기)
    }
  }
}

export async function 켜기({ 포트 = Number(process.env.PORT) || 7788, 곳들 = 묶을곳들(), 뿌리 = process.cwd(), 열기 = process.env.NOOPEN !== '1' } = {}) {
  const require = createRequire(join(뿌리, 'dashboard', 'package.json'))
  const next = require('next')
  const app = next({ dir: join(뿌리, 'dashboard'), dev: false, hostname: 곳들[0], port: 포트 })
  await app.prepare()
  const handle = app.getRequestHandler()

  const 서버들 = await Promise.all(곳들.map((곳) => 묶기(handle, 포트, 곳)))

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
  // 끝내 못 묶으면 반쪽으로 살아 있지 말고 죽는다 — launchd(KeepAlive)가 다시 켠다
  await 켜기({ 곳들 }).catch((오류) => { console.error(오류); process.exit(1) })
}
