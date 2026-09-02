// 안 쓴 미디어 치우기 검사 — node 검사/test.미디어치우기.mjs
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, utimes, readdir, access, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 고르기, 치우기, 사람크기, 기본날수, 쟁인코드들 } from '../도구/미디어치우기.mjs'

const 있나 = (p) => access(p).then(() => true, () => false)
const 날전 = (n) => new Date(Date.now() - n * 86400000)

async function 방차리기() {
  const 방 = await mkdtemp(join(tmpdir(), '미디어-'))
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })
  await writeFile(join(방, '계정', 'aaa', '열쇠.env'), 'THREADS_COOKIE=x\n')
  const 만들기 = async (갈래, code, 나이일) => {
    const 곳 = join(방, '계정', 'aaa', 'media', 갈래, code)
    await mkdir(곳, { recursive: true })
    await writeFile(join(곳, '01.mp4'), 'x'.repeat(1000))
    await utimes(곳, 날전(나이일), 날전(나이일))
    return 곳
  }
  return { 방, 만들기 }
}

{ // 오래된 「받은것」만 고른다
  const { 방, 만들기 } = await 방차리기()
  await 만들기('받은것', '옛것', 10)
  await 만들기('받은것', '새것', 1)
  const 것들 = await 고르기('aaa', { 뿌리: 방, 날수: 3 })
  assert.deepEqual(것들.map((r) => r.code), ['옛것'])
  assert.ok(것들[0].크기 >= 1000, '크기를 안 잰다')
}

{ // ⚠️ **쓴것 은 절대 안 건드린다** — 중복 막기의 근거다. 지우면 같은 글이 두 번 나간다
  const { 방, 만들기 } = await 방차리기()
  const 쓴것 = await 만들기('쓴것', '옛것', 90)
  const 막힌것 = await 만들기('막힌것', '옛것', 90)
  await 만들기('받은것', '치울것', 90)
  const r = await 치우기({ 뿌리: 방, 날수: 3, 실행: true, 기록: () => {} })
  assert.equal(r.지운수, 1)
  assert.ok(await 있나(쓴것), '★쓴것을 지웠다 — 같은 글이 두 번 나간다★')
  assert.ok(await 있나(막힌것), '막힌것을 지웠다')
  assert.equal(await 있나(join(방, '계정', 'aaa', 'media', '받은것', '치울것')), false)
}

{ // 마른 판이 기본이다 — 세기만 하고 아무것도 안 지운다
  const { 방, 만들기 } = await 방차리기()
  const 곳 = await 만들기('받은것', '옛것', 90)
  const r = await 치우기({ 뿌리: 방, 날수: 3, 기록: () => {} })
  assert.equal(r.실행, false)
  assert.equal(r.지운수, 0)
  assert.ok(await 있나(곳), '마른 판인데 지웠다')
  assert.ok(r.크기 >= 1000)
}

{ // 남의 계정 폴더를 안 건드린다
  const { 방, 만들기 } = await 방차리기()
  await mkdir(join(방, '계정', 'bbb'), { recursive: true })
  await writeFile(join(방, '계정', 'bbb', '열쇠.env'), 'THREADS_COOKIE=y\n')
  const 남의것 = join(방, '계정', 'bbb', 'media', '받은것', '옛것')
  await mkdir(남의것, { recursive: true })
  await writeFile(join(남의것, '01.mp4'), 'y')
  await utimes(남의것, 날전(90), 날전(90))
  const 것들 = await 고르기('aaa', { 뿌리: 방, 날수: 3 })
  assert.deepEqual(것들.map((r) => r.code), [], 'aaa 를 고르랬는데 bbb 것을 집었다')
  assert.ok(await 있나(남의것))
}

{ // 받은것 폴더가 아예 없어도 안 터진다
  const { 방 } = await 방차리기()
  assert.deepEqual(await 고르기('aaa', { 뿌리: 방, 날수: 3 }), [])
}

{ // ⚠️ 보관함에 쟁여 둔 글의 재료는 안 지운다 (검수 지적 — 이 문에 검사가 하나도 없었다)
  const { 방, 만들기 } = await 방차리기()
  await 만들기('받은것', '쟁인것', 90)
  await 만들기('받은것', '버린것', 90)
  await writeFile(join(방, '계정', 'aaa', '보관함.json'), JSON.stringify([{ code: '쟁인것' }]))
  const 것들 = await 고르기('aaa', { 뿌리: 방, 날수: 3 })
  assert.deepEqual(것들.map((r) => r.code), ['버린것'], '쟁여 둔 글의 재료를 지울 뻔했다')
}

