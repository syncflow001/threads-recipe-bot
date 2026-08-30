import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 원격메시지, 판번호 } from './src/제작자.mjs'

const 글 = 원격메시지({
  코드: '123456789012', 계정: 'a', 맥: 'm', 판: '1.0.0',
  때: new Date('2026-08-28T09:00:00+09:00'),
})
assert.ok(글.includes('1234 5678 9012'), '코드가 4-4-4 로 안 띄어 있다')
assert.ok(글.includes('a'), '계정이 없다')
assert.ok(글.includes('m'), '맥이 없다')
assert.ok(글.includes('1.0.0'), '판이 없다')
console.log('원격메시지 ✓')

const 폴더 = await mkdtemp(join(tmpdir(), '제작자-'))
try {
  await writeFile(join(폴더, 'package.json'), JSON.stringify({ version: '9.9.9' }))
  assert.equal(await 판번호(폴더), '9.9.9')
  console.log('판번호 ✓')
} finally {
  await rm(폴더, { recursive: true, force: true })
}
