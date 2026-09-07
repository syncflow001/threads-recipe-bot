// 눈점검 검사 — 「조회수는 읽는데 답글을 못 읽는 눈」을 따로 가려내는가
//
// 2026-09-05 에 아홉 계정이 하루 5편에서 1~3편으로 떨어졌다. 걷은 글 47개 중 47개가
// 「레시피 없음」으로 걸렸는데 헬스체크는 초록불이었다 — 「쿠키 주인이 누구냐」만 물었기 때문이다.
// 여기서 지키는 것은 하나다. **조회수가 읽힌다고 눈이 멀쩡한 것이 아니다.**
import assert from 'node:assert/strict'
import { 판정, 눈재기, 한판 } from '../src/눈점검.mjs'

// 스레드에 안 물어본다. 눈마다 「어느 글의 답글을 보는가」를 표로 정해 주고 그대로 답하게 한다
const 가짜상세 = (표) => async (작성자, code, { cookie }) => {
  const 눈 = 표[cookie]
  if (!눈) throw new Error(`모르는 쿠키: ${cookie}`)
  return { 조회수: 눈.조회수 ? 100 : null, 글타래: Array.from({ length: 눈.답글[code] ?? 0 }, () => ({ 본문: 'x' })) }
}

{ // ① 세 갈래를 가른다 — 「반쯤」이 따로 있어야 이 도구가 쓸모 있다
  assert.equal(판정({ 조회수본것: 3, 글타래본것: 2 }, 3).갈래, '멀쩡')
  assert.equal(판정({ 조회수본것: 3, 글타래본것: 0 }, 3).갈래, '반쯤',
    '조회수만 읽히는 눈을 「멀쩡」으로 보면 이 도구가 있을 까닭이 없다')
  assert.equal(판정({ 조회수본것: 0, 글타래본것: 0 }, 3).갈래, '끊김')
  // 기준글이 없으면 아무 말도 하지 않는다. 없는 잣대로 빨간불을 주면 사람을 헛되이 부른다
  assert.equal(판정({ 조회수본것: 0, 글타래본것: 0 }, 0).갈래, '못잼')
  console.log('세 갈래를 가른다 ✓')
}

{ // ② 「반쯤」은 옛 물러서기(읽기쿠키.mjs)가 못 잡는 자리다 — 그쪽 잣대와 나란히 둔다
  const { 읽혔나 } = await import('../src/읽기쿠키.mjs')
  const 반쯤본것 = [{ 조회수: 100, 글타래: [] }, { 조회수: 200, 글타래: [] }]
  assert.equal(읽혔나(반쯤본것), true, '옛 잣대는 이것을 「읽혔다」로 본다 — 그래서 안 물러섰다')
  assert.equal(판정({ 조회수본것: 2, 글타래본것: 0 }, 2).갈래, '반쯤', '새 잣대는 이것을 잡아야 한다')
  console.log('옛 잣대가 놓치는 자리를 새 잣대가 잡는다 ✓')
}

{ // ③ 눈재기 — 답글을 본 글만 센다
  const 상세 = 가짜상세({ 좋은눈: { 조회수: true, 답글: { A: 2, B: 1, C: 0 } } })
  const r = await 눈재기('좋은눈', [{ 작성자: 'u', code: 'A' }, { 작성자: 'u', code: 'B' }, { 작성자: 'u', code: 'C' }], { 상세 })
  assert.equal(r.조회수본것, 3)
  assert.equal(r.글타래본것, 2, '답글이 원래 없는 글(C)까지 세면 안 된다')
  console.log('눈재기가 답글 본 것만 센다 ✓')
}

// 한판을 부르는 데 필요한 것들 — 계정 목록·열쇠·주소를 전부 가짜로 준다
const 판돌리기 = (표, 글목록) => 한판({
  계정들: Object.keys(표),
  열쇠읽기: async (계정, 키) => (키 === 'THREADS_COOKIE' ? 계정 : 'x'),
  주소들: async (계정) => (계정 === Object.keys(표)[0] ? 글목록 : []),
  상세: 가짜상세(표),
})

