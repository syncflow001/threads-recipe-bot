// 본 크롬 쿠키 읽기가 제대로 도는지 본다 — node 검사/test.크롬쿠키.mjs
//
// ⚠️ **진짜 크롬도 키체인도 건드리지 않는다.** 가짜 쿠키 DB 를 임시 폴더에 만들어 읽는다
//    ([[검사가-실서버-장부를-쓰면-안-된다]]). 열쇠도 우리가 지어서 넘긴다.
import assert from 'node:assert/strict'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { 값풀기, 지났나, 크롬쿠키들 } from '../src/크롬쿠키.mjs'

const 열쇠 = randomBytes(16)
// 크롬이 정해 둔 모양 그대로 — 'v10' + AES-128-CBC, IV 는 공백 열여섯
const 잠그기 = (평문) => {
  const c = createCipheriv('aes-128-cbc', 열쇠, Buffer.alloc(16, 0x20))
  return Buffer.concat([Buffer.from('v10'), c.update(Buffer.from(평문)), c.final()])
}
const 지문붙여잠그기 = (값, 도메인) =>
  잠그기(Buffer.concat([createHash('sha256').update(도메인).digest(), Buffer.from(값)]))

{ // ① 지났나 — 크롬 시각은 1601년부터다. 0 은 「창 닫으면 지워지는」 쿠키라 안 따진다
  const 지금초 = Math.floor(Date.now() / 1000) + 11644473600
  assert.equal(지났나(0), false, '0 은 세션 쿠키다 — 지났다고 보면 안 된다')
  assert.equal(지났나(지금초 - 3600), true, '한 시간 전이면 지난 것이다')
  assert.equal(지났나(지금초 + 3600), false, '한 시간 뒤면 안 지났다')
  console.log('지났나 ✓')
}

{ // ② 값풀기 — 넣은 대로 나온다
  assert.equal(값풀기(잠그기('abc123'), 열쇠, '.threads.com'), 'abc123')
  assert.equal(값풀기(Buffer.alloc(0), 열쇠, '.threads.com'), '', '빈 것은 빈 것이다')
  // 옛 크롬은 안 잠그고 넣었다 — 'v10' 이 아니면 그대로 읽는다
  assert.equal(값풀기(Buffer.from('맨값'), 열쇠, '.threads.com'), '맨값')
  console.log('값풀기 ✓')
}

{ // ③ 크롬 130+ 는 평문 앞에 도메인 SHA256 32바이트를 붙인다 — 떼야 값이 맞는다
  assert.equal(값풀기(지문붙여잠그기('sess-1', '.threads.com'), 열쇠, '.threads.com'), 'sess-1')

  // ⚠️ **아무 32바이트나 떼면 안 된다.** 지문이 아닌데 떼면 진짜 값의 앞 32자가 날아간다.
  //    도메인이 안 맞으면 그대로 둔다
  const 딴지문 = 값풀기(지문붙여잠그기('sess-1', '.other.com'), 열쇠, '.threads.com')
  assert.notEqual(딴지문, 'sess-1', '딴 도메인 지문을 떼면 안 된다')
  assert.ok(딴지문.endsWith('sess-1'), '떼지 않고 통째로 돌려준다')

  // 32바이트보다 짧은 값도 안 깨진다
  assert.equal(값풀기(잠그기('짧'), 열쇠, '.threads.com'), '짧')
  console.log('도메인 지문은 맞을 때만 뗀다 ✓')
}

{ // ④ 가짜 쿠키 DB 를 통째로 읽어 본다
  const 뿌리 = await mkdtemp(join(tmpdir(), '가짜크롬-'))
  try {
    const 칸만들기 = async (이름, 줄들) => {
      await mkdir(join(뿌리, 이름), { recursive: true })
      const db = new DatabaseSync(join(뿌리, 이름, 'Cookies'))
      db.exec('CREATE TABLE cookies (host_key TEXT, name TEXT, encrypted_value BLOB, expires_utc INTEGER)')
      const 넣기 = db.prepare('INSERT INTO cookies VALUES (?, ?, ?, ?)')
      for (const [host, name, 값, 만료] of 줄들) 넣기.run(host, name, 잠그기(값), 만료)
      db.close()
    }
    const 앞선초 = (Math.floor(Date.now() / 1000) + 11644473600 + 86400) * 1000000
    const 지난초 = (Math.floor(Date.now() / 1000) + 11644473600 - 86400) * 1000000

    // ⚠️ **만료 시각이 크다.** 마이크로초 그대로는 자바스크립트가 정확히 못 담아
    //    `node:sqlite` 가 통째로 던졌다 (2026-09-08 실측). SQL 에서 초로 줄여 받는 것을 여기서 지킨다
    assert.ok(앞선초 > Number.MAX_SAFE_INTEGER, '이 검사가 뜻이 있으려면 만료 시각이 안전 범위를 넘어야 한다')

    await 칸만들기('Default', [
      ['.threads.com', 'sessionid', 'AAA', 앞선초],
      ['.threads.com', 'csrftoken', 'BBB', 앞선초],
      ['.threads.com', '옛것', 'CCC', 지난초],          // 지난 것은 뺀다
      ['.instagram.com', '딴데', 'DDD', 앞선초],        // 딴 도메인은 뺀다
    ])
    // 로그인 전(sessionid 없음)인 칸은 아예 안 돌려준다
    await 칸만들기('Profile 1', [['.threads.com', 'csrftoken', 'EEE', 앞선초]])
    // 프로필 꼴이 아닌 폴더는 안 본다
    await 칸만들기('System Profile', [['.threads.com', 'sessionid', 'FFF', 앞선초]])

    const 모음 = await 크롬쿠키들({ 뿌리, 열쇠 })
    assert.equal(모음.length, 1, 'sessionid 가 있는 칸 하나만 나와야 한다')
    assert.equal(모음[0].프로필, 'Default')
    const 이름들 = 모음[0].쿠키.split('; ').map((s) => s.split('=')[0]).sort()
    assert.deepEqual(이름들, ['csrftoken', 'sessionid'], '지난 것과 딴 도메인은 빠져야 한다')
    assert.match(모음[0].쿠키, /sessionid=AAA/)
    console.log('가짜 쿠키 DB 를 읽는다 — 만료·도메인·로그인 여부로 거른다 ✓')
  } finally {
    await rm(뿌리, { recursive: true, force: true })
  }
}

{ // ⑤ 크롬 폴더가 없으면 조용히 빈손을 주지 않고 말한다
  await assert.rejects(
    크롬쿠키들({ 뿌리: join(tmpdir(), '없는크롬-' + Date.now()), 열쇠 }),
    /크롬없음/,
    '못 읽으면 까닭을 말해야 한다 — 빈손을 주면 「로그인이 없다」로 잘못 읽힌다',
  )
  console.log('크롬 폴더가 없으면 까닭을 말한다 ✓')
}

console.log('\n전부 통과 ✓')
