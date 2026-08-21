// 스레드 발행 토큰을 받아 계정의 열쇠 파일에 넣어 주는 일회용 도우미
//   node --env-file=.env.local threads-login.mjs                → .env.local (첫 계정)
//   node --env-file=.env.local threads-login.mjs jaengyeo.unni  → .env.jaengyeo.unni
import { createInterface } from 'node:readline/promises'
import { readFile, writeFile } from 'node:fs/promises'

const 아이디 = process.env.THREADS_APP_ID
const 비밀 = process.env.THREADS_APP_SECRET
const 돌아올주소 = process.env.THREADS_REDIRECT_URI || 'https://localhost/'
const 계정 = (process.argv[2] ?? '').trim()
const 경로 = 계정 ? `.env.${계정}` : '.env.local'
if (!아이디 || !비밀) {
  console.error('.env.local 에 THREADS_APP_ID 와 THREADS_APP_SECRET 을 먼저 넣어라.')
  process.exit(1)
}

// 답글을 달려면 threads_manage_replies 가 있어야 한다. 없으면 본문만 올라가고
// 레시피 답글이 500 으로 죽는다 — 오류 메시지가 "An unknown error occurred" 뿐이라 원인이 안 보인다
const 권한목록 = ['threads_basic', 'threads_content_publish', 'threads_manage_replies']
const 권한 = 권한목록.join(',')
const 로그인주소 =
  `https://threads.net/oauth/authorize?client_id=${아이디}` +
  `&redirect_uri=${encodeURIComponent(돌아올주소)}&response_type=code&scope=${encodeURIComponent(권한)}`

console.log('\n1) 아래 주소를 브라우저에 붙여넣고 열어라.\n')
console.log('   ' + 로그인주소)
console.log('\n2) 스레드 로그인 후 "허용" 을 누르면 주소창이 이렇게 바뀐다.')
console.log(`   ${돌아올주소}?code=AQBx........#_`)
console.log('   (화면은 "사이트에 연결할 수 없음" 이라고 떠도 정상이다. 주소창만 보면 된다)')
console.log('\n3) 주소창의 code= 뒤부터 # 앞까지를 복사해 아래에 붙여넣어라.\n')

const 입력 = createInterface({ input: process.stdin, output: process.stdout })
const 코드원문 = (await 입력.question('code = ')).trim()
입력.close()

// 통째로 붙여넣어도 되게 주소에서 code 를 뽑아낸다. 끝의 #_ 도 떼어낸다.
const 코드 = (코드원문.match(/code=([^&#\s]+)/)?.[1] ?? 코드원문).replace(/#_?$/, '')
if (!코드) { console.error('코드를 못 읽었다.'); process.exit(1) }

const 짧은 = await fetch('https://graph.threads.net/oauth/access_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: 아이디, client_secret: 비밀, code: 코드,
    grant_type: 'authorization_code', redirect_uri: 돌아올주소,
  }),
}).then((r) => r.json())

if (!짧은.access_token) {
  console.error('\n토큰 받기 실패:', JSON.stringify(짧은).slice(0, 300))
  console.error('코드는 1시간 지나면 만료되고 한 번만 쓸 수 있다. 1번부터 다시 해라.')
  process.exit(1)
}
console.log('\n짧은 토큰 받았다. 사용자 번호:', 짧은.user_id)

// 짧은 토큰은 한 시간짜리다. 60일짜리로 바꿔 둔다.
let 토큰 = 짧은.access_token
let 수명 = '1시간'
try {
  const 긴 = await fetch(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${비밀}&access_token=${토큰}`,
  ).then((r) => r.json())
  if (긴.access_token) { 토큰 = 긴.access_token; 수명 = `${Math.round((긴.expires_in ?? 0) / 86400)}일` }
  else console.log('긴 토큰 교환은 실패했다. 짧은 것으로 둔다 —', JSON.stringify(긴).slice(0, 160))
} catch (e) {
  console.log('긴 토큰 교환 중 오류. 짧은 것으로 둔다 —', e.message)
}

// 허용 화면에서 권한 하나를 안 켜고 넘어갈 수 있다. 그러면 발행은 되는데 답글만 죽는다.
// 저장하기 전에 실제로 받은 권한을 확인한다 — 초록불을 완료의 증거로 삼지 않는다
const 받은권한 = await fetch(`https://graph.threads.net/debug_token?input_token=${토큰}&access_token=${토큰}`)
  .then((r) => r.json()).then((j) => j?.data?.scopes ?? []).catch(() => [])
const 빠진권한 = 권한목록.filter((p) => !받은권한.includes(p))
if (빠진권한.length) {
  console.error(`\n권한이 빠졌다: ${빠진권한.join(', ')}. 저장하지 않았다.`)
  console.error('허용 화면에서 항목을 모두 켠 채 "허용" 을 눌러야 한다. 1번부터 다시 해라.')
  process.exit(1)
}

// 딴 계정으로 로그인한 채 허용을 누르면 글이 엉뚱한 데로 올라간다. 저장 전에 막는다
if (계정) {
  const 나 = await fetch(`https://graph.threads.net/v1.0/me?fields=username&access_token=${토큰}`)
    .then((r) => r.json()).catch(() => ({}))
  if (나.username && 나.username !== 계정) {
    console.error(`\n이 토큰은 "${나.username}" 계정 것이다. "${계정}" 이 아니다. 저장하지 않았다.`)
    console.error('브라우저에서 스레드를 로그아웃하고 그 계정으로 다시 로그인한 뒤 1번부터 다시 해라.')
    process.exit(1)
  }
}

const 기존 = (await readFile(경로, 'utf8').catch(() => ''))
  .split('\n').filter((l) => !/^THREADS_(ACCESS_TOKEN|USER_ID)=/.test(l)).join('\n').replace(/\n+$/, '')
await writeFile(경로, `${기존}\nTHREADS_ACCESS_TOKEN=${토큰}\nTHREADS_USER_ID=${짧은.user_id}\n`, { mode: 0o600 })

console.log(`\n끝났다. ${경로} 에 저장했다 (수명 ${수명}).`)
console.log('토큰은 화면에 안 띄웠다. 파일에만 있다.')
