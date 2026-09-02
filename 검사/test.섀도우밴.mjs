// 섀도우밴 살피기 검사 — node 검사/test.섀도우밴.mjs
// 2026-08-31 검수 뒤 다시 썼다. 문턱값을 **숫자로 못 박고**(자기 참조하면 문턱을 바꿔도 초록이다),
// 흉내 프로필을 진짜 `프로필읽기` 처럼 **안 던지고 빈 목록을 주게** 만들었다
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { 판정, 재기, 한판, 장부읽기, 평소값, 기준선판정, 설정 } from '../src/섀도우밴.mjs'

const 새방 = async () => {
  const 방 = await mkdtemp(join(tmpdir(), '섀도우-'))
  await mkdir(join(방, '계정', 'aaa'), { recursive: true })
  return 방
}
// 진짜 프로필읽기와 같은 계약 — **절대 안 던진다.** 못 받으면 { 팔로워: null, 글들: [] }
const 프로필 = (편수, 팔로워 = 10) => async () =>
  ({ 팔로워, 글들: Array.from({ length: 편수 }, (_, i) => ({ code: 'C' + i, 본문: '글' })) })
const 못받는프로필 = async () => ({ 팔로워: null, 글들: [] })

{ // 문턱값 — **숫자로 못 박는다.** 설정을 참조하면 문턱을 바꿔도 검사가 초록이다 (검수 지적)
  assert.equal(설정.도달빨강, 10, '도달 빨강 문턱이 바뀌었다 — 근거(조사: 추천 제외 시 90% 감소)를 다시 대라')
  assert.equal(설정.도달노랑, 30, '도달 노랑 문턱이 바뀌었다')
  assert.equal(설정.공개노랑, 0.5, '공개 노출 문턱이 바뀌었다')
  assert.equal(판정({ 도달비율: 9 }).등급, '의심')
  assert.equal(판정({ 도달비율: 10 }).신호들[0].빛, '노랑')
  assert.equal(판정({ 도달비율: 29 }).신호들[0].빛, '노랑')
  assert.equal(판정({ 도달비율: 30 }).신호들[0].빛, '초록')
}

{ // 공개 노출 — 어제까지의 나와 견준다
  assert.equal(판정({ 공개글수: 0, 평소공개글수: 10, 도달비율: 120 }).등급, '의심')
  assert.equal(판정({ 공개글수: 4, 평소공개글수: 10, 도달비율: 120 }).등급, '주의')
  assert.equal(판정({ 공개글수: 5, 평소공개글수: 10, 도달비율: 120 }).등급, '괜찮음')
}

{ // ⚠️ 그물이 끊긴 것을 사고로 읽지 않는다 — 헛알람의 유일한 길이었다 (검수 지적)
  const r = 판정({ 공개글수: null, 평소공개글수: 10, 도달비율: 120, 못받음: true })
  assert.ok(!r.신호들.some((s) => s.이름 === '공개 노출'), '못 받았는데 공개 노출 신호를 만들었다')
  assert.equal(r.등급, '덜잼')
}

{ // ⚠️ 신호 하나로 「괜찮음」을 말하지 않는다 — 초록 배지를 보고 안심하면 안 된다 (검수 지적)
  assert.equal(판정({ 도달비율: 120 }).등급, '덜잼', '도달만 초록인데 괜찮음이라 말한다')
  assert.equal(판정({ 공개글수: 9, 평소공개글수: 10 }).등급, '덜잼')
  assert.equal(판정({ 공개글수: 9, 평소공개글수: 10, 도달비율: 120 }).등급, '괜찮음')
  assert.equal(판정({}).등급, '못잼')
}

{ // 평소값 — 중앙값이라 하루치 튐에 안 흔들린다
  assert.equal(평소값([10, 11, 2, 10, 12]), 10)
  assert.equal(평소값([10, 12]), 11)
  assert.equal(평소값([]), null)
  assert.equal(평소값([null, undefined]), null)
}

{ // 재기 — 못 받은 것과 「0편 보인다」를 가른다
  const 방 = await 새방()
  const r = await 재기('aaa', { 뿌리: 방, 프로필받기: 못받는프로필, 지난것들: [{ 공개글수: 10 }] })
  assert.equal(r.못받음, true)
  assert.equal(r.공개글수, null)
  assert.equal(판정(r).등급, '못잼', '그물이 끊긴 날 의심을 보내면 안 된다')
}

