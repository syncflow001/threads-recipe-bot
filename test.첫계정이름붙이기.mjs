// 도구.첫계정이름붙이기.mjs 가 표대로 옮기는지, 마른 판은 아무것도 안 바꾸는지, 되돌리기가 되는지 잰다
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, stat, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  열쇠세줄나누기, 키바꾸기, 옮길목록, plist바꾸기, 옮기기, 되돌리기,
  글계정바꾸기, 글계정되돌리기, 글계정고치기,
} from './도구.첫계정이름붙이기.mjs'

const 존재 = (경로) => stat(경로).then(() => true, () => false)

// ⚠️ 실행 을 안 넘기면 도구가 기본값으로 진짜 execFile 을 쓴다 — 임시 런치폴더와 섞이면 진짜 launchd 에
// 유령 예약이 남는 사고가 실제로 났다(2026-08-28). 옮기기·되돌리기 를 부르는 곳은 마른 판이든 아니든
// 전부 이 가짜 실행 을 넘긴다(호출 기록이 필요하면 그 검사가 제 것을 따로 만든다)
const 가짜실행 = async (cmd, args) => ({ stdout: '', stderr: '', cmd, args })

// ─── 순수 함수 ──────────────────────────────────────────────────

test('열쇠세줄나누기 — 세 줄을 뽑고 나머지는 순서 그대로 남긴다', () => {
  const 원문 = 'THREADS_APP_ID=app1\nTHREADS_ACCESS_TOKEN=a\nTHREADS_USER_ID=b\nTHREADS_COOKIE=c\nOPENAI_API_KEY=y'
  const { 계정것, 남은것 } = 열쇠세줄나누기(원문)
  assert.equal(계정것, 'THREADS_ACCESS_TOKEN=a\nTHREADS_USER_ID=b\nTHREADS_COOKIE=c\n')
  assert.equal(남은것, 'THREADS_APP_ID=app1\nOPENAI_API_KEY=y')
})

test('열쇠세줄나누기 — 세 키가 다 없으면 계정것은 빈 값이고 원문을 그대로 돌려준다', () => {
  const 원문 = 'THREADS_ACCESS_TOKEN=a\nOPENAI_API_KEY=y'
  const { 계정것, 남은것 } = 열쇠세줄나누기(원문)
  assert.equal(계정것, '')
  assert.equal(남은것, 원문)
})

test('키바꾸기 — "" 키를 이름으로 바꾼다', () => {
  assert.deepEqual(키바꾸기({ '': { a: 1 }, x: 2 }, 'example.cook'), { x: 2, 'example.cook': { a: 1 } })
})

test('키바꾸기 — "" 키가 없으면 그대로 돌려준다', () => {
  assert.deepEqual(키바꾸기({ x: 2 }, 'example.cook'), { x: 2 })
})

test('키바꾸기 — 이미 이름 키가 있으면 던진다', () => {
  assert.throws(
    () => 키바꾸기({ '': {}, 'example.cook': {} }, 'example.cook', '계정정보.json'),
    /이미 있다: 계정정보\.json/,
  )
})

test('옮길목록 — 아무것도 없으면 전부 방법 없음', () => {
  const 목록 = 옮길목록('/뿌리', 'example.cook', { 최상위: [], logs: [], media: [], launchd: [] })
  assert.ok(목록.length > 0)
  assert.ok(목록.every((m) => m.방법 === '없음'))
})

test('옮길목록 — 있는 것은 표대로 방법이 붙는다', () => {
  const 목록 = 옮길목록('/뿌리', 'example.cook', {
    최상위: ['.env.local', 'persona.json', '보관함.json', '활동장부.main.jsonl', '계정정보.json'],
    logs: ['마지막발행.txt', '2026-08.log', '성적-2026-08.log'],
    media: ['쓴것', '받은것', '프로필.jpg'],
    launchd: ['com.example.threads.plist', 'com.threads.score.main.plist'],
  })
  const 찾기 = (무엇) => 목록.find((m) => m.무엇 === 무엇)
  assert.equal(찾기('.env.local 스레드 열쇠').방법, '새로쓰기')
  assert.equal(찾기('persona.json').방법, '복사')
  assert.equal(찾기('보관함.json').방법, '이동')
  assert.equal(찾기('media/쓴것').방법, '이동')
  assert.equal(찾기('활동장부.main.jsonl').방법, '이동')
  assert.equal(찾기('logs/마지막발행.txt').방법, '이동')
  assert.equal(찾기('logs/2026-08.log').으로, 'logs/example.cook-2026-08.log')
  assert.equal(찾기('logs/성적-2026-08.log').으로, 'logs/성적-example.cook-2026-08.log')
  assert.equal(찾기('계정정보.json "" 키').방법, '키바꾸기')
  assert.equal(찾기('launchd com.example.threads').방법, 'launchd')
  assert.equal(찾기('launchd com.threads.score.main').으로, 'com.threads.score.example.cook')
  assert.equal(찾기('알림기록.main.jsonl').방법, '없음', '실제 뿌리엔 없는 파일 — 없음으로 찍혀야 한다')
})

