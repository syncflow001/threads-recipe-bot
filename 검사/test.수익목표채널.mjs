// 수익 목표가 제휴 채널마다 따로인가 — node 검사/test.수익목표채널.mjs
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 채널목표, 읽기, 쓰기, 모두읽기, 기본채널, 다듬기 } from '../src/수익목표.mjs'
import { 수익채널 } from '../src/계정.mjs'

const 새방 = () => mkdtemp(join(tmpdir(), '목표-'))

{ // ⚠️ 옛 파일(`{ 월목표: … }`)을 손대지 않아도 그대로 이어진다 — 쿠팡 목표로 읽는다
  assert.equal(채널목표({ 월목표: 150000 }), 150000)
  assert.equal(채널목표({ 월목표: 150000 }, '쿠팡파트너스'), 150000)
  assert.equal(채널목표({ 월목표: 150000 }, '라쿠텐'), 0, '옛 쿠팡 목표를 라쿠텐 목표로 쓰면 거짓말이다')
  assert.equal(기본채널, '쿠팡파트너스')
}

{ // 채널별이 있으면 그것이 이긴다
  const 짐 = { 월목표: 150000, 채널별: { 쿠팡파트너스: 200000, 라쿠텐: 30000 } }
  assert.equal(채널목표(짐, '쿠팡파트너스'), 200000)
  assert.equal(채널목표(짐, '라쿠텐'), 30000)
  assert.equal(채널목표(짐, '아마존JP'), 0)
}

{ // 저장 — 채널마다 따로 쌓이고 서로 안 덮는다
  const 방 = await 새방()
  await 쓰기(100000, 방, '쿠팡파트너스')
  await 쓰기(50000, 방, '라쿠텐')
  assert.equal(await 읽기(방, '쿠팡파트너스'), 100000)
  assert.equal(await 읽기(방, '라쿠텐'), 50000)
  assert.equal(await 읽기(방, '아마존JP'), 0)
  // 옛 칸도 맞춰 둔다 — 아직 옛 꼴로 읽는 곳이 있으면 어긋나지 않게
  const 짐 = JSON.parse(await readFile(join(방, '수익목표.json'), 'utf8'))
  assert.equal(짐.월목표, 100000)
  assert.deepEqual(짐.채널별, { 쿠팡파트너스: 100000, 라쿠텐: 50000 })
}

{ // 라쿠텐 목표를 세워도 쿠팡 목표는 안 건드린다
  const 방 = await 새방()
  await writeFile(join(방, '수익목표.json'), JSON.stringify({ 월목표: 150000 }))
  await 쓰기(9000, 방, '라쿠텐')
  assert.equal(await 읽기(방, '쿠팡파트너스'), 150000, '라쿠텐을 저장했더니 쿠팡 목표가 사라졌다')
  assert.equal(JSON.parse(await readFile(join(방, '수익목표.json'), 'utf8')).월목표, 150000)
}

{ // 모두읽기 — 화면이 「어디에 목표를 세워 뒀나」를 보여 주는 데 쓴다
  const 방 = await 새방()
  await 쓰기(100000, 방, '쿠팡파트너스')
  assert.deepEqual(await 모두읽기(방, ['쿠팡파트너스', '라쿠텐', '아마존JP']),
    { 쿠팡파트너스: 100000, 라쿠텐: 0, 아마존JP: 0 })
}

{ // 0 과 이상한 값은 「목표 없음」이다 — 0 을 목표로 두면 달성률이 무한대가 된다
  assert.equal(다듬기(0), 0)
  assert.equal(다듬기(-5), 0)
  assert.equal(다듬기('여기에'), 0)
  assert.equal(다듬기(1e12), 100_000_000, '1억 위는 잘못 누른 것으로 본다')
}

{ // ⚠️ 목표는 **숫자를 실제로 받아오는 채널**에 붙는다 — 라쿠텐 목표에 쿠팡 숫자로
  // 달성률을 그리면 거짓말이다. 그래서 화면 길들은 `수익채널().출처` 로 읽는다
  assert.equal(수익채널('라쿠텐').출처, '쿠팡파트너스')
  assert.equal(수익채널('쿠팡파트너스').출처, '쿠팡파트너스')
  for (const 길 of ['revenue', 'revenue-detail', 'revenue-goal']) {
    const 글 = await readFile(`dashboard/app/api/${길}/route.ts`, 'utf8')
    assert.ok(/수익채널\(/.test(글), `/${길} 이 채널을 안 보고 목표를 읽는다`)
    assert.ok(/채널\.출처/.test(글), `/${길} 이 「고른 채널」로 목표를 읽는다 — 「숫자가 오는 채널」이어야 한다`)
  }
}

console.log('통과 — 수익 목표 채널 검사 7묶음')
