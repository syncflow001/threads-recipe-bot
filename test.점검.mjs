// 점검 로그와 계정별 분리 검사 — node test.점검.mjs
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const 임시뿌리 = () => mkdtemp(join(tmpdir(), '점검검사-'))

test('막힌 글은 계정을 적고, 그 계정 것만 돌려준다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 막힌글적기, 막힌글들 } = await import('./src/관문.mjs')
  const 판정결과 = { 판정: '막음', 까닭: [{ 종류: '수량', 무엇: '2T', 설명: '원글에 없던 분량' }] }

  await 막힌글적기('AAA', { 본문: '가나다' }, 판정결과, 뿌리, 'example.cook')
  await 막힌글적기('BBB', { 본문: 'hello' }, 판정결과, 뿌리, 'sample_table')

  // 폴더가 계정별로 갈렸다 (2026-08-29). 한 계정 폴더에는 그 계정 글만 있다
  const 하나 = await 막힌글들(뿌리, 'example.cook')
  assert.equal(하나.length, 1)
  assert.equal(하나[0].code, 'AAA')
  assert.equal(하나[0].계정, 'example.cook')
  assert.deepEqual((await 막힌글들(뿌리, 'sample_table')).map((b) => b.code), ['BBB'])

  const { 미디어뿌리 } = await import('./src/계정.mjs')
  const { access } = await import('node:fs/promises')
  await access(join(뿌리, 미디어뿌리('example.cook'), '막힌것', 'AAA'))
  await assert.rejects(() => access(join(뿌리, 미디어뿌리('example.cook'), '막힌것', 'BBB')),
    '남의 계정 글은 이 계정 폴더에 없다')
})

test('계정 칸이 없는 옛 막힌 글은 계정으로 거를 때 빠진다', async () => {
  const 뿌리 = await 임시뿌리()
  const 곳 = join(뿌리, 'media', '막힌것.주인모름', 'OLD')
  await mkdir(곳, { recursive: true })
  await writeFile(join(곳, '재구성.json'), JSON.stringify({ 본문: '옛 글' }))
  await writeFile(join(곳, '까닭.json'), JSON.stringify({ 때: '2026-08-01T00:00:00Z', 판정: '막음', 까닭: [] }))

  const { 막힌글들 } = await import('./src/관문.mjs')
  assert.equal((await 막힌글들(뿌리)).length, 1, '계정을 안 주면 주인 모르는 옛 글이 나온다')
  assert.equal((await 막힌글들(뿌리, 'example.cook')).length, 0, '어느 계정 폴더에도 안 들어간다')
})

test('사진 저장 자리는 계정별 media 를 본다', async () => {
  const 뿌리 = await 임시뿌리()
  await mkdir(join(뿌리, '계정', 'example.cook', 'media'), { recursive: true })
  // 이름 있는 계정은 media/<계정>/ 이 있으면 「있습니다」여야 한다.
  // 브리프 원문은 `것들.것들.find` 였으나 진단()은 배열을 그대로 돌려준다({답,것들} 로 감싸는 건
  // 화면엔진.mjs 의 계정진단() 쪽이다) — Interfaces 절도 진단()의 반환꼴을 바꾸라 하지 않는다
  const { 진단 } = await import('./src/진단.mjs')
  const 것들 = await 진단('example.cook', { 뿌리 })
  const 사진 = 것들.find((h) => h.이름 === '사진 저장 자리')
  assert.equal(사진.됨, true, '계정/example.cook/media 가 있으므로 있습니다')

  const 없는계정 = await 진단('없는계정', { 뿌리 })
  const 사진2 = 없는계정.find((h) => h.이름 === '사진 저장 자리')
  assert.equal(사진2.됨, null, 'media/없는계정 이 없으므로 아직 없습니다')
})

test('돌려본 기록은 계정마다 따로 쌓이고, 잠금은 하나다', async () => {
  const { 상태통, 계정칸, 스크립트돌리기 } = await import('./src/화면엔진.mjs')

  // 계정칸은 없으면 만들어 준다
  const 가 = 계정칸('가계정')
  assert.deepEqual(가.기록, [])
  가.기록.push('가계정 줄\n')

  const 나 = 계정칸('나계정')
  assert.deepEqual(나.기록, [], '새 계정 칸은 비어 있다')
  assert.deepEqual(계정칸('가계정').기록, ['가계정 줄\n'], '가계정 기록은 그대로다')

  // 잠금은 하나 — 도는중이 차 있으면 어느 계정이든 거절한다
  상태통.도는중 = { 아이: null, 계정: '가계정' }
  const 답 = 스크립트돌리기('나계정', ['-e', 'null'], { 실행막기: true })
  assert.match(답.안됨, /이미 돌고 있습니다/)
  assert.match(답.안됨, /가계정/, '어느 계정이 돌고 있는지 알려 준다')
  상태통.도는중 = null
})

