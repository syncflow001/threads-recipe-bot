// 대시보드서버.mjs 가 옛 서버 규칙을 지키는지, 실제로 뜨는지 본다 — node 검사/test.대시보드서버.mjs
import assert from 'node:assert/strict'
import { 묶을곳들, 막힌주소인가, 켜기, 묶기 } from '../대시보드서버.mjs'

{ // 부팅 직후 테일스케일 주소가 아직 없으면 기다렸다 다시 묶는다 (2026-09-07 재부팅 실측 — 반쪽 서버가 남았다)
  const 없는주소 = '100.64.0.1'   // 이 컴퓨터에 안 붙은 주소 → EADDRNOTAVAIL
  const 시작 = Date.now()
  await assert.rejects(묶기(() => {}, 7999, 없는주소, { 최대시도: 3, 쉬기: 20 }), (e) => e.code === 'EADDRNOTAVAIL')
  assert.ok(Date.now() - 시작 >= 40, '세 번 시도했으면 쉬기 두 번(40ms)은 지났어야 한다 — 바로 던지면 안 된다')
  // 「없는 주소」가 아닌 오류는 기다리지 않고 바로 던진다
  const 다른시작 = Date.now()
  await assert.rejects(묶기(() => {}, 7999, '999.999.999.999', { 최대시도: 3, 쉬기: 500 }))
  assert.ok(Date.now() - 다른시작 < 400, '다른 오류까지 기다리면 진짜 잘못을 5분 동안 숨긴다')
  console.log('없는 주소는 기다렸다 다시 묶고, 다른 오류는 바로 던진다 ✓')
}

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
