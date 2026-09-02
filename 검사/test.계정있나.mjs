// 새로 설치한 것인지(계정이 하나도 없나) 판정 검사 — node --test 검사/test.계정있나.mjs
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'; import { tmpdir } from 'node:os'
import { 계정이하나도없다 } from '../src/계정있나.mjs'

const 새방 = () => mkdtemp(join(tmpdir(), '계정있나-'))

const d = await 새방()
assert.equal(await 계정이하나도없다(d), true, '아무것도 없으면 없는 것이다')
await writeFile(join(d, '.env.example'), 'X=\n')
assert.equal(await 계정이하나도없다(d), true, '서식은 계정이 아니다')

// ⚠️ 2026-08-29 — 계정이 있다는 것은 `계정/<이름>/열쇠.env` 가 있다는 뜻이다.
// 옛 판은 뿌리의 `.env.<계정>` 만 봐서, 폴더 개편 뒤 **계정 여덟이 멀쩡한데
// 「처음 오셨네요」 마법사가 뜰 뻔했다** (검증 에이전트가 잡았다)
await mkdir(join(d, '계정', 'abc'), { recursive: true })
await writeFile(join(d, '계정', 'abc', '열쇠.env'), 'X=1\n')
assert.equal(await 계정이하나도없다(d), false, '계정 폴더에 열쇠가 있으면 있는 것이다')

// 폴더만 있고 열쇠가 없으면 아직 계정이 아니다
const f = await 새방()
await mkdir(join(f, '계정', 'bbb'), { recursive: true })
assert.equal(await 계정이하나도없다(f), true, '열쇠 없는 빈 폴더는 계정이 아니다')

// 이름 없는 첫 계정은 .env.local 에 열쇠가 있을 때만 산다
const e = await 새방()
await writeFile(join(e, '.env.local'), 'X=1\n')
assert.equal(await 계정이하나도없다(e), false)
console.log('계정있나 ✓')
