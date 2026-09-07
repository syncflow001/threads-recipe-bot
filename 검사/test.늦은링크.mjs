// 늦은링크 검사 — 30시간 안에 1만 조회를 넘긴 글에만, 한 번만, 링크 답글을 다는가
//
// 2026-09-06 실측 — 발행마다 링크를 달았더니(하루 6~25편) 쿠팡 클릭이 링크 글 0편이던 때와 같았다.
// 클릭은 조회수가 만든다. 그래서 발행은 깨끗이 하고 터진 글에만 뒤늦게 단다 (사용자가 정했다).
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { 달아야하나, 답글글월, 달기, 링크꼴 } from '../src/늦은링크.mjs'

const 지금 = Date.parse('2026-09-07T12:00:00Z')
const 시간전 = (h) => new Date(지금 - h * 3600e3).toISOString()
const 글 = (덮기 = {}) => ({ 핵심재료: '생크림', 발행: { 본문번호: '1', 올린때: 시간전(5) }, ...덮기 })
const 계정정보 = { 링크넣기: true }
const 제휴팩 = { 링크만들기: async () => ({ 이름: '생크림', url: 'https://link.coupang.com/a/T' }), 대가성문구: '수수료를 받습니다' }

{ // ① 사용자가 정한 조건 — 30시간 이내 · 1만 이상. 하나라도 어긋나면 안 단다
  const 옵 = { 지금, 계정정보, 제휴팩 }
  assert.equal(달아야하나(글(), { ...옵, 조회수: 12000 }).단다, true)
  assert.equal(달아야하나(글(), { ...옵, 조회수: 9999 }).단다, false, '9,999 는 문턱 미달이다')
  assert.equal(달아야하나(글({ 발행: { 본문번호: '1', 올린때: 시간전(31) } }), { ...옵, 조회수: 50000 }).단다, false,
    '31시간 지난 글은 아무리 터져도 안 단다 — 「지금 터지는 글」만 본다')
  assert.equal(달아야하나(글({ 발행: { 본문번호: '1', 올린때: 시간전(29) } }), { ...옵, 조회수: 10000 }).단다, true,
    '29시간 · 딱 1만은 단다')
  console.log('30시간 · 1만 조건을 지킨다 ✓')
}

{ // ② 안 다는 까닭을 **말로** 돌려준다 — 조용히 안 달면 왜 안 달렸는지 아무도 모른다
  const 옵 = { 지금, 조회수: 20000, 계정정보, 제휴팩 }
  assert.match(달아야하나(글({ 발행: { 본문번호: '1', 올린때: 시간전(5), 늦은링크: { 단때: 'x' } } }), 옵).까닭, /이미 달았다/)
  assert.match(달아야하나(글(), { ...옵, 계정정보: { 링크넣기: false } }).까닭, /링크를 끈/,
    '「제휴 링크 넣기」를 끈 계정은 터져도 안 단다')
  assert.match(달아야하나(글(), { ...옵, 제휴팩: { 링크만들기: null } }).까닭, /없음/, '제휴가 없으면 못 단다')
  assert.match(달아야하나(글({ 핵심재료: '' }), 옵).까닭, /핵심재료/, '무엇을 링크할지 모르는 글')
  assert.match(달아야하나(글({ 발행: {} }), 옵).까닭, /안 올라간/)
  assert.match(달아야하나(글({ 발행: { 본문번호: '1', 올린때: 시간전(-2) } }), 옵).까닭, /올린 때/, '앞날 글은 시계가 어긋난 것')
  console.log('안 다는 까닭을 말한다 ✓')
}

{ // ③ 답글은 한 조각 — 첫 줄(언어팩) · 링크 · 대가성 문구. 상품 이름은 안 쓴다 (링크가 말한다)
  const 언어팩 = { 광고표기: '', 늦은링크말: (재료) => `${재료} 어디서 샀냐고 많이 물어보셔서 👇` }
  const 월 = 답글글월({ 핵심재료: '생크림', url: 'https://link.coupang.com/a/T', 언어팩, 제휴팩 })
  // 링크와 고지 사이에 빈 줄이 없어야 한다 — 빈 줄로 나뉘면 고지 없는 링크 조각이 생긴다
  assert.equal(월, '생크림 어디서 샀냐고 많이 물어보셔서 👇\nhttps://link.coupang.com/a/T\n수수료를 받습니다')
  // 광고 표기가 있는 언어(일본 [PR]·영어 #ad)는 맨 앞에 온다
  assert.match(답글글월({ 핵심재료: 'x', url: 'u', 언어팩: { ...언어팩, 광고표기: '[PR]' }, 제휴팩 }), /^\[PR\]\n/)
  // 언어팩에 말이 없어도 죽지 않는다
  assert.match(답글글월({ 핵심재료: '생크림', url: 'u', 언어팩: {}, 제휴팩 }), /^생크림 👇\nu/)
  assert.ok(링크꼴.test('https://link.coupang.com/a/T') && !링크꼴.test('https://www.threads.com/x'))
  console.log('답글 한 조각을 짓는다 ✓')
}

