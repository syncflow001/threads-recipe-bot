// 읽기용 쿠키 빌리기 — 제 계정으로 못 읽으면 다른 계정 로그인을 빌린다 (읽기만)
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { 읽혔나, 빌릴쿠키들, 읽어채우기, 표본수 } from '../src/읽기쿠키.mjs'

// ── 읽혔나 — 조회수든 글타래든 하나라도 건졌으면 읽힌 것이다
assert.equal(읽혔나([{ 조회수: null, 글타래: [] }]), false)
assert.equal(읽혔나([{ 조회수: 0, 글타래: [] }]), true, '조회수 0 도 읽은 것이다 — null 과 다르다')
assert.equal(읽혔나([{ 조회수: null, 글타래: ['재료…'] }]), true, '레시피 답글만 와도 읽힌 것이다')
assert.equal(읽혔나([{ 조회수: null, 글타래: [] }, { 조회수: 12 }]), true)
assert.equal(읽혔나([]), false)
assert.equal(읽혔나(null), false)

// ── 빌릴 쿠키 목록 — 나는 빼고, 쿠키 있는 계정만
{
  const 것들 = await 빌릴쿠키들('나', {
    목록: async () => ['나', '가', '나쁨', '다'],
    열쇠읽기: async (n) => ({ 나: 'A', 가: 'B', 다: 'D' })[n],
  })
  assert.deepEqual(것들, [{ 계정: '가', cookie: 'B' }, { 계정: '다', cookie: 'D' }],
    '나는 빼고, 쿠키 없는 계정도 뺀다')
}

// ── 제 쿠키로 읽히면 안 빌린다
{
  let 부른횟수 = 0
  const 글 = [{ code: 'a' }, { code: 'b' }]
  const r = await 읽어채우기(글, {
    계정: '나', cookie: '내것', 빌릴것: [{ 계정: '남', cookie: '남것' }],
    채우기: async (목록, o) => { 부른횟수 += 1; return 목록.map((p) => Object.assign(p, { 조회수: o.cookie === '내것' ? 500 : null })) },
  })
  assert.equal(r.빌린계정, null, '제 쿠키로 읽히면 남의 것을 안 건드린다')
  assert.equal(r.cookie, '내것')
  assert.equal(부른횟수, 1, '읽혔으면 문서를 더 받지 않는다')
}

// ── 못 읽으면 빌리고, **빌린 쿠키로 전부 다시 채운다**
{
  const 간쿠키 = []
  const 글 = [{ code: 'a' }, { code: 'b' }, { code: 'c' }, { code: 'd' }]
  let 알린말 = ''
  const r = await 읽어채우기(글, {
    계정: '나', cookie: '못읽는것', 알림: (m) => { 알린말 = m },
    빌릴것: [{ 계정: '죽은이', cookie: '이것도못읽음' }, { 계정: '산이', cookie: '읽히는것' }],
    채우기: async (목록, o) => {
      간쿠키.push(o.cookie)
      return 목록.map((p) => Object.assign(p, { 조회수: o.cookie === '읽히는것' ? 700 : null, 글타래: [] }))
    },
  })
  assert.equal(r.빌린계정, '산이', '읽히는 계정을 찾아 빌린다')
  assert.equal(r.cookie, '읽히는것')
  assert.match(알린말, /@산이/, '누구 것을 빌렸는지 말한다 — 숨기면 안 된다')
  assert.match(알린말, /읽기만/, '읽기만 한다는 것을 말한다')
  assert.equal(간쿠키[간쿠키.length - 1], '읽히는것', '마지막에 빌린 쿠키로 전부 다시 채운다')
  assert.ok(글.every((p) => p.조회수 === 700), '네 편이 모두 빌린 쿠키 값으로 채워져야 한다')
}

// ── 아무 계정으로도 못 읽으면 제 쿠키 그대로 둔다. 지어내지 않는다
{
  const r = await 읽어채우기([{ code: 'a' }], {
    계정: '나', cookie: '내것', 빌릴것: [{ 계정: '남', cookie: '남것' }],
    채우기: async (목록) => 목록.map((p) => Object.assign(p, { 조회수: null, 글타래: [] })),
  })
  assert.equal(r.빌린계정, null)
  assert.equal(r.cookie, '내것')
}

// ── 원래 조회수도 답글도 없는 글이면 헛디딤이 스스로 바로잡힌다 (빌리지 않는다)
{
  const r = await 읽어채우기([{ code: 'a' }, { code: 'b' }], {
    계정: '나', cookie: '멀쩡한것', 빌릴것: [{ 계정: '남', cookie: '남것' }],
    채우기: async (목록) => 목록.map((p) => Object.assign(p, { 조회수: null, 글타래: [] })),
  })
  assert.equal(r.빌린계정, null, '남의 쿠키로도 비면 안 빌린다')
}

assert.equal(표본수, 3, '한 편만 보고 판단하면 안 된다')

// ── ⛔ **빌린 쿠키가 쓰는 길로 새면 안 된다.** 발행·답글·팔로우·하트는 제 계정 것이어야 한다
{
  const 실행기 = await readFile('./run.mjs', 'utf8')
  assert.match(실행기, /읽기쿠키/, '실행기가 읽기용 쿠키를 갈라 써야 한다')
  // 브라우저로 답글 다는 자리에는 **원래 쿠키**가 가야 한다
  assert.match(실행기, /답글통로, 쿠키: cookie,/,
    '답글을 빌린 쿠키로 달면 남의 계정으로 나간다 — 여기는 반드시 제 쿠키다')
  assert.ok(!/쿠키: 읽기쿠키/.test(실행기),
    '읽기용 쿠키가 브라우저·발행 쪽으로 넘어갔다')
  assert.match(실행기, /홈에서걷기\(\{ 쿠키: cookie/,
    '홈 걷기는 제 계정으로 로그인해야 한다 — 남의 홈을 길들이면 안 된다')
}

console.log('통과 — 읽기용 쿠키 빌리기 검사 21개')
