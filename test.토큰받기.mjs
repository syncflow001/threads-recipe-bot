import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { 코드뽑기, 쿠키문자열, 코드로토큰, 권한확인, 로그인주소, 필수권한, 자동발급 } from './src/토큰받기.mjs'
assert.equal(코드뽑기('https://localhost/?code=AQBxyz#_'), 'AQBxyz')
assert.equal(코드뽑기('https://localhost/?error=access_denied'), null)
assert.equal(쿠키문자열([{name:'a',value:'1',domain:'.threads.com'},{name:'b',value:'2',domain:'.instagram.com'}]), 'a=1')
assert.match(로그인주소('123', 'https://localhost/'), /client_id=123.*redirect_uri=https%3A%2F%2Flocalhost%2F.*scope=threads_basic/)
const 받기 = async (url, opts) => ({ ok: true, json: async () => url.includes('oauth/access_token') ? { access_token:'T', user_id:'9' } : { data: { scopes: ['threads_basic'] } } })
assert.deepEqual(await 코드로토큰('AQB', { 아이디:'1', 비밀:'2', 돌아올주소:'https://localhost/', 받기 }), { 토큰:'T', 사용자:'9' })
assert.deepEqual(await 권한확인('T', { 받기 }), ['threads_content_publish','threads_manage_replies','threads_manage_insights'])

// ── 자동발급: 가짜 크롬 + 가짜 받기로 실제 브라우저·네트워크 없이 흐름을 잰다 ──
const 가짜크롬 = (도착주소) => ({
  launchPersistentContext: async () => ({
    newPage: async () => ({
      goto: async () => {},
      waitForURL: async () => {},
      url: () => 도착주소,
    }),
    cookies: async () => [{ name: 'sid', value: 'abc', domain: '.threads.com' }],
    close: async () => {},
  }),
})
const 가짜받기 = (권한목록) => async (url) => ({
  ok: true,
  json: async () => {
    const 주소 = String(url)
    if (주소.includes('oauth/access_token')) return { access_token: 'SHORT', user_id: '9' }
    if (주소.includes('th_exchange_token')) return { access_token: 'LONG', expires_in: 5184000 }
    if (주소.includes('debug_token')) return { data: { scopes: 권한목록 } }
    if (주소.includes('v1.0/me')) return { id: '9', username: 'tst' }
    return {}
  },
})
const 새뿌리 = async () => {
  const 뿌리 = await mkdtemp(join(tmpdir(), '토큰받기-'))
  await writeFile(join(뿌리, '.env.local'), 'THREADS_APP_ID=1\nTHREADS_APP_SECRET=2\n')
  return 뿌리
}

// 쿠키가 딴 계정 것이면 — 토큰은 살리고 쿠키만 안 쓴다.
// 허용 화면에서 계정을 바꿔 고르면 토큰과 브라우저 쿠키가 갈린다 (2026-08-29 실측).
// 쓸 수 있는 토큰까지 버릴 이유가 없다
{
  const 뿌리 = await 새뿌리()
  const 이전 = process.cwd()
  process.chdir(뿌리)
  try {
    const 결과 = await 자동발급('tst', {
      뿌리, 크롬: 가짜크롬('https://localhost/?code=AQB'), 받기: 가짜받기(필수권한),
      쿠키묻기: async () => '딴사람',
    })
    assert.equal(결과.쿠키있음, false, '딴 계정 쿠키는 저장하지 않는다')
    assert.match(결과.쿠키탈, /딴사람/, '누구 것인지 말해 준다')
    const 파일 = await readFile(join(뿌리, '계정', 'tst', '열쇠.env'), 'utf8')
    assert.match(파일, /^THREADS_ACCESS_TOKEN=/m, '토큰은 그대로 저장된다')
    assert.ok(!/^THREADS_COOKIE=.+$/m.test(파일), '쿠키는 안 써진다')
  } finally { process.chdir(이전) }
}

// 성공: 계정/tst/열쇠.env 에 세 열쇠가 써진다
{
  const 뿌리 = await 새뿌리()
  const 이전 = process.cwd()
  process.chdir(뿌리)
  try {
    const 결과 = await 자동발급('tst', {
      뿌리, 크롬: 가짜크롬('https://localhost/?code=AQB'), 받기: 가짜받기(필수권한),
      쿠키묻기: async () => 'tst',   // 쿠키 주인이 이 계정이더라
    })
    assert.deepEqual(결과, { 사용자: 'tst', 권한: 필수권한, 쿠키있음: true, 쿠키탈: null })
    const 파일 = await readFile(join(뿌리, '계정', 'tst', '열쇠.env'), 'utf8')
    for (const 키 of ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID', 'THREADS_COOKIE']) assert.match(파일, new RegExp(`^${키}=`, 'm'))
  } finally { process.chdir(이전) }
}

// 거부: error= 주소면 '거부' 로 던지고 파일을 안 쓴다
{
  const 뿌리 = await 새뿌리()
  const 이전 = process.cwd()
  process.chdir(뿌리)
  try {
    await assert.rejects(
      자동발급('tst', { 뿌리, 크롬: 가짜크롬('https://localhost/?error=access_denied'), 받기: 가짜받기(필수권한) }),
      /거부/,
    )
    await assert.rejects(readFile(join(뿌리, '계정', 'tst', '열쇠.env'), 'utf8'))
  } finally { process.chdir(이전) }
}

// 권한부족: 필수권한 하나가 빠지면 '권한부족:' 으로 던지고 파일을 안 쓴다
{
  const 뿌리 = await 새뿌리()
  const 이전 = process.cwd()
  process.chdir(뿌리)
  try {
    const 모자란권한 = 필수권한.slice(0, -1)
    await assert.rejects(
      자동발급('tst', { 뿌리, 크롬: 가짜크롬('https://localhost/?code=AQB'), 받기: 가짜받기(모자란권한) }),
      new RegExp('권한부족:' + 필수권한.at(-1)),
    )
    await assert.rejects(readFile(join(뿌리, '계정', 'tst', '열쇠.env'), 'utf8'))
  } finally { process.chdir(이전) }
}

// 코드도 error= 도 없는 주소(url() 이 'https://localhost/' 만 준 경우): '거부' 로 던지고 파일을 안 쓴다
{
  const 뿌리 = await 새뿌리()
  const 이전 = process.cwd()
  process.chdir(뿌리)
  try {
    await assert.rejects(
      자동발급('tst', { 뿌리, 크롬: 가짜크롬('https://localhost/'), 받기: 가짜받기(필수권한) }),
      /거부/,
    )
    await assert.rejects(readFile(join(뿌리, '계정', 'tst', '열쇠.env'), 'utf8'))
  } finally { process.chdir(이전) }
}

console.log('토큰받기 ✓')
