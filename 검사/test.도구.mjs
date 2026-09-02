// 도구가 「돌긴 도는가」만 잰다 — node 검사/test.도구.mjs
//
// ⚠️ 2026-09-01 에 도구를 도구/ 로 옮기면서 세션 시작 훅이 **아무 말 없이 죽었다.**
//    cd "$(dirname "$0")" 가 뿌리가 아니라 도구/ 를 가리켜 docs 를 못 찾았는데,
//    오류도 안 내고 1줄만 뱉었다. 그때 ./검사.sh 는 25개 초록이었다.
//    무엇을 하는지까지는 안 본다. **도는지만** 본다 — 그것만으로 이 종류의 사고가 다 걸린다.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, access, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
const 실행 = promisify(execFile)

const 도구들 = ['세션부팅.sh', '화면다시짓기.sh', '문서점검.mjs', '문구뽑기.mjs',
  '미디어치우기.mjs', '계정환경점검.mjs', '장부가르기.mjs', '첫계정이름붙이기.mjs', '공개판올리기.mjs']

{
  for (const f of 도구들) await access(`도구/${f}`)
  console.log(`도구 ${도구들.length}개가 도구/ 에 다 있다 ✓`)
}

{
  // 셸 도구는 저장소 뿌리를 잡아야 한다. 도구/ 를 잡으면 docs·계정을 못 찾는다
  for (const f of 도구들.filter((f) => f.endsWith('.sh'))) {
    const 글 = await readFile(`도구/${f}`, 'utf8')
    const 줄 = 글.split('\n').find((l) => /dirname/.test(l) && !l.trimStart().startsWith('#'))
    assert.ok(줄, `${f} 가 제 자리를 안 잡는다`)
    assert.match(줄, /dirname[^)]*\)"?\/\.\./,
      `${f} 는 도구/ 안에 있으니 dirname 뒤에 /.. 를 붙여 뿌리로 올라가야 한다 — ${줄.trim()}`)
  }
  console.log('셸 도구가 저장소 뿌리를 잡는다 ✓')
}

{
  // 세션 시작 훅. 죽으면 새 세션이 지난 기록도 교훈도 못 받는데 아무도 모른다
  const { stdout } = await 실행('bash', ['도구/세션부팅.sh'])
  const 줄수 = stdout.trim().split('\n').length
  assert.ok(줄수 > 5, `세션부팅이 ${줄수}줄만 뱉는다 — 뿌리를 못 잡았을 때 이렇게 된다`)
  assert.match(stdout, /교훈 색인/, '교훈 색인이 안 실린다')
  assert.match(stdout, /docs\/세션\//, '최근 세션 파일을 못 찾는다')
  console.log(`세션부팅이 ${줄수}줄을 내놓는다 ✓`)
}

{
  await 실행('node', ['도구/문서점검.mjs'])       // 종료코드 0 이 아니면 던진다
  await 실행('node', ['도구/장부가르기.mjs'])      // 마른 판. 아무것도 안 바꾼다
  await 실행('node', ['도구/미디어치우기.mjs'])    // 마른 판. --실행 을 안 주면 안 지운다
  console.log('마른 판으로 도는 도구 셋이 종료코드 0 이다 ✓')
}

{
  // 2026-09-01 — 단추(.command)를 단추/ 로, 돌기 넷을 src/ 로 옮겼다.
  // 단추는 사용자가 파인더에서 더블클릭하는 것이라 깨져도 아무 기록이 안 남는다
  const 단추들 = await readdir('단추')
  assert.equal(단추들.filter((f) => f.endsWith('.command')).length, 4, '단추가 넷이 아니다')
  for (const f of 단추들.filter((f) => f.endsWith('.command'))) {
    const 글 = await readFile(`단추/${f}`, 'utf8')
    const 줄 = 글.split('\n').find((l) => /dirname/.test(l) && !l.trimStart().startsWith('#'))
    assert.match(줄 ?? '', /dirname[^)]*\)"?\/\.\./,
      `${f} 는 단추/ 안에 있으니 dirname 뒤에 /.. 를 붙여 뿌리로 올라가야 한다`)
  }
  console.log('단추 넷이 저장소 뿌리를 잡는다 ✓')
}