{ // ⚠️ 보관함이 **깨졌으면** 그 계정은 통째로 건너뛴다 — 없는 것과 깨진 것을 가른다
  const { 방, 만들기 } = await 방차리기()
  await 만들기('받은것', '옛것', 90)
  await writeFile(join(방, '계정', 'aaa', '보관함.json'), '[{"code":"쟁인것"')  // 깨진 JSON
  assert.deepEqual(await 고르기('aaa', { 뿌리: 방, 날수: 3 }), [],
    '보관함이 깨졌는데 지울 후보를 골랐다 — 쟁여 둔 재료가 날아간다')
  assert.equal(await 쟁인코드들('aaa', 방), null)

  // 파일이 아예 없는 것은 정상이다 — 그때는 지운다
  const { 방: 방2, 만들기: 만들기2 } = await 방차리기()
  await 만들기2('받은것', '옛것', 90)
  assert.equal((await 고르기('aaa', { 뿌리: 방2, 날수: 3 })).length, 1)
  assert.equal((await 쟁인코드들('aaa', 방2)).size, 0)
}

{ // 계정을 지정하면 그것만 치운다 — 마지막 판이 남의 계정 재료를 건드리면 안 된다
  const { 방, 만들기 } = await 방차리기()
  await mkdir(join(방, '계정', 'bbb'), { recursive: true })
  await writeFile(join(방, '계정', 'bbb', '열쇠.env'), 'THREADS_COOKIE=y\n')
  const 남의것 = join(방, '계정', 'bbb', 'media', '받은것', '옛것')
  await mkdir(남의것, { recursive: true })
  await writeFile(join(남의것, '01.mp4'), 'y')
  await utimes(남의것, 날전(90), 날전(90))
  await 만들기('받은것', '내것', 90)

  const r = await 치우기({ 뿌리: 방, 계정들: ['aaa'], 날수: 3, 실행: true, 기록: () => {} })
  assert.equal(r.지운수, 1)
  assert.ok(await 있나(남의것), '★남의 계정 재료를 지웠다★')
}

{ // 잣대는 **이 판이 시작한 시각**이다 — 그보다 먼저 받은 것만 치운다.
  // 판이 걸린 시간을 날수로 넘기므로, 판 도중에 받은 것은 저절로 지켜진다
  const { 방 } = await 방차리기()
  const 시간전 = async (code, 시간) => {
    const 곳 = join(방, '계정', 'aaa', 'media', '받은것', code)
    await mkdir(곳, { recursive: true })
    await writeFile(join(곳, '01.jpg'), 'x')
    const t = new Date(Date.now() - 시간 * 3600000)
    await utimes(곳, t, t)
  }
  await 시간전('어제것', 30)
  await 시간전('아침판', 12)
  await 시간전('직전판', 4)
  await 시간전('이판이받은것', 0.02)   // 1분 전 — 이 판이 받았다
  const 판걸린시간 = 0.1 / 24          // 이 판이 6분 걸렸다고 치자
  const 고른것 = (await 고르기('aaa', { 뿌리: 방, 날수: 판걸린시간 })).map((r) => r.code).sort()
  assert.deepEqual(고른것, ['아침판', '어제것', '직전판'].sort(), '이 판보다 먼저 받은 것을 다 못 치웠다')
  assert.ok(!고른것.includes('이판이받은것'), '★이 판이 방금 받은 재료를 지웠다★')
}

{ // ⚠️ run.mjs 배선 — **값까지** 잰다. 낱말만 보면 날수·계정을 바꿔도 초록이었다 (2026-08-31 검수)
  const 글 = await readFile('./run.mjs', 'utf8')
  assert.ok(/const 판시작 = Date\.now\(\)/.test(글), 'run.mjs 가 판 시작 시각을 안 잡는다')
  const 자리 = 글.indexOf('치우기, 사람크기')
  assert.ok(자리 > 0, 'run.mjs 가 치우기를 안 부른다')
  assert.ok(자리 > 글.indexOf('올림 → '), '치우기가 발행보다 먼저 온다')
  const 토막 = 글.slice(글.indexOf('판이 끝나면 이 판보다 먼저'))
  assert.ok(/try \{/.test(토막) && /catch/.test(토막), '치우기가 안 감싸여 있다 — 터지면 판이 실패로 끝난다')
  assert.ok(/계정들: \[프로필\]/.test(토막), '제 계정만 치우지 않는다')
  assert.ok(/실행: true/.test(토막), '마른 판이라 아무것도 안 치운다')
  // ⚠️ 잣대가 **판 시작 시각**이어야 한다. 상수(기본날수·마법 숫자)면 오늘 것을 못 치우거나 너무 치운다
  assert.ok(/날수: \(Date\.now\(\) - 판시작\) \/ 86400000/.test(토막),
    '잣대가 판 시작 시각이 아니다 — 상수로 두면 오늘 것을 못 치우거나 도는 판의 것을 지운다')
  assert.ok(!/마지막판인가/.test(글), '판마다 치우기로 바꿨는데 마지막 판 가리기가 남아 있다')
}

{ // 기본 날수는 넉넉하게 — 실수로 오늘 것을 지우면 안 된다
  assert.ok(기본날수 >= 7, '기본 날수가 너무 짧다')
  assert.equal(사람크기(0), '0B')
  assert.equal(사람크기(1024), '1.0KB')
  assert.equal(사람크기(805 * 1024 * 1024), '805MB')
}

console.log('통과 — 미디어 치우기 검사 11묶음')