{ // 진짜로 0편이 보이는 것은 신호다 (팔로워는 읽혔으므로 못 받은 게 아니다)
  const 방 = await 새방()
  const r = await 재기('aaa', { 뿌리: 방, 프로필받기: 프로필(0, 500), 지난것들: [{ 공개글수: 10 }, { 공개글수: 11 }] })
  assert.equal(r.못받음, false)
  assert.equal(r.평소공개글수, 11)   // 두 값의 중앙값은 반올림
  assert.equal(판정(r).신호들.find((s) => s.이름 === '공개 노출').빛, '빨강')
}

{ // 견줄 어제가 없으면 공개 노출 신호를 안 만든다 — 첫 판에 헛알람을 내지 않는다
  const 방 = await 새방()
  const r = await 재기('aaa', { 뿌리: 방, 프로필받기: 프로필(0, 500), 지난것들: [] })
  assert.equal(r.평소공개글수, null)
  assert.ok(!판정(r).신호들.some((s) => s.이름 === '공개 노출'))
}

{ // 못 받은 날의 기록은 「평소」 계산에서 뺀다 — 안 그러면 평소값이 0 쪽으로 끌려간다
  const 방 = await 새방()
  const r = await 재기('aaa', {
    뿌리: 방, 프로필받기: 프로필(10, 500),
    지난것들: [{ 공개글수: 10 }, { 공개글수: null, 못받음: true }, { 공개글수: 12 }],
  })
  assert.equal(r.평소공개글수, 11)
}

{ // ⚠️ 도달이 낡았으면 안 쓴다 — 도달 재기가 멈추면 몇 주 전 값이 오늘의 초록이 된다 (검수 지적)
  const 방 = await 새방()
  await writeFile(join(방, '계정', 'aaa', '도달이력.jsonl'), '{"날짜":"2026-08-01","비율":618}\n')
  const 낡음 = await 재기('aaa', { 뿌리: 방, 프로필받기: 못받는프로필, 오늘: new Date('2026-08-31') })
  assert.equal(낡음.도달비율, null, '한 달 전 값을 오늘 신호로 썼다')
  const 싱싱 = await 재기('aaa', { 뿌리: 방, 프로필받기: 못받는프로필, 오늘: new Date('2026-08-02') })
  assert.equal(싱싱.도달비율, 618)
}

{ // 한판 — 계정 폴더 안에 **이어서** 쌓는다. 덮어쓰면 이력을 통째로 잃는다 (검수 지적)
  const 방 = await 새방()
  await writeFile(join(방, '계정', 'aaa', '도달이력.jsonl'),
    `{"날짜":"${new Date().toISOString().slice(0, 10)}","비율":150}\n`)
  await 한판('aaa', { 뿌리: 방, 프로필받기: 프로필(10, 500) })
  await 한판('aaa', { 뿌리: 방, 프로필받기: 프로필(10, 500) })
  const 글 = await readFile(join(방, '계정', 'aaa', '섀도우밴장부.jsonl'), 'utf8')
  assert.equal(글.trim().split('\n').length, 2, '두 판을 돌렸는데 줄이 둘이 아니다 — 덮어쓰고 있다')
  assert.equal((await 장부읽기('aaa', 방))[0].계정, 'aaa')
}

{ // 두 번째 판은 첫 판을 「평소」로 쓴다 — 장부를 스스로 읽는다
  const 방 = await 새방()
  await 한판('aaa', { 뿌리: 방, 프로필받기: 프로필(10, 500) })
  const 둘째 = await 한판('aaa', { 뿌리: 방, 프로필받기: 프로필(1, 500) })
  assert.equal(둘째.평소공개글수, 10)
  assert.equal(둘째.등급, '주의', '평소 10편이던 것이 1편이 됐는데 못 잡았다')
}

{ // ⚠️ 못 쓴 신호 셋을 다시 넣지 못하게 막는다. **이름을 바꿔 되살리는 것도 잡는다** (검수 지적)
  const 소스 = await readFile('./src/섀도우밴.mjs', 'utf8')
  assert.ok(!/from '\.\/threads\.mjs'/.test(소스.replace(/import \{ 프로필읽기 \} from '\.\/threads\.mjs'/, '')),
    'threads.mjs 에서 프로필읽기 말고 다른 것을 가져왔다 — 검색 신호가 되살아났나 확인하라')
  assert.ok(!/쿠키/.test(소스.split('export function 판정')[1] ?? ''),
    '판정이 다시 쿠키(로그인한 눈)를 본다 — 쿠키를 붙이면 늘 8편이라 안 켜지는 신호다')
  assert.ok(소스.includes('안 퍼뜨리는') && soseul(소스), '못 쓴 신호를 왜 뺐는지 적어 두는 주석이 사라졌다')
  function soseul(s) { return s.includes('늘 8편만 준다') }
}