{
  // 예약 스크립트와 단추가 부르는 것이 실제로 그 자리에 있는지 — 없으면 그 예약이 조용히 죽는다.
  //
  // ⚠️ 정규식으로 경로 「일부」를 뽑으면 안 된다. JS 의 \w 는 한글을 안 세어서
  //    '../src/점검돌기.mjs' 에서 '검돌기.mjs' 만 뽑히는 일이 실제로 있었다.
  //    그래서 **공백으로 끊은 토큰을 통째로** 쓴다 — 자르지 않으니 흘릴 것도 없다
  const 부르는것 = []
  const 볼파일 = [...(await readdir('.')).filter((f) => f.endsWith('.sh')),
    ...(await readdir('단추')).map((f) => `단추/${f}`)]
  for (const f of 볼파일) {
    for (let 줄 of (await readFile(f, 'utf8')).split('\n')) {
      if (줄.trimStart().startsWith('#')) continue     // 주석은 설명이지 실행이 아니다
      줄 = 줄.replaceAll('"$HOME_DIR/', ' ').replaceAll('$HOME_DIR/', ' ')
      for (const 조각 of 줄.split(/[\s"'`()]+/)) {
        const 길 = 조각.replace(/^\.\//, '')
        if (!길.endsWith('.mjs') || 길.includes('*')) continue
        if (/dashboard|node_modules/.test(길)) continue
        부르는것.push([f, 길])
      }
    }
  }
  // ⚠️ 뽑기만 하고 **재지 않으면** 무엇을 넣어도 초록이다. 실제로 그 상태로 한 판 돌았다
  assert.ok(부르는것.length >= 10, `예약이 부르는 것이 ${부르는것.length}곳뿐이다 — 뽑기가 헛돈다`)
  for (const [어디, 길] of 부르는것) {
    await access(길).catch(() => { throw new Error(`${어디} 가 없는 ${길} 을 부른다`) })
  }
  console.log(`예약·단추가 부르는 몸통 ${부르는것.length}곳이 다 있다 ✓`)
}

{
  // 몸통이 그 자리에 있는 것만으로는 모자라다 — 그것이 부르는 것도 있어야 한다.
  // 감시돌기·팔로잉풀기돌기는 어느 검사도 import 하지 않아, 그 안이 깨져도 26개가 초록이었다
  const 몸통들 = (await readdir('src')).filter((f) => f.endsWith('돌기.mjs')).map((f) => `src/${f}`)
  assert.ok(몸통들.length >= 6, `src/ 의 돌기가 ${몸통들.length}개뿐이다`)
  let 잰수 = 0
  for (const p of 몸통들) {
    const 글 = await readFile(p, 'utf8')
    for (const m of 글.matchAll(/(?:from|import\s*\()\s*['`](\.[^'`$]+)['`]/g)) {
      const 대상 = join('src', m[1])
      await access(대상).catch(() => { throw new Error(`${p} 가 없는 ${m[1]} 을 부른다`) })
      잰수 += 1
    }
  }
  console.log(`돌기 ${몸통들.length}개가 부르는 모듈 ${잰수}곳이 다 있다 ✓`)
}

{
  // ⚠️ 대시보드는 **빌드된 것**을 낸다 (대시보드서버.mjs 의 dev:false).
  //    route.ts 를 고쳐도 다시 짓지 않으면 사용자 화면은 옛 코드 그대로다.
  //    2026-09-01 에 실제로 그랬다 — history 를 고쳤는데 화면은 옛 값을 보였다.
  //    「다시 지어야 한다」를 사람이 기억하지 말고 검사가 말하게 한다
  const 빌드 = await stat('dashboard/.next/BUILD_ID').catch(() => null)
  if (!빌드) {
    console.log('대시보드를 아직 안 지었다 — 건너뛴다')
  } else {
    const 늦은것 = []
    const 훑기 = async (곳) => {
      for (const d of await readdir(곳, { withFileTypes: true })) {
        if (d.name === 'node_modules' || d.name === '.next') continue
        const 길 = join(곳, d.name)
        if (d.isDirectory()) await 훑기(길)
        else if (/\.(ts|tsx|css)$/.test(d.name) && (await stat(길)).mtimeMs > 빌드.mtimeMs) 늦은것.push(길)
      }
    }
    await 훑기('dashboard')
    assert.deepEqual(늦은것, [],
      `빌드보다 새 파일이 있다 — 지금 도는 화면은 옛 코드다. \`bash 도구/화면다시짓기.sh\` 를 돌려라`)
    console.log('대시보드 빌드가 소스보다 새것이다 ✓')
  }
}

console.log('\n전부 통과 ✓')
