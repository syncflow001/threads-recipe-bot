// 블롭 치우기 검사 — 안 치우면 1GB 한도가 차서 발행이 통째로 죽는다
//
// 2026-09-06 에 실제로 죽었다. 영상을 올리기만 하고 한 번도 안 지워서 19일치 404개가
// 1.000 GB 를 꽉 채웠고, 다섯 계정이 판마다 같은 자리에서 실패했다 —
// `Vercel Blob: Storage quota exceeded for Hobby plan (1GB maximum)`.
//
// ⚠️ 진짜 vercel CLI 를 부르지 않는다. `실행기` 를 갈아 끼워 가짜로 돈다
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { 나이시간, 지우기, 목록, 묵은것치우기, 한도찼나, 올리기 } from '../src/blob.mjs'

const 토큰 = '가짜토큰'

{ // ① 나이 읽기 — **못 읽은 것은 null 이다.** 0 으로 두면 영영 안 지우고,
  //   크게 잡으면 지금 올리는 중인 것을 지운다
  assert.equal(나이시간('19d'), 456)
  assert.equal(나이시간('15h'), 15)
  assert.equal(나이시간('30m'), 0.5)
  assert.equal(나이시간('2w'), 336)
  assert.equal(나이시간('알수없음'), null)
  assert.equal(나이시간(''), null)
  assert.equal(나이시간(undefined), null)
  console.log('나이를 시간으로 읽고, 모르면 null 이다 ✓')
}

// CLI 가 뱉는 표를 흉내 낸다 (진짜 출력에서 그대로 옮겼다 — 앞 공백과 칸 순서가 같아야 한다)
const 가짜표 = (줄들) => `Vercel CLI 59.1.3\nFetching blobs\n\n  Uploaded At     Size    Pathname   URL\n`
  + 줄들.map(([나이, 크기, 길]) => `  ${나이}             ${크기}       ${길}     https://x.public.blob.vercel-storage.com/${길}`).join('\n')

{ // ② 목록 — 표에서 나이·크기·주소를 캐낸다
  const 실행기 = async () => ({ stdout: '', stderr: 가짜표([['19d', 500, 'threads/a/01.mp4'], ['3h', 700, 'threads/b/01.mp4']]) })
  const 것들 = await 목록({ 토큰, 실행기 })
  assert.equal(것들.length, 2)
  assert.deepEqual(것들.map((b) => [b.나이, b.크기, b.시간]), [['19d', 500, 456], ['3h', 700, 3]])
  assert.ok(것들[0].url.startsWith('https://'), '주소를 못 캤다 — 지울 수가 없다')
  console.log('CLI 표에서 목록을 캔다 ✓')
}

{ // ③ **묵은 것만 지운다.** 갓 올린 것을 지우면 지금 발행 중인 판이 죽는다
  const 부른것 = []
  const 실행기 = async (명령, 인자) => {
    부른것.push(인자)
    if (인자[1] === 'list') {
      return { stdout: '', stderr: 가짜표([
        ['19d', 500, 'threads/오래된/01.mp4'],
        ['3d', 400, 'threads/사흘된/01.mp4'],
        ['3h', 700, 'threads/방금/01.mp4'],
        ['알수없음', 900, 'threads/모름/01.mp4'],
      ]) }
    }
    return { stdout: '', stderr: '' }
  }
  const r = await 묵은것치우기({ 남길시간: 48, 토큰, 실행기 })
  const 지운인자 = 부른것.find((v) => v[1] === 'del')
  assert.ok(지운인자, '지우기를 아예 안 불렀다')
  const 지운주소 = 지운인자.filter((v) => v.startsWith('https://'))
  assert.equal(지운주소.length, 2, '48시간 넘은 둘만 지워야 한다')
  assert.ok(지운주소.some((u) => u.includes('오래된')) && 지운주소.some((u) => u.includes('사흘된')))
  assert.ok(!지운주소.some((u) => u.includes('방금')), '갓 올린 것을 지우면 발행 중인 판이 죽는다')
  assert.ok(!지운주소.some((u) => u.includes('모름')), '나이를 모르는 것은 안 건드린다')
  assert.equal(r.지운수, 2)
  assert.equal(r.아낀바이트, 900)
  assert.equal(r.나이못읽음, 1)
  console.log('묵은 것만 지우고 갓 올린 것·모르는 것은 남긴다 ✓')
}

{ // ④ 못 지워도 던지지 않는다 — 치우다 실패해서 발행을 죽이면 아끼려던 것보다 큰 것을 잃는다
  const 실행기 = async () => { throw new Error('네트워크가 끊겼다') }
  const r = await 지우기(['https://x/1', 'https://x/2'], { 토큰, 실행기 })
  assert.equal(r.지운수, 0)
  assert.equal(r.안됨.length, 1, '왜 못 지웠는지는 남겨야 한다')
  console.log('못 지워도 던지지 않는다 ✓')
}

{ // ⑤ 한도가 찼으면 **스스로 치우고 한 번 더 해 본다.** 이 길이 없어서 사람이 손대기 전까지
  //   판마다 같은 자리에서 죽었다
  assert.equal(한도찼나('Vercel Blob: Storage quota exceeded for Hobby plan (1GB maximum)'), true)
  assert.equal(한도찼나('네트워크가 끊겼다'), false)

  let 올린횟수 = 0
  let 치웠나 = false
  const 실행기 = async (명령, 인자) => {
    if (인자[1] === 'put') {
      올린횟수 += 1
      if (올린횟수 === 1) throw new Error('Error: Vercel Blob: Storage quota exceeded for Hobby plan (1GB maximum)')
      return { stdout: 'https://x.public.blob.vercel-storage.com/threads/새것/01.mp4', stderr: '' }
    }
    if (인자[1] === 'list') return { stdout: '', stderr: 가짜표([['19d', 500, 'threads/오래된/01.mp4']]) }
    치웠나 = true
    return { stdout: '', stderr: '' }
  }
  const 주소 = await 올리기('01.mp4', { 토큰, 실행기 })
  assert.equal(올린횟수, 2, '한도가 찼는데 다시 안 해 봤다 — 그러면 판마다 같은 자리에서 죽는다')
  assert.equal(치웠나, true, '다시 하기 전에 치우지 않았다')
  assert.match(주소, /새것/)

  // 한도 말고 다른 까닭이면 치우지 않고 그대로 던진다. 아무 오류에나 지우면 위험하다
  const 딴오류 = async (명령, 인자) => {
    if (인자[1] === 'put') throw new Error('파일을 못 찾겠다')
    throw new Error('여기 오면 안 된다 — 한도가 아닌데 치웠다')
  }
  await assert.rejects(() => 올리기('01.mp4', { 토큰, 실행기: 딴오류 }), /파일을 못 찾겠다/)
  console.log('한도가 차면 스스로 치우고 다시 해 본다 ✓')
}

{ // ⑥ **실행기가 이것을 실제로 쓰는가.** 부품만 만들고 안 부르면 그대로 쌓인다
  //   ([[고쳤다고-그-글이-닿는-것은-아니다]])
  const 실행기소스 = await readFile('run.mjs', 'utf8')
  assert.match(실행기소스, /블롭지우기\(치울것\)/, '발행 뒤에 올린 영상 조각을 안 치운다 — 또 한도가 찬다')
  assert.match(실행기소스, /미디어\.filter\(\(m\) => m\.우리가올림\)\.map\(\(m\) => m\.url\)/,
    '우리가 올린 것만 골라 치워야 한다')
  console.log('실행기가 발행 뒤에 치운다 ✓')
}

console.log('통과 — 블롭 치우기 검사 6묶음')