// 실제로 다는 길 — 파일·스레드·브라우저를 전부 가짜로 준다
async function 방만들기(글값) {
  const 방 = await mkdtemp(join(tmpdir(), '늦은링크-'))
  const 폴더 = join(방, '계정', 'a', 'media', '쓴것', 'C1')
  await mkdir(폴더, { recursive: true })
  await writeFile(join(폴더, '재구성.json'), JSON.stringify(글값))
  return 방
}
const 바탕 = () => ({
  열쇠읽기: async () => 'x', 글주소받기: async () => 'https://www.threads.com/@a/post/P1',
  언어팩: { 광고표기: '', 주제태그: '광고', 늦은링크말: (r) => `${r} 👇` }, 제휴팩, 지금, 조회수: 15000,
})

{ // ④ 단다 — 링크는 **이때** 만들고, 기록에 남기고, 「광고」 주제를 붙이라고 넘긴다
  const 방 = await 방만들기(글())
  const 넘긴것 = []
  const r = await 달기('a', 'C1', {
    ...바탕(), 뿌리: 방, 상세: async () => ({ 글타래: [{ 본문: '🍳 레시피만 있다' }] }),
    답글달기: async (인자) => { 넘긴것.push(인자); return { 올린조각수: 1, 주제결과: '「광고」 달았다' } },
  })
  assert.equal(r.달았다, true)
  assert.equal(넘긴것.length, 1)
  assert.equal(넘긴것[0].주제달기, '광고', '광고 표시(주제 태그)를 안 넘겼다 — 광고 표시 없는 글이 남는다')
  assert.match(넘긴것[0].조각들[0], /생크림 👇\nhttps:\/\/link\.coupang\.com\/a\/T/)
  const 남은것 = JSON.parse(await readFile(join(방, '계정', 'a', 'media', '쓴것', 'C1', '재구성.json'), 'utf8'))
  assert.equal(남은것.발행.늦은링크.조각수, 1)
  assert.ok(남은것.발행.늦은링크.단때, '언제 달았는지 안 남기면 다음 판에 또 단다')
  assert.equal(달아야하나(남은것, { 지금, 조회수: 99999, 계정정보, 제휴팩 }).단다, false, '단 뒤에는 다시 안 단다')
  console.log('터진 글에 한 번 달고 기록한다 ✓')
}

{ // ⑤ **기록이 없어도 스레드에 이미 링크가 있으면 안 단다** — 두 번 달면 손으로 지워야 한다
  const 방 = await 방만들기(글())
  let 달렸다 = false
  const r = await 달기('a', 'C1', {
    ...바탕(), 뿌리: 방,
    상세: async () => ({ 글타래: [{ 본문: '레시피' }, { 본문: '여기 👇\nhttps://link.coupang.com/a/OLD' }] }),
    답글달기: async () => { 달렸다 = true; return { 올린조각수: 1 } },
  })
  assert.equal(r.달았다, false)
  assert.equal(달렸다, false, '이미 달린 글에 또 달았다')
  const 남은것 = JSON.parse(await readFile(join(방, '계정', 'a', 'media', '쓴것', 'C1', '재구성.json'), 'utf8'))
  assert.ok(남은것.발행.늦은링크.단때, '기록을 맞춰 두지 않으면 30분마다 스레드를 또 읽는다')
  console.log('스레드에 이미 있으면 안 단다 ✓')
}

{ // ⑥ 로켓배송 상품이 없으면 **없었다고 적는다** — 안 적으면 30분마다 쿠팡을 또 두드린다
  const 방 = await 방만들기(글())
  const r = await 달기('a', 'C1', {
    ...바탕(), 뿌리: 방, 제휴팩: { ...제휴팩, 링크만들기: async () => null },
    상세: async () => ({ 글타래: [] }), 답글달기: async () => { throw new Error('오면 안 된다') },
  })
  assert.equal(r.달았다, false)
  assert.match(r.까닭, /상품이 없다/)
  const 남은것 = JSON.parse(await readFile(join(방, '계정', 'a', 'media', '쓴것', 'C1', '재구성.json'), 'utf8'))
  assert.equal(남은것.발행.늦은링크.상품없음, true)
  console.log('상품이 없으면 적어 두고 다시 안 온다 ✓')
}