test('원인찾기 — 로그 표시를 사람 말로 바꾼다', async () => {
  const { 원인찾기 } = await import('./src/점검.mjs')
  assert.match(원인찾기('‼️  열쇠 파일이 없습니다: /x/.env.a'), /출입증 파일이 없습니다/)
  assert.match(원인찾기('⏸  멈춰 있습니다 — 전체 멈춤입니다'), /멈춤 스위치가 켜져 있습니다/)
  assert.match(원인찾기('⏸  이번 판은 건너뜁니다 — 마지막 발행이 30분 전입니다'), /너무 가까워/)
  assert.match(원인찾기('⏭  이번 판은 올린 글이 없습니다 — 쓸 만한 글이 없었습니다'), /쓸 만한 글이 없었습니다/)
  assert.match(원인찾기('⛔ [a] 이 계정은 아직 못 돌립니다.'), /조합이 아직 없습니다/)
  assert.match(원인찾기('‼️  스레드가 허락한 권한이 모자라 올리지 못합니다: x'), /권한이 모자랍니다/)
  // 모르는 ‼️ 줄은 그대로 옮긴다 — 「알 수 없음」으로 덮지 않는다
  assert.match(원인찾기('그냥 줄\n‼️  듣도 보도 못한 일이 났습니다'), /듣도 보도 못한 일이 났습니다/)
  // 아무 표시도 없으면
  assert.match(원인찾기(''), /아예 안 떴습니다/)
})

test('늦었나 — 간격의 배수를 넘으면 늦은 것이다', async () => {
  const { 늦었나 } = await import('./src/점검.mjs')
  const 지금 = Date.parse('2026-08-29T12:00:00Z')
  const 세시간 = 3 * 3600
  assert.equal(늦었나(지금 - 2 * 3600 * 1000, 세시간, 지금), false, '2시간 전은 안 늦었다')
  assert.equal(늦었나(지금 - 8 * 3600 * 1000, 세시간, 지금), false, '8시간(3배 미만)은 봐준다')
  assert.equal(늦었나(지금 - 10 * 3600 * 1000, 세시간, 지금), true, '10시간(3배 초과)은 늦었다')
  assert.equal(늦었나(null, 세시간, 지금), true, '한 번도 안 돌았으면 늦은 것이다')
})

test('견주기 — 열쇠로 생김과 고쳐짐을 가른다', async () => {
  const { 견주기 } = await import('./src/점검.mjs')
  const 옛 = [
    { 열쇠: 'a', 갈래: '발행', 무엇: '가', 처음본때: '2026-08-29T00:00:00.000Z' },
    { 열쇠: 'b', 갈래: '열쇠', 무엇: '나', 처음본때: '2026-08-29T00:00:00.000Z' },
  ]
  const 새 = [
    { 열쇠: 'a', 갈래: '발행', 무엇: '가' },
    { 열쇠: 'c', 갈래: '예약살았나', 무엇: '다' },
  ]
  const { 생김, 고쳐짐 } = 견주기(옛, 새)
  assert.deepEqual(생김.map((x) => x.열쇠), ['c'])
  assert.deepEqual(고쳐짐.map((x) => x.열쇠), ['b'])
  const 그대로 = 새.find((x) => x.열쇠 === 'a')
  assert.equal(그대로.처음본때, '2026-08-29T00:00:00.000Z', '이어지는 문제는 처음본때를 물려받는다')
})

test('계정점검 — 예약이 파일은 있는데 안 올라가 있으면 이상이다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(런치폴더, 'com.threads.auto.가.plist'), '<plist/>')
  await writeFile(join(런치폴더, 'com.threads.score.가.plist'), '<plist/>')

  // launchctl print 가 auto 만 0, score 는 1 로 끝난다고 흉내낸다
  const 실행 = async (cmd, args) => {
    if (String(args?.[0]) === 'print' && String(args?.[1]).includes('auto.가')) return { stdout: '', stderr: '' }
    const e = new Error('없음'); e.code = 1; throw e
  }
  const { 계정점검 } = await import('./src/점검.mjs')
  const 문제들 = await 계정점검('가', { 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정정보: {} })

  const 예약 = 문제들.filter((x) => x.갈래 === '예약살았나')
  assert.equal(예약.length, 1, 'score 하나만 안 올라가 있다')
  assert.match(예약[0].무엇, /score/)
  assert.equal(예약[0].심각도, '높음')
})

test('계정점검 — 있어야 할 자동화가 빠지면 이상이다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 계정점검 } = await import('./src/점검.mjs')
  const 문제들 = await 계정점검('가', { 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정정보: {} })
  const 빠짐 = 문제들.filter((x) => x.갈래 === '있어야할것').map((x) => x.무엇).join(' ')
  assert.match(빠짐, /자동발행/)
  assert.match(빠짐, /성적/)
  assert.doesNotMatch(빠짐, /길들이기/, '길들이기는 켜야 한다고 안 한다 (사용자 결정)')
})