test('plist바꾸기 — Label · 계정 인자 · 로그 이름 세 곳만 바꾸고 시각은 그대로', () => {
  const 옛글 = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    '<dict>',
    '  <key>Label</key><string>com.example.threads</string>',
    '  <key>ProgramArguments</key>',
    '  <array>',
    '    <string>/bin/bash</string>',
    '    <string>/뿌리/자동발행.sh</string>',
    '  </array>',
    '  <key>WorkingDirectory</key><string>/뿌리</string>',
    '  <key>StartCalendarInterval</key>',
    '  <array>',
    '    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>2</integer></dict>',
    '  </array>',
    '  <key>StandardOutPath</key><string>/뿌리/logs/launchd.out</string>',
    '  <key>StandardErrorPath</key><string>/뿌리/logs/launchd.err</string>',
    '</dict>',
    '</plist>',
  ].join('\n')
  const 새글 = plist바꾸기(옛글, { 새라벨: 'com.threads.auto.example.cook', 이름: 'example.cook' })
  assert.match(새글, /<key>Label<\/key><string>com\.threads\.auto\.example.cook<\/string>/)
  assert.match(새글, /<string>\/뿌리\/자동발행\.sh<\/string>\s*<string>example.cook<\/string>/)
  assert.match(새글, /logs\/launchd-example.cook\.out/)
  assert.match(새글, /logs\/launchd-example.cook\.err/)
  assert.match(새글, /<integer>8<\/integer>/, '시각(칸)은 그대로여야 한다')
  assert.match(새글, /<string>\/뿌리<\/string>/, 'WorkingDirectory 는 손대지 않는다')
})

// ─── 통합 — 임시 뿌리에서만 논다 ──────────────────────────────────

const plist글 = (라벨, 스크립트파일, 로그이름, 뿌리, 꼴) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${라벨}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${뿌리}/${스크립트파일}</string>
  </array>
  <key>WorkingDirectory</key><string>${뿌리}</string>
  ${꼴 === '간격'
    ? '<key>StartInterval</key><integer>21600</integer>'
    : '<key>StartCalendarInterval</key>\n  <array>\n    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>2</integer></dict>\n  </array>'}
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${뿌리}/logs/${로그이름}.out</string>
  <key>StandardErrorPath</key><string>${뿌리}/logs/${로그이름}.err</string>
