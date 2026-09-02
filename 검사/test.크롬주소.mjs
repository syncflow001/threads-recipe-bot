// 본 크롬 주소 지켜보기 검사 — node 검사/test.크롬주소.mjs
import assert from 'node:assert/strict'
import { 한번찾기, 지켜보기, 포기까지 } from '../src/크롬주소.mjs'

// 가짜 osascript. 부를 때마다 미리 정한 답을 하나씩 준다
const 가짜 = (답들) => {
  const 남은 = [...답들]
  const 부른것 = []
  const 실행 = (길, 인자, 옵션, 끝나면) => {
    부른것.push(인자[1])
    const 이번 = 남은.shift()
    setImmediate(() => (이번 instanceof Error ? 끝나면(이번, '') : 끝나면(null, 이번 ?? '')))
  }
  실행.부른것 = 부른것
  return 실행
}

{ // 찾으면 주소를 준다
  const 실행 = 가짜(['https://localhost/?code=AQB1#_\n'])
  assert.equal(await 한번찾기('https://localhost/', { 실행 }), 'https://localhost/?code=AQB1#_')
}

{ // 물어봤는데 없으면 null — 못 물어본 것(false)과 다르다
  assert.equal(await 한번찾기('https://localhost/', { 실행: 가짜(['']) }), null)
  assert.equal(await 한번찾기('https://localhost/', { 실행: 가짜([new Error('시간초과')]) }), false)
}

{ // 앞머리가 다른 주소는 안 잡는다 — 남의 탭을 코드로 착각하면 안 된다
  assert.equal(await 한번찾기('https://localhost/', { 실행: 가짜(['https://threads.net/foo']) }), null)
}

{ // 없다가 나타나면 그때 잡는다
  const 실행 = 가짜(['', '', 'https://localhost/?code=Z'])
  assert.equal(await 지켜보기('https://localhost/', { 실행, 쉬기: async () => {} }), 'https://localhost/?code=Z')
}

{ // 못 물어보는 것이 이어지면 그만둔다 — 권한 창이 안 눌렸다는 뜻이다 (2026-08-30 실측 -1712)
  const 실행 = 가짜(Array.from({ length: 50 }, () => new Error('-1712')))
  const 말들 = []
  assert.equal(await 지켜보기('https://localhost/', { 실행, 쉬기: async () => {}, 알림: (m) => 말들.push(m) }), null)
  assert.equal(실행.부른것.length, 포기까지, '못 물어보면 ' + 포기까지 + '번만 해 보고 그만둔다')
  assert.ok(말들.some((m) => m.includes('손으로 붙여넣어')), '물러날 때 무엇을 하면 되는지 말해 준다')
}

{ // 한 번 못 물어봤어도 그 뒤에 되면 이어간다 — 잠깐 바쁜 것과 권한 없는 것은 다르다
  const 실행 = 가짜([new Error('바쁨'), '', 'https://localhost/?code=Q'])
  assert.equal(await 지켜보기('https://localhost/', { 실행, 쉬기: async () => {} }), 'https://localhost/?code=Q')
}

console.log('통과 — 본 크롬 주소 지켜보기 검사 8개')