test('계정점검 — 길들이기는 켜져 있는데 안 돌 때만 이상이다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(런치폴더, 'com.threads.tame.가.plist'), '<plist/>')
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 계정점검 } = await import('./src/점검.mjs')

  // 길들이기 로그가 아예 없다 = 한 번도 안 돌았다 = 늦었다
  const 문제들 = await 계정점검('가', { 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정정보: {} })
  assert.ok(문제들.some((x) => x.갈래 === '켜뒀는데안돎' && /길들이기/.test(x.무엇)))
})

test('계정점검 — 검사에서 실행을 안 넘기면 던진다 (진짜 launchctl 방지)', async () => {
  const 뿌리 = await 임시뿌리()
  const { 계정점검 } = await import('./src/점검.mjs')
  await assert.rejects(
    () => 계정점검('가', { 뿌리, 지금: Date.now(), 런치폴더: join(뿌리, 'launchd테스트') }),
    /실행 을 넘기세요/,
  )
})

test('계정점검 — 첫 계정 성적 로그는 성적-YYYY-MM.log 다 (더블 대시 아님)', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(런치폴더, 'com.threads.score.main.plist'), '<plist/>')
  const 지금 = Date.now()
  const d = new Date(지금)
  const YYYYMM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  // 첫 계정(계정='')은 접두어 없이 성적-YYYY-MM.log 다. 방금 만들어졌으니 안 늦었다
  await writeFile(join(뿌리, 'logs', `성적-${YYYYMM}.log`), '방금 만들어짐')
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 계정점검 } = await import('./src/점검.mjs')
  const 문제들 = await 계정점검('', { 뿌리, 지금, 실행, 런치폴더, 계정정보: {} })
  assert.ok(!문제들.some((x) => x.갈래 === '마지막으로돈때'), '방금 만든 로그를 더블 대시 경로로 못 찾아 헛알람 내면 안 된다')
})

test('계정점검 — 성적 예약 자체가 없으면 있어야할것 만 뜨고 마지막으로돈때 는 안 뜬다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  // 성적 plist 는 아예 안 만든다 — 「한 번도 설치 안 함」 상태
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 계정점검 } = await import('./src/점검.mjs')
  const 문제들 = await 계정점검('가', { 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정정보: {} })
  assert.ok(문제들.some((x) => x.갈래 === '있어야할것' && /성적/.test(x.무엇)), '있어야할것은 뜬다')
  assert.ok(!문제들.some((x) => x.갈래 === '마지막으로돈때'), '설치 안 한 것을 돌다 늦어짐으로 잘못 말하면 안 된다')
})

test('전체점검 — 헬스체크·알리미 plist 가 없으면 이상이고 열쇠가 전체: 로 시작한다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 전체점검 } = await import('./src/점검.mjs')
  const 문제들 = await 전체점검({ 뿌리, 지금: Date.now(), 실행, 런치폴더 })
  const 있어야할것 = 문제들.filter((x) => x.갈래 === '있어야할것')
  assert.ok(있어야할것.some((x) => /헬스체크/.test(x.무엇)))
  assert.ok(있어야할것.some((x) => /조회수알리미/.test(x.무엇)))
  assert.ok(문제들.length > 0 && 문제들.every((x) => x.열쇠.startsWith('전체:')))
})

test('계정점검 — 발행 예정 시각이 지났는데 기록이 없으면 이상이다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 지금 = Date.now()
  const d = new Date(지금)
  const YYYYMM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  await writeFile(join(런치폴더, 'com.threads.auto.가.plist'), '<plist/>')
  await writeFile(join(뿌리, 'logs', `가-${YYYYMM}.log`), '') // 예정은 있는데 그 판의 흔적이 없다
  const 실행 = async (cmd, args) => {
    if (cmd === 'plutil') return { stdout: JSON.stringify({ StartCalendarInterval: [{ Hour: 0, Minute: 1 }] }) }
    return { stdout: '', stderr: '' }
  }
  const { 계정점검 } = await import('./src/점검.mjs')
  const 문제들 = await 계정점검('가', { 뿌리, 지금, 실행, 런치폴더, 계정정보: {} })
  assert.ok(문제들.some((x) => x.갈래 === '발행'), '00:01 판은 언제 돌려도 이미 지났으니 기록없음이면 이상이다')
})

test('계정점검 — 헬스체크결과.json 의 탈에 이 계정이 있으면 열쇠 이상이다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true })
  await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(뿌리, '헬스체크결과.json'), JSON.stringify({
    때: '', 계정수: 1, 잰것: ['가'], 탈: ['가 — 쿠키가 죽었습니다'],
  }))
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 계정점검 } = await import('./src/점검.mjs')
  const 문제들 = await 계정점검('가', { 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정정보: {} })
  assert.ok(문제들.some((x) => x.갈래 === '열쇠' && /쿠키가 죽었습니다/.test(x.무엇)))
})

