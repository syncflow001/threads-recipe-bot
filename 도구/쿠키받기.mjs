// 크롬 창을 띄워 그 계정으로 로그인만 하면, 쿠키를 꺼내 열쇠 파일에 넣고 답글까지 읽히는지 재 준다
//
//   node 도구/쿠키받기.mjs sample_salim
//
// 왜 있나. 예전에는 크롬 개발자도구 → Network → `cookie:` 줄 전체를 손으로 복사해
// 대시보드 「열쇠」 칸에 붙여넣어야 했다. 비개발자에게 아홉 계정을 그렇게 시킬 수 없다.
// 게다가 손으로 옮기면 값이 잘린다 — 계정 셋의 쿠키가 110자쯤 잘린 채 몇 달을 돌았다 (인계 §7-18).
//
// ⚠️ **로그인한 계정이 맞는지 먼저 묻는다.** 남의 쿠키가 이 계정 칸에 들어가면
// 그 계정으로 활동이 나간다 — 되돌리기 가장 어려운 침범이다 (CLAUDE.md §3-1).
// 파일에 쓰는 것은 `열쇠저장()` 하나뿐이고, 그것이 쓰기 **전에** 주인을 한 번 더 묻는다.
//
// ⚠️ 쿠키 값은 화면에 한 글자도 안 찍는다.
import { 계정목록 } from '../src/계정.mjs'
import { 쿠키주인 } from '../src/계정벽.mjs'
import { 열쇠저장 } from '../src/화면엔진.mjs'
import { 한판, 막혔다표시, 막힘풀기 } from '../src/눈점검.mjs'

const 계정 = (process.argv[2] ?? '').trim()
if (!계정) {
  console.error('어느 계정인지 알려 주세요.  예)  node 도구/쿠키받기.mjs sample_salim')
  console.error('어느 계정을 손봐야 하는지 모르겠으면  node 도구/눈점검.mjs  를 먼저 돌리세요.')
  process.exit(1)
}
const 계정들 = await 계정목록()
if (!계정들.includes(계정)) {
  console.error(`"${계정}" 은 없는 계정입니다. 있는 계정 — ${계정들.join(' · ')}`)
  process.exit(1)
}

// 스레드가 쓰는 쿠키만 담는다. 인스타그램 쪽 쿠키가 섞이면 줄만 길어지고 쓰이지 않는다
const 한줄로 = (것들) => 것들
  .filter((c) => String(c.domain ?? '').includes('threads.com'))
  .map((c) => `${c.name}=${c.value}`)
  .join('; ')

const { chromium } = await import('playwright-core')
console.log(`크롬 창을 엽니다 — 창에서 **@${계정}** 으로 로그인해 주세요.`)
console.log('로그인이 끝나면 창을 그대로 두세요. 알아서 알아보고 저장합니다.')
console.log('(그만두려면 이 터미널에서 Ctrl+C 를 누르세요)\n')