</dict>
</plist>
`

const env원문 = [
  'THREADS_APP_ID=app1',
  'THREADS_APP_SECRET=secret1',
  'THREADS_ACCESS_TOKEN=tok-abc',
  'THREADS_USER_ID=12345',
  'THREADS_COOKIE=ck-xyz',
  'OPENAI_API_KEY=sk-1',
].join('\n') + '\n'

async function 뿌리만들기() {
  const 뿌리 = await mkdtemp(join(tmpdir(), '첫계정이름-'))
  await writeFile(join(뿌리, '.env.local'), env원문)
  await writeFile(join(뿌리, 'persona.json'), JSON.stringify({ 말투: '기본' }, null, 2) + '\n')
  await writeFile(join(뿌리, '보관함.json'), JSON.stringify([{ code: 'abc' }], null, 2) + '\n')
  await mkdir(join(뿌리, 'media', '쓴것', 'a'), { recursive: true })
  await writeFile(join(뿌리, 'media', '쓴것', 'a', 'x.jpg'), 'jpgdata')
  await mkdir(join(뿌리, 'media', '받은것'), { recursive: true })
  await writeFile(join(뿌리, 'media', '받은것', '.gitkeep'), '')
  await writeFile(join(뿌리, 'media', '프로필.jpg'), 'profile')
  await writeFile(join(뿌리, 'media', '미디어지문.json'), JSON.stringify(['aaa111']) + '\n')
  await writeFile(join(뿌리, '활동장부.main.jsonl'), '{"a":1}\n')
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(뿌리, 'logs', '마지막발행.txt'), '2026-08-28T00:00:00Z')
  await writeFile(join(뿌리, 'logs', '2026-08.log'), '로그줄\n')
  await writeFile(join(뿌리, 'logs', '성적-2026-08.log'), '성적줄\n')
  await writeFile(join(뿌리, '계정정보.json'), JSON.stringify({ '': { 별칭: '첫 계정', 아이디: '', 분야: '요리' } }, null, 2) + '\n')
  await writeFile(join(뿌리, '팔로워장부.json'), JSON.stringify({ '': [{ 날: '2026-08-25', 수: 100 }] }, null, 2) + '\n')
  await writeFile(join(뿌리, '글성적장부.json'), JSON.stringify({ '': { x: 1 } }, null, 2) + '\n')
  await writeFile(join(뿌리, '도달기준선.json'), JSON.stringify({ '': { 기준선: 100 } }, null, 2) + '\n')
  await writeFile(join(뿌리, '길들이기장부.json'), JSON.stringify({ '': [{ 때: '2026-08-25' }] }, null, 2) + '\n')

  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await writeFile(join(런치폴더, 'com.example.threads.plist'), plist글('com.example.threads', '자동발행.sh', 'launchd', 뿌리, '시각'))
  await writeFile(join(런치폴더, 'com.threads.score.main.plist'), plist글('com.threads.score.main', '성적.sh', '성적', 뿌리, '간격'))

  return { 뿌리, 런치폴더 }
}

async function 걷기(경로, 기준 = 경로) {
  let 결과 = []
  for (const it of await readdir(경로, { withFileTypes: true })) {
    const 전체 = join(경로, it.name)
    결과 = it.isDirectory() ? 결과.concat(await 걷기(전체, 기준)) : [...결과, 전체.slice(기준.length + 1)]
  }
  return 결과.sort()
}

test('마른 판은 파일을 하나도 안 바꾼다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  const 이전 = await 걷기(뿌리)
  const 결과 = await 옮기기('example.cook', { 뿌리, 런치폴더, 실행: 가짜실행 })
  assert.ok(Array.isArray(결과.목록))
  assert.ok(결과.목록.some((m) => m.방법 !== '없음'))

  const 이후 = await 걷기(뿌리)
  assert.deepEqual(이후, 이전, '마른 판인데 파일 목록이 바뀌었다')
  assert.equal(await readFile(join(뿌리, '.env.local'), 'utf8'), env원문, '내용도 그대로여야 한다')
  assert.equal(await 존재(join(뿌리, '첫계정백업')), false)
})

test('--실행 뒤 표대로 옮겨지고, 되돌리기 하면 제자리로 돌아온다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  const 호출들 = []
  const 가짜실행 = async (cmd, args) => { 호출들.push([cmd, ...(args ?? [])]); return { stdout: '', stderr: '' } }

  const 결과 = await 옮기기('example.cook', {
    뿌리, 런치폴더, 실행: 가짜실행, 마른판: false, 지금: new Date('2026-08-28T15:30:00'),
  })

  // .env
  assert.equal(
    await readFile(join(뿌리, '.env.example.cook'), 'utf8'),
    'THREADS_ACCESS_TOKEN=tok-abc\nTHREADS_USER_ID=12345\nTHREADS_COOKIE=ck-xyz\n',
  )
  assert.equal((await stat(join(뿌리, '.env.example.cook'))).mode & 0o777, 0o600, '.env.* 는 0600')
  const envLocal새것 = await readFile(join(뿌리, '.env.local'), 'utf8')
  assert.ok(!envLocal새것.includes('THREADS_ACCESS_TOKEN'), '스레드 열쇠 세 줄이 빠져야 한다')
  assert.ok(!envLocal새것.includes('THREADS_USER_ID'))
  assert.ok(!envLocal새것.includes('THREADS_COOKIE'))
  assert.ok(envLocal새것.includes('THREADS_APP_ID=app1'), '공유 열쇠는 그대로 남아야 한다')
  assert.ok(envLocal새것.includes('OPENAI_API_KEY=sk-1'))

  // persona
  assert.ok(await 존재(join(뿌리, 'persona.example.cook.json')))
  assert.equal(
    await readFile(join(뿌리, 'persona.example.cook.json'), 'utf8'),
    await readFile(join(뿌리, 'persona.json'), 'utf8'),
    'persona.json 은 그대로 두고 복사만 해야 한다',
  )

  // 보관함 · 활동장부 · media
  assert.ok(await 존재(join(뿌리, '보관함.example.cook.json')))
  assert.ok(await 존재(join(뿌리, '활동장부.example.cook.jsonl')))
  assert.ok(await 존재(join(뿌리, 'media', 'example.cook', '쓴것', 'a', 'x.jpg')))
  assert.ok(await 존재(join(뿌리, 'media', 'example.cook', '미디어지문.json')), '계정별 중복 막이 장부라 같이 옮겨야 한다')

  // logs
  assert.ok(await 존재(join(뿌리, 'logs', '마지막발행-example.cook.txt')))
  assert.ok(await 존재(join(뿌리, 'logs', 'example.cook-2026-08.log')))
  assert.ok(await 존재(join(뿌리, 'logs', '성적-example.cook-2026-08.log')))

  // 장부 다섯 — "" 키가 이름으로 바뀐다
  for (const 장부 of ['계정정보.json', '팔로워장부.json', '글성적장부.json', '도달기준선.json', '길들이기장부.json']) {
    const d = JSON.parse(await readFile(join(뿌리, 장부), 'utf8'))
    assert.ok(!('' in d), `${장부} 에 "" 키가 남으면 안 된다`)
    assert.ok('example.cook' in d, `${장부} 에 example.cook 키가 있어야 한다`)
  }
  const 계정정보 = JSON.parse(await readFile(join(뿌리, '계정정보.json'), 'utf8'))
  assert.equal(계정정보['example.cook'].아이디, 'example.cook', '비어 있던 아이디를 채워야 한다')

  // 백업폴더 — 원본 전부
  assert.equal(결과.백업폴더, join(뿌리, '첫계정백업', '2026-08-28-1530'))
  const envLocal백업 = await readFile(join(결과.백업폴더, '.env.local'), 'utf8')
  assert.equal(envLocal백업, env원문)
  const 계정정보백업 = JSON.parse(await readFile(join(결과.백업폴더, '계정정보.json'), 'utf8'))
  assert.ok('' in 계정정보백업)
  assert.ok(await 존재(join(결과.백업폴더, '보관함.json')))
  assert.ok(await 존재(join(결과.백업폴더, '활동장부.main.jsonl')))
  assert.ok(await 존재(join(결과.백업폴더, '마지막발행.txt')))
  assert.ok(await 존재(join(결과.백업폴더, '2026-08.log')))
  assert.ok(await 존재(join(결과.백업폴더, '성적-2026-08.log')))
  assert.ok(await 존재(join(결과.백업폴더, 'launchd', 'com.example.threads.plist')))
  assert.ok(await 존재(join(결과.백업폴더, 'launchd', 'com.threads.score.main.plist')))
  assert.ok(await 존재(join(결과.백업폴더, 'media목록.json')))

  // 옮긴/건너뛴
  assert.ok(결과.옮긴.every((m) => m.방법 !== '없음'))
  assert.ok(결과.건너뛴.every((m) => m.방법 === '없음'))
  assert.ok(결과.건너뛴.some((m) => m.무엇 === '알림기록.main.jsonl'))

  // launchctl 호출 — unload 둘, load 둘 (시각표켜기 없이 직접 부른다)
  const 명령들 = 호출들.map((h) => h.join(' '))
  assert.ok(명령들.some((c) => c.startsWith('launchctl unload') && c.includes('com.example.threads.plist')))
  assert.ok(명령들.some((c) => c.startsWith('launchctl unload') && c.includes('com.threads.score.main.plist')))
  assert.ok(명령들.some((c) => c.startsWith('launchctl load') && c.includes('com.threads.auto.example.cook.plist')))
  assert.ok(명령들.some((c) => c.startsWith('launchctl load') && c.includes('com.threads.score.example.cook.plist')))

  // 새 plist — 세 곳만 바뀌고 시각은 그대로
  const 새자동plist = await readFile(join(런치폴더, 'com.threads.auto.example.cook.plist'), 'utf8')
  assert.match(새자동plist, /<string>example.cook<\/string>/)
  assert.match(새자동plist, /logs\/launchd-example.cook\.out/)
  assert.match(새자동plist, /<integer>8<\/integer>/, 'StartCalendarInterval 시각은 그대로')
  const 새성적plist = await readFile(join(런치폴더, 'com.threads.score.example.cook.plist'), 'utf8')
  assert.match(새성적plist, /<integer>21600<\/integer>/, 'StartInterval 은 그대로')
  assert.equal(await 존재(join(런치폴더, 'com.example.threads.plist')), false, '옛 plist 는 백업으로 옮겨져야 한다')

  // ── 되돌리기 ──
  const 되돌린것 = await 되돌리기(결과.백업폴더, { 뿌리, 런치폴더, 실행: 가짜실행 })
  assert.equal(되돌린것.이름, 'example.cook')

  assert.equal(await readFile(join(뿌리, '.env.local'), 'utf8'), env원문)
  assert.equal(await 존재(join(뿌리, '.env.example.cook')), false)
  assert.equal(await 존재(join(뿌리, '보관함.json')), true)
  assert.equal(await 존재(join(뿌리, '활동장부.main.jsonl')), true)
  assert.equal(await 존재(join(뿌리, 'media', '쓴것', 'a', 'x.jpg')), true)
  assert.equal(await 존재(join(뿌리, 'media', 'example.cook')), false)
  assert.equal(await 존재(join(뿌리, 'logs', '마지막발행.txt')), true)
  assert.equal(await 존재(join(뿌리, 'logs', '2026-08.log')), true)
  assert.equal(await 존재(join(뿌리, 'logs', '성적-2026-08.log')), true)

  for (const 장부 of ['계정정보.json', '팔로워장부.json', '글성적장부.json', '도달기준선.json', '길들이기장부.json']) {
    const d = JSON.parse(await readFile(join(뿌리, 장부), 'utf8'))
    assert.ok('' in d, `${장부} 에 "" 키가 되돌아와야 한다`)
    assert.ok(!('example.cook' in d))
  }

  assert.ok(await 존재(join(런치폴더, 'com.example.threads.plist')))
  assert.ok(await 존재(join(런치폴더, 'com.threads.score.main.plist')))
  assert.equal(await 존재(join(런치폴더, 'com.threads.auto.example.cook.plist')), false)
  assert.equal(await 존재(join(런치폴더, 'com.threads.score.example.cook.plist')), false)
})

test('.env.<이름> 이 이미 있으면 던진다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  await writeFile(join(뿌리, '.env.example.cook'), 'X=1\n')
  await assert.rejects(() => 옮기기('example.cook', { 뿌리, 런치폴더, 마른판: false, 실행: 가짜실행 }), /이미 있다/)
})

test('첫 계정에 스레드 열쇠가 없으면 던진다', async (t) => {
  const 뿌리 = await mkdtemp(join(tmpdir(), '첫계정이름-'))
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  await writeFile(join(뿌리, '.env.local'), 'OPENAI_API_KEY=x\n')
  await assert.rejects(() => 옮기기('example.cook', { 뿌리, 실행: 가짜실행 }), /스레드 열쇠 세 줄/)
})

test('계정 이름꼴이 아니면 던진다', async (t) => {
  // 이름꼴 검사가 첫 줄이라 지금은 안전하지만, 임시 뿌리를 넘겨야 이 검사가 실서버를 훑지 않는다는
  // 확정 교훈을 앞으로도 지킨다(순서가 바뀌어도 이 검사만은 안전하게)
  const 뿌리 = await mkdtemp(join(tmpdir(), '첫계정이름-'))
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  await assert.rejects(() => 옮기기('Bad Name!', { 뿌리, 실행: 가짜실행 }), /영문 소문자/)
})

test('장부에 이미 이름 키가 있으면 --실행 이 아무 파일도 안 바꾼 채 던진다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  // 이전 시도의 잔재(또는 사람이 미리 손댄 상태) — 계정정보.json 에 "" 와 "example.cook" 가 같이 있다
  await writeFile(
    join(뿌리, '계정정보.json'),
    JSON.stringify({ '': { 별칭: '첫 계정' }, 'example.cook': { 별칭: '이미 있음' } }, null, 2) + '\n',
  )

  const 이전 = await 걷기(뿌리)
  const 이전계정정보 = await readFile(join(뿌리, '계정정보.json'), 'utf8')

  await assert.rejects(
    () => 옮기기('example.cook', { 뿌리, 런치폴더, 마른판: false, 실행: 가짜실행 }),
    /이미 있다: 계정정보\.json/,
    'launchd·env·persona 등을 손대기 전에, rename 을 하나도 하기 전에 던져야 한다',
  )

  const 이후 = await 걷기(뿌리)
  assert.deepEqual(이후, 이전, '파일 목록이 하나도 안 바뀌어야 한다')
  assert.equal(await readFile(join(뿌리, '계정정보.json'), 'utf8'), 이전계정정보, '계정정보.json 이 제자리에 그대로 있어야 한다')
  assert.equal(await 존재(join(뿌리, '.env.example.cook')), false)
  assert.equal(await 존재(join(뿌리, '첫계정백업')), false, 'launchd·env 등 뒤 단계는 아예 시작도 안 해야 한다')
})

test('되돌리기 — media 를 옮기던 도중 죽은 상태(일부만 새 자리)에서도 제자리로 돌려놓는다', async (t) => {
  const 뿌리 = await mkdtemp(join(tmpdir(), '첫계정이름-되돌리기-'))
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  // 죽기 전 상태를 그대로 흉내낸다 — media목록.json 은 (고침 뒤) rename 루프보다 먼저 쓰이므로
  // 조각 중 "쓴것"만 새 자리로 옮겨진 채, "받은것"·"프로필.jpg" 는 아직 원래 자리에 남아 있다
  await mkdir(join(뿌리, 'media', '받은것'), { recursive: true })
  await writeFile(join(뿌리, 'media', '프로필.jpg'), 'profile')
  await mkdir(join(뿌리, 'media', 'example.cook', '쓴것', 'a'), { recursive: true })
  await writeFile(join(뿌리, 'media', 'example.cook', '쓴것', 'a', 'x.jpg'), 'jpgdata')

  const 백업폴더 = join(뿌리, '첫계정백업', '2026-08-28-1530')
  await mkdir(백업폴더, { recursive: true })
  await writeFile(join(백업폴더, '정보.json'), JSON.stringify({ 이름: 'example.cook' }, null, 2) + '\n')
  await writeFile(join(백업폴더, 'media목록.json'), JSON.stringify(['쓴것', '받은것', '프로필.jpg'], null, 2) + '\n')

  const 런치폴더 = join(뿌리, 'launchd테스트없음')
  await 되돌리기(백업폴더, { 뿌리, 런치폴더, 실행: async () => ({ stdout: '', stderr: '' }) })

  assert.equal(await 존재(join(뿌리, 'media', '쓴것', 'a', 'x.jpg')), true, '이미 새 자리로 옮겨졌던 조각도 되돌아와야 한다')
  assert.equal(await 존재(join(뿌리, 'media', '받은것')), true, '한 번도 안 옮겨진 조각은 그대로 있어야 한다')
  assert.equal(await 존재(join(뿌리, 'media', '프로필.jpg')), true)
  assert.equal(await 존재(join(뿌리, 'media', 'example.cook')), false, '다 옮겨진 뒤엔 빈 폴더도 안 남아야 한다')
})

test('plist바꾸기 — Label 을 못 찾으면(꼴이 다르면) 조용히 안 지나가고 던진다', () => {
  assert.throws(
    () => plist바꾸기('<dict><key>NotLabel</key><string>x</string></dict>', { 새라벨: 'com.threads.auto.example.cook', 이름: 'example.cook' }),
    /plist 꼴이 예상과 다르다/,
  )
})

test('plist바꾸기 — ProgramArguments 를 못 찾으면 던진다', () => {
  const 라벨만있는글 = '<key>Label</key><string>com.example.threads</string><array></array>'
  assert.throws(
    () => plist바꾸기(라벨만있는글, { 새라벨: 'com.threads.auto.example.cook', 이름: 'example.cook' }),
    /ProgramArguments/,
  )
})

test('옮기기 — plist 가 안 맞으면 백업폴더조차 아직 안 만든 채로 던진다(에러에 백업폴더도 안 붙는다)', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  // com.example.threads.plist 를 plist바꾸기 가 못 알아먹는 꼴로 망가뜨려 둔다
  await writeFile(join(런치폴더, 'com.example.threads.plist'), '<dict><key>NotLabel</key><string>x</string></dict>')

  let 잡은에러 = null
  try {
    await 옮기기('example.cook', { 뿌리, 런치폴더, 마른판: false, 실행: 가짜실행 })
  } catch (에러) {
    잡은에러 = 에러
  }
  assert.ok(잡은에러, '던져야 한다')
  assert.match(잡은에러.message, /plist 꼴이 예상과 다르다/)
  // 선검증이 launchd 두 쌍을 다 미리 본 뒤(백업폴더 생기기 전)에 일어나므로, 여기선 에러에
  // 백업폴더가 안 붙는다 — 되돌릴 것 자체가 없다(아무것도 안 건드렸다)
  assert.equal(잡은에러.백업폴더, undefined)
  assert.equal(await 존재(join(뿌리, '첫계정백업')), false)
})

test('옮기기 — 백업폴더를 만든 뒤(launchd 이후) 던지면 에러에 그 백업폴더 경로가 붙는다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  // 보관함.json 자리에 파일 대신 폴더를 둬서, rename(파일→백업) 은 되지만
  // 그다음 copyFile(백업→새 자리) 에서 EISDIR 로 던지게 만든다 — launchd 는 이미 다 옮겨진 뒤다
  await rm(join(뿌리, '보관함.json'))
  await mkdir(join(뿌리, '보관함.json'))

  let 잡은에러 = null
  try {
    await 옮기기('example.cook', { 뿌리, 런치폴더, 마른판: false, 실행: 가짜실행 })
  } catch (에러) {
    잡은에러 = 에러
  }
  assert.ok(잡은에러, '던져야 한다')
  assert.equal(typeof 잡은에러.백업폴더, 'string')
  assert.ok(
    await 존재(잡은에러.백업폴더),
    '백업폴더 자체는 만들어져 있어야 CLI 가 되돌리기 경로를 알려줄 수 있다',
  )
  assert.ok(await 존재(join(잡은에러.백업폴더, '.env.local')), '이미 옮겨진 것들은 백업폴더 안에 있어야 한다')
})

test('옮기기 — 성적(두 번째) plist 가 안 맞으면, 자동발행(첫 번째) 쪽도 통째로 아무것도 안 바뀐다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))
  // com.threads.score.main.plist 만 망가뜨린다 — 자동발행 plist 는 멀쩡하다
  await writeFile(join(런치폴더, 'com.threads.score.main.plist'), '<dict><key>NotLabel</key><string>x</string></dict>')

  const 이전 = await 걷기(뿌리)
  const 이전자동plist = await readFile(join(런치폴더, 'com.example.threads.plist'), 'utf8')

  let 잡은에러 = null
  try {
    await 옮기기('example.cook', { 뿌리, 런치폴더, 마른판: false, 실행: 가짜실행 })
  } catch (에러) {
    잡은에러 = 에러
  }
  assert.ok(잡은에러, '던져야 한다')
  assert.match(잡은에러.message, /plist 꼴이 예상과 다르다/)

  const 이후 = await 걷기(뿌리)
  assert.deepEqual(이후, 이전, '순서가 먼저인 자동발행 쌍이 이미 커밋된 채 남으면 안 된다 — 파일 목록이 하나도 안 바뀌어야 한다')
  assert.equal(
    await readFile(join(런치폴더, 'com.example.threads.plist'), 'utf8'),
    이전자동plist,
    '자동발행 plist 는 unload·rename·라벨 변경 전부 안 됐어야 한다(옛 라벨 그대로)',
  )
  assert.equal(await 존재(join(뿌리, '첫계정백업')), false, '선검증이 백업폴더 생성보다 먼저라 백업 폴더조차 안 생겨야 한다')
})

test('되돌리기 — launchd 복원이 실패해도(load 가 던져도) 파일 복원은 끝까지 돈다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  const 실행기록 = []
  const 정상실행 = async (cmd, args) => { 실행기록.push([cmd, ...(args ?? [])]); return { stdout: '', stderr: '' } }
  const 결과 = await 옮기기('example.cook', { 뿌리, 런치폴더, 실행: 정상실행, 마른판: false, 지금: new Date('2026-08-28T15:30:00') })

  // load 를 부르면 무조건 던지는 가짜 실행 — launchd 되살리기는 매번 실패한다
  const 던지는실행 = async (cmd, args) => {
    if (args?.[0] === 'load') throw new Error('launchctl: 흉내낸 실패')
    return { stdout: '', stderr: '' }
  }

  await assert.doesNotReject(
    () => 되돌리기(결과.백업폴더, { 뿌리, 런치폴더, 실행: 던지는실행 }),
    'launchd 가 안 되도 되돌리기 자체는 끝까지 돌아야 한다(던지면 안 된다)',
  )

  assert.equal(await readFile(join(뿌리, '.env.local'), 'utf8'), env원문, '.env.local 이 launchd 실패와 무관하게 되돌아와야 한다')
  assert.equal(await 존재(join(뿌리, '.env.example.cook')), false)
  assert.equal(await 존재(join(뿌리, '보관함.json')), true)
  assert.equal(await 존재(join(뿌리, '활동장부.main.jsonl')), true)
  for (const 장부 of ['계정정보.json', '팔로워장부.json', '글성적장부.json', '도달기준선.json', '길들이기장부.json']) {
    const d = JSON.parse(await readFile(join(뿌리, 장부), 'utf8'))
    assert.ok('' in d, `${장부} 은 launchd 가 실패해도 되돌아와야 한다`)
  }
})

test('안전장치 — 임시 런치폴더인데 실행 을 안 넘기면(=진짜 launchctl 을 쓰려 하면) 던진다', async (t) => {
  // 2026-08-28 사고 재발 방지 — 검사가 임시 런치폴더를 쓰면서 실행 을 빠뜨리면 도구가 기본값인 진짜
  // execFile 로 진짜 launchctl 을 부른다. 임시 런치폴더 + 실행 없음 조합 자체를 막아야 한다
  const 임시런치폴더 = await mkdtemp(join(tmpdir(), '첫계정이름-런치안전-'))
  t.after(() => rm(임시런치폴더, { recursive: true, force: true }))
  await assert.rejects(
    () => 옮기기('example.cook', { 뿌리: 임시런치폴더, 런치폴더: 임시런치폴더 }),
    /런치폴더가 진짜 LaunchAgents 가 아닌데 실행/,
  )
})

// ─── 글계정바꾸기 · 글계정되돌리기 — 순수 함수 ──────────────────────

test('글계정바꾸기 — 발행.계정 이 "" 면 바뀐 새 객체를 돌려주고 원본은 그대로다(불변)', () => {
  const 글 = { 본문: '레시피', 발행: { 계정: '', 본문번호: 'x1', 올린때: '2026-08-28T00:00:00Z' } }
  const 새글 = 글계정바꾸기(글, 'example.cook')
  assert.equal(새글.발행.계정, 'example.cook')
  assert.equal(새글.본문, '레시피', '다른 칸은 그대로여야 한다')
  assert.equal(글.발행.계정, '', '원본은 바뀌면 안 된다')
  assert.notEqual(새글, 글, '새 객체여야 한다')
})

test('글계정바꾸기 — 발행 칸이 없으면(발행 안 된 초안) null', () => {
  assert.equal(글계정바꾸기({ 본문: '초안' }, 'example.cook'), null)
})

test('글계정바꾸기 — 발행.계정 이 이미 다른 값이면(남의 계정 글) null', () => {
  assert.equal(글계정바꾸기({ 발행: { 계정: 'other' } }, 'example.cook'), null)
})

test('글계정되돌리기 — 발행.계정 이 이름 이면 "" 로 되돌린 새 객체, 아니면 null', () => {
  const 글 = { 본문: '레시피', 발행: { 계정: 'example.cook' } }
  const 새글 = 글계정되돌리기(글, 'example.cook')
  assert.equal(새글.발행.계정, '')
  assert.equal(글.발행.계정, 'example.cook', '원본은 그대로')
  assert.equal(글계정되돌리기({ 발행: { 계정: 'other' } }, 'example.cook'), null)
  assert.equal(글계정되돌리기({ 본문: '초안' }, 'example.cook'), null)
})

// ─── 옮기기·되돌리기 통합 — 재구성.json 의 발행.계정 도 함께 옮긴다 ──────

test('옮기기 --실행 뒤 재구성.json 의 발행.계정 이 함께 옮겨지고, 발행 없는 글·남의 계정 글은 그대로다', async (t) => {
  const { 뿌리, 런치폴더 } = await 뿌리만들기()
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  const 글A = { 본문: 'A 본문', 발행: { 계정: '', 본문번호: 'n1', 답글번호들: [], 통로: 'api', 올린때: '2026-08-27T00:00:00Z' } }
  const 글B = { 본문: 'B 본문(초안)' } // 발행 칸 없음 — 발행 안 된 초안
  const 글C = { 본문: 'C 본문', 발행: { 계정: 'other', 본문번호: 'n3', 올린때: '2026-08-27T00:00:00Z' } }
  await mkdir(join(뿌리, 'media', '쓴것', 'A'), { recursive: true })
  await writeFile(join(뿌리, 'media', '쓴것', 'A', '재구성.json'), JSON.stringify(글A, null, 2))
  await mkdir(join(뿌리, 'media', '쓴것', 'B'), { recursive: true })
  await writeFile(join(뿌리, 'media', '쓴것', 'B', '재구성.json'), JSON.stringify(글B, null, 2))
  await mkdir(join(뿌리, 'media', '쓴것', 'C'), { recursive: true })
  await writeFile(join(뿌리, 'media', '쓴것', 'C', '재구성.json'), JSON.stringify(글C, null, 2))

  const 가짜실행 = async () => ({ stdout: '', stderr: '' })
  const 결과 = await 옮기기('example.cook', { 뿌리, 런치폴더, 실행: 가짜실행, 마른판: false, 지금: new Date('2026-08-28T17:21:00') })
  assert.ok(결과.옮긴.some((m) => m.방법 === '글계정고치기'), '옮긴 목록에 글기록 항목이 찍혀야 한다')

  const 새A = JSON.parse(await readFile(join(뿌리, 'media', 'example.cook', '쓴것', 'A', '재구성.json'), 'utf8'))
  assert.equal(새A.발행.계정, 'example.cook')
  assert.equal(새A.본문, 'A 본문', '본문 등 다른 칸은 안 바뀌어야 한다')
  assert.deepEqual(새A.발행.답글번호들, [], '발행 안의 다른 칸도 안 바뀌어야 한다')

  const 새B = JSON.parse(await readFile(join(뿌리, 'media', 'example.cook', '쓴것', 'B', '재구성.json'), 'utf8'))
  assert.deepEqual(새B, 글B, '발행 없는 초안은 그대로여야 한다')

  const 새C = JSON.parse(await readFile(join(뿌리, 'media', 'example.cook', '쓴것', 'C', '재구성.json'), 'utf8'))
  assert.equal(새C.발행.계정, 'other', '남의 계정 글은 안 바뀌어야 한다')

  // ── 되돌리기 ──
  const 되돌린것 = await 되돌리기(결과.백업폴더, { 뿌리, 런치폴더, 실행: 가짜실행 })
  assert.deepEqual(되돌린것.글기록경고, [])

  const 되돌아온A = JSON.parse(await readFile(join(뿌리, 'media', '쓴것', 'A', '재구성.json'), 'utf8'))
  assert.equal(되돌아온A.발행.계정, '', '되돌리기 뒤 발행.계정 이 다시 "" 여야 한다')
  assert.equal(되돌아온A.본문, 'A 본문')

  const 되돌아온C = JSON.parse(await readFile(join(뿌리, 'media', '쓴것', 'C', '재구성.json'), 'utf8'))
  assert.equal(되돌아온C.발행.계정, 'other', '남의 계정 글은 되돌리기에서도 안 바뀐다')
})

// ─── --글계정고치기 갈래 — 이미 옮겨진 데이터를 나중에 손으로 메꾼다 ─────

test('글계정고치기 — 마른 판은 아무것도 안 바꾸고 개수만 센다', async (t) => {
  const 뿌리 = await mkdtemp(join(tmpdir(), '첫계정이름-글계정고치기-'))
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  const 글A = { 본문: 'A', 발행: { 계정: '', 본문번호: 'n1' } }
  const 글B = { 본문: 'B', 발행: { 계정: 'example.cook', 본문번호: 'n2' } } // 이미 옮겨진 것 — 안 바뀌어야
  await mkdir(join(뿌리, 'media', 'example.cook', '쓴것', 'A'), { recursive: true })
  await writeFile(join(뿌리, 'media', 'example.cook', '쓴것', 'A', '재구성.json'), JSON.stringify(글A, null, 2))
  await mkdir(join(뿌리, 'media', 'example.cook', '쓴것', 'B'), { recursive: true })
  await writeFile(join(뿌리, 'media', 'example.cook', '쓴것', 'B', '재구성.json'), JSON.stringify(글B, null, 2))

  const 결과 = await 글계정고치기('example.cook', { 뿌리 })
  assert.deepEqual(결과.고칠것, ['A'])

  const 그대로A = JSON.parse(await readFile(join(뿌리, 'media', 'example.cook', '쓴것', 'A', '재구성.json'), 'utf8'))
  assert.equal(그대로A.발행.계정, '', '마른 판이니 파일은 안 바뀌어야 한다')
})

test('글계정고치기 --실행 은 발행.계정 "" 인 것만 고친다', async (t) => {
  const 뿌리 = await mkdtemp(join(tmpdir(), '첫계정이름-글계정고치기-'))
  t.after(() => rm(뿌리, { recursive: true, force: true }))

  const 글A = { 본문: 'A', 발행: { 계정: '', 본문번호: 'n1' } }
  const 글B = { 본문: 'B', 발행: { 계정: 'example.cook', 본문번호: 'n2' } }
  await mkdir(join(뿌리, 'media', 'example.cook', '쓴것', 'A'), { recursive: true })
  await writeFile(join(뿌리, 'media', 'example.cook', '쓴것', 'A', '재구성.json'), JSON.stringify(글A, null, 2))
  await mkdir(join(뿌리, 'media', 'example.cook', '쓴것', 'B'), { recursive: true })
  await writeFile(join(뿌리, 'media', 'example.cook', '쓴것', 'B', '재구성.json'), JSON.stringify(글B, null, 2))

  const 결과 = await 글계정고치기('example.cook', { 뿌리, 마른판: false })
  assert.deepEqual(결과.고칠것, ['A'])

  const 새A = JSON.parse(await readFile(join(뿌리, 'media', 'example.cook', '쓴것', 'A', '재구성.json'), 'utf8'))
  assert.equal(새A.발행.계정, 'example.cook')
  const 새B = JSON.parse(await readFile(join(뿌리, 'media', 'example.cook', '쓴것', 'B', '재구성.json'), 'utf8'))
  assert.deepEqual(새B, 글B, '이미 옮겨진 글은 그대로여야 한다')
})
