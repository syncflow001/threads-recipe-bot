// 한 파일에 여덟 계정이 들어 있던 장부를 계정별 파일로 가르는 도구 검사 — node --test test.장부가르기.mjs
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, readdir, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const 새방 = () => mkdtemp(join(tmpdir(), '가르기-'))
const 읽기 = (p) => readFile(p, 'utf8').then(JSON.parse)
const 있나 = (p) => access(p).then(() => true).catch(() => false)

async function 옛방(뿌리) {
  await writeFile(join(뿌리, '팔로워장부.json'), JSON.stringify({
    '': [{ 날: '2026-08-20', 수: 100 }],
    'sample.unni': [{ 날: '2026-08-20', 수: 8 }, { 날: '2026-08-21', 수: 12 }],
  }))
  await writeFile(join(뿌리, '도달기준선.json'), JSON.stringify({
    'example.cook': { 기준선: 3422, 표본: 7 },
  }))
  await writeFile(join(뿌리, '점검상태.json'), JSON.stringify({
    _전체: [{ 열쇠: 'x', 무엇: '헬스체크 꺼짐' }],
    'sample.unni': [{ 열쇠: 'y', 무엇: '판 실패' }],
  }))
  await writeFile(join(뿌리, '도달이력.jsonl'),
    '{"날짜":"2026-08-29","계정":"example.cook","비율":1}\n'
    + '{"날짜":"2026-08-29","계정":"sample.unni","비율":789}\n')
  await writeFile(join(뿌리, '팔로우장부.json'), JSON.stringify([
    { who: 'a', 때: '2026-08-24T01:31:00.000Z' },
    { who: 'b', 때: '2026-08-24T01:33:00.000Z' },
  ]))
  // 막힌 글 — 계정 칸이 있는 것과 없는 옛 것
  for (const [code, 계정] of [['AAA', 'example.cook'], ['OLD', null]]) {
    const 곳 = join(뿌리, 'media', '막힌것', code)
    await mkdir(곳, { recursive: true })
    await writeFile(join(곳, '재구성.json'), JSON.stringify({ 본문: code }))
    await writeFile(join(곳, '까닭.json'),
      JSON.stringify(계정 === null ? { 때: 'x', 까닭: [] } : { 때: 'x', 까닭: [], 계정 }))
  }
}

test('마른 판은 아무것도 안 바꾸고 무엇을 옮길지만 센다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const { 가르기 } = await import('./도구.장부가르기.mjs')

  const 잰것 = await 가르기({ 뿌리 })
  assert.ok(잰것.할것.length >= 6, '옮길 것을 찾는다')
  assert.equal(잰것.실행, false)

  assert.ok(await 있나(join(뿌리, '팔로워장부.json')), '마른 판은 옛 파일을 그대로 둔다')
  assert.equal(await 있나(join(뿌리, '팔로워장부.main.json')), false, '마른 판은 새 파일을 안 만든다')
  const 백업들 = (await readdir(뿌리)).filter((f) => f.startsWith('첫계정백업'))
  assert.equal(백업들.length, 0, '마른 판은 백업도 안 만든다')
})

test('키로 나뉜 장부가 계정별 파일이 된다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const { 가르기 } = await import('./도구.장부가르기.mjs')
  await 가르기({ 뿌리, 실행: true })

  // 이름 없는 첫 계정은 main 이다 — 활동장부.main.jsonl 과 같은 규칙
  assert.deepEqual(await 읽기(join(뿌리, '팔로워장부.main.json')), [{ 날: '2026-08-20', 수: 100 }])
  assert.equal((await 읽기(join(뿌리, '팔로워장부.sample.unni.json'))).length, 2)
  assert.equal((await 읽기(join(뿌리, '도달기준선.example.cook.json'))).기준선, 3422)

  // 전체자리도 제 파일을 갖는다
  assert.equal((await 읽기(join(뿌리, '점검상태._전체.json')))[0].무엇, '헬스체크 꺼짐')
  assert.equal((await 읽기(join(뿌리, '점검상태.sample.unni.json')))[0].무엇, '판 실패')
})

test('줄로 쌓인 이력은 줄의 계정 칸을 보고 가른다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const { 가르기 } = await import('./도구.장부가르기.mjs')
  await 가르기({ 뿌리, 실행: true })

  const 하나 = await readFile(join(뿌리, '도달이력.example.cook.jsonl'), 'utf8')
  assert.equal(하나.trim().split('\n').length, 1)
  assert.equal(JSON.parse(하나.trim()).비율, 1)
  assert.equal(JSON.parse((await readFile(join(뿌리, '도달이력.sample.unni.jsonl'), 'utf8')).trim()).비율, 789)
})

test('막힌 글은 계정 폴더로 가고, 주인 모르는 것은 따로 간다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const { 가르기 } = await import('./도구.장부가르기.mjs')
  await 가르기({ 뿌리, 실행: true })

  assert.ok(await 있나(join(뿌리, 'media', 'example.cook', '막힌것', 'AAA', '까닭.json')))
  assert.ok(await 있나(join(뿌리, 'media', '막힌것.주인모름', 'OLD', '까닭.json')))
  assert.equal(await 있나(join(뿌리, 'media', 'example.cook', '막힌것', 'OLD')), false,
    '주인 모르는 글이 남의 계정 폴더에 들어가면 안 된다')

  // 팔로우장부의 계정 칸 없는 줄도 주인모름으로 간다
  assert.equal((await 읽기(join(뿌리, '팔로우장부.주인모름.json'))).length, 2)
})

test('옛 파일은 지우지 않고 백업으로 옮긴다 — 되돌릴 수 있어야 한다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const { 가르기 } = await import('./도구.장부가르기.mjs')
  const r = await 가르기({ 뿌리, 실행: true })

  assert.ok(r.백업폴더, '어디에 남겼는지 알려 준다')
  assert.ok(await 있나(join(r.백업폴더, '팔로워장부.json')), '옛 파일이 백업에 그대로 있다')
  assert.equal(await 있나(join(뿌리, '팔로워장부.json')), false, '뿌리에서는 치운다 — 둘이 남으면 헷갈린다')

  // 백업본으로 되돌릴 수 있다
  const 되돌린것 = await 읽기(join(r.백업폴더, '팔로워장부.json'))
  assert.equal(되돌린것['sample.unni'].length, 2)
})

test('자료를 하나도 안 잃는다 — 옛 줄 수와 새 줄 수가 같다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const 옛것 = await 읽기(join(뿌리, '팔로워장부.json'))
  const 옛줄수 = Object.values(옛것).reduce((합, v) => 합 + v.length, 0)

  const { 가르기 } = await import('./도구.장부가르기.mjs')
  await 가르기({ 뿌리, 실행: true })

  const 새줄수 = (await 읽기(join(뿌리, '팔로워장부.main.json'))).length
    + (await 읽기(join(뿌리, '팔로워장부.sample.unni.json'))).length
  assert.equal(새줄수, 옛줄수, '줄이 하나도 안 사라진다')
})

test('두 번 돌려도 안 터진다 — 옮길 것이 없으면 없다고 말한다', async () => {
  const 뿌리 = await 새방()
  await 옛방(뿌리)
  const { 가르기 } = await import('./도구.장부가르기.mjs')
  await 가르기({ 뿌리, 실행: true })
  const 두번째 = await 가르기({ 뿌리, 실행: true })
  assert.equal(두번째.할것.length, 0)
  assert.equal(두번째.백업폴더, null, '옮길 것이 없으면 빈 백업 폴더를 안 만든다')
})
