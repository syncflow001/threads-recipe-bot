// 안전쓰기가 임시 파일 + rename 으로 원자적으로 쓰는지 잰다
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, stat, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 안전쓰기 } from './src/장부쓰기.mjs'

test('내용을 그대로 쓴다', async () => {
  const 폴더 = await mkdtemp(join(tmpdir(), '장부쓰기-'))
  try {
    const 경로 = join(폴더, '장부.json')
    await 안전쓰기(경로, 'a')
    assert.equal(await readFile(경로, 'utf8'), 'a')
  } finally {
    await rm(폴더, { recursive: true, force: true })
  }
})

test('쓰고 나면 .쓰는중- 임시 파일이 안 남는다', async () => {
  const 폴더 = await mkdtemp(join(tmpdir(), '장부쓰기-'))
  try {
    const 경로 = join(폴더, '장부.json')
    await 안전쓰기(경로, 'a')
    const 남은것 = (await readdir(폴더)).filter((f) => f.includes('.쓰는중-'))
    assert.deepEqual(남은것, [])
  } finally {
    await rm(폴더, { recursive: true, force: true })
  }
})

test('mode 를 준 대로 지킨다', async () => {
  const 폴더 = await mkdtemp(join(tmpdir(), '장부쓰기-'))
  try {
    const 경로 = join(폴더, '열쇠')
    await 안전쓰기(경로, 'b', { mode: 0o600 })
    const 정보 = await stat(경로)
    assert.equal(정보.mode & 0o777, 0o600)
  } finally {
    await rm(폴더, { recursive: true, force: true })
  }
})

test('덮어써도 임시 파일이 안 남는다', async () => {
  const 폴더 = await mkdtemp(join(tmpdir(), '장부쓰기-'))
  try {
    const 경로 = join(폴더, '장부.json')
    await 안전쓰기(경로, '옛것')
    await 안전쓰기(경로, '새것')
    assert.equal(await readFile(경로, 'utf8'), '새것')
    const 남은것 = (await readdir(폴더)).filter((f) => f.includes('.쓰는중-'))
    assert.deepEqual(남은것, [])
  } finally {
    await rm(폴더, { recursive: true, force: true })
  }
})

// 2026-08-29 계정 폴더 개편으로 계약이 바뀌었다. 장부가 `계정/<이름>/` 안으로 들어가면서
// 「폴더가 아직 없다」가 예외 상황이 아니라 **정상**이 됐다 — 계정을 새로 만들면 늘 그렇다.
// 부르는 쪽마다 mkdir 을 적게 하면 언젠가 한 곳이 빠지고 그 계정만 조용히 기록을 잃는다
test('없는 폴더에 쓰면 자리를 만들어서 쓴다 — 계정을 새로 만들면 늘 그렇다', async () => {
  const 폴더 = await mkdtemp(join(tmpdir(), '장부쓰기-'))
  try {
    const 경로 = join(폴더, '계정', '새계정', 'x.json')
    await 안전쓰기(경로, 'c')
    assert.equal(await readFile(경로, 'utf8'), 'c')
    assert.deepEqual(await readdir(join(폴더, '계정', '새계정')), ['x.json'],
      '임시 파일은 남지 않는다')
  } finally {
    await rm(폴더, { recursive: true, force: true })
  }
})

test('이어쓰기도 자리를 스스로 만든다', async () => {
  const { 이어쓰기 } = await import('./src/장부쓰기.mjs')
  const 폴더 = await mkdtemp(join(tmpdir(), '장부쓰기-'))
  try {
    const 경로 = join(폴더, '계정', '새계정', 'x.jsonl')
    await 이어쓰기(경로, 'a\n')
    await 이어쓰기(경로, 'b\n')
    assert.equal(await readFile(경로, 'utf8'), 'a\nb\n')
  } finally {
    await rm(폴더, { recursive: true, force: true })
  }
})