{ // ⚠️ 기준선을 못 믿을 때 — 실측 근거는 우리 계정 일곱이다.
  // 성한 여섯이 팔로워의 3.09~8.47배인데 sample_dinner 만 0.06배(기준선 9.5 · 팔로워 150)였다
  assert.equal(설정.기준선의심배수, 1.0, '문턱을 바꿨으면 근거를 다시 대라 — 성한 계정 최소가 3.09배였다')
  assert.equal(설정.기준선최소표본, 3)

  const 성한것 = 기준선판정({ 기준선: 3422, 표본: 7, 찍은때: 'x' }, 1107)
  assert.equal(성한것.의심, false)

  const 오염 = 기준선판정({ 기준선: 9.5, 표본: 6, 찍은때: 'x' }, 150)
  assert.equal(오염.의심, true)
  assert.match(오염.까닭, /팔로워\(150명\)보다 적어요/)

  // 문턱 바로 위·아래
  assert.equal(기준선판정({ 기준선: 100, 표본: 5 }, 100).의심, false)
  assert.equal(기준선판정({ 기준선: 99, 표본: 5 }, 100).의심, true)

  // 표본이 너무 적어도 못 믿는다
  assert.match(기준선판정({ 기준선: 5000, 표본: 2 }, 100).까닭, /2편으로만/)

  // 팔로워를 모르면 배수를 못 잰다 — 지어내지 않는다
  assert.equal(기준선판정({ 기준선: 5, 표본: 5 }, null).의심, false)
  assert.equal(기준선판정({ 기준선: 5, 표본: 5 }, 0).의심, false)
  assert.equal(기준선판정(null, 100), null)
}

{ // 자를 못 믿으면 그 자로 잰 값도 안 쓴다 — 오염된 기준선의 「100%」를 초록으로 보이면 안 된다
  const 방 = await 새방()
  const 오늘 = new Date().toISOString().slice(0, 10)
  await writeFile(join(방, '계정', 'aaa', '도달기준선.json'), JSON.stringify({ 기준선: 9.5, 표본: 6, 찍은때: 'x' }))
  await writeFile(join(방, '계정', 'aaa', '팔로워장부.json'), JSON.stringify([{ 날: 오늘, 수: 150 }]))
  await writeFile(join(방, '계정', 'aaa', '도달이력.jsonl'), `{"날짜":"${오늘}","비율":100}\n`)
  const r = await 재기('aaa', { 뿌리: 방, 프로필받기: 프로필(10, 500), 지난것들: [{ 공개글수: 10 }] })
  assert.equal(r.도달비율, null, '오염된 기준선으로 잰 비율을 그대로 썼다')
  assert.match(r.기준선탈, /팔로워/)
  assert.equal(판정(r).등급, '덜잼', '거짓 초록이 나왔다')
}

{ // 기준선이 성하면 도달을 그대로 쓴다
  const 방 = await 새방()
  const 오늘 = new Date().toISOString().slice(0, 10)
  await writeFile(join(방, '계정', 'aaa', '도달기준선.json'), JSON.stringify({ 기준선: 3422, 표본: 7 }))
  await writeFile(join(방, '계정', 'aaa', '팔로워장부.json'), JSON.stringify([{ 날: 오늘, 수: 1107 }]))
  await writeFile(join(방, '계정', 'aaa', '도달이력.jsonl'), `{"날짜":"${오늘}","비율":100}\n`)
  const r = await 재기('aaa', { 뿌리: 방, 프로필받기: 프로필(10, 500), 지난것들: [{ 공개글수: 10 }] })
  assert.equal(r.도달비율, 100)
  assert.equal(r.기준선탈, null)
  assert.equal(판정(r).등급, '괜찮음')
}

{ // 쓰기는 이어쓰기 하나뿐이어야 한다 (CLAUDE.md §3-1 규칙 3)
  const 소스 = await readFile('./src/섀도우밴.mjs', 'utf8')
  assert.ok(!/writeFile|appendFile/.test(소스), '장부쓰기.mjs 를 안 거치고 직접 쓴다')
  assert.ok(소스.includes('이어쓰기('), '이어쓰기로 안 쌓는다')
}

console.log('통과 — 섀도우밴 검사 17묶음')
