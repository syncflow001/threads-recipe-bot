// 터미널 없이 브라우저에서 열쇠·말투를 넣고 돌려 보는 화면 — 내 컴퓨터에서만 열린다
import { createServer } from 'node:http'
import { readFile, writeFile, access, readdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { 화면 } from './src/설정화면-html.mjs'
import { 수익, 발행격자, 최근글 } from './src/대시보드.mjs'
import { extname, join, basename } from 'node:path'
import { createReadStream } from 'node:fs'

const 포트 = Number(process.env.PORT || 7788)

// 기본은 이 컴퓨터에서만 열린다. 아이폰에서도 쓰려면 BIND 로 테일스케일 주소를 준다 —
// 테일스케일은 내 기기끼리만 통하는 사설망이라 인터넷에 노출되지 않는다.
// 0.0.0.0 은 쓰지 마라. 같은 와이파이의 아무나 들어와 열쇠를 바꿀 수 있다
const 묶을곳 = process.env.BIND || '127.0.0.1'
if (묶을곳 === '0.0.0.0' || 묶을곳 === '::') {
  console.error('BIND 를 0.0.0.0 으로 열지 마세요. 같은 와이파이의 아무나 들어옵니다.')
  process.exit(1)
}

// 주소·쿠키·파라미터 이름은 전부 영문으로 쓴다. 한글을 쓰면 브라우저가 퍼센트 인코딩해서
// url.pathname 이 '/%EC%83%81...' 로 오고 문자열 비교가 안 맞는다 — 실제로 당했다.
// 화면에 보이는 글만 한국어다.
// 브라우저는 다른 사이트에서도 localhost 로 요청을 보낼 수 있다. 그대로 두면 아무 웹페이지나
// 우리 화면을 조작해 열쇠를 바꾸거나 글을 올릴 수 있다. 그래서 매번 켤 때마다 열쇠말을 새로 만든다
const 열쇠말 = randomBytes(24).toString('hex')

const 열쇠들 = [
  ['OPENAI_API_KEY', '글을 다시 쓰는 데 필요', true],
  ['THREADS_ACCESS_TOKEN', '스레드에 올리는 데 필요', true],
  ['THREADS_USER_ID', '내 스레드 계정 번호', true],
  ['THREADS_COOKIE', '조회수·등급을 보려면 필요', false],
  ['COUPANG_ACCESS_KEY', '쿠팡 제휴 링크용', false],
  ['COUPANG_SECRET_KEY', '쿠팡 제휴 링크용', false],
  ['BLOB_READ_WRITE_TOKEN', '영상을 같이 올리려면 필요', false],
]

const 있나 = (p) => access(p).then(() => true, () => false)
const 열쇠파일 = (계정) => (계정 ? `.env.${계정}` : '.env.local')
const 말투파일 = (계정) => (계정 ? `persona.${계정}.json` : 'persona.json')

// 계정 이름은 SubID 에 들어간다. 영문·숫자만, 8자까지 (src/coupang.mjs 와 같은 제약)
const 계정꼴 = /^[0-9A-Za-z_-]{1,8}$/

async function 계정목록() {
  const 파일들 = await readdir('.').catch(() => [])
  const 딴것 = 파일들
    .map((f) => f.match(/^\.env\.([0-9A-Za-z_-]{1,8})$/)?.[1])
    // .env.local 은 첫 계정 그 자체다. .env.example 은 서식이다. 둘 다 계정이 아니다
    .filter((v) => v && v !== 'example' && v !== 'local')
  return ['', ...new Set(딴것)]
}

async function 상태(계정) {
  const 원문 = await readFile(열쇠파일(계정), 'utf8').catch(() => '')
  // 값은 절대 밖으로 내보내지 않는다. 채워졌는지만 알린다
  const 열쇠 = 열쇠들.map(([이름, 설명, 필수]) => ({
    이름, 설명, 필수,
    채움: new RegExp(`^${이름}=.+`, 'm').test(원문),
  }))
  const 말투원문 = await readFile(말투파일(계정), 'utf8').catch(() => '')
  let 말투 = null
  try {
    const p = JSON.parse(말투원문)
    말투 = {
      정체성: p.정체성 ?? '',
      말투: p.말투 ?? '',
      표현: (p['자주 쓰는 표현'] ?? []).join(', '),
      예시: p['내 글 예시'] ?? [],
    }
  } catch {}
  return { 계정, 계정들: await 계정목록(), 열쇠, 말투, 말투있나: !!말투원문 }
}

// 있던 줄은 바꾸고 없던 줄은 붙인다. 손으로 적어 둔 주석과 다른 값은 건드리지 않는다
async function 열쇠저장(계정, 받은것) {
  const 경로 = 열쇠파일(계정)
  let 원문 = await readFile(경로, 'utf8').catch(() => '')
  for (const [이름, 값] of Object.entries(받은것)) {
    if (!열쇠들.some(([n]) => n === 이름)) continue // 모르는 이름은 무시한다
    const 다듬 = String(값 ?? '').trim()
    if (!다듬) continue // 빈 칸은 "안 바꾼다" 는 뜻이다. 지우려면 파일을 직접 연다
    const 줄 = `${이름}=${다듬.includes(' ') || 다듬.includes('"') ? JSON.stringify(다듬) : 다듬}`
    const 자리 = new RegExp(`^${이름}=.*$`, 'm')
    원문 = 자리.test(원문) ? 원문.replace(자리, 줄) : `${원문.replace(/\n*$/, '\n')}${줄}\n`
  }
  await writeFile(경로, 원문, { mode: 0o600 })
}

async function 말투저장(계정, 받은것) {
  const 경로 = 말투파일(계정)
  const 바탕 = await readFile(경로, 'utf8').catch(() => null)
  const p = 바탕 ? JSON.parse(바탕) : JSON.parse(await readFile('persona.json', 'utf8'))
  p.정체성 = String(받은것.정체성 ?? '').trim()
  p.말투 = String(받은것.말투 ?? '').trim()
  p['자주 쓰는 표현'] = String(받은것.표현 ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  p['내 글 예시'] = (받은것.예시 ?? []).map((s) => String(s).trim()).filter(Boolean)
  await writeFile(경로, JSON.stringify(p, null, 2) + '\n')
}

// 계정을 하나 늘린다. 열쇠 서식과 말투 서식을 만들어 두면 그때부터 목록에 뜬다.
// 레시피 형식·분량 규칙은 첫 계정 것을 물려준다. 말투만 비운다 —
// 계정마다 달라야 하는 건 '누가 어떻게 말하는가' 지 레시피 생김새가 아니다
async function 계정만들기(이름) {
  if (!계정꼴.test(이름)) throw new Error('계정 이름은 영문·숫자 8자까지입니다')
  if (이름 === 'local' || 이름 === 'example') throw new Error(`"${이름}" 은 쓸 수 없는 이름입니다`)
  if (await 있나(열쇠파일(이름))) throw new Error(`"${이름}" 계정이 이미 있습니다`)

  const 서식 = await readFile('.env.example', 'utf8').catch(() =>
    열쇠들.map(([n]) => `${n}=`).join('\n') + '\n')
  await writeFile(열쇠파일(이름), 서식, { mode: 0o600 })

  const 바탕 = await readFile('persona.json', 'utf8').then(JSON.parse).catch(() => ({}))
  await writeFile(말투파일(이름), JSON.stringify({
    ...바탕,
    _설명: `${이름} 계정의 말투. 이 화면에서 채우면 된다.`,
    정체성: '',
    말투: '',
    '자주 쓰는 표현': [],
    '내 글 예시': [],
  }, null, 2) + '\n')
  return 이름
}

// ─── 돌리기 ────────────────────────────────────────────────────────
// 한 번에 하나만 돈다. 두 판이 겹치면 같은 글을 두 번 올릴 수 있다
let 도는중 = null
const 기록 = []

function 돌리기(계정, 단계, 키워드) {
  if (도는중) return { 안됨: '이미 돌고 있습니다' }
  기록.length = 0
  const 인자 = ['--env-file=' + 열쇠파일(계정), 'run.mjs', ...키워드]
  if (단계 !== '보기') 인자.push('--받기', '--재구성')
  if (단계 === '발행') 인자.push('--발행')

  기록.push(`$ node ${인자.join(' ')}${계정 ? `   (계정 ${계정})` : ''}\n`)
  const 아이 = spawn(process.execPath, 인자, {
    env: { ...process.env, ...(계정 ? { PROFILE: 계정 } : {}) },
  })
  도는중 = 아이
  const 받기 = (덩이) => {
    기록.push(String(덩이))
    if (기록.length > 400) 기록.splice(0, 기록.length - 400)
  }
  아이.stdout.on('data', 받기)
  아이.stderr.on('data', 받기)
  아이.on('close', (코드) => {
    기록.push(`\n─── 끝 (종료코드 ${코드}) ───\n`)
    도는중 = null
  })
  return { 시작함: true }
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

const 서버 = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')

  // 첫 방문에서 열쇠말을 쿠키에 심는다. 그다음부터는 쿠키로 확인한다
  if (url.pathname === '/' && url.searchParams.get('k') === 열쇠말) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': `gate=${열쇠말}; Path=/; HttpOnly; SameSite=Strict`,
      'Cache-Control': 'no-store',
    })
    return res.end(화면)
  }

  const 쿠키 = (req.headers.cookie ?? '').match(/gate=([0-9a-f]+)/)?.[1]
  if (쿠키 !== 열쇠말) {
    return 보내기(res, 403, '<h1>주소가 맞지 않습니다</h1><p>터미널에 찍힌 주소를 그대로 열어 주세요.</p>',
      'text/html; charset=utf-8')
  }
  // 다른 사이트가 보낸 요청은 Origin 이 우리와 다르다. 브라우저가 붙여 주는 값이다
  const 출처 = req.headers.origin
  const 우리것 = [`http://127.0.0.1:${포트}`, `http://localhost:${포트}`, `http://${묶을곳}:${포트}`]
  if (출처 && !우리것.includes(출처)) {
    return 보내기(res, 403, { 안됨: '다른 곳에서 온 요청입니다' })
  }

  const 계정 = (url.searchParams.get('profile') ?? '').trim()
  if (계정 && !계정꼴.test(계정)) return 보내기(res, 400, { 안됨: '계정 이름은 영문·숫자 8자까지입니다' })

  try {
    if (url.pathname === '/') return 보내기(res, 200, 화면, 'text/html; charset=utf-8')
    if (url.pathname === '/status') return 보내기(res, 200, await 상태(계정))
    if (url.pathname === '/revenue') return 보내기(res, 200, await 수익())
    if (url.pathname === '/schedule') return 보내기(res, 200, await 발행격자(계정))
    if (url.pathname === '/posts') return 보내기(res, 200, await 최근글(계정))

    // 내려받아 둔 사진을 화면에 보여 준다. 폴더 밖으로 새 나가지 않게 이름만 받는다
    if (url.pathname === '/photo') {
      const code = basename(url.searchParams.get('code') ?? '')
      const file = basename(url.searchParams.get('file') ?? '')
      if (!/^[A-Za-z0-9_-]{1,20}$/.test(code) || !/^[\w.-]{1,40}$/.test(file)) {
        return 보내기(res, 400, { 안됨: '이름이 이상합니다' })
      }
      const 길 = join(process.cwd(), 'media', '쓴것', code, file)
      if (!(await 있나(길))) return 보내기(res, 404, { 안됨: '없는 사진입니다' })
      const 종류 = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.gif': 'image/gif' }[extname(file).toLowerCase()]
      if (!종류) return 보내기(res, 400, { 안됨: '사진이 아닙니다' })
      res.writeHead(200, { 'Content-Type': 종류, 'Cache-Control': 'private, max-age=3600' })
      return createReadStream(길).pipe(res)
    }
    if (url.pathname === '/log') return 보내기(res, 200, { 도는중: !!도는중, 글: 기록.join('') })

    if (req.method === 'POST') {
      const 몸통 = await 몸통읽기(req)
      if (url.pathname === '/keys') { await 열쇠저장(계정, 몸통); return 보내기(res, 200, await 상태(계정)) }
      if (url.pathname === '/persona') { await 말투저장(계정, 몸통); return 보내기(res, 200, await 상태(계정)) }
      if (url.pathname === '/run') {
        const 키워드 = (몸통.키워드 ?? '').trim().split(/\s+/).filter(Boolean)
        if (!키워드.length) return 보내기(res, 400, { 안됨: '검색어를 하나는 넣어 주세요' })
        return 보내기(res, 200, 돌리기(계정, 몸통.단계, 키워드))
      }
      if (url.pathname === '/account') {
        const 새이름 = await 계정만들기(String(몸통.이름 ?? '').trim())
        return 보내기(res, 200, await 상태(새이름))
      }
      if (url.pathname === '/stop') { 도는중?.kill('SIGTERM'); return 보내기(res, 200, { 멈춤: true }) }
    }
    return 보내기(res, 404, { 안됨: '없는 주소입니다' })
  } catch (e) {
    return 보내기(res, 500, { 안됨: e.message })
  }
})