const 브라우저 = await chromium.launch({ headless: false, channel: 'chrome' })
let 얻은쿠키 = null
let 창닫힘 = false
try {
  // 쿠키를 하나도 안 넣고 연다. 넣으면 이미 남의 계정으로 로그인된 창이 뜬다
  const 판 = await 브라우저.newContext({ viewport: { width: 1180, height: 900 }, locale: 'ko-KR' })
  const 쪽 = await 판.newPage()
  await 쪽.goto('https://www.threads.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 })

  const 끝날때 = Date.now() + 10 * 60 * 1000
  let 알린주인 = null
  // ⚠️ **창을 닫으면 죽지 않는다** (2026-09-06 사용자 실측). 사람이 창을 닫는 것은
  //    「그만두겠다」는 뜻이지 고장이 아니다. 그런데 playwright 는 그 자리에서 던져
  //    `page.waitForTimeout: Target page, context or browser has been closed` 로 끝났다
  const 닫혔나 = () => 쪽.isClosed() || !브라우저.isConnected()
  while (Date.now() < 끝날때) {
    if (닫혔나()) { 창닫힘 = true; break }
    try { await 쪽.waitForTimeout(3000) } catch { 창닫힘 = true; break }
    if (닫혔나()) { 창닫힘 = true; break }
    const 한줄 = 한줄로(await 판.cookies().catch(() => []))
    // sessionid 가 없으면 아직 로그인 전이다. 물어봐야 헛일이라 스레드를 두드리지 않는다
    if (!/(^|;\s*)sessionid=/.test(한줄)) continue

    const 주인 = await 쿠키주인(한줄).catch(() => null)
    if (!주인) continue // 방금 로그인해 아직 화면이 안 잡힌 참일 수 있다. 조금 더 기다린다
    if (주인 !== 계정) {
      if (알린주인 !== 주인) {
        console.log(`⚠️  지금 창은 **@${주인}** 으로 로그인돼 있습니다. @${계정} 이 아닙니다.`)
        console.log('    창에서 로그아웃하고 다시 로그인해 주세요. 이대로는 저장하지 않습니다.')
        알린주인 = 주인
      }
      continue
    }
    얻은쿠키 = 한줄
    break
  }
} finally {
  await 브라우저.close()
}

if (!얻은쿠키) {
  console.error(창닫힘
    ? `\n창을 닫으셨네요 — 아무것도 바꾸지 않았습니다.`
    : `\n❌ 10분 동안 @${계정} 로그인을 못 봤습니다 — 아무것도 바꾸지 않았습니다.`)
  console.error('   다시 하시려면.  node 도구/쿠키받기.mjs ' + 계정)
  process.exit(창닫힘 ? 0 : 1)
}

console.log(`\n✅ @${계정} 로그인을 확인했습니다. 열쇠 파일에 넣습니다...`)
// 여기서 주인을 한 번 더 묻는다 (열쇠저장 안에서). 두 번 묻는 값이 있다 —
// 창을 닫는 사이에 사람이 계정을 바꿨을 수 있다
await 열쇠저장(계정, { THREADS_COOKIE: 얻은쿠키 })
console.log('   넣었습니다.')

// 넣었다고 읽히는 것이 아니다. **실제로 답글을 읽어 본다** ([[검사-초록이어도-단추는-사람이-누른다]]).
// 견줄 눈이 있어야 「답글이 원래 없는 글」과 「못 읽는 눈」을 가른다 — 그래서 다른 계정도 함께 잰다
console.log('\n답글까지 읽히는지 재 봅니다 — 20초쯤 걸립니다.')
const 견줄것 = 계정들.filter((a) => a !== 계정).slice(0, 2)
const { 기준글, 결과 } = await 한판({ 계정들: [계정, ...견줄것] })
const 내것 = 결과.find((r) => r.계정 === 계정)

if (!기준글.length) {
  console.log('❔ 기준글을 못 구했습니다 — 견준 계정들도 답글을 못 읽는 상태입니다.')
  console.log('   나머지 계정을 먼저 손본 뒤  node 도구/눈점검.mjs  로 다시 재 보세요.')
} else if (내것?.갈래 === '멀쩡') {
  console.log(`✅ ${계정} — 답글 ${내것.글타래본것}/${기준글.length}편을 읽습니다. 이제 레시피를 찾습니다.`)
  if (await 막힘풀기(계정)) console.log('   전에 「막힘」으로 표시해 둔 것을 지웠습니다 — 스레드가 풀어 줬습니다.')
} else {
  // ⚠️ **여기까지 왔으면 「쿠키를 다시 넣어 보세요」는 틀린 말이다.** 방금 새로 로그인했다.
  //    스레드가 이 계정에만 글 상세 화면을 안 내주는 것이고, 새 쿠키로도 그대로였다.
  //    표시를 남겨 헬스체크가 3시간마다 이 일로 부르지 않게 한다
  console.log(`⚠️  ${계정} — ${내것?.말 ?? '아직 못 읽습니다'} (답글 ${내것?.글타래본것 ?? 0}/${기준글.length}편)`)
  console.log('   **방금 새로 로그인했는데도 그대로입니다.** 쿠키 문제는 아닙니다.')
  // ⚠️ 여기서 「고칠 수 없다」고 단정하지 않는다. 2026-09-06 에 똑같은 상태를 두고
  //    「계정에 걸렸다」고 단정했는데, 실은 **우리 요청 모양**이 문제였다.
  //    쿠키가 아니면 다음으로 의심할 것은 요청이지 계정이 아니다
  console.log('   쿠키 말고 다른 것을 의심해야 합니다 — 요청 모양이 바뀌었을 수 있습니다.')
  console.log('   당장은 남의 계정 로그인을 빌려 읽으며 돌아갑니다. **글은 이 계정으로 올라갑니다.**')
  await 막혔다표시(계정)
  console.log('   「막힘」으로 표시했습니다 — 알림은 멈춥니다. 고쳐지면 눈점검이 표시를 지웁니다.')
  console.log(`   풀렸는지 가끔 봐 주세요.  node 도구/눈점검.mjs ${계정}`)
}
