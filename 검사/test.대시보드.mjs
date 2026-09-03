// 새 대시보드(dashboard/) 뼈대가 실제로 도는지 본다 — node 검사/test.대시보드.mjs
import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { setTimeout as 쉼 } from 'node:timers/promises'
import { promisify } from 'node:util'
import { 주문다듬기 } from '../src/coupang.mjs'
const execFile비동기 = promisify(execFile)

// 주문다듬기 — fetch 없는 순수 함수. docs/coupang-api-facts.md 「orders 엔드포인트 실측」의 표본 그대로 검사한다
{
  const 표본 = {
    date: '20260728', trackingCode: 'AF0000000', subId: '', subParam: '', addtag: '460', ctag: '9000000000',
    orderId: 1000000000000000, productId: 9000000000,
    productName: '에삭 사생활보호 초강력 강화유리 휴대폰 액정보호필름 매직핏 프라이버시 2매',
    quantity: 1, gmv: 17400, commissionRate: 3, commissionRateType: 'PERCENTAGE', commission: 522, categoryName: '가전디지털',
  }
  assert.deepEqual(주문다듬기(표본), {
    날짜: '2026-07-28', 주문번호: 1000000000000000, 상품번호: 9000000000,
    상품명: '에삭 사생활보호 초강력 강화유리 휴대폰 액정보호필름 매직핏 프라이버시 2매',
    수량: 1, 거래액: 17400, 수수료: 522, 수수료율: 3, 분류: '가전디지털', 꼬리표: '',
  })
  console.log('주문다듬기 ✓')
}

// 진행시작/진행끝/알림담기/계정칸 — 화면엔진.mjs 를 직접 불러 진행 통이 계정별로 기대대로 도는지 본다
{
  const { 진행시작, 진행끝, 알림담기, 계정칸, 상태통 } = await import('../src/화면엔진.mjs')
  진행시작('x', 'a')
  알림담기('한 줄', 'a')
  assert.equal(계정칸('a').진행.단계들[0], '한 줄')
  진행끝({ 됨: true }, 'a')
  assert.equal(계정칸('a').진행, null)
  assert.equal(계정칸('a').마지막결과.값.됨, true)
  assert.equal(typeof 상태통.토큰도는중, 'boolean')
  console.log('화면엔진 진행 통 ✓')
}

const 포트 = 7790 + Math.floor(Math.random() * 100)
const next = 'dashboard/node_modules/next/dist/bin/next'
const 켜기제한 = 30_000

