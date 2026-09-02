import assert from 'node:assert/strict'
import { 자동배정, 겹치나 } from '../src/시각배정.mjs'

assert.equal(겹치나({시:8,분:2}, [{시:8,분:4}]), true)      // 2분 차 → 겹침
assert.equal(겹치나({시:8,분:2}, [{시:8,분:21}]), true)     // 19분 차 → 아직 겹침
assert.equal(겹치나({시:8,분:2}, [{시:8,분:22}]), false)    // 20분 차 → 됨
const r = 자동배정({ 남들: [{ 계정:'a', 칸들:[{시:8,분:0},{시:8,분:3}] }, { 계정:'b', 칸들:[{시:12,분:2}] }] })
assert.deepEqual(r.칸들, [{시:8,분:24},{시:12,분:24},{시:16,분:0},{시:20,분:0}])
assert.deepEqual(r.밀림, [])
// 한 시가 꽉 차면(0~57 모두 20분 안) 다음 시로 민다
const 꽉 = { 계정:'x', 칸들: Array.from({length:20},(_,i)=>({시:8,분:i*3})) }
const r2 = 자동배정({ 남들:[꽉], 시들:[8] })
assert.deepEqual(r2.칸들, [{시:9,분:18}]); assert.deepEqual(r2.밀림, [{바란시:8, 시:9}])
// 이미 고른 시는 유지하고 분만 새로 고른다
assert.deepEqual(자동배정({ 남들:[], 이미:[{시:7,분:30}] }).칸들, [{시:7,분:0}])
console.log('시각배정 ✓')
