// 계정 폴더 규칙을 구조로 못 박는 검사 — node --test test.계정폴더.mjs
//
// 계정이 섞이는 사고는 늘 「어딘가 한 곳이 제 손으로 경로를 조립했다」에서 났다.
// 그래서 값이 맞나만 보지 않고 **소스를 읽어 규칙을 어긴 자리가 있는지** 본다.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readdir, readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const 새방 = () => mkdtemp(join(tmpdir(), '계정폴더-'))

// 계정 이름을 파일 이름에 끼워 넣는 옛 꼴. 계정길() 을 거치면 이런 줄이 나올 수 없다.
// ⚠️ 2026-08-29 — 첫 판 금지꼴은 `${계정}` **바로 뒤** 확장자만 봐서
// `활동초안.${계정}.교류.json` 같은 것을 놓쳤고, 보는 폴더도 src 뿐이라
// run.mjs·threads-login.mjs 를 아예 안 봤다. 그 틈으로 사고 셋이 지나갔다
const 금지꼴 = [
  /`[^`]*\$\{(계정|프로필)[^}]*\}[^`]*\.(json|jsonl|env)`/, // `활동초안.${계정}.교류.json`
  /`\.env\.\$\{[^}]*\}`/,                                 // `.env.${계정}`
  /'\.env\.' *\+/,                                        // '.env.' + 계정
]

test('어떤 모듈도 계정 경로를 제 손으로 조립하지 않는다', async () => {
  // 뿌리의 실행 파일도 본다 — run.mjs 가 말투 파일 이름을 제 손으로 조립하다가
  // 폴더 개편 뒤 여덟 계정 발행을 죽일 뻔했다
  const 볼곳 = ['src', '.']
  const 걸린것 = []
  for (const 곳 of 볼곳) {
    for (const f of await readdir(곳)) {
      if (!f.endsWith('.mjs')) continue
      if (곳 === '.' && (f.startsWith('test.') || f.startsWith('도구.'))) continue
      const 글 = await readFile(join(곳, f), 'utf8')
      글.split('\n').forEach((줄, i) => {
        if (줄.trimStart().startsWith('//')) return // 주석은 설명이지 코드가 아니다
        if (금지꼴.some((꼴) => 꼴.test(줄))) 걸린것.push(`${곳}/${f}:${i + 1}  ${줄.trim()}`)
      })
    }
  }
  assert.deepEqual(걸린것, [],
    '계정 경로는 반드시 계정길() 을 거쳐야 한다 — 위 줄들이 규칙을 어겼다')
})

