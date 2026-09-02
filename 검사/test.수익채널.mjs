// 수익 화면이 어느 제휴 채널 숫자인지 바로 말하는가 — node 검사/test.수익채널.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { 수익채널, 제휴들, 실적있는채널 } from '../src/계정.mjs'

{ // 사용자가 정한 채널 이름 넷이 그대로 있다 (2026-08-30)
  for (const 이름 of ['쿠팡파트너스', '라쿠텐', '아마존JP', '아마존US', '없음'])
    assert.ok(제휴들[이름], `제휴 채널 「${이름}」 이 없다`)
  assert.ok(!제휴들['아마존 재팬'] && !제휴들['아마존 US'], '옛 긴 이름이 남아 있다')
}

{ // 「없음」 계정은 쿠팡 숫자를 본다 — 빈 화면은 「0원 벌었다」로 잘못 읽힌다 (사용자 결정)
  const r = 수익채널('없음')
  assert.equal(r.출처, '쿠팡파트너스')
  assert.equal(r.이름, '쿠팡파트너스')
  assert.equal(r.빌려옴, false, '「없음」 은 빌려온 것이 아니다 — 원래 볼 것이 쿠팡이다')
  assert.deepEqual(수익채널(''), 수익채널('없음'), '제휴를 안 정한 계정도 같다')
}

{ // 쿠팡 계정은 제 숫자를 본다
  const r = 수익채널('쿠팡파트너스')
  assert.equal(r.이름, '쿠팡파트너스')
  assert.equal(r.빌려옴, false)
}

{ // ⚠️ 핵심 — 라쿠텐·아마존 딱지 아래 쿠팡 숫자를 두면 거짓말이다. 반드시 빌려옴 이라 말한다
  for (const 채널 of ['라쿠텐', '아마존JP', '아마존US']) {
    const r = 수익채널(채널)
    assert.equal(r.이름, 채널, '딱지에는 계정이 고른 채널 이름이 뜬다')
    assert.equal(r.출처, '쿠팡파트너스', '숫자는 아직 쿠팡 것이다')
    assert.equal(r.빌려옴, true, `${채널} 이 제 숫자를 가진 척한다 — 거짓말이 된다`)
  }
}

{ // 실적을 받아오는 채널이 늘면 저절로 따라간다 — 규칙을 두 곳에 적지 않는다
  assert.ok(실적있는채널.has('쿠팡파트너스'))
  assert.equal(실적있는채널.size, 1, '실적 출처가 늘었으면 이 검사도 같이 고쳐라')
}

{ // 화면은 서버가 준 것만 쓴다. 규칙을 화면에 또 적으면 언젠가 한쪽만 바뀐다
  const 쪽 = await readFile('dashboard/app/(pages)/revenue/page.tsx', 'utf8')
  assert.ok(쪽.includes('수익채널'), '수익 쪽이 채널 정보를 안 읽는다')
  assert.ok(!/['"]없음['"]/.test(쪽), '수익 쪽이 「없음」 규칙을 제 손으로 다시 짓고 있다')
  const 줄 = await readFile('dashboard/components/쪽/revenue/채널줄.tsx', 'utf8')
  assert.ok(줄.includes('빌려옴'), '채널줄이 빌려온 숫자임을 안 가린다')
  const 엔진 = await readFile('src/화면엔진.mjs', 'utf8')
  assert.ok(/수익채널: 수익채널\(/.test(엔진), '상태() 가 수익채널을 안 내려보낸다')
}

console.log('통과 — 수익 채널 검사 6묶음')
