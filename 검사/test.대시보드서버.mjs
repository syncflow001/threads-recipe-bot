// 대시보드서버.mjs 가 옛 서버 규칙을 지키는지, 실제로 뜨는지 본다 — node 검사/test.대시보드서버.mjs
import assert from 'node:assert/strict'
import { 묶을곳들, 막힌주소인가, 켜기 } from '../대시보드서버.mjs'

assert.deepEqual(묶을곳들(''), ['127.0.0.1'])
console.log('묶을곳들(빈값) ✓')

assert.deepEqual(묶을곳들('100.64.0.1,127.0.0.1'), ['127.0.0.1', '100.64.0.1'])
console.log('묶을곳들(중복 없음) ✓')

assert.equal(막힌주소인가(['127.0.0.1', '0.0.0.0']), true)
assert.equal(막힌주소인가(['127.0.0.1']), false)
console.log('막힌주소인가 ✓')

const 포트 = 7790 + Math.floor(Math.random() * 100)
const { 서버들 } = await 켜기({ 포트, 곳들: ['127.0.0.1'], 열기: false })
try {
  const r = await fetch(`http://127.0.0.1:${포트}/api/first-run`)
  assert.ok([200, 403].includes(r.status), 'first-run 은 200 또는 403 이어야 뜬 것이다: ' + r.status)
  console.log('켜기 ✓ 상태 ' + r.status)
} finally {
  서버들.forEach((s) => s.close())
}
process.exit(0)