{ // ④ **답글이 원래 없는 글은 기준글에서 뺀다.** 안 그러면 멀쩡한 눈까지 빨갛게 물든다
  const 글목록 = [{ 작성자: 'u', code: 'A' }, { 작성자: 'u', code: '답글없음' }]
  const { 기준글, 결과 } = await 판돌리기({
    좋은눈: { 조회수: true, 답글: { A: 1 } },
    또좋은눈: { 조회수: true, 답글: { A: 2 } },
  }, 글목록)
  assert.deepEqual(기준글.map((g) => g.code), ['A'],
    '아무 눈도 답글을 못 본 글은 기준글이 될 수 없다 — 그 글로 재면 다 빨간불이다')
  assert.ok(결과.every((r) => r.갈래 === '멀쩡'), '둘 다 멀쩡한데 빨간불이 떴다')
  console.log('답글 없는 글을 기준글에서 뺀다 ✓')
}

{ // ⑤ 이 도구의 본론 — 같은 글을 두 눈으로 읽어 「반쯤」을 집어낸다 (2026-09-05 에 실제로 본 그림)
  const 글목록 = [{ 작성자: 'u', code: 'A' }, { 작성자: 'u', code: 'B' }]
  const { 기준글, 결과 } = await 판돌리기({
    성한눈: { 조회수: true, 답글: { A: 2, B: 1 } },
    반쯤눈: { 조회수: true, 답글: {} },          // 조회수는 읽는데 답글이 0
    끊긴눈: { 조회수: false, 답글: {} },
  }, 글목록)
  assert.equal(기준글.length, 2)
  const 봄 = Object.fromEntries(결과.map((r) => [r.계정, r]))
  assert.equal(봄.성한눈.갈래, '멀쩡')
  assert.equal(봄.반쯤눈.갈래, '반쯤', '조회수만 읽히는 눈을 못 집어냈다 — 이것이 판마다 0편의 원인이었다')
  assert.equal(봄.반쯤눈.조회수본것, 2, '반쯤 죽은 눈도 조회수는 읽는다 — 그래서 아무 감시도 안 울렸다')
  assert.equal(봄.끊긴눈.갈래, '끊김')
  console.log('같은 글을 두 눈으로 읽어 「반쯤」을 집어낸다 ✓')
}

{ // ⑥ 쿠키가 아직 없는 계정은 「없음」이지 「끊김」이 아니다 — 사람에게 시킬 일이 다르다
  const { 결과 } = await 한판({
    계정들: ['빈계정'],
    열쇠읽기: async () => null,
    주소들: async () => [],
    상세: async () => { throw new Error('부르면 안 된다') },
  })
  assert.equal(결과[0].갈래, '없음')
  console.log('쿠키가 없는 계정을 따로 부른다 ✓')
}

{ // ⑦ 「다시 로그인해도 안 고쳐진다」 표시 — 세우고·읽고·지운다
  //   2026-09-06 에 사용자가 두 계정을 **새로 로그인**했는데 그대로였다.
  //   새 쿠키로 받은 상세 문서가 BarcelonaFeedColumnRoute(검색엔진용 껍데기)로 왔다 —
  //   멀쩡한 계정은 BarcelonaPostColumnRoute 다. 쿠키가 아니라 계정에 걸린 것이다
  const { mkdtemp, writeFile, mkdir } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { tmpdir } = await import('node:os')
  const { 막혔다표시, 막힘풀기, 막힌계정들, 막힘칸 } = await import('../src/눈점검.mjs')
  const 방 = await mkdtemp(join(tmpdir(), '막힘-'))
  await mkdir(join(방, '계정', 'jp'), { recursive: true })
  await writeFile(join(방, '계정', 'jp', '열쇠.env'), 'THREADS_COOKIE=x\n')
  await writeFile(join(방, '계정정보.json'), JSON.stringify({ jp: { 아이디: 'jp' } }))

  assert.deepEqual(await 막힌계정들(방), {}, '아무 표시도 없어야 시작이다')
  await 막혔다표시('jp', { 뿌리: 방, 오늘: new Date('2026-09-06T12:00:00Z') })
  assert.deepEqual(await 막힌계정들(방), { jp: '2026-09-06' }, '언제부터인지 남겨야 한다')

  // 다시 읽히면 지운다. 남겨 두면 **진짜 고장이 났을 때 그것까지 가린다**
  assert.equal(await 막힘풀기('jp', { 뿌리: 방 }), true)
  assert.deepEqual(await 막힌계정들(방), {}, '풀었는데 표시가 남았다')
  assert.equal(await 막힘풀기('jp', { 뿌리: 방 }), false, '없는 것을 풀었다고 하면 안 된다')

  // 칸 이름을 바꾸면 헬스체크가 못 읽는다 — 이름을 못 박아 둔다
  assert.equal(막힘칸, '상세막힘')
  await (await import('node:fs/promises')).rm(방, { recursive: true, force: true })
  console.log('막힘 표시를 세우고 읽고 지운다 ✓')
}