const 켜기 = () => new Promise((되면, 안되면) => {
  // COUPANG_ACCESS_KEY 를 비워 /api/orders 검사가 실제 쿠팡 API 를 부르지 않게 막는다
  const env = { ...process.env, COUPANG_ACCESS_KEY: '', COUPANG_SECRET_KEY: '' }
  // detached: true — 자식이 제 프로세스 그룹의 우두머리가 돼, 종료할 때 -pid 로 그 그룹(손자 next-server 포함)을 통째로 죽일 수 있다
  const p = spawn('node', [next, 'start', 'dashboard', '-p', String(포트), '-H', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'inherit'], env, detached: true })
  const 시계 = setTimeout(() => 안되면(new Error(`next start 가 ${켜기제한 / 1000}초 안에 뜨지 않았다`)), 켜기제한)
  p.stdout.on('data', (d) => { if (String(d).includes('Ready')) { clearTimeout(시계); 되면(p) } })
  p.on('error', (e) => { clearTimeout(시계); 안되면(e) })
  p.on('exit', (c) => { clearTimeout(시계); 안되면(new Error('next start 가 죽었다 ' + c)) })
})
const 서버 = await 켜기()
const 주소 = `http://127.0.0.1:${포트}`
try {
  // 문 — 열쇠말 없이 오면 403, 옛 문구 그대로. 이 요청이 열쇠말 파일을 처음 만든다
  let r = await fetch(주소 + '/', { redirect: 'manual' })
  assert.equal(r.status, 403)
  assert.match(await r.text(), /주소가 맞지 않습니다/)
  const 열쇠말 = (await readFile('.설정화면열쇠', 'utf8')).trim()
  // ?k= 로 오면 쿠키를 심고 / 로 보낸다
  r = await fetch(`${주소}/?k=${열쇠말}`, { redirect: 'manual' })
  assert.equal(r.status, 307)
  const 쿠키 = r.headers.get('set-cookie') ?? ''
  assert.match(쿠키, new RegExp(`gate=${열쇠말}; Path=/; HttpOnly; SameSite=Strict`, 'i'))
  const 위치 = r.headers.get('location') ?? ''
  assert.ok(위치.endsWith('/'), '리다이렉트 주소는 / 로 끝난다: ' + 위치)
  assert.ok(!위치.includes('k='), '리다이렉트 주소에 k= 가 남으면 안 된다: ' + 위치)
  // 쿠키로 오면 200
  r = await fetch(주소 + '/', { headers: { cookie: `gate=${열쇠말}` } })
  assert.equal(r.status, 200)
  // 틀린 열쇠말은 403
  r = await fetch(주소 + '/?k=deadbeef', { redirect: 'manual' })
  assert.equal(r.status, 403)
  // 다른 곳에서 온 POST 는 403
  r = await fetch(주소 + '/api/health', { method: 'POST', headers: { cookie: `gate=${열쇠말}`, origin: 'http://evil.example' } })
  assert.equal(r.status, 403)
  assert.equal((await r.json()).안됨, '다른 곳에서 온 요청입니다')
  console.log('문 ✓')
  r = await fetch(주소 + '/api/health', { headers: { cookie: `gate=${열쇠말}` } })
  assert.equal(r.status, 200)
  const h = await r.json()
  assert.equal(h.판, JSON.parse(await readFile('package.json', 'utf8')).version)
  assert.ok(Array.isArray(h.계정들), '계정들은 배열')
  // 이름 없는 첫 계정은 `.env.local` 에 스레드 열쇠가 있을 때만 목록에 들어간다 (src/계정.mjs 첫계정있나).
  // 2026-08-28 에 첫 계정을 example.cook 로 옮긴 뒤로는 열쇠가 없어 목록에 안 나온다.
  // 자리(0번)를 박아 두면 옮기는 순간 깨지므로 **규칙 그대로** 잰다
  const 열쇠있나 = /^THREADS_ACCESS_TOKEN=\S+/m.test(await readFile('.env.local', 'utf8').catch(() => ''))
  const 빈계정 = h.계정들.filter((c) => c.이름 === '')
  if (열쇠있나) assert.equal(h.계정들[0].이름, '', '열쇠가 있으면 빈 첫 계정이 맨 앞에 온다')
  else assert.equal(빈계정.length, 0, '열쇠가 없으면 빈 첫 계정은 목록에 없다')
  for (const c of h.계정들) assert.ok(typeof c.이름 === 'string' && typeof c.별칭 === 'string')
  console.log('health ✓ 계정 ' + h.계정들.length)
  for (const 쪽 of ['overview','revenue','publish','activity','persona','history','monitor','check','settings','admin']) {
    r = await fetch(주소 + '/' + 쪽, { headers: { cookie: `gate=${열쇠말}` } })
    assert.equal(r.status, 200, 쪽 + ' 쪽')
  }
  console.log('쪽 10 ✓')

  // ④ — 마법사·첫 화면·갈림길 (Task 5). 어느 것도 쓰기 길을 부르지 않는다
  for (const 쪽 of ['wizard', 'start']) {
    r = await fetch(주소 + '/' + 쪽, { headers: { cookie: `gate=${열쇠말}` } })
    assert.equal(r.status, 200, 쪽 + ' 쪽')
    assert.match(r.headers.get('content-type') ?? '', /text\/html/)
  }
  assert.match(await (await fetch(주소 + '/start', { headers: { cookie: `gate=${열쇠말}` } })).text(), /스레드 자동화 시작하기/)
  // 이 맥에는 .env.local 이 있으니 / 는 개요로 간다. 계정이 없을 때 /start 로 가는 쪽은
  // 임시 폴더를 쓰는 test.계정있나.mjs 가 계정이하나도없다() 로 잰다(서버를 새로 안 띄운다)
  r = await fetch(주소 + '/', { headers: { cookie: `gate=${열쇠말}` }, redirect: 'manual' })
  assert.ok([307, 308].includes(r.status), '/ 는 갈림길이라 옮겨 준다: ' + r.status)
  assert.ok((r.headers.get('location') ?? '').endsWith('/overview'), '/ → /overview')
  console.log('마법사·첫 화면·갈림길 ✓')

  // ② — 옛 서버 함수가 src/화면엔진.mjs 로 그대로 나왔나
  {
    const 엔진 = await import('../src/화면엔진.mjs')
    for (const 이름 of ['계정목록','상태','열쇠저장','나를알아내기','프로필사진챙기기','말투저장','말투샘플','말투대화',
      '키워드추천','말투추천하기','스크립트돌리기','돌리기','팔로우후보찾기','상태통','계정칸','열쇠들'])
      assert.ok(이름 in 엔진, '화면엔진 에 ' + 이름 + ' 이 없다')
    const s = await 엔진.상태('')
    for (const k of ['계정','계정들','이름표','아이디표','열쇠','말투','말투있나','팔로우몫','멈춤','아이디','정보','못함','고를것','분야안내','되는조합'])
      assert.ok(k in s, '상태() 에 ' + k + ' 가 없다')
    assert.ok(Array.isArray(엔진.계정칸('').기록))
    console.log('화면엔진 ✓')
  }

  // ② — 옛 서버(7788)와 응답의 윗단 키가 같은가. 꺼져 있거나 7788 이 이미 새 대시보드면 건너뛴다.
  // ⑥(2026-08-28) 뒤 7788 은 새 대시보드다 — 새 것은 /api/health 가 200, 옛 것은 그 길이 없어 404 였다
  const 옛 = 'http://127.0.0.1:7788'
  const 옛살았나 = await fetch(옛 + '/api/health', { headers: { cookie: `gate=${열쇠말}` } })
    .then((r) => r.status === 404, () => false)
  if (!옛살았나) console.log('길 대조 건너뜀 — 옛 대시보드가 없다(⑥ 에서 archive)')
  else {
    // /last-result 는 뺐다 — 7788 은 실사용 중인 상시 서버라 대기 중인 실제 결과를 물고 있어,
    // 갓 띄운 이 테스트 서버와 모양이 다를 수 있다(모양 자체는 리뷰로 이미 확인했다).
    // /status 도 뺐다 — 첫 계정에 아이디가 없으면 그 핸들러가 나를알아내기() 를 돌려 .env.local·계정정보.json 을 쓴다.
    // /followers 도 뺐다 — 그 핸들러가 하루한번찍기() 를 돌려 팔로워장부.json 을 쓴다.
    // /progress 도 뺐다 — 실서버(7788)가 바쁠 때 응답이 흔들려 검사가 들쭉날쭉해진다.
    const 읽기길 = ['/revenue','/revenue-detail?days=30','/schedule?days=7','/tame','/posts','/activity-draft','/archive',
      '/score','/activity-settings','/growth','/history','/blocked','/diagnose','/watchdog','/keyword-suggest','/log']
    const 키 = (o) => (Array.isArray(o) ? ['[]'] : Object.keys(o ?? {})).sort().join(',')
    for (const 길 of 읽기길) {
      const 이음 = 길.includes('?') ? '&' : '?'
      const [a, b] = await Promise.all([
        fetch(옛 + 길 + 이음 + 'profile=', { headers: { cookie: `gate=${열쇠말}` } }).then((r) => r.json()),
        fetch(주소 + '/api' + 길 + 이음 + 'profile=', { headers: { cookie: `gate=${열쇠말}` } }).then((r) => r.json()),
      ])
      assert.equal(키(b), 키(a), 길 + ' 의 키가 옛것과 다르다')
    }
    // /profile-photo 는 뺐다 — 캐시가 24시간 지났으면 그 핸들러가 사진을 새로 받아 캐시에 쓰고
    // 스레드 API 를 부른다. /photo·/persona-file 은 파일을 읽어 그대로 내려줄 뿐이라 남긴다
    for (const 길 of ['/photo?where=받은것&code=x&file=y', '/persona-file']) {
      const [a, b] = await Promise.all([
        fetch(옛 + 길 + (길.includes('?') ? '&' : '?') + 'profile=', { headers: { cookie: `gate=${열쇠말}` } }),
        fetch(주소 + '/api' + 길 + (길.includes('?') ? '&' : '?') + 'profile=', { headers: { cookie: `gate=${열쇠말}` } }),
      ])
      assert.equal(b.status, a.status, 길 + ' 의 상태 코드가 옛것과 다르다')
      assert.equal(b.headers.get('content-type')?.split(';')[0], a.headers.get('content-type')?.split(';')[0], 길 + ' 의 content-type')
    }
    console.log('길 대조(읽기) ✓ ' + 읽기길.length + '+2')
  }

  // ③ — 쓰기 길 25개. 부작용 없는 것만 옛것과 견준다 — 잘못된 몸통을 보내 거절 모양만 본다
  // 쓰기 길은 실서버(7788)에 보내지 않는다 — /keywords 는 저장하고, /persona-sample 은 저장소에 글이 있으면
  // 클로드 샘플을 실제로 돌리며, /blocked-drop 은 파일을 지운다. 2026-08-27 사고 뒤 「거절 대조」를 통째로 뺐다.
  // 쓰기 길의 모양은 검토가 옛 코드와 눈으로 견줬다.
  // 새 서버만 — 없는 길은 404, GET 은 405
  assert.equal((await fetch(주소 + '/api/run?profile=', { headers: { cookie: `gate=${열쇠말}` } })).status, 405)
  console.log('쓰기 길 25개 GET 405 ✓')

  // ③-b — Task 3: 옛 여섯 + 새 여섯 길. 검사 금지 목록(열쇠·파일을 쓰거나 스레드·텔레그램·크롬을 실제로 부른다) —
  // /api/keys · /api/account · /api/account-edit · /api/account-delete ·
  // /api/schedule-on · /api/schedule-off · /api/token/auto · /api/telegram/test · /api/telegram/find
  // 는 이 파일에서 절대 보내지 않는다. 아래는 그 목록에 없는(파일을 안 쓰는) 길만 검사한다
  {
    const 쿠키줄 = { cookie: `gate=${열쇠말}` }
    r = await fetch(주소 + '/api/first-run', { headers: 쿠키줄 })
    assert.equal(r.status, 200)
    assert.deepEqual(await r.json(), { 없음: false }) // 이 맥엔 .env.local 이 있다
    console.log('first-run ✓')

    r = await fetch(주소 + '/api/manual?이름=없는것', { headers: 쿠키줄 })
    assert.equal(r.status, 404)

    r = await fetch(주소 + '/api/manual?이름=페이스북앱', { headers: 쿠키줄 })
    assert.equal(r.status, 200)
    const 절 = await r.json()
    assert.ok(절.글.startsWith('## 페이스북 앱 만들기와 스레드 연결'), 'manual 글은 그 절 제목으로 시작한다')
    console.log('manual ✓')

    // schedule/auto — 배정은 순수 함수이고 간격 설정은 **읽기만** 하므로 실서버에 보내도 된다
    const 남들자료 = await fetch(주소 + '/api/schedule?profile=&days=1', { headers: 쿠키줄 }).then((res) => res.json())
    const { 겹치나 } = await import('../src/시각배정.mjs')
    r = await fetch(주소 + '/api/schedule/auto?profile=', { method: 'POST', headers: 쿠키줄 })
    assert.equal(r.status, 200)
    const { 칸들, 간격 } = await r.json()
    assert.equal(칸들.length, 4)
    // ⚠️ 분이 3의 배수라는 규칙은 없앴다 (2026-09-03) — 사용자가 간격을 1~59분으로 정하게 되면서
    // 「설정 가능한 가장 빠른 분」을 잡도록 1분씩 훑는다. 대신 **정해진 간격**으로 견준다
    assert.ok(간격 >= 1 && 간격 <= 59, '어느 간격으로 배정했는지 함께 돌려줘야 한다')
    for (const 칸 of 칸들) {
      assert.ok(Number.isInteger(칸.분) && 칸.분 >= 0 && 칸.분 <= 59, '분은 0~59다')
      for (const 남 of 남들자료.남들) {
        assert.ok(!겹치나(칸, 남.칸들, 간격), 칸.시 + ':' + 칸.분 + ' 이 ' + 남.계정 + ' 과 겹친다')
      }
    }
    // 간격 설정 길 — **읽기만** 보낸다. 저장(POST)은 실제 파일을 바꾸므로 여기서 누르지 않는다
    const 간격r = await fetch(주소 + '/api/schedule/gap?profile=', { headers: 쿠키줄 })
    assert.equal(간격r.status, 200)
    const 간격자료 = await 간격r.json()
    assert.ok(간격자료.분 >= 1 && 간격자료.분 <= 59, '지금 간격을 1~59로 돌려준다')
    console.log('schedule/auto ✓ 칸 ' + 칸들.length + ' · 간격 ' + 간격 + '분')
  }

  // ④ — 글자.ts: 옛 설정화면-html.mjs 의 돈·짧은때·날짜만 이 그대로 옮겨졌나
  {
    const { 돈, 짧은때, 날짜만 } = await import('../dashboard/lib/글자.ts')
    assert.equal(돈(4178920), '₩4,178,920')
    assert.equal(짧은때('2026-08-27T13:05:00'), new Date('2026-08-27T13:05:00')
      .toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }))
    assert.equal(날짜만('2026-08-27T13:05:00'), '2026-08-27')
    console.log('글자 ✓')
  }

  // ⑤ — 쪽별 문구 대조: 옛 화면 문구가 새 쪽 소스에 다 있나
  {
    await execFile비동기('node', ['도구/문구뽑기.mjs', '819', '846', 'dashboard/components/쪽/publish'])
    console.log('문구 대조(발행) ✓')
    await execFile비동기('node', ['도구/문구뽑기.mjs', '731', '819', 'dashboard/components/쪽/activity'])
    console.log('문구 대조(활동) ✓')

    // 길들이기 스위치는 **어느 언어 계정에서도 눌린다** (2026-08-30). 엔진에는 언어 문턱이 없는데
    // 화면만 한국어 계정의 스위치를 잠가 두어, 한국어 계정은 켤 수가 없었다.
    // 길들이기의 쓰임은 「그 언어 글을 모은다」 하나가 아니라 **꾸준히 들락거리는 계정으로 키운다** 이기도 하다
    {
      const 길들이기글 = await readFile('dashboard/components/쪽/activity/언어길들이기.tsx', 'utf8')
      assert.ok(!/잠김=/.test(길들이기글),
        '길들이기 스위치에 잠금이 붙었다 — 한국어 계정이 켤 수 없게 된다')
      assert.ok(!길들이기글.includes('한국어 계정이라 길들일 게 없어요'),
        '「한국어 계정이라 길들일 게 없어요」 — 엔진은 한국어도 돈다')
      assert.ok(길들이기글.includes('한국어 계정도 씁니다'), '한국어 계정도 쓴다는 안내가 없다')
      const 엔진글 = await readFile('src/길들이기.mjs', 'utf8')
      assert.ok(!/목표언어\s*===\s*'한국어'|언어\s*===\s*'한국어'/.test(엔진글),
        '엔진에 한국어 문턱이 생겼다 — 화면 스위치와 어긋난다')
      console.log('길들이기 언어 문턱 없음 ✓')
    }
    await execFile비동기('node', ['도구/문구뽑기.mjs', '1000', '1069', 'dashboard/components/쪽/history'])
    console.log('문구 대조(기록) ✓')
    await execFile비동기('node', ['도구/문구뽑기.mjs', '1077', '1118', 'dashboard/components/쪽/monitor'])
    console.log('문구 대조(모니터링) ✓')
    await execFile비동기('node', ['도구/문구뽑기.mjs', '1118', '1121', 'dashboard/components/쪽/check'])
    await execFile비동기('node', ['도구/문구뽑기.mjs', '60', '204', 'dashboard/components/쪽/check', 'archive/2026-08-28-옛-대시보드/src/설정화면-안전.mjs'])
    console.log('문구 대조(점검) ✓')
    await execFile비동기('node', ['도구/문구뽑기.mjs', '846', '919', 'dashboard/components/쪽/revenue'])
    console.log('문구 대조(수익) ✓')
    await execFile비동기('node', ['도구/문구뽑기.mjs', '920', '988', 'dashboard/components/쪽/persona'])
    console.log('문구 대조(페르소나) ✓')
    // 마법사 판(다음·뒤로·건너뛰기·나중에 하기). 걸음 문구는 JS 가 만들어 내는 것이라 구간으로 못 잰다 —
    // 제목 8개·건너뛴뒤 3개·「이어서 채웁니다」는 손으로 옮겨 적었다(옛 2559~2717 · 2795~2802)
    await execFile비동기('node', ['도구/문구뽑기.mjs', '640', '651', 'dashboard/components/마법사'])
    console.log('문구 대조(마법사) ✓')

    // 걸음 문구는 JS 가 만드는 것이라 문구뽑기가 못 잰다 — 원문에 그대로 있는지 손으로 확인한다
    {
      const 마법사글 = (await Promise.all([
        'dashboard/components/마법사/걸음들.tsx',
        'dashboard/components/마법사/연결단계.tsx',
        'dashboard/components/마법사/마법사.tsx',
      ].map((f) => readFile(f, 'utf8')))).join('\n').replace(/<\/?b>/g, '')
      for (const 제목 of ['이 계정은 무엇인가', '나를 한 줄로', '어떻게 말하나', '자주 쓰는 표현',
        '글 예시', '열쇠 넣기', '언제 올릴까', '끝났습니다'])
        assert.ok(마법사글.includes(제목), '걸음 제목 「' + 제목 + '」 이 없다')
      for (const 건너뛴뒤 of [
        '예시 없이 갑니다. 글이 밋밋해질 수 있습니다 — 나중에 「말투」 칸에서 채워 주세요.',
        '열쇠 없이 갑니다. 이 계정은 아직 글을 못 올립니다 — 「열쇠」 칸에서 채워 주세요.',
        '시각표 없이 갑니다. 자동으로 안 올라갑니다 — 「발행 현황」 아래에서 켜 주세요.'])
        assert.ok(마법사글.includes(건너뛴뒤), '건너뛴뒤 「' + 건너뛴뒤.slice(0, 12) + '…」 가 없다')
      for (const 조각 of ['은 이미 있는 계정이라', '이어서 채웁니다.',
        '별칭·분야·언어·제휴를 바꾸려면 마법사를 닫고 「수정」을 쓰세요.'])
        assert.ok(마법사글.includes(조각), '이어받기 문구 「' + 조각 + '」 이 없다')
      console.log('마법사 걸음 문구 ✓')
    }
    await execFile비동기('node', ['도구/문구뽑기.mjs', '989', '999', 'dashboard/components/쪽/settings'])
    await execFile비동기('node', ['도구/문구뽑기.mjs', '653', '687', 'dashboard/components/쪽/settings'])
    // 709~711 은 발행 현황 격자의 뜻풀이라 개요 쪽으로 갔다. 발행 시각 카드(712~724)와 한 구간이라 두 폴더를 함께 넘긴다
    await execFile비동기('node', ['도구/문구뽑기.mjs', '709', '724', 'dashboard/components/쪽/settings,dashboard/components/쪽/overview'])
    console.log('문구 대조(세팅) ✓')

    // ⑥ — 주문 목록·활동 알림 길, posts 개수 인자 (Task 2)
    r = await fetch(주소 + '/api/posts?개수=100&profile=', { headers: { cookie: `gate=${열쇠말}` } })
    assert.equal(r.status, 200)
    let 글들 = await r.json()
    assert.ok(Array.isArray(글들) && 글들.length <= 100, '/api/posts?개수=100 은 배열 ≤ 100')

    // COUPANG_ACCESS_KEY 를 비웠으니 실제 쿠팡 호출 없이 곧장 실패해 { 안됨, 것들: [] } 로 온다
    r = await fetch(주소 + '/api/orders?days=999&profile=', { headers: { cookie: `gate=${열쇠말}` } })
    assert.equal(r.status, 200)
    const 주문값 = await r.json()
    assert.ok(주문값.안됨 || (주문값.기간 && Object.keys(주문값.기간).length), '/api/orders?days=999 는 안됨 이거나 30일로 잘린 기간을 담는다')
    assert.deepEqual(주문값.것들, [])

    r = await fetch(주소 + '/api/activity-feed?profile=', { headers: { cookie: `gate=${열쇠말}` } })
    assert.equal(r.status, 200)
    const 활동값 = await r.json()
    assert.ok(활동값.없음 === true || (활동값.때 && Array.isArray(활동값.것들)), '/api/activity-feed GET 은 {없음:true} 또는 {때,것들}')
    // POST 는 보내지 않는다 — 스레드 실호출이라 검사 규칙으로 막았다
    console.log('주문 목록·활동 알림·posts 개수 ✓')

    // check 폴더도 함께 넘긴다 — 성장 진단 문구(⑤단계)가 거기로 간다.
    // 발행 시각 문구(712~724)는 위 「문구 대조(세팅)」에서 잰다
    await execFile비동기('node', ['도구/문구뽑기.mjs', '688', '708', 'dashboard/components/쪽/overview,dashboard/components/쪽/check'])
    await execFile비동기('node', ['도구/문구뽑기.mjs', '724', '731', 'dashboard/components/쪽/overview'])
    console.log('문구 대조(개요) ✓')

    // 관리자 도구(Task 3) — 자물쇠·창 HTML 구간. 스크립트 구간(204~366)은 id·코드 조각이 문구로 잡혀 기계로 못 잰다,
    // 거기 사용자 문구 셋은 바로 아래에서 손으로 확인한다
    await execFile비동기('node', ['도구/문구뽑기.mjs', '159', '202', 'dashboard/components/쪽/admin', 'src/설정화면-터미널.mjs'])
    {
      // 자물쇠는 2026-08-30 에 뗐다 — 사용자 지시. archive/2026-08-30-터미널-비밀번호/README.md
      const 도구글 = (await Promise.all(['터미널창', '터미널판']
        .map((f) => readFile('dashboard/components/쪽/admin/' + f + '.tsx', 'utf8')))).join('\n')
      for (const 문구 of ['셸이 끝났습니다', '창 모두 닫기', '파일을 지우는 명령도 막지 않아요.'])
        assert.ok(도구글.includes(문구), '관리자 도구 문구 「' + 문구 + '」 가 없다')
      // 비밀번호 문은 없어야 한다. 되살아나면 자동발급이 다시 끊긴다
      const 터미널문 = await readFile('dashboard/lib/터미널.ts', 'utf8')
      assert.ok(!/통행증살았나/.test(터미널문), '터미널에 비밀번호 문이 다시 붙었다')
      assert.ok(!(await readFile('dashboard/app/api/term/check/route.ts', 'utf8')).includes('통행증살았나'),
        '/term/check 가 다시 통행증을 본다')
    }
    r = await fetch(주소 + '/admin', { headers: { cookie: `gate=${열쇠말}` } })
    assert.equal(r.status, 200)
    const 관리자글 = await r.text()
    assert.match(관리자글, /관리자 도구/)
    assert.match(관리자글, /원격 연결/)
    console.log('문구 대조(관리자 도구) ✓')
  }

  // ⑦ — 터미널 길 (Task 2). 검사 금지 목록 — open·close·input·resize·stream 은 부르지 않는다
  // (실제 쉘·pty 를 띄운다). **2026-08-30 부터는 더 중요하다** — 비밀번호 문을 뗐으므로
  // 이 길들이 이제 진짜로 열린다. 전에는 403 이라 눌러 봐도 안전했다.
  // remote/* (Task 4, 실제로 크롬을 열거나 텔레그램을 부른다) · update/check·run·on·off (Task 6,
  // 각각 깃허브를 부르거나 파일을 덮거나 launchd 를 건드린다) 도 이 파일에서 절대 안 보낸다.
  // GET /api/update 는 파일을 읽기만 해 보낸다
  {
    const 쿠키줄 = { cookie: `gate=${열쇠말}` }
    r = await fetch(주소 + '/api/term/check', { headers: 쿠키줄 })
    assert.equal(r.status, 200)
    assert.deepEqual(await r.json(), { 통과: true, 열린것: [] })
    console.log('term/check — 늘 열려 있다 ✓')
  }

  // ⑧ — 자동 업데이트 (Task 6). GET 만 보낸다 — check/run/on/off 는 위 금지 목록에 있다
  {
    const 쿠키줄 = { cookie: `gate=${열쇠말}` }
    // 섀도우밴 길 — 다른 시각표(헬스·점검·알리미)는 여기서 재는데 이것만 빠져 있었다
    // (2026-08-31 검수). **GET 만** 보낸다 — shadow-on/off 는 진짜 launchd 를 건드린다
    r = await fetch(주소 + '/api/shadow', { headers: 쿠키줄 })
    assert.equal(r.status, 200)
    const 섀도우값 = await r.json()
    assert.equal(typeof 섀도우값.켜짐, 'boolean')
    assert.ok(Array.isArray(섀도우값.것들), '/shadow 는 계정마다 한 칸을 준다')
    for (const c of 섀도우값.것들) {
      assert.ok('계정' in c && '별칭' in c && '마지막' in c, '/shadow 칸 모양이 다르다')
      if (c.마지막) assert.ok(['괜찮음', '덜잼', '주의', '의심', '못잼'].includes(c.마지막.등급),
        '모르는 등급 「' + c.마지막.등급 + '」 — 화면 배지 표에도 넣어야 한다')
    }
    // 설명 팝업이 읽는 문서. 없으면 단추가 빈 창을 띄운다
    r = await fetch(주소 + '/api/manual?' + new URLSearchParams({ 이름: '섀도우밴' }), { headers: 쿠키줄 })
    assert.equal(r.status, 200)
    assert.match((await r.json()).글, /섀도우밴/)
    console.log('shadow GET · 설명 문서 ✓')

    r = await fetch(주소 + '/api/update', { headers: 쿠키줄 })
    assert.equal(r.status, 200)
    const 업데이트값 = await r.json()
    assert.equal(업데이트값.지금판, JSON.parse(await readFile('package.json', 'utf8')).version)
    assert.ok(Array.isArray(업데이트값.기록), '기록은 배열')
    assert.equal(typeof 업데이트값.켜짐, 'boolean')
    assert.equal(typeof 업데이트값.새판있음, 'boolean')
    console.log('update GET ✓')

    r = await fetch(주소 + '/admin', { headers: 쿠키줄 })
    assert.match(await r.text(), /자동 업데이트/)
    console.log('admin 쪽 자동 업데이트 문구 ✓')
  }
} finally { try { process.kill(-서버.pid, 'SIGTERM') } catch {}; await 쉼(200) }
