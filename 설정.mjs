// 처음 쓰는 사람이 열쇠와 말투를 갖추도록 안내하는 도우미 — 물어보고 persona.json 을 써 준다
import { createInterface } from 'node:readline/promises'
import { readFile, writeFile, access } from 'node:fs/promises'
import { stdin, stdout } from 'node:process'

// 사람이 답을 쳐 넣어야 하는 도우미다. 파이프로 물리거나 Ctrl-D 를 누르면
// readline 이 닫혀 버리는데, 그대로 두면 시뻘건 스택 추적이 뜬다. 미리 막는다
if (!stdin.isTTY) {
  console.error('이 도우미는 터미널에서 직접 실행해야 합니다.\n  node 설정.mjs')
  process.exit(1)
}

const 물음 = createInterface({ input: stdin, output: stdout })

// question() 을 매번 새로 부르면 질문과 질문 사이에 들어온 줄이 버려진다.
// 여러 줄짜리 글을 통째로 붙여넣으면 첫 줄만 남고 나머지가 사라진다 — 실제로 겪었다.
// 그래서 줄을 계속 받아 쌓아 두고, 물어볼 때 쌓인 것부터 꺼내 쓴다
const 쌓인줄 = []
const 기다리는이 = []
물음.on('line', (l) => {
  const 받을이 = 기다리는이.shift()
  if (받을이) 받을이(l)
  else 쌓인줄.push(l)
})

// 입력이 끊기면(Ctrl-D 등) 시뻘건 스택 추적 대신 한 줄로 알리고 나간다
물음.on('close', () => {
  if (!기다리는이.length) return
  console.log('\n\n중단했습니다. persona.json 은 건드리지 않았습니다.')
  process.exit(1)
})

const 받기 = (q) => {
  stdout.write(q)
  if (쌓인줄.length) return Promise.resolve(쌓인줄.shift())
  return new Promise((맞이하기) => 기다리는이.push(맞이하기))
}

const 묻기 = async (q, 기본 = '') => (await 받기(q)).trim() || 기본

// 여러 줄을 받는다. 빈 줄에서 엔터를 한 번 더 치면 끝난다
const 여러줄묻기 = async (q) => {
  console.log(q)
  console.log('  (다 붙여넣었으면 빈 줄에서 엔터를 한 번 더 치세요. 그냥 엔터만 치면 건너뜁니다)')
  const 줄 = []
  for (;;) {
    const l = await 받기('  ')
    if (l.trim() === '') break
    줄.push(l)
  }
  return 줄.join('\n').trim()
}

const 있나 = async (p) => access(p).then(() => true, () => false)

console.log(`
╭──────────────────────────────────────────╮
│  스레드 요리글 자동화 — 처음 설정 도우미  │
╰──────────────────────────────────────────╯
`)

// ─── 1. 열쇠 점검 ────────────────────────────────────────────────
// 값은 절대 화면에 찍지 않는다. 있고 없고만 본다
const 열쇠들 = [
  ['OPENAI_API_KEY', '글을 다시 쓰는 데 필요', true],
  ['THREADS_ACCESS_TOKEN', '스레드에 올리는 데 필요', true],
  ['THREADS_USER_ID', '내 스레드 계정 번호', true],
  ['THREADS_COOKIE', '조회수·등급을 보려면 필요', false],
  ['COUPANG_ACCESS_KEY', '쿠팡 제휴 링크를 넣으려면 필요', false],
  ['COUPANG_SECRET_KEY', '쿠팡 제휴 링크를 넣으려면 필요', false],
  ['BLOB_READ_WRITE_TOKEN', '영상을 같이 올리려면 필요', false],
]

console.log('1. 열쇠 점검\n')

// 없으면 여기서 만들어 준다. 안 만들면 run.mjs 가 "node: .env.local: not found" 라는
// 알아먹기 힘든 소리를 내고 죽는다 — 처음 쓰는 사람이 제일 먼저 부딪히는 벽이다
if (!(await 있나('.env.local')) && (await 있나('.env.example'))) {
  await writeFile('.env.local', await readFile('.env.example', 'utf8'))
  console.log('   ✅ .env.local 을 만들었습니다. 아직 비어 있으니 값을 채워 넣으세요.')
  console.log('      터미널에 이렇게 치면 편집기가 열립니다 →  open -e .env.local\n')
}

const env = (await 있나('.env.local')) ? await readFile('.env.local', 'utf8') : ''
if (!env) console.log('   .env.local 파일이 아직 없습니다.\n')

const 빠진필수 = []
for (const [이름, 설명, 필수] of 열쇠들) {
  const 채워짐 = new RegExp(`^${이름}=.+`, 'm').test(env)
  if (!채워짐 && 필수) 빠진필수.push(이름)
  console.log(`   ${채워짐 ? '✅' : 필수 ? '❌' : '⬜️'}  ${이름.padEnd(22)} ${설명}${필수 ? '' : ' (선택)'}`)
}
console.log(`
   ❌ 는 없으면 안 되는 것, ⬜️ 는 없어도 도는 것입니다.
   채우는 법은 README.md 의 "열쇠 준비하기" 에 있습니다.
   ⚠️  열쇠 값은 .env.local 파일에만 넣으세요. 채팅창이나 메신저에 붙여넣지 마세요.
`)
if (빠진필수.length) console.log(`   지금 비어 있는 필수 항목 — ${빠진필수.join(', ')}\n`)