test('계정 목록을 뽑는 규칙은 한 곳뿐이다', async () => {
  // 전에는 화면엔진·헬스체크·대시보드 셋이 같은 규칙을 따로 적어 두었다.
  // 하나만 어긋나도 「어떤 화면에는 있고 어떤 화면에는 없는 계정」이 생긴다
  const 걸린것 = []
  for (const 곳 of ['src', 'dashboard/app/api/health']) {
    for (const f of await readdir(곳)) {
      if (!/\.(mjs|ts)$/.test(f)) continue
      if (f === '계정.mjs') continue // 여기가 그 한 곳이다
      const 글 = await readFile(join(곳, f), 'utf8')
      if (/\^\\\.env\\\.\(\[a-z0-9/.test(글)) 걸린것.push(`${곳}/${f}`)
    }
  }
  assert.deepEqual(걸린것, [], '계정 목록 규칙을 여기서 다시 적으면 안 된다 — src/계정.mjs 것을 쓴다')
})

test('계정길 — 계정마다 다른 폴더를 주고, 이름 없는 계정은 main 이다', async () => {
  const { 계정길, 계정뿌리, 미디어뿌리, 자리이름 } = await import('./src/계정.mjs')
  assert.equal(자리이름(''), 'main')
  assert.equal(자리이름('example.cook'), 'example.cook')
  assert.equal(계정뿌리('example.cook'), join('계정', 'example.cook'))
  assert.equal(계정길('example.cook', '보관함.json'), join('계정', 'example.cook', '보관함.json'))
  assert.equal(미디어뿌리('sample.unni'), join('계정', 'sample.unni', 'media'))
  assert.notEqual(계정길('가', 'x.json'), 계정길('나', 'x.json'), '계정이 다르면 길도 다르다')
})

test('장부들이 모두 그 계정 폴더 안을 가리킨다', async () => {
  const 방 = '/뿌리'
  const 것들 = [
    ['팔로워', (m) => m.장부파일('가', 방)],
    ['성적', (m) => m.장부파일('가', 방)],
    ['길들이기', (m) => m.장부길('가', 방)],
    ['점검기록', (m) => m.상태길('가', 방)],
    ['점검기록', (m) => m.기록길('가', 방)],
    ['교류하기', (m) => m.계정장부길('가', 방)],
    ['조회수알리미', (m) => m.기록길('가', 방)],
    ['활동알림', (m) => m.파일길('가', 방)],
    ['답하기', (m) => m.초안길('가', 방)],
    ['팔로우하기', (m) => m.초안길('가', 방)],
    ['교류하기', (m) => m.초안길('가', 방)],
    ['보관함', (m) => join(방, m.보관함길('가'))],
    ['멈춤', (m) => join(방, m.멈춤파일이름('가'))],
  ]
  for (const [이름, 뽑기] of 것들) {
    const 길 = 뽑기(await import(`./src/${이름}.mjs`))
    assert.ok(길.startsWith(join(방, '계정', '가') + '/'),
      `${이름} 이 계정 폴더 밖을 가리킨다: ${길}`)
    assert.ok(!길.includes('가.json') && !길.includes('.가.'),
      `${이름} 이 파일 이름에 계정을 아직 끼워 넣는다: ${길}`)
  }
})

test('한 계정에 쓴 것이 남의 계정에서 안 읽힌다', async () => {
  const 방 = await 새방()
  const { 장부적기, 장부읽기 } = await import('./src/길들이기.mjs')
  await mkdir(join(방, '계정', '가'), { recursive: true })
  await mkdir(join(방, '계정', '나'), { recursive: true })

  await 장부적기('가', { 때: 'x', 걷은수: 3 }, 방)
  assert.equal((await 장부읽기('가', 방)).length, 1)
  assert.equal((await 장부읽기('나', 방)).length, 0, '남의 계정에는 안 보인다')

  await 장부적기('나', { 때: 'y', 걷은수: 9 }, 방)
  assert.equal((await 장부읽기('가', 방))[0].걷은수, 3, '나에 쓴 것이 가를 덮지 않는다')
  assert.equal((await 장부읽기('나', 방))[0].걷은수, 9)
})

test('열쇠는 계정 폴더 안, 공용 열쇠는 뿌리에 남는다', async () => {
  const { 열쇠파일 } = await import('./src/화면엔진.mjs')
  assert.equal(열쇠파일('example.cook'), join('계정', 'example.cook', '열쇠.env'))
  // .env.local 은 쿠팡·텔레그램·앱 열쇠 자리다. 계정이 아니라 이 맥 전체의 것이라 안 옮긴다
  assert.equal(열쇠파일(''), '.env.local')
})

test('계정 목록은 열쇠 파일이 있는 폴더만 센다', async () => {
  const 방 = await 새방()
  const { 계정목록 } = await import('./src/계정.mjs')
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })
  await writeFile(join(방, '계정', 'aaa', '열쇠.env'), 'THREADS_COOKIE=x\n')
  await mkdir(join(방, '계정', 'bbb'), { recursive: true }) // 열쇠가 없다 = 아직 계정이 아니다
  await mkdir(join(방, '계정', '_전체'), { recursive: true }) // 점검의 공통 자리 — 계정이 아니다

  assert.deepEqual(await 계정목록(방), ['aaa'])
})

test('셸 스크립트도 계정 폴더의 열쇠를 본다', async () => {
  // 스크립트가 옛 자리를 보면 그 계정은 열쇠 없이 돌거나 남의 열쇠를 받는다 —
  // 2026-08-26 사고가 정확히 그것이었다
  for (const f of ['자동발행.sh', '성적.sh', '길들이기.sh']) {
    const 글 = await readFile(f, 'utf8')
    assert.match(글, /ENV_FILE=\$HOME_DIR\/계정\/\$PROFILE\/열쇠\.env/, `${f} 가 옛 열쇠 자리를 본다`)
    assert.doesNotMatch(글, /ENV_FILE=\$HOME_DIR\/\.env\.\$PROFILE/, `${f} 에 옛 줄이 남아 있다`)
  }
})

test('셸 스크립트가 계정 멈춤 스위치도 새 자리에서 본다', async () => {
  // 옛 자리를 보면 대시보드에서 한 계정만 멈춰도 그 계정은 계속 발행한다
  const 글 = await readFile('자동발행.sh', 'utf8')
  assert.match(글, /\$HOME_DIR\/계정\/\$PROFILE\/멈춤/, '계정 멈춤을 옛 자리에서 본다')
  assert.doesNotMatch(글, /\$HOME_DIR\/멈춤\.\$PROFILE/, '옛 줄이 남아 있다')
  assert.match(글, /-f "\$HOME_DIR\/멈춤"/, '전체 멈춤은 뿌리 그대로여야 한다')
})