// 127.0.0.1 로만 연다. 0.0.0.0 으로 열면 같은 와이파이에 있는 아무나 들어와 열쇠를 바꿀 수 있다
서버.listen(포트, 묶을곳, () => {
  const 주소 = `http://${묶을곳}:${포트}/?k=${열쇠말}`

  // 더블클릭으로 켰을 때 주소를 손으로 옮기지 않아도 되게 브라우저를 열어 준다.
  // NOOPEN=1 이면 안 연다 (검사 돌릴 때 창이 계속 뜨면 성가시다)
  if (process.env.NOOPEN !== '1') {
    const 열주소 = 묶을곳 === '127.0.0.1' ? 주소 : `http://127.0.0.1:${포트}/?k=${열쇠말}`
    spawn('open', [열주소], { stdio: 'ignore', detached: true }).unref()
  }

  console.log(`
╭──────────────────────────────────────────────╮
│  설정 화면이 열렸습니다                       │
╰──────────────────────────────────────────────╯

브라우저가 저절로 열립니다. 안 열리면 아래 주소를 붙여넣으세요.

  ${주소}

${묶을곳 === '127.0.0.1' ? '' : '이 주소는 테일스케일로 이어진 내 기기에서만 열립니다.\n'}주소에 붙은 열쇠는 켤 때마다 새로 만들어집니다.
끄려면 이 창에서 Control + C 를 누르세요.
`)
})
