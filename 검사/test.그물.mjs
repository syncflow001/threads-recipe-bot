// 밖으로 나가는 요청이 IPv6 로 헛디디지 않는가 — node 검사/test.그물.mjs
// 2026-08-31. 이것 때문에 텔레그램 알림이 몇 주째 한 통도 안 나갔다
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { getDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'
import { 붙는시간문턱 } from '../src/그물.mjs'

{ // 불러 쓰기만 하면 문턱이 올라간다
  assert.equal(getDefaultAutoSelectFamilyAttemptTimeout(), 붙는시간문턱)
  assert.ok(붙는시간문턱 >= 500,
    'Node 기본이 250ms 인데 이 맥의 IPv4 연결이 251ms 다 — 넉넉히 잡지 않으면 또 헛디딘다')
}

{ // ⚠️ **밖으로 나가는 모듈은 전부 이것을 불러야 한다.** 하나만 빠져도 그 길만 조용히 죽는다.
  // 새 모듈이 fetch 를 쓰기 시작하면 여기서 잡힌다
  const 봐줄것 = new Set(['그물.mjs'])
  const 빠진것 = []
  for (const 이름 of await readdir('src')) {
    if (!이름.endsWith('.mjs') || 봐줄것.has(이름)) continue
    const 글 = await readFile('src/' + 이름, 'utf8')
    // 제 손으로 fetch 를 부르는 곳만 본다. `가져오기 = fetch` 처럼 기본값으로 받는 것도 포함이다
    if (!/\bfetch\s*\(|=\s*fetch\b/.test(글)) continue
    if (!글.includes("'./그물.mjs'")) 빠진것.push(이름)
  }
  assert.deepEqual(빠진것, [],
    '밖으로 나가는데 그물.mjs 를 안 부른다 — 느린 날 IPv6 로 헛디뎌 그 길만 조용히 죽는다: ' + 빠진것.join(', '))
}

console.log('통과 — 그물 검사 2묶음')
