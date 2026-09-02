// 겹치는 글은 사진 한 장만 받고 멈추는가 — node 검사/test.미리겹침.mjs
// 2026-08-31. 판마다 마흔 편을 받는데 셋에 하나가 이미 올린 것과 겹쳤다.
// 전에는 **다 받고 나서** 버렸다 — 영상까지 받아 두고 버리던 셈이다
import assert from 'node:assert/strict'
import { mkdtemp, readdir, access, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 내려받기, 엿볼차례 } from '../src/media.mjs'

const 새방 = () => mkdtemp(join(tmpdir(), '미리겹침-'))
const 있나 = (p) => access(p).then(() => true, () => false)

// 받은 주소를 적어 두는 가짜 그물
const 가짜받기 = (적을곳) => async (url) => {
  적을곳.push(url)
  return { ok: true, arrayBuffer: async () => new TextEncoder().encode('x'.repeat(10)).buffer }
}
const 글 = {
  code: 'AAA',
  미디어: [
    { 종류: '영상', url: 'https://x/영상.mp4' },
    { 종류: '이미지', url: 'https://x/사진1.jpg' },
    { 종류: '이미지', url: 'https://x/사진2.jpg' },
  ],
}

{ // ⚠️ **사진을 먼저 받는다.** 영상은 스무 배 크다 (실측: 5.1MB 대 257KB)
  assert.deepEqual(엿볼차례(글.미디어), [1, 0, 2], '영상부터 받으면 아낄 것이 없다')
  assert.deepEqual(엿볼차례([{ 종류: '영상' }]), [0], '영상뿐이면 어쩔 수 없다')
  assert.deepEqual(엿볼차례([]), [])
}

{ // 겹치면 한 장만 받고 멈춘다 — 영상을 안 받는다
  const 방 = await 새방()
  const 받은주소 = []
  const r = await 내려받기(글, {
    뿌리: 방, fetch: 가짜받기(받은주소),
    엿보기: async () => '같은 그림을 어제 이미 올렸다 (BBB)',
  })
  assert.equal(받은주소.length, 1, `한 장만 받아야 하는데 ${받은주소.length}개를 받았다`)
  assert.match(받은주소[0], /사진1/, '영상을 받았다 — 아낄 것이 없어진다')
  assert.match(r.겹침, /같은 그림/)
  assert.match(r.건너뜀, /같은 그림/)
  assert.deepEqual(r.파일, [])
  // 받다 만 폴더는 지운다. 안 지우면 그게 다시 찌꺼기가 된다
  assert.equal(await 있나(join(방, '받은것', 'AAA')), false, '받다 만 폴더가 남았다')
}

{ // 안 겹치면 전부 받는다. 파일 이름은 **원래 차례**를 지킨다
  const 방 = await 새방()
  const 받은주소 = []
  const r = await 내려받기(글, { 뿌리: 방, fetch: 가짜받기(받은주소), 엿보기: async () => null })
  assert.equal(받은주소.length, 3)
  assert.deepEqual((await readdir(join(방, '받은것', 'AAA'))).sort(),
    ['01.mp4', '02.jpg', '03.jpg', 'post.json'],
    '받는 차례를 바꿨다고 파일 이름까지 바뀌면 안 된다 — 영상갈아끼우기가 01.mp4 를 찾는다')
  assert.equal(r.파일.length, 3)
}

{ // 엿보기를 안 주면 옛날 그대로 — 차례도 안 바꾸고 다 받는다
  const 방 = await 새방()
  const 받은주소 = []
  await 내려받기(글, { 뿌리: 방, fetch: 가짜받기(받은주소) })
  assert.deepEqual(받은주소, ['https://x/영상.mp4', 'https://x/사진1.jpg', 'https://x/사진2.jpg'])
}