test('활동장부는 계정 폴더를 훑어 읽는다 — 한계 셈이 여기 달려 있다', async () => {
  const { mkdtemp } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const 방 = await mkdtemp(join(tmpdir(), '활동장부-'))
  const 교 = await import('./src/교류하기.mjs')
  await 교.장부적기('가', [{ 한것: '하트', code: 'a' }], 방)
  await 교.장부적기('나', [{ 한것: '하트', code: 'b' }, { 한것: '답글', code: 'c' }], 방)

  const 다 = await 교.장부읽기(방)
  assert.equal((다['가'] ?? []).length, 1, '쓴 것을 다시 읽지 못하면 하루 한계가 0 으로 읽힌다')
  assert.equal((다['나'] ?? []).length, 2)
  assert.equal((다['가'] ?? [])[0].code, 'a', '남의 계정 줄이 섞이지 않는다')
})

test('업데이트가 계정 폴더를 덮지 않는다 — 출입증과 사진이 거기 있다', async () => {
  const { 보존인가 } = await import('./src/업데이트.mjs')
  for (const 길 of ['계정/example.cook/열쇠.env', '계정/a/media/받은것/01.jpg',
    '계정/a/멈춤', '계정/a/persona.json', '계정/_전체/점검상태.json']) {
    assert.equal(보존인가(길), true, `업데이트가 ${길} 를 덮는다`)
  }
  // 코드는 덮여야 새 판이 온다
  for (const 길 of ['src/계정.mjs', 'package.json', 'dashboard/app/page.tsx']) {
    assert.equal(보존인가(길), false, `${길} 는 코드라 새 판으로 덮여야 한다`)
  }
})

test('계정이 있는데 「처음 오셨네요」가 뜨면 안 된다', async () => {
  const { 계정이하나도없다 } = await import('./src/계정있나.mjs')
  const 방 = await 새방()
  assert.equal(await 계정이하나도없다(방), true, '아무것도 없으면 없는 것이다')

  // 계정 폴더에 열쇠가 있으면 계정이 있는 것이다 (.env.local 이 없어도)
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })
  await writeFile(join(방, '계정', 'aaa', '열쇠.env'), 'THREADS_COOKIE=x\n')
  assert.equal(await 계정이하나도없다(방), false,
    '계정이 멀쩡히 있는데 마법사가 뜬다 — 옛 .env.<계정> 자리만 보고 있다')
})