test('자르기 — 오래된 것과 넘치는 것을 버린다', async () => {
  const { 자르기 } = await import('./src/점검기록.mjs')
  const 지금 = Date.parse('2026-09-30T00:00:00Z')
  const 줄들 = [
    { 때: '2026-08-01T00:00:00.000Z', 무엇: '아주 옛것' },   // 60일 전
    { 때: '2026-09-20T00:00:00.000Z', 무엇: '최근' },        // 10일 전
  ]
  const 남은것 = 자르기(줄들, 지금, 500, 30)
  assert.equal(남은것.length, 1)
  assert.equal(남은것[0].무엇, '최근')

  const 많이 = Array.from({ length: 600 }, (_, i) => ({ 때: '2026-09-25T00:00:00.000Z', 무엇: `줄${i}` }))
  assert.equal(자르기(많이, 지금, 500, 30).length, 500, '최대 줄 수로 자른다')
  assert.equal(자르기(많이, 지금, 500, 30)[499].무엇, '줄599', '새것을 남긴다')
})

test('기록더하기 — jsonl 에 이어붙이고 다시 읽는다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 기록더하기, 기록읽기 } = await import('./src/점검기록.mjs')
  await 기록더하기('가', [{ 때: '2026-08-29T10:00:00.000Z', 일: '생김', 갈래: '발행', 무엇: '가', 열쇠: 'k1' }], 뿌리)
  await 기록더하기('가', [{ 때: '2026-08-29T11:00:00.000Z', 일: '고쳐짐', 갈래: '발행', 무엇: '가', 열쇠: 'k1' }], 뿌리)
  const 읽은것 = await 기록읽기('가', 뿌리)
  assert.equal(읽은것.length, 2)
  assert.equal(읽은것[0].일, '고쳐짐', '최신이 먼저다')
})

test('상태읽기 — 파일이 없으면 빈 것이지 고장이 아니다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 상태읽기, 모두읽기 } = await import('./src/점검기록.mjs')
  assert.deepEqual(await 상태읽기('가', 뿌리), [], '없는 계정은 빈 줄이다')
  assert.deepEqual(await 모두읽기(['가', '나'], 뿌리), { 가: [], 나: [] })
})

test('한 판을 돌리면 생김이 적히고, 다음 판에 고쳐짐이 적힌다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 한판 } = await import('./점검돌기.mjs')
  const 보낸것 = []
  const 알림 = async (글) => { 보낸것.push(글) }

  // 첫 판 — 자동발행 plist 가 없으니 「있어야할것」 이상이 난다.
  // 전체점검(헬스체크·조회수알리미)도 이 임시 런치폴더엔 아무것도 없어 같이 이상을 낸다 —
  // 그래서 첫 판은 계정 한 통 + 전체 한 통, 모두 두 통이다
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })
  await 한판({ 뿌리, 계정들: ['가'], 지금: Date.parse('2026-08-29T10:00:00Z'), 실행, 런치폴더, 알림 })

  const { 기록읽기 } = await import('./src/점검기록.mjs')
  const 첫판 = await 기록읽기('가', 뿌리)
  assert.ok(첫판.some((x) => x.일 === '생김'), '생김이 적힌다')
  assert.equal(보낸것.length, 2, '계정 한 통 + 전체 한 통')

  // 둘째 판 — 아무것도 안 바뀌었으면 알림이 더 안 간다
  await 한판({ 뿌리, 계정들: ['가'], 지금: Date.parse('2026-08-29T10:30:00Z'), 실행, 런치폴더, 알림 })
  assert.equal(보낸것.length, 2, '상태가 그대로면 다시 안 알린다')

  // 셋째 판 — plist 를 넣어 고치면 「고쳐짐」이 적히고 알림이 한 번 더 간다 (전체는 그대로라 안 늘어난다)
  await writeFile(join(런치폴더, 'com.threads.auto.가.plist'), '<plist/>')
  await writeFile(join(런치폴더, 'com.threads.score.가.plist'), '<plist/>')
  await 한판({ 뿌리, 계정들: ['가'], 지금: Date.parse('2026-08-29T11:00:00Z'), 실행, 런치폴더, 알림 })
  const 셋째 = await 기록읽기('가', 뿌리)
  assert.ok(셋째.some((x) => x.일 === '고쳐짐'), '고쳐짐이 적힌다')
  assert.equal(보낸것.length, 3)
  assert.ok(보낸것.some((글) => /돌아왔습니다/.test(글)))
})