{ // ⑧ **요청 모양이 판을 가른다** (2026-09-06 실측).
  //   `Sec-Fetch-Site: none`(주소창에 직접 친 것처럼) 이면 스레드가 어떤 계정에는
  //   글 상세 대신 검색엔진용 껍데기를 준다 — 조회수도 답글도 통째로 빠진다.
  //   홈에서 눌러 들어간 모양(`same-origin` + Referer)이면 제대로 온다.
  //   같은 쿠키로 헤더만 바꿔 잰 값 — 632KB·답글0 대 853KB·답글2.
  //   ⚠️ 이 두 줄을 지우면 그 계정들이 다시 조용히 0편이 된다
  const 소스 = await (await import('node:fs/promises')).readFile('src/threads.mjs', 'utf8')
  const 머리 = 소스.slice(소스.indexOf('const 문서헤더'), 소스.indexOf('const BASE'))
  assert.match(머리, /'Sec-Fetch-Site':\s*'same-origin'/,
    "Sec-Fetch-Site 가 same-origin 이 아니다 — 어떤 계정은 글 상세를 못 받는다")
  assert.match(머리, /Referer:/, 'Referer 가 없다 — 홈에서 눌러 들어간 모양이 아니다')
  assert.doesNotMatch(머리, /'Sec-Fetch-Site':\s*'none'/, '옛 값이 남아 있다')
  console.log('상세를 받는 요청 모양을 지킨다 ✓')
}

{ // ⑨ **브라우저도 같은 함정에 빠진다** (2026-09-06 실측).
  //   글 주소로 그냥 `goto` 하면 어떤 계정에는 검색엔진용 껍데기가 온다 — **답글 칸이 없다.**
  //   그래서 답글 달기가 「쿠키가 죽었다」로 끝났고, 본문만 올라가고 레시피가 안 붙었다.
  //   같은 글을 크롬으로 열어 잰 값 — 그냥 goto 답글칸 0개 · referer 를 홈으로 답글칸 1개.
  //   ⚠️ 글을 여는 자리는 **전부** `글열기()` 를 거쳐야 한다
  const { readFile } = await import('node:fs/promises')
  const 홈 = await readFile('src/홈수집.mjs', 'utf8')
  assert.match(홈, /export const 글열기 = \(쪽, 주소, opts = \{\}\) => 쪽\.goto\(/, '글열기 가 없다')
  assert.match(홈.slice(홈.indexOf('export const 글열기')), /referer: 홈주소/,
    '글열기 가 referer 를 안 붙인다 — 붙이려고 만든 함수다')

  for (const 곳 of ['src/브라우저답글.mjs', 'src/답하기.mjs', 'src/교류하기.mjs', 'src/길들이기.mjs']) {
    const 소스 = await readFile(곳, 'utf8')
    assert.match(소스, /글열기\(쪽,/, `${곳} 이 글열기 를 안 쓴다`)
    // 글 주소를 **그냥** goto 하는 자리가 남아 있으면 그 길만 조용히 껍데기를 받는다
    const 맨goto = [...소스.matchAll(/쪽\.goto\(([^\n]*)/g)].map((m) => m[1])
      .filter((v) => /post\/|주소|내글주소/.test(v))
    assert.deepEqual(맨goto, [], `${곳} 에 글열기 를 안 거치는 글 열기가 남았다: ${맨goto.join(' / ')}`)
  }
  console.log('글은 반드시 글열기로 연다 ✓')
}

console.log('통과 — 눈점검 검사 9묶음')
