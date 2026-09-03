import assert from 'node:assert/strict'
import { 자동배정, 겹치나, 기본간격분, 간격다듬기, 간격읽기, 간격쓰기, 간격파일 } from '../src/시각배정.mjs'

assert.equal(겹치나({시:8,분:2}, [{시:8,분:4}]), true)      // 2분 차 → 겹침
assert.equal(겹치나({시:8,분:2}, [{시:8,분:21}]), true)     // 19분 차 → 아직 겹침
assert.equal(겹치나({시:8,분:2}, [{시:8,분:22}]), false)    // 20분 차 → 됨
// ⚠️ **1분씩 훑어 가장 빠른 자리를 잡는다** (2026-09-03 에 사용자가 정했다).
// 전에는 3분씩 건너뛰어 23분이면 되는 자리를 24분으로 밀었다
const r = 자동배정({ 남들: [{ 계정:'a', 칸들:[{시:8,분:0},{시:8,분:3}] }, { 계정:'b', 칸들:[{시:12,분:2}] }] })
assert.deepEqual(r.칸들, [{시:8,분:23},{시:12,분:22},{시:16,분:0},{시:20,분:0}])
assert.deepEqual(r.밀림, [])
// 한 시가 꽉 차면(0~59 모두 20분 안) 다음 시로 민다
const 꽉 = { 계정:'x', 칸들: Array.from({length:20},(_,i)=>({시:8,분:i*3})) }
const r2 = 자동배정({ 남들:[꽉], 시들:[8] })
assert.deepEqual(r2.칸들, [{시:9,분:17}]); assert.deepEqual(r2.밀림, [{바란시:8, 시:9}])
// 이미 고른 시는 유지하고 분만 새로 고른다
assert.deepEqual(자동배정({ 남들:[], 이미:[{시:7,분:30}] }).칸들, [{시:7,분:0}])

// ── 간격을 사용자가 정한다 (2026-09-03)
// 1분이면 바로 옆 분도 된다 — 20분 규칙에 걸리던 자리가 열린다
assert.equal(겹치나({시:8,분:2}, [{시:8,분:3}], 1), false, '1분 간격이면 1분 차도 안 겹친다')
assert.equal(겹치나({시:8,분:2}, [{시:8,분:2}], 1), true, '같은 분은 어떤 간격이든 겹친다')
assert.equal(겹치나({시:8,분:2}, [{시:8,분:50}], 59), true, '59분 간격이면 48분 차도 겹친다')
const 남하나 = [{ 계정:'a', 칸들:[{시:9,분:0}] }]
assert.deepEqual(자동배정({ 남들: 남하나, 시들:[9], 간격: 1 }).칸들, [{시:9,분:1}], '1분이면 바로 다음 분')
assert.deepEqual(자동배정({ 남들: 남하나, 시들:[9], 간격: 7 }).칸들, [{시:9,분:7}], '7분이면 7분 뒤')
assert.deepEqual(자동배정({ 남들: 남하나, 시들:[9], 간격: 45 }).칸들, [{시:9,분:45}], '45분이면 45분 뒤')
// 그 시에 자리가 없으면 다음 시로 민다 — 간격이 커도 규칙은 같다
const r3 = 자동배정({ 남들: [{ 계정:'a', 칸들:[{시:9,분:30}] }], 시들:[9], 간격: 59 })
assert.deepEqual(r3.칸들, [{시:10,분:29}]); assert.deepEqual(r3.밀림, [{바란시:9, 시:10}])
// 간격을 안 주면 예전 그대로 20분이다 — 안 고친 부르는 쪽이 있어도 안 바뀐다
assert.equal(기본간격분, 20)
assert.deepEqual(자동배정({ 남들: 남하나, 시들:[9] }).칸들, [{시:9,분:20}])

// ── 다듬기 — 화면이 1~59만 주지만 밖에서 이상한 값이 와도 **막지 않고** 끌어당긴다.
// 여기서 던지면 발행 배정이 통째로 선다
assert.equal(간격다듬기(1), 1)
assert.equal(간격다듬기(59), 59)
assert.equal(간격다듬기(0), 1)
assert.equal(간격다듬기(-5), 1)
assert.equal(간격다듬기(60), 59)
assert.equal(간격다듬기(999), 59)
assert.equal(간격다듬기('30'), 30)
assert.equal(간격다듬기(30.4), 30)
assert.equal(간격다듬기('아무말'), 기본간격분)
assert.equal(간격다듬기(null), 기본간격분)
assert.equal(간격다듬기(undefined), 기본간격분)

// ── 파일로 오간다. ⚠️ **임시 폴더에서만 쓴다** — 검사가 실서버 자료를 쓰면 안 된다
{
  const { mkdtemp } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const 방 = await mkdtemp(join(tmpdir(), '발행간격-'))
  assert.equal(await 간격읽기(방), 기본간격분, '파일이 없으면 바탕값이다')
  assert.equal(await 간격쓰기(37, 방), 37)
  assert.equal(await 간격읽기(방), 37, '쓴 값을 그대로 읽는다')
  assert.equal(await 간격쓰기(0, 방), 1, '쓸 때도 다듬는다')
  assert.equal(await 간격읽기(방), 1)
  assert.match(간격파일('/어디'), /발행간격\.json$/)
}
console.log('시각배정 ✓ (간격 설정 검사 30개 포함)')