test('한판 — 전체점검도 상태가 바뀔 때만 기록되고 알려진다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 한판 } = await import('./점검돌기.mjs')
  const 보낸것 = []
  const 알림 = async (글) => { 보낸것.push(글) }

  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })

  // 첫 판 — 헬스체크·조회수알리미 plist 가 없으니 전체 이상이 난다
  await 한판({ 뿌리, 계정들: [], 지금: Date.parse('2026-08-29T10:00:00Z'), 실행, 런치폴더, 알림 })
  const { 기록읽기 } = await import('./src/점검기록.mjs')
  const { 전체자리 } = await import('./src/점검기록.mjs')
  const 첫판 = await 기록읽기(전체자리, 뿌리)
  assert.ok(첫판.some((x) => x.일 === '생김'), '전체 이상이 점검기록._전체.jsonl 에 생김으로 적힌다')
  assert.equal(보낸것.length, 1)

  // 둘째 판 — 아무것도 안 바뀌었으면 알림이 더 안 간다
  await 한판({ 뿌리, 계정들: [], 지금: Date.parse('2026-08-29T10:30:00Z'), 실행, 런치폴더, 알림 })
  assert.equal(보낸것.length, 1, '전체도 상태가 그대로면 다시 안 알린다')

  // 셋째 판 — 헬스체크·알리미 plist 를 넣으면 고쳐짐이 적히고 돌아왔습니다가 온다
  // 화면 스위치(간격시각표켜기)가 실제로 만드는 이름은 .main 접미가 붙은 것이다 — 옛 검사가
  // 접미 없는 이름을 심어 C1(켜도 영원히 빨간불)을 통과시켰다
  await writeFile(join(런치폴더, 'com.threads.health.main.plist'), '<plist/>')
  await writeFile(join(런치폴더, 'com.threads.viewalert.main.plist'), '<plist/>')
  await 한판({ 뿌리, 계정들: [], 지금: Date.parse('2026-08-29T11:00:00Z'), 실행, 런치폴더, 알림 })
  const 셋째 = await 기록읽기(전체자리, 뿌리)
  assert.ok(셋째.some((x) => x.일 === '고쳐짐'), '전체 고쳐짐이 적힌다')
  assert.equal(보낸것.length, 2)
  assert.match(보낸것[1], /돌아왔습니다/)
})

test('한판 — 계정 하나가 던져도 나머지 계정·전체점검·상태쓰기는 돈다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 한판 } = await import('./점검돌기.mjs')
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })

  const 보낸것 = []
  // '가' 자리를 처리할 때만 죽게 만든다 — 진짜 예외(디스크 오류·손상된 알림 등)를 흉내낸다
  const 알림 = async (글, 계정) => {
    if (계정 === '가') throw new Error('알림이 죽었다(검사)')
    보낸것.push([계정, 글])
  }

  await 한판({ 뿌리, 계정들: ['가', '나'], 지금: Date.parse('2026-08-29T10:00:00Z'), 실행, 런치폴더, 알림 })

  const { 기록읽기, 상태읽기, 전체자리 } = await import('./src/점검기록.mjs')
  assert.ok((await 기록읽기('나', 뿌리)).some((x) => x.일 === '생김'), '가 가 죽어도 나 계정 기록은 남는다')
  assert.ok((await 기록읽기(전체자리, 뿌리)).some((x) => x.일 === '생김'), '전체점검 결과도 남는다')

  // 자리마다 제 파일이다 (2026-08-29) — 한 자리가 죽어도 그 파일만 안 바뀐다
  const { 상태길 } = await import('./src/점검기록.mjs')
  const { access } = await import('node:fs/promises')
  assert.ok((await 상태읽기('나', 뿌리)).length, '나 계정 파일이 쓰였다')
  assert.ok((await 상태읽기(전체자리, 뿌리)).length, '전체 자리 파일도 쓰였다')
  await assert.rejects(() => access(상태길('가', 뿌리)),
    '죽은 가 자리는 파일을 아예 안 만든다 — 다음 판이 다시 잰다')
})

test('기록읽기·기록더하기 — 깨진 줄이 섞여도 성한 줄만 읽고 이어쓴다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 기록길, 기록읽기, 기록더하기 } = await import('./src/점검기록.mjs')
  const 줄1 = JSON.stringify({ 때: '2026-08-29T09:00:00.000Z', 일: '생김', 갈래: '발행', 무엇: '가', 열쇠: 'a' })
  const 줄2 = JSON.stringify({ 때: '2026-08-29T09:10:00.000Z', 일: '생김', 갈래: '발행', 무엇: '나', 열쇠: 'b' })
  await mkdir(join(뿌리, '계정', '가'), { recursive: true })
  await writeFile(기록길('가', 뿌리), `${줄1}\n{깨진 줄\n${줄2}\n`)

  const 읽은것 = await 기록읽기('가', 뿌리)
  assert.equal(읽은것.length, 2, '깨진 줄은 버리고 성한 둘만 읽는다')

  await assert.doesNotReject(() => 기록더하기('가', [
    { 때: '2026-08-29T09:20:00.000Z', 일: '고쳐짐', 갈래: '발행', 무엇: '다', 열쇠: 'c' },
  ], 뿌리), '깨진 줄이 섞여 있어도 기록더하기 가 안 던진다')

  const 다시읽은것 = await 기록읽기('가', 뿌리)
  assert.equal(다시읽은것.length, 3, '깨진 줄을 걸러내고 새 줄을 이어붙인다')
})

