// 섀도우밴 알림 규칙 검사 — node 검사/test.섀도우밴알림.mjs
// 검수(2026-08-31)가 「섀도우밴돌기.mjs 는 검사 0줄」이라 짚었다. 사용자에게 실제로 도착하는
// 글을 정하는 자리라 여기가 비면 헛경고를 아무도 못 잡는다
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 한판 } from '../src/섀도우밴돌기.mjs'
import { 한판 as 계정한판 } from '../src/섀도우밴.mjs'

// 도달이력을 함께 심는다 — 신호가 둘 다 있어야 「괜찮음」·「돌아왔습니다」가 나온다.
// 신호 하나뿐이면 「덜잼」이고, 덜 잰 것으로는 좋아졌다고도 나빠졌다고도 말하지 않는다
const 새방 = async (도달 = 150) => {
  const 방 = await mkdtemp(join(tmpdir(), '섀도우알림-'))
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })
  await writeFile(join(방, '계정', 'aaa', '도달이력.jsonl'),
    `{"날짜":"${new Date().toISOString().slice(0, 10)}","비율":${도달}}\n`)
  return 방
}
const 프로필 = (편수, 팔로워 = 10) => async () =>
  ({ 팔로워, 글들: Array.from({ length: 편수 }, (_, i) => ({ code: 'C' + i, 본문: '글' })) })
const 못받는프로필 = async () => ({ 팔로워: null, 글들: [] })

// 어제 줄을 미리 심는다
const 어제심기 = (방, 프로필받기) => 계정한판('aaa', { 뿌리: 방, 프로필받기 })

{ // 첫 판이 괜찮음이면 조용하다 — 아무 일도 없는 날 알림을 보내지 않는다
  const 방 = await 새방()
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(10) })
  assert.deepEqual(말들, [])
}

{ // ⚠️ 「못잼 → 괜찮음」에 본문이 텅 빈 ⚠️ 경고가 나가던 헛알람 (검수가 잡았다)
  const 방 = await 새방()
  await 어제심기(방, 못받는프로필)          // 어제는 못 쟀다
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(10) })
  assert.deepEqual(말들, [], '못 잰 다음 날 멀쩡한데 경고를 보냈다')
}

{ // 못 잰 날에도 조용하다 — 모르는 것을 소식처럼 보내지 않는다
  const 방 = await 새방()
  await 어제심기(방, 프로필(10))
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 못받는프로필 })
  assert.deepEqual(말들, [])
}

{ // 나빠지면 말한다. 본문에 나쁜 신호가 들어 있어야 한다
  const 방 = await 새방()
  await 어제심기(방, 프로필(10))
  await 어제심기(방, 프로필(10))
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(1) })
  assert.equal(말들.length, 1)
  assert.match(말들[0], /덜 퍼지고 있는 것 같습니다/)
  assert.match(말들[0], /공개 노출/, '무엇이 나쁜지 안 적혀 있다')
  assert.match(말들[0], /계정 상태/, '진짜 확인은 앱이라는 말이 빠졌다')
  assert.ok(!/\n\n/.test(말들[0].replace(/\n앱에서/, '앱에서')), '본문이 비어 있다')
}

{ // 같은 상태가 이어지면 다시 안 말한다 — 날마다 같은 말을 보내면 안 읽게 된다
  const 방 = await 새방()
  await 어제심기(방, 프로필(10)); await 어제심기(방, 프로필(10))
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: () => {}, 프로필받기: 프로필(1) })
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(1) })
  assert.deepEqual(말들, [], '같은 상태인데 또 알렸다')
}

{ // 신호를 하나밖에 못 쟀으면 좋아졌다고도 나빠졌다고도 안 한다 — 「덜잼」은 모름이다
  const 방 = await mkdtemp(join(tmpdir(), '섀도우알림-'))
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })   // 도달이력 없음
  await 계정한판('aaa', { 뿌리: 방, 프로필받기: 프로필(10) })
  await 계정한판('aaa', { 뿌리: 방, 프로필받기: 프로필(10) })
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(10) })
  assert.deepEqual(말들, [], '신호 하나만 쟀는데 무슨 말을 했다')
}

{ // 📏 기준선을 못 믿겠으면 따로 말한다 — 등급과 다른 이야기다
  const 방 = await mkdtemp(join(tmpdir(), '섀도우알림-'))
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })
  const 오늘 = new Date().toISOString().slice(0, 10)
  await writeFile(join(방, '계정', 'aaa', '도달기준선.json'), JSON.stringify({ 기준선: 9.5, 표본: 6 }))
  await writeFile(join(방, '계정', 'aaa', '팔로워장부.json'), JSON.stringify([{ 날: 오늘, 수: 150 }]))
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(10) })
  assert.equal(말들.length, 1)
  assert.match(말들[0], /기준선을 못 믿겠습니다/)
  assert.match(말들[0], /기준선 다시 찍기/, '무엇을 눌러야 하는지 안 적혀 있다')

  // 어제도 같은 말이었으면 다시 안 한다
  const 또 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 또.push(m), 프로필받기: 프로필(10) })
  assert.deepEqual(또, [], '같은 기준선 탈을 날마다 알렸다')
}

{ // 돌아오면 말한다
  const 방 = await 새방()
  await 어제심기(방, 프로필(10)); await 어제심기(방, 프로필(10))
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: () => {}, 프로필받기: 프로필(1) })
  const 말들 = []
  await 한판({ 뿌리: 방, 계정들: ['aaa'], 알림: (m) => 말들.push(m), 프로필받기: 프로필(10) })
  assert.equal(말들.length, 1)
  assert.match(말들[0], /돌아왔습니다/)
}

console.log('통과 — 섀도우밴 알림 규칙 검사 8묶음')