{ // ⑦ 브라우저에서 죽으면 기록을 **안 남긴다** — 다음 30분에 다시 해야 한다
  const 방 = await 방만들기(글())
  await assert.rejects(() => 달기('a', 'C1', {
    ...바탕(), 뿌리: 방, 상세: async () => ({ 글타래: [] }),
    답글달기: async () => { throw new Error('답글 칸이 안 보인다') },
  }), /답글 칸/)
  const 남은것 = JSON.parse(await readFile(join(방, '계정', 'a', 'media', '쓴것', 'C1', '재구성.json'), 'utf8'))
  assert.equal(남은것.발행.늦은링크, undefined, '실패했는데 달았다고 적으면 그 글은 영영 안 달린다')
  console.log('실패하면 기록을 안 남겨 다음 판에 다시 한다 ✓')
}

{ // ⑧ **발행이 실제로 링크를 안 넣는가** — 부품만 만들고 발행을 안 고치면 광고가 두 번 붙는다
  //    ([[고쳤다고-그-글이-닿는-것은-아니다]])
  const 실행기 = await readFile('run.mjs', 'utf8')
  assert.doesNotMatch(실행기, /링크넣기\(글\.레시피/, '발행이 아직 발행 때 링크를 넣는다')
  assert.doesNotMatch(실행기, /제휴팩\.링크만들기\(/, '발행이 아직 발행 때 쿠팡 링크를 만든다')
  assert.match(실행기, /감추기: false/, '발행이 아직 재료를 감춘다 — 링크가 안 붙는데 감추면 못 만드는 레시피다')
  const 돌기 = await readFile('src/조회수알리미돌기.mjs', 'utf8')
  assert.match(돌기, /달아야하나\(/, '30분 알리미가 링크 달기를 안 부른다')
  assert.match(돌기, /await 달기\(/, '30분 알리미가 링크 달기를 안 부른다')
  const 알 = await import('../src/조회수알리미.mjs')
  assert.equal(알.설정.시간, 30, '창이 30시간이 아니다')
  assert.equal(알.설정.문턱, 10000, '문턱이 1만이 아니다')
  // 언어팩 셋이 다 첫 줄을 갖는다 — 한국어팩이 기준이다 (CLAUDE.md §3)
  for (const 언어 of ['한국어', '일본어', '영어']) {
    const 팩 = (await import(`../src/언어/${언어}.mjs`)).default
    assert.equal(typeof 팩.늦은링크말, 'function', `${언어} 팩에 늦은링크말이 없다`)
    assert.match(팩.늦은링크말('X'), /X/, `${언어} 첫 줄에 재료 이름이 안 들어간다`)
  }
  console.log('발행은 깨끗이, 달기는 알리미가 — 실제로 닿는다 ✓')
}

{ // ⑨ 알림 스위치 — 기본은 켜짐, 파일이 없어도 켜짐, 끄면 꺼진 채 남는다 (2026-09-07 사용자가 시켰다)
  const { 알림설정읽기, 알림설정쓰기, 실패인가 } = await import('../src/늦은링크.mjs')
  const 방 = await mkdtemp(join(tmpdir(), '알림설정-'))
  assert.deepEqual(await 알림설정읽기(방), { 늦은링크: true }, '파일이 없으면 켜짐이어야 한다 — 조용히 꺼지는 쪽이 더 위험하다')
  await 알림설정쓰기({ 늦은링크: false }, 방)
  assert.equal((await 알림설정읽기(방)).늦은링크, false)
  await writeFile(join(방, '알림설정.json'), '{깨진')
  assert.equal((await 알림설정읽기(방)).늦은링크, true, '깨진 파일이면 기본값으로')
  // 「실패」의 뜻 — 못 단 것은 실패, 이미 달려 있던 것은 실패가 아니다
  assert.equal(실패인가({ 달았다: false, 까닭: '"x" 는 로켓배송 상품이 없다' }), true)
  assert.equal(실패인가({ 달았다: false, 까닭: '이미 달려 있다 (기록만 맞췄다)' }), false)
  assert.equal(실패인가({ 달았다: true }), false)
  // 30분 알리미가 스위치를 읽고, 성공도 실패도 알린다
  const 돌기 = await readFile('src/조회수알리미돌기.mjs', 'utf8')
  assert.match(돌기, /알림설정읽기\(\)/, '알리미가 스위치를 안 읽는다')
  assert.match(돌기, /못 달았습니다/, '못 단 것을 알리지 않는다')
  assert.match(돌기, /알림설정\.늦은링크 \? 단것/, '성공 알림이 스위치에 안 묶였다')
  assert.match(돌기, /알림설정\.늦은링크 \? 못단것/, '실패 알림이 스위치에 안 묶였다')
  assert.doesNotMatch(돌기, /설정\.며칠/, '옛 이름(며칠)이 남아 있다 — undefined 가 기록에 적힌다')
  console.log('알림 스위치와 실패 알림 ✓')
}

console.log('통과 — 늦은링크 검사 9묶음')