// ─── 과제 6 — 화면엔진 점검문제들·점검이력 ────────────────────────────
test('점검문제들 — 그 계정 것과 전체 것을 함께 준다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 상태쓰기 } = await import('./src/점검기록.mjs')
  const { 전체자리 } = await import('./src/점검기록.mjs')
  await 상태쓰기('가', [{ 열쇠: 'a', 갈래: '발행', 무엇: '가 문제', 심각도: '높음' }], 뿌리)
  await 상태쓰기('나', [{ 열쇠: 'b', 갈래: '발행', 무엇: '나 문제', 심각도: '높음' }], 뿌리)
  await 상태쓰기(전체자리,
    [{ 열쇠: '전체:c', 갈래: '있어야할것', 무엇: '헬스체크가 꺼져 있습니다', 심각도: '높음' }], 뿌리)
  const { 점검문제들 } = await import('./src/화면엔진.mjs')
  const 것들 = await 점검문제들('가', 뿌리)
  const 무엇들 = 것들.map((x) => x.무엇).join(' ')
  assert.match(무엇들, /가 문제/)
  assert.match(무엇들, /헬스체크가 꺼져 있습니다/, '전체 문제는 모든 계정에 보인다')
  assert.doesNotMatch(무엇들, /나 문제/, '남의 계정 문제는 안 보인다')
})

test('점검문제들 — 상태 파일이 없으면 빈 배열', async () => {
  const 뿌리 = await 임시뿌리()
  const { 점검문제들 } = await import('./src/화면엔진.mjs')
  assert.deepEqual(await 점검문제들('가', 뿌리), [])
})

test('점검이력 — 최신순 200줄, 그 계정 기록만 준다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 기록더하기 } = await import('./src/점검기록.mjs')
  await 기록더하기('가', [
    { 때: '2026-08-29T09:00:00.000Z', 일: '생김', 갈래: '발행', 무엇: '가 옛것', 심각도: '보통', 열쇠: 'a' },
    { 때: '2026-08-29T10:00:00.000Z', 일: '생김', 갈래: '발행', 무엇: '가 새것', 심각도: '보통', 열쇠: 'a' },
  ], 뿌리)
  await 기록더하기('나', [
    { 때: '2026-08-29T09:30:00.000Z', 일: '생김', 갈래: '발행', 무엇: '나 것', 심각도: '보통', 열쇠: 'b' },
  ], 뿌리)

  const { 점검이력 } = await import('./src/화면엔진.mjs')
  const 것들 = await 점검이력('가', 뿌리)
  assert.equal(것들.length, 2)
  assert.equal(것들[0].무엇, '가 새것', '최신순 — 새것이 먼저')
  assert.equal(것들[1].무엇, '가 옛것')
})

// ─── 2026-08-29 최종 검토 반영 검사 ───────────────────────────────────
// ⚠️ 이 검사들은 전부 mkdtemp 임시 폴더 + 가짜 실행 에서만 논다.
// 진짜 ~/Library/LaunchAgents · 진짜 launchctl · 진짜 텔레그램을 절대 안 부른다

test('C1 — 화면 스위치가 붙이는 이름(.main 접미)을 점검이 찾아낸다', async () => {
  // ⚠️ 여기 이름을 손으로 적으면 C1 이 또 샌다. 화면 쪽 원본(src/대시보드.mjs)에서 규칙을 뽑아 견준다
  const 대시보드글 = await readFile('./src/대시보드.mjs', 'utf8')
  assert.ok(
    대시보드글.includes("`${꼴.라벨앞}.${계정 || 'main'}`"),
    '간격시각표켜기 의 라벨 규칙이 바뀌었다 — src/점검.mjs 의 라벨후보 도 같이 봐야 한다',
  )
  const 라벨앞 = (이름) => 대시보드글.match(new RegExp(`const ${이름} = \\{[^}]*라벨앞: '([^']+)'`))[1]
  const 헬스라벨 = `${라벨앞('헬스꼴')}.main`
  const 알리미라벨 = `${라벨앞('알리미꼴')}.main`

  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  // 화면에서 켠 뒤의 모습 그대로 심는다 — 파일도 launchd 도 .main 이름만 안다
  await writeFile(join(런치폴더, `${헬스라벨}.plist`), '<plist/>')
  await writeFile(join(런치폴더, `${알리미라벨}.plist`), '<plist/>')
  const 살아있는것 = new Set([헬스라벨, 알리미라벨])
  const 실행 = async (cmd, args) => {
    if (String(args?.[0]) === 'print') {
      const 라벨 = String(args?.[1]).split('/').pop()
      if (살아있는것.has(라벨)) return { stdout: '', stderr: '' }
      const e = new Error('없음'); e.code = 1; throw e
    }
    return { stdout: '', stderr: '' }
  }
  const { 전체점검 } = await import('./src/점검.mjs')
  const 문제들 = await 전체점검({ 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정들: [] })
  const 글 = 문제들.map((x) => x.무엇).join(' ')
  assert.doesNotMatch(글, /헬스체크/, '화면에서 켰으면 헬스체크는 더 이상 문제가 아니다')
  assert.doesNotMatch(글, /조회수알리미/, '화면에서 켰으면 알리미도 더 이상 문제가 아니다')
})

