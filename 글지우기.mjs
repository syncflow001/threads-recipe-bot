// 잘못 나간 글을 글타래째 지운다 — 본문 링크 하나만 주면 답글까지 함께 지운다
//   node --env-file=.env.local 글지우기.mjs https://www.threads.com/@example.cook/post/DcYw7XQmTP8
//   node --env-file=.env.local --env-file=.env.sample_gohan 글지우기.mjs <링크>
// threads_delete 권한이 있어야 한다. 없으면 무엇이 없는지 말해 준다.
import { createInterface } from 'node:readline/promises'

const API = 'https://graph.threads.net/v1.0'
const 토큰 = process.env.THREADS_ACCESS_TOKEN
const 준것 = (process.argv[2] ?? '').trim()

if (!토큰) { console.error('THREADS_ACCESS_TOKEN 이 없다. --env-file 을 줬는지 봐라.'); process.exit(1) }
if (!준것) {
  console.error('지울 글의 링크를 줘라.')
  console.error('  node --env-file=.env.local 글지우기.mjs https://www.threads.com/@나/post/DcYw7XQmTP8')
  process.exit(1)
}

const 물어보기 = async (path) => {
  const r = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}access_token=${토큰}`)
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, j }
}

// 권한부터 본다. 없는 채로 시작하면 답글만 지우다 본문에서 막혀 반쪽이 남는다
const 있는권한 = await fetch(`https://graph.threads.net/debug_token?input_token=${토큰}&access_token=${토큰}`)
  .then((r) => r.json()).then((j) => j?.data?.scopes ?? []).catch(() => [])
if (있는권한.length && !있는권한.includes('threads_delete')) {
  console.error('\n⛔ threads_delete 권한이 없다. 한 글자도 지우지 않았다.')
  console.error('   node --env-file=.env.local threads-login.mjs [계정이름] 으로 토큰을 다시 받아라.')
  console.error('   허용 화면에서 「삭제」 항목을 켜야 한다.')
  process.exit(1)
}

// 링크의 짧은 코드는 API 번호와 다르다 (실측 — 되돌려 풀면 딴 숫자가 나온다).
// 그래서 내가 올린 글을 훑어 링크가 같은 것을 찾는다. 숫자를 바로 주면 그대로 쓴다
const 본문번호 = await (async () => {
  if (/^\d+$/.test(준것)) return 준것
  // 링크 끝의 짧은 코드로만 견준다. ?hl=ko 같은 꼬리표가 붙어도 흔들리지 않는다
  const 짧은코드 = 준것.match(/\/post\/([A-Za-z0-9_-]+)/)?.[1]
  if (!짧은코드) return null
  const { j } = await 물어보기('/me/threads?fields=id,permalink&limit=100')
  return (j.data ?? []).find((p) => p.permalink?.includes(`/post/${짧은코드}`))?.id
})()

if (!본문번호) {
  console.error(`\n"${준것}" 에 해당하는 내 글을 최근 100편에서 못 찾았다.`)
  console.error('본문(첫 조각) 링크가 맞는지 봐라. 답글 링크로는 못 찾는다.')
  process.exit(1)
}

// 답글까지 모은다. 본문만 지우면 레시피 답글이 주인 없이 남는다
const { j: 대화 } = await 물어보기(`/${본문번호}/conversation?fields=id,text,username`)
const 나 = (await 물어보기('/me?fields=username')).j?.username
const 내답글 = (대화.data ?? []).filter((p) => p.username === 나 && p.id !== 본문번호)
const { j: 본문 } = await 물어보기(`/${본문번호}?fields=id,text`)

const 한줄 = (t) => String(t ?? '(글자 없음)').replace(/\s+/g, ' ').slice(0, 60)
console.log(`\n지울 글 ${내답글.length + 1}조각이다.`)
console.log(`  본문  ${본문번호}  ${한줄(본문.text)}`)
for (const p of 내답글) console.log(`  답글  ${p.id}  ${한줄(p.text)}`)
console.log('\n지우면 되돌릴 수 없다.')

const 입력 = createInterface({ input: process.stdin, output: process.stdout })
const 답 = (await 입력.question('정말 지울까? (지운다 라고 적어라) ')).trim()
입력.close()
if (답 !== '지운다') { console.log('아무것도 안 했다.'); process.exit(0) }

// 답글부터 지운다. 본문을 먼저 지우면 답글을 다시 찾을 길이 막힌다
let 실패 = 0
for (const id of [...내답글.map((p) => p.id).reverse(), 본문번호]) {
  const r = await fetch(`${API}/${id}?access_token=${토큰}`, { method: 'DELETE' })
  // 지웠다는 응답을 믿지 않는다. 실제로 사라졌는지 다시 물어본다
  const 남았나 = (await 물어보기(`/${id}?fields=id`)).ok
  if (남았나) {
    실패 += 1
    const j = await r.json().catch(() => ({}))
    console.error(`  ${id} 못 지웠다 — ${j?.error?.message ?? `HTTP ${r.status}`}`)
  } else {
    console.log(`  ${id} 지웠다`)
  }
}

console.log(실패 ? `\n${실패}조각이 남았다. 웹 화면에서 지워라.` : '\n다 지웠다.')
process.exit(실패 ? 1 : 0)
