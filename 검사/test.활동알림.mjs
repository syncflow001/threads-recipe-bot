// 활동 알림 뽑기가 표본 HTML 에서 종류·누가·때를 제대로 읽는지 — node 검사/test.활동알림.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { 알림뽑기 } from '../src/활동알림.mjs'
const html = await readFile('docs/표본/활동알림.html', 'utf8')
const 것들 = 알림뽑기(html)
assert.equal(것들.length, 4)
assert.deepEqual(것들.map((v) => v.종류), ['좋아요', '팔로우', '답글', '알림'])
assert.equal(것들[0].누가, 'user_a'); assert.equal(것들[0].몇명, 4)   // 「님 외 3명」→ 4
assert.equal(것들[0].대상코드, 'DABCxyz'); assert.equal(것들[0].대상주인, 'me')
assert.equal(것들[1].대상코드, null)                                   // 팔로우는 글이 아니다
assert.equal(것들[0].때, new Date(1787800000 * 1000).toISOString())
assert.equal(알림뽑기('<html></html>').length, 0)                       // 없으면 빈 배열, 안 던진다
console.log('활동알림 ✓')