test('I1 — 머리글 앞에 찍힌 ‼️ 도 원인으로 읽는다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 지금 = new Date(2026, 7, 29, 23, 0).getTime()
  const YYYYMM = '2026-08'
  await writeFile(join(런치폴더, 'com.threads.auto.가.plist'), '<plist/>')
  // 자동발행.sh:34 처럼 ═══ 머리글 **앞**에 찍힌다 — 판 조각에는 안 들어온다
  await writeFile(join(뿌리, 'logs', `가-${YYYYMM}.log`), '‼️  열쇠 파일이 없습니다: /x/.env.가\n')
  const 실행 = async (cmd) =>
    cmd === 'plutil' ? { stdout: JSON.stringify({ StartCalendarInterval: [{ Hour: 20, Minute: 2 }] }) } : { stdout: '' }
  const { 계정점검 } = await import('./src/점검.mjs')
  const 발행 = (await 계정점검('가', { 뿌리, 지금, 실행, 런치폴더 })).find((x) => x.갈래 === '발행')
  assert.ok(발행, '20:02 판이 기록없음이다')
  assert.match(발행.원인, /출입증 파일이 없습니다/, '엉뚱하게 예약·맥 잠자기를 보라고 하면 안 된다')
})

test('I5 — 그 달 로그 파일이 아예 없어도 발행을 잰다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 지금 = new Date(2026, 7, 29, 23, 0).getTime()
  await writeFile(join(런치폴더, 'com.threads.auto.가.plist'), '<plist/>')
  // 로그 파일을 아예 안 만든다 = 그 달에 한 번도 안 돌았다 = §0 이 잡겠다던 바로 그 경우다
  const 실행 = async (cmd) =>
    cmd === 'plutil' ? { stdout: JSON.stringify({ StartCalendarInterval: [{ Hour: 20, Minute: 2 }] }) } : { stdout: '' }
  const { 계정점검 } = await import('./src/점검.mjs')
  const 발행 = (await 계정점검('가', { 뿌리, 지금, 실행, 런치폴더 })).find((x) => x.갈래 === '발행')
  assert.ok(발행, '로그 파일이 없다고 조용히 넘기면 안 된다')
  assert.equal(발행.심각도, '높음')
  assert.match(발행.원인, /아예 안 떴습니다/)
})

test('I7 — 열쇠를 두 계정이 함께 쓴다는 탈줄은 전체 문제로 올라온다', async () => {
  const 뿌리 = await 임시뿌리()
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(뿌리, '헬스체크결과.json'), JSON.stringify({
    때: '', 계정수: 2, 잰것: ['가', '나'],
    탈: ['가 — 쿠키가 죽었습니다', 'THREADS_ACCESS_TOKEN 을(를) 가 · 나 가 함께 쓰고 있습니다'],
  }))
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const { 전체점검 } = await import('./src/점검.mjs')
  const 문제들 = await 전체점검({ 뿌리, 지금: Date.now(), 실행, 런치폴더, 계정들: ['가', '나'] })
  const 열쇠들 = 문제들.filter((x) => x.갈래 === '열쇠')
  assert.equal(열쇠들.length, 1, '섞임 탈줄 하나만 전체로 올라온다')
  assert.match(열쇠들[0].무엇, /함께 쓰고 있습니다/)
  assert.ok(열쇠들[0].열쇠.startsWith('전체:열쇠:'))
  assert.ok(!문제들.some((x) => /쿠키가 죽었습니다/.test(x.무엇)), '계정 이름으로 시작하는 줄은 계정점검 몫이다')
})