// ─── 2. 말투 만들기 ──────────────────────────────────────────────
console.log('\n2. 말투 만들기\n')
if (await 있나('persona.json')) {
  const 기존 = JSON.parse(await readFile('persona.json', 'utf8'))
  if (기존.정체성) {
    const 답 = await 묻기('   이미 설정된 말투가 있습니다. 새로 만들까요? (y/N) ', 'n')
    if (답.toLowerCase() !== 'y') {
      console.log('\n   그대로 두겠습니다. 끝.\n')
      물음.close()
      process.exit(0)
    }
  }
}

console.log(`   네 가지만 물어봅니다. 나머지는 무난한 기본값으로 채웁니다.
   언제든 persona.json 을 직접 고쳐도 됩니다.\n`)

const 정체성 = await 묻기(
  '   ① 나를 한 줄로 소개하면? (예: 30대 직장인. 퇴근하고 해먹는 집밥을 나누는 계정)\n   > ',
  '요리를 좋아해 직접 해먹고 나누는 일상 계정. 전문가가 아니라 생활형이다.',
)

const 말끝 = await 묻기('\n   ② 반말과 존댓말 중 어느 쪽인가요? (1=반말, 2=존댓말) [1] ', '1')
const 반말 = 말끝 !== '2'

const 표현 = await 묻기(
  '\n   ③ 자주 쓰는 말버릇이 있나요? 쉼표로 나눠 적어 주세요. (예: ㅋㅋ, ㅎㅎ, ㅠㅠ)\n   > ',
  'ㅋㅋ, ㅎㅎ, ㅠㅠ',
)

console.log('\n   ④ 실제로 반응이 좋았던 내 글을 붙여넣어 주세요. 이게 제일 중요합니다.')
console.log('      2~3편이면 충분합니다. 한 편 넣고 빈 줄 엔터, 또 한 편 넣고 빈 줄 엔터.')
const 예시 = []
for (let i = 1; i <= 3; i++) {
  const 글 = await 여러줄묻기(`\n   ${i}번째 글:`)
  if (!글) break
  예시.push(글)
}

const 말투 = 반말
  ? '친한 친구한테 얘기하듯 자연스러운 반말. 마침표를 거의 안 쓰고 줄바꿈으로 끊는다. 문장 끝은 흘리듯 맺고, 줄마다 어미를 하나만 골라 쓴다. 어미를 겹쳐 붙이지 않는다.'
  : '읽는 사람에게 말을 건네는 편안한 존댓말. 딱딱한 설명체가 아니라 대화하듯 쓴다. 한 줄에 한 가지만 담고 줄바꿈으로 끊는다.'

const 페르소나 = {
  _설명: '내 말투 설정. `node 설정.mjs` 로 다시 만들 수 있다.',
  정체성,
  말투,
  '자주 쓰는 표현': 표현.split(',').map((s) => s.trim()).filter(Boolean),
  '표현 사용 규칙': '줄 끝에 자연스럽게 붙인다. 한 줄에 하나면 충분하다.',
  '글 구조': [
    '계기 — 어디서 보고 따라 해봤는지 (한 줄)',
    "'근데' 로 전환 — 먹어보니 어땠는지",
    '맛을 구체적으로 — 가게와 비교하거나 행동으로',
    '그 뒤 우리 집이 어떻게 됐는지',
  ],
  '지켜야 할 것': [
    '첫 줄은 따라 해보게 된 계기로 연다',
    '요리 초보도 알아듣는 말로',
    '실제로 해먹어 본 사람처럼 구체적으로',
  ],
  '쓰지 말 것': [
    반말 ? '~하시죠, ~해보세요 같은 존댓말' : '반말',
    '과한 유행어',
    "'꿀팁', '레전드', '미쳤다' 같은 닳은 표현",
    '광고 카피 같은 표현',
    '지나치게 정돈된 AI 말투, 오글거리는 표현',
    '출처를 밝히거나 남의 글을 언급하는 것',
    '매번 같은 훅이나 표현을 반복하는 것',
  ],
  '본문 길이': '4~5줄',
  '본문 이모지': '맨 끝에 딱 하나만. 음식과 어울리는 것으로.',
  '레시피 길이': '재료와 순서를 합쳐 25줄 이내',
  '레시피 규칙':
    '재료·용량·핵심 조리법은 원문 그대로 둔다. 임의로 바꾸거나 더하지 말고 읽기 좋게 정리만 한다. 원문에 없는 것은 비워 둔다.',
  '레시피 형식':
    "첫 줄은 '이모지 **요리이름**'. 그다음 '🛒 준비물' 아래 재료를 한 줄씩. 그다음 '👩🏻‍🍳 만드는 법' 아래 1️⃣2️⃣3️⃣ 번호 이모지로 단계. 단계마다 요령을 한 줄 덧붙인다. 마지막은 핵심 한 줄로 맺는다.",
  '내 글 예시': 예시,
}

// 덮어쓰기 전에 원본을 남긴다. 공들여 쓴 말투를 실수로 날리면 복구할 길이 없다
if (await 있나('persona.json')) await writeFile('persona.json.backup', await readFile('persona.json'))
await writeFile('persona.json', JSON.stringify(페르소나, null, 2) + '\n')

물음.close()

console.log(`
✅ persona.json 을 만들었습니다.${예시.length ? '' : '\n\n   ⚠️  내 글 예시가 비어 있습니다. 말투가 밋밋하게 나옵니다.\n      나중에라도 persona.json 의 "내 글 예시" 에 실제 글을 넣어 주세요.'}

${빠진필수.length
  ? `⚠️  아직 채울 열쇠가 남았습니다 — ${빠진필수.join(', ')}
   open -e .env.local  로 열어 채운 다음 아래를 실행하세요.`
  : '다음은 이렇게 해보세요. 아무것도 올리지 않고 뭐가 잡히는지만 봅니다.'}

   node --env-file=.env.local run.mjs 레시피 요리 한식
`)