// ── 브라우저를 여는 모든 길에 계정벽이 걸려 있다 (2026-08-29) ──────────────
// 계정이 섞이는 사고는 파일이 아니라 **브라우저가 누구로 로그인돼 있느냐**에서 났다.
// 벽을 자리마다 손으로 붙이면 언젠가 한 자리를 빠뜨린다 — 실제로 홈수집이 빠져 있었고
// 그 틈으로 `sample_table` 이 `sample_minimi` 홈을 여덟 판 길들였다.
// 그래서 「브라우저를 여는 파일은 반드시 벽을 부른다」를 소스로 못 박는다
test('브라우저를 여는 모든 곳이 계정벽을 부른다', async () => {
  const 빠진것 = []
  for (const f of await readdir('src')) {
    if (!f.endsWith('.mjs') || f === '계정벽.mjs') continue
    const 글 = await readFile(join('src', f), 'utf8')
    // 쿠키를 브라우저에 심는 곳이 곧 「그 계정으로 움직이는」 곳이다
    if (!/addCookies\(/.test(글)) continue
    if (!/계정이름으로벽\(/.test(글)) 빠진것.push(f)
  }
  assert.deepEqual(빠진것, [],
    '쿠키를 브라우저에 심는데 주인 확인을 안 한다 — 남의 계정으로 움직일 수 있다')
})

test('홈수집은 주인이 다르면 걷기 전에 멈춘다', async () => {
  const { 홈에서걷기 } = await import('./src/홈수집.mjs')
  const { 딴계정 } = await import('./src/계정벽.mjs')

  let 브라우저열림 = false
  const 가짜크로미움 = { launch: async () => { 브라우저열림 = true; return { close: async () => {} } } }

  await assert.rejects(
    () => 홈에서걷기({
      쿠키: 'x=1', 계정: 'kr', chromium: 가짜크로미움,
      문서받기: async () => '{"username":"jp"}',   // 스레드가 「이 쿠키는 jp 것」이라고 답한다
    }),
    (e) => e instanceof 딴계정 && /jp/.test(e.message),
    '남의 계정 쿠키인데 그냥 걷었다',
  )
  assert.equal(브라우저열림, false, '벽은 브라우저를 열기 **전에** 서야 한다 — 열고 나면 이미 흔적이 남는다')
})

test('주인을 못 읽으면 막지 않는다 — 벽이 프로그램을 죽이면 안 된다', async () => {
  const { 홈에서걷기 } = await import('./src/홈수집.mjs')
  const 알림들 = []
  let 걸었나 = false
  const 가짜크로미움 = { launch: async () => { 걸었나 = true; throw new Error('여기까지 왔으면 통과한 것') } }

  await assert.rejects(() => 홈에서걷기({
    쿠키: 'x=1', 계정: 'kr', chromium: 가짜크로미움,
    문서받기: async () => { throw new Error('그물이 끊겼다') },
    알림: (m) => 알림들.push(m),
  }), /여기까지 왔으면/)
  assert.equal(걸었나, true, '스레드가 답을 안 준다고 걷기를 통째로 세우면 안 된다')
  assert.ok(알림들.some((m) => /확인/.test(m)), '확인 못 했다는 것은 사람에게 알린다')
})

// ── 토큰도 쿠키와 같은 벽이 필요하다 (2026-08-30) ──────────────────────────
// 쿠키는 벽이 있는데 **토큰은 없었다.** 열쇠 파일에 남의 토큰이 들어가면
// 스레드 API 가 그 계정으로 글을 올린다 — 되돌리기 가장 어려운 침범이다.
// 헬스체크가 세 시간 뒤에 잡을 뿐이었다
test('토큰 주인이 다르면 글이 나가기 전에 멈춘다', async () => {
  const { 토큰벽 } = await import('./src/publish.mjs')
  const { 딴계정 } = await import('./src/계정벽.mjs')
  const 답 = (username, id) => async () => ({ json: async () => ({ id, username }) })

  await assert.rejects(
    () => 토큰벽('kr', 'tok', { 가져오기: 답('jp', '222') }),
    (e) => e instanceof 딴계정 && /jp/.test(e.message),
    '남의 토큰인데 그대로 올린다',
  )

  // 제 것이면 통과하고 번호를 준다 — 열쇠 파일 번호가 틀려도 실제 번호로 올리기 위해서다
  assert.equal(await 토큰벽('kr', 'tok', { 가져오기: 답('kr', '111') }), '111')

  // 못 물어봤으면 막지 않는다. 그물이 끊겼다고 발행을 세우면 사고를 막는 게 아니다
  assert.equal(await 토큰벽('kr', 'tok', { 가져오기: async () => { throw new Error('끊김') } }), null)
  // 스레드가 이름을 안 주면 짐작하지 않는다
  assert.equal(await 토큰벽('kr', 'tok', { 가져오기: 답(undefined, '111') }), '111')
})

test('계정 번호 캐시가 계정을 가른다 — 한 프로세스에서 둘을 다뤄도 안 섞인다', async () => {
  const { 내계정번호 } = await import('./src/publish.mjs')
  const 답 = (id) => async () => ({ json: async () => ({ id }) })
  assert.equal(await 내계정번호('tokA', 답('111')), '111')
  assert.equal(await 내계정번호('tokB', 답('222')), '222',
    'A 계정 번호가 B 계정에 그대로 쓰였다 — 남의 계정으로 글이 올라간다')
  assert.equal(await 내계정번호('tokA', 답('999')), '111', '같은 토큰은 캐시가 먹어야 한다')
})

// ── 공용 열쇠는 계정 파일에 사본을 두지 않는다 (2026-08-30) ────────────────
// `node --env-file` 은 **뒤에 오는 파일이 이긴다**(실측). 자동발행.sh 는
// `.env.local` 다음에 계정 파일을 준다 — 계정 파일에 공용 열쇠 사본이 있으면
// **그 계정만 딴 값을 쓴다.** 값이 어쩌다 같아서 안 터지고 있을 뿐이다
test('계정 열쇠 파일에는 그 계정 것만 있다', async () => {
  const { 공유열쇠 } = await import('./src/계정.mjs')
  const 자리들 = await readdir('계정', { withFileTypes: true }).catch(() => [])
  const 걸린것 = []
  for (const d of 자리들) {
    if (!d.isDirectory()) continue
    const 글 = await readFile(join('계정', d.name, '열쇠.env'), 'utf8').catch(() => null)
    if (글 === null) continue
    for (const 줄 of 글.split('\n')) {
      const 이름 = 줄.match(/^([A-Z_]+)=/)?.[1]
      if (이름 && (공유열쇠.has(이름) || 이름.startsWith('OPENAI_'))) 걸린것.push(`${d.name}: ${이름}`)
    }
  }
  assert.deepEqual(걸린것, [],
    '공용 열쇠 사본이 계정 파일에 있다 — .env.local 을 덮어써 그 계정만 딴 값을 쓴다')
})