test('I2 — 자정을 넘겨도 어제 발행 문제로 가짜 「돌아왔습니다」가 안 온다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 한판 } = await import('./점검돌기.mjs')
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  await writeFile(join(런치폴더, 'com.threads.auto.가.plist'), '<plist/>')
  const 실행 = async (cmd) =>
    cmd === 'plutil' ? { stdout: JSON.stringify({ StartCalendarInterval: [{ Hour: 20, Minute: 2 }] }) } : { stdout: '' }
  const 보낸것 = []
  const 알림 = async (글) => { 보낸것.push(글) }

  // 8/31 23:00 — 20:02 판이 안 떴다
  await 한판({ 뿌리, 계정들: ['가'], 지금: new Date(2026, 7, 31, 23, 0).getTime(), 실행, 런치폴더, 알림 })
  assert.ok(보낸것.some((글) => /20:02 판/.test(글)), '첫 판에 발행 문제가 알려진다')
  const 첫통수 = 보낸것.length

  // 9/1 00:30 — 날짜가 바뀌어 어제 열쇠가 새 목록에서 빠진다. 안 올라간 글은 그대로다
  await 한판({ 뿌리, 계정들: ['가'], 지금: new Date(2026, 8, 1, 0, 30).getTime(), 실행, 런치폴더, 알림 })
  assert.ok(!보낸것.some((글) => /돌아왔습니다/.test(글)), '가짜 안심 알림이 오면 안 된다')
  assert.equal(보낸것.length, 첫통수, '자정만 지났다고 새 알림이 오면 안 된다')
})

test('I3 — 텔레그램으로 못 보내면 상태를 안 넘긴다 (다음 판이 다시 보낸다)', async () => {
  const 뿌리 = await 임시뿌리()
  const { 한판 } = await import('./점검돌기.mjs')
  const { 상태읽기, 전체자리 } = await import('./src/점검기록.mjs')
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })
  // 알리기 는 실패해도 안 던지고 이 꼴을 돌려준다
  let 시도 = 0
  const 알림 = async () => { 시도 += 1; return { 보냄: false, 까닭: '텔레그램 열쇠가 없다' } }

  await 한판({ 뿌리, 계정들: ['가'], 지금: Date.parse('2026-08-29T10:00:00Z'), 실행, 런치폴더, 알림 })
  const 상태 = await 상태읽기(뿌리)
  assert.equal(상태['가'], undefined, '못 보냈으면 계정 상태를 안 넘긴다')
  assert.equal(상태[전체자리], undefined, '전체 자리도 안 넘긴다')

  // 다음 판이 같은 것을 다시 잰다 — 사건이 영영 묻히면 안 된다
  await 한판({ 뿌리, 계정들: ['가'], 지금: Date.parse('2026-08-29T10:30:00Z'), 실행, 런치폴더, 알림 })
  assert.equal(시도, 4, '두 판 모두 전체·계정 두 번씩 다시 보내려 한다')
})

test('I8 — 첫 계정이 있어도 전체 자리와 안 부딪힌다 (알림 폭풍 방지)', async () => {
  const 뿌리 = await 임시뿌리()
  const { 한판 } = await import('./점검돌기.mjs')
  const 런치폴더 = join(뿌리, 'launchd테스트')
  await mkdir(런치폴더, { recursive: true }); await mkdir(join(뿌리, 'logs'), { recursive: true })
  const 실행 = async () => ({ stdout: '', stderr: '' })
  const 보낸것 = []
  const 알림 = async (글, 계정) => { 보낸것.push([계정, 글]) }

  // 계정 목록에 이름 없는 첫 계정('')이 들어온다 — 옛 꼴에서는 이 순간 30분마다 왕복 알림이 났다
  await 한판({ 뿌리, 계정들: [''], 지금: Date.parse('2026-08-29T10:00:00Z'), 실행, 런치폴더, 알림 })
  assert.equal(보낸것.length, 2, '첫 판은 전체 한 통 + 첫 계정 한 통')

  await 한판({ 뿌리, 계정들: [''], 지금: Date.parse('2026-08-29T10:30:00Z'), 실행, 런치폴더, 알림 })
  assert.equal(보낸것.length, 2, '아무것도 안 바뀌었으면 다음 판은 조용해야 한다')

  await 한판({ 뿌리, 계정들: [''], 지금: Date.parse('2026-08-29T11:00:00Z'), 실행, 런치폴더, 알림 })
  assert.equal(보낸것.length, 2, '세 판째도 조용하다 — 두 자리가 서로를 덮어쓰지 않는다')
})

test('I6 — 점검 기록 카드에 전체(계정 공통) 이력도 때 순으로 섞여 보인다', async () => {
  const 뿌리 = await 임시뿌리()
  const { 기록더하기, 전체자리 } = await import('./src/점검기록.mjs')
  await 기록더하기('가', [
    { 때: '2026-08-29T09:00:00.000Z', 일: '생김', 갈래: '발행', 무엇: '가 것', 심각도: '높음', 열쇠: 'a' },
  ], 뿌리)
  await 기록더하기(전체자리, [
    { 때: '2026-08-29T10:00:00.000Z', 일: '생김', 갈래: '있어야할것', 무엇: '헬스체크 꺼짐', 심각도: '높음', 열쇠: '전체:h' },
  ], 뿌리)

  const { 점검이력 } = await import('./src/화면엔진.mjs')
  const 것들 = await 점검이력('가', 뿌리)
  assert.equal(것들.length, 2)
  assert.equal(것들[0].무엇, '헬스체크 꺼짐', '최신순 — 전체 것이 먼저')
  assert.equal(것들[1].무엇, '가 것')
})