{ // 엿보기가 터져도 판이 안 죽는다 — 그때는 그냥 다 받는다
  const 방 = await 새방()
  const 받은주소 = []
  const r = await 내려받기(글, {
    뿌리: 방, fetch: 가짜받기(받은주소),
    엿보기: async () => { throw new Error('지문 못 만듦') },
  })
  assert.equal(받은주소.length, 3, '엿보기가 터졌다고 글을 버리면 안 된다')
  assert.equal(r.겹침, undefined)
}

{ // 첫 장을 못 받았으면 물어보지 않는다 — 빈 폴더로 지문을 재면 헛것이 나온다
  const 방 = await 새방()
  let 물어봄 = 0
  await 내려받기(글, {
    뿌리: 방,
    fetch: async () => ({ ok: false, status: 403 }),
    엿보기: async () => { 물어봄++; return '겹침' },
  })
  assert.equal(물어봄, 0, '아무것도 못 받았는데 지문을 쟀다')
}

{ // ⚠️ 엿보기에 **폴더가 아니라 방금 받은 파일 이름**을 넘긴다.
  // 폴더를 넘기면 지난 판이 남긴 파일까지 함께 재게 되어 「한 장만 봤다」가 거짓이 되고,
  // 찌꺼기가 남았는지에 따라 판정이 달라진다 (2026-08-31 검수)
  const 방 = await 새방()
  const 본것 = []
  await 내려받기(글, {
    뿌리: 방, fetch: 가짜받기([]),
    엿보기: async (폴더, 파일이름) => { 본것.push({ 폴더, 파일이름 }); return null },
  })
  assert.equal(본것.length, 1, '한 번만 물어봐야 한다')
  assert.equal(본것[0].파일이름, '02.jpg', '방금 받은 파일 이름을 안 넘겼다')
  assert.ok(본것[0].폴더.endsWith('AAA'))
}

{ // ⚠️ **지우는 함수가 됐으니 지울 자리를 스스로 확인한다.**
  // code 가 비면 join 이 받은것 폴더 자체를 가리켜 그 계정 것이 통째로 날아간다
  const 방 = await 새방()
  for (const 나쁜 of ['', '..', '../..', 'a/b', null, undefined]) {
    const r = await 내려받기({ code: 나쁜, 미디어: 글.미디어 }, {
      뿌리: 방, fetch: 가짜받기([]), 엿보기: async () => '겹침',
    })
    assert.match(String(r.건너뜀), /이상한 글 번호/, `code 「${나쁜}」 를 그대로 받았다`)
  }
  // 멀쩡한 번호는 그대로 돈다
  const r = await 내려받기(글, { 뿌리: 방, fetch: 가짜받기([]), 엿보기: async () => null })
  assert.equal(r.파일.length, 3)
}

{ // run.mjs 가 미리 걸린 것을 다시 지문 내지 않는다 — 폴더가 없어 빈 지문이 나온다.
  // ⚠️ 낱말만 보는 검사는 「filter 를 지우고 낱말은 남기기」를 못 잡는다 (검수 지적).
  // 그래서 **미리 걸린 code 가 뒤 단계로 넘어가지 않는다**는 것을 동작으로도 잰다
  const 글자 = await readFile('./run.mjs', 'utf8')
  assert.ok(/엿보기: 미리겹침보기/.test(글자), 'run.mjs 가 엿보기를 안 넘긴다')
  const 몸통 = 글자.slice(글자.indexOf('const 받고거르기'), 글자.indexOf('const 받고거르기') + 500)
  assert.ok(/미리걸린/.test(몸통) && /목록\.filter\(/.test(몸통),
    '받고거르기가 미리 걸린 것을 안 거른다 — 빈 지문은 「안 겹침」으로 나와 이미 올린 글이 되살아난다')
  // 빈 폴더의 지문이 정말 「안 겹침」으로 나오는지 — 이 검사의 근거를 못 박는다
  const { 지문만들기 } = await import('../src/미디어지문.mjs')
  const 빈지문 = await 지문만들기('/없는/폴더')
  assert.deepEqual(빈지문, { 바이트: [], 그림: [], 소리: [] })
}

console.log('통과 — 미리 겹침 보기 검사 9묶음')
