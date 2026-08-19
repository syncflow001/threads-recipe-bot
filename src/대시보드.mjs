// 대시보드에 보여줄 것을 모은다 — 수익 · 발행 현황 · 최근 올린 글
import { readFile, readdir, stat } from 'node:fs/promises'
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
let 수익캐시 = { 때: 0, 값: null }

export async function 수익({ 일수 = 14, 캐시초 = 300 } = {}) {
  if (수익캐시.값 && Date.now() - 수익캐시.때 < 캐시초 * 1000) return 수익캐시.값

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

  const 날짜별 = new Map()
  for (const r of 줄) {
    const 이전 = 날짜별.get(r.날짜) ?? { 수수료: 0, 클릭: 0, 주문: 0 }
    날짜별.set(r.날짜, {
      수수료: 이전.수수료 + r.수수료,
      클릭: 이전.클릭 + r.클릭,
      주문: 이전.주문 + r.주문,
    })
  }

  const 최근 = []
  for (let i = 일수 - 1; i >= 0; i--) {
    const d = new Date(오늘)
    d.setDate(d.getDate() - i)
    const 키 = 날짜글(d)
    최근.push({ 날짜: 키, ...(날짜별.get(키) ?? { 수수료: 0, 클릭: 0, 주문: 0 }) })
  }

  const 달것 = [...날짜별.entries()].filter(([k]) => k.startsWith(날짜글(오늘).slice(0, 7)))
  const 값 = {
    안됨,
    오늘: 날짜별.get(날짜글(오늘))?.수수료 ?? 0,
    이번달: 달것.reduce((a, [, v]) => a + v.수수료, 0),
    클릭: 달것.reduce((a, [, v]) => a + v.클릭, 0),
    주문: 달것.reduce((a, [, v]) => a + v.주문, 0),
    최근,
    // 쿠팡이 subId 를 비워서 돌려준다 (실측). 채워지면 계정별로 가를 수 있다
    계정별가능: 줄.some((r) => r.꼬리표),
  }
  수익캐시 = { 때: Date.now(), 값 }
  return 값
}

// ─── 발행 현황 ─────────────────────────────────────────────────────
// 예정 시각은 LaunchAgent 에서 읽는다. 라벨이 아니라 '우리 자동발행.sh 를 부르는가' 로 찾는다 —
// 배포판은 라벨이 다르기 때문이다
export async function 예정시각(계정, 뿌리 = process.cwd()) {
  const 곳 = join(homedir(), 'Library', 'LaunchAgents')
  let 파일들 = []
  try { 파일들 = (await readdir(곳)).filter((f) => f.endsWith('.plist')) } catch { return [] }

  for (const f of 파일들) {
    try {
      const { stdout } = await 실행('plutil', ['-convert', 'json', '-o', '-', join(곳, f)])
      const d = JSON.parse(stdout)
      const 인자 = d.ProgramArguments ?? []
      if (!인자.some((a) => String(a).includes('자동발행.sh'))) continue
      // 인자 맨 뒤가 계정 이름이다. 없으면 첫 계정이다
      const 그계정 = 인자.length > 2 && !String(인자[2]).includes('/') ? String(인자[2]) : ''
      if (그계정 !== 계정) continue
      const 시각 = (d.StartCalendarInterval ?? []).map((s) => Number(s.Hour) || 0)
      return [...new Set(시각)].sort((a, b) => a - b)
    } catch {}
  }
  return []
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
    const 결과 = /✅ 올렸다/.test(c) ? '올림' : '못올림'
    return { 날짜: `${때[1]}-${때[2]}-${때[3]}`, 시: Number(때[4]), 분: Number(때[5]), 결과 }
  }).filter(Boolean)
}

export async function 발행격자(계정, { 일수 = 7, 뿌리 = process.cwd() } = {}) {
  const 시각들 = await 예정시각(계정, 뿌리)
  const 기록 = await 판들(계정, 뿌리)
  const 지금 = new Date()

  const 줄 = []
  for (let i = 0; i < 일수; i++) {
    const d = new Date(지금)
    d.setDate(d.getDate() - i)
    const 날짜 = 날짜글(d)
    const 칸 = 시각들.map((시) => {
      // 예정 시각부터 두 시간 안에 돈 판을 그 칸의 결과로 본다.
      // 맥이 자다 깨서 늦게 도는 일이 있어 정각만 보면 놓친다
      const 판 = 기록.find((r) => r.날짜 === 날짜 && r.시 >= 시 && r.시 < 시 + 2)
      if (판) return { 시, 상태: 판.결과, 때: `${이틀(판.시)}:${이틀(판.분)}` }
      const 지났나 = new Date(`${날짜}T${이틀(시)}:00:00`) < 지금
      return { 시, 상태: 지났나 ? '기록없음' : '아직' }
    })
    줄.push({ 날짜, 요일: '일월화수목금토'[d.getDay()], 칸 })
  }
  return { 시각들, 줄 }
}

// ─── 최근 올린 글 ──────────────────────────────────────────────────
const 사진꼴 = /\.(jpe?g|png|webp|gif)$/i

export async function 최근글(계정, { 개수 = 20, 뿌리 = process.cwd() } = {}) {
  const 쓴곳 = join(뿌리, 'media', '쓴것')
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
