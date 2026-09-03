// 프로필 소개문구 뽑기 — 말투 카드의 「나를 한 줄로」가 이것을 그대로 따라간다
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { 소개뽑기 } from '../src/threads.mjs'

const 문서 = (안) => `<html><script type="application/json">${안}</script></html>`

// 있는 것을 그대로 읽는다
assert.equal(소개뽑기(문서('{"biography":"20대 싱글. 혼밥 레시피만 올려요"}')),
  '20대 싱글. 혼밥 레시피만 올려요')

// ⚠️ 줄바꿈은 공백 하나로 접는다 — 「한 줄로」 칸이고 프롬프트에도 한 줄로 나간다
assert.equal(소개뽑기(문서('{"biography":"첫 줄\\n둘째 줄\\n\\n셋째"}')), '첫 줄 둘째 줄 셋째')
assert.equal(소개뽑기(문서('{"biography":"  앞뒤 공백  "}')), '앞뒤 공백')

// 이모지·따옴표가 든 소개도 깨지지 않는다
assert.equal(소개뽑기(문서('{"biography":"🐜 개미처럼 \\"부지런히\\""}')), '🐜 개미처럼 "부지런히"')

// ⛔ **둘 이상이면 안 믿는다.** 프로필 문서에는 추천 계정도 섞여 온다 —
// 남의 소개를 내 정체성으로 박느니 비워 두는 게 낫다 (쿠키주인 과 같은 규칙)
assert.equal(소개뽑기(문서('{"a":{"biography":"내 소개"},"b":{"biography":"남의 소개"}}')), null)
// 같은 값이 여러 번 나오는 것은 하나로 본다 (문서 안에 두 번 실린다)
assert.equal(소개뽑기(문서('{"a":{"biography":"내 소개"},"b":{"biography":"내 소개"}}')), '내 소개')

// 없거나 비었으면 null — 지어내지 않는다
assert.equal(소개뽑기(문서('{"biography":""}')), null)
assert.equal(소개뽑기(문서('{"biography":"   "}')), null)
assert.equal(소개뽑기(문서('{"follower_count":10}')), null)
assert.equal(소개뽑기(''), null)
assert.equal(소개뽑기(null), null)
assert.equal(소개뽑기(undefined), null)

// 프로필읽기가 소개 칸을 함께 준다. 못 받으면 null 이다
{
  const { 프로필읽기 } = await import('../src/threads.mjs')
  const r = await 프로필읽기('아무개', { })
    .catch(() => null)
  assert.ok(r === null || '소개' in r, '프로필읽기 결과에 소개 칸이 있어야 한다')
}

// ⚠️ **화면 칸만 덮는다.** 「말투 저장」을 눌러야 파일이 바뀐다 —
// 소개문구를 읽는 것만으로 열한 계정의 페르소나가 저 혼자 바뀌면 안 된다
{
  const 화면 = await readFile('./dashboard/components/쪽/persona/말투.tsx', 'utf8')
  assert.match(화면, /'\/profile-bio'/, '말투 카드가 소개문구를 읽어야 한다')
  assert.match(화면, /소개자료\?\.소개 \|\| m\?\.정체성/,
    '소개를 못 읽으면 저장된 값을 그대로 써야 한다')
  assert.match(화면, /프로필 소개문구<\/b>가 자동으로 입력됩니다/,
    '칸 옆에 자동 입력이라고 알려 줘야 한다')
  // 소개를 읽자마자 저장으로 넘어가는 길이 있으면 안 된다
  assert.ok(!/소개자료[\s\S]{0,200}부르기\('\/persona'/.test(화면),
    '소개문구를 읽는 길에서 바로 저장하면 안 된다 — 사람이 눌러야 한다')
}

console.log('통과 — 프로필 소개문구 검사 17개')
