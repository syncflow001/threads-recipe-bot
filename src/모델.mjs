// LLM 에게 한 번 물어본다 — 클로드 유료 구독(claude -p)으로 돈다. API 열쇠를 쓰지 않는다
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'

// 실패를 종류로 가른다. 「한도」와 「로그인 끊김」은 사람이 손대야 하는 것이라
// 「쓸 만한 글이 없었다」와 절대 뭉뚱그리면 안 된다 — 그러면 조용히 멈춘 것이 된다
export class 한도끝 extends Error {}
export class 로그인끊김 extends Error {}

// 지시(system)와 자료(user)를 갈라 넘긴다. 남의 글을 지시 쪽에 섞으면
// 거기 심긴 문장이 지시로 읽힐 수 있다 (2026-08-24 적대적 시험 참고)
// ⚠️ **시각표가 주는 PATH 에는 `~/.local/bin` 이 없다.** 그래서 손으로 돌리면 멀쩡한데
// 자동 발행에서만 `spawn claude ENOENT` 로 죽었다 (2026-08-25 12:02·16:02 판, 실측).
// 플리스트에 PATH 를 넣어 고치면 안 된다 — 대시보드가 시각표를 다시 켤 때
// `plist글()` 이 통째로 새로 써서 손으로 넣은 값이 조용히 사라진다 (HANDOFF §5 와 같은 함정).
// 그래서 **부르는 자리에서** 찾는다. 여기를 모든 길이 지나간다
export const 클로드길 = (환경 = process.env, 있나 = existsSync) => {
  const 준것 = String(환경.CLAUDE_BIN ?? '').trim()
  if (준것) return 준것
  const 집 = 환경.HOME ?? ''
  const 자리들 = [
    `${집}/.local/bin/claude`,
    `${집}/.claude/local/claude`,
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ]
  return 자리들.find((자리) => 집 || !자리.startsWith('/Users') ? 있나(자리) : false) ?? 'claude'
}

const 기본돌리기 = (인자들, 시간제한초) => new Promise((맞다, 틀리다) => {
  execFile(클로드길(), 인자들, {
    timeout: 시간제한초 * 1000,
    maxBuffer: 32 * 1024 * 1024,
    killSignal: 'SIGKILL',
  }, (오류, 나온것, 샌것) => {
    if (오류) return 틀리다(Object.assign(오류, { 샌것: String(샌것 ?? '') }))
    맞다(String(나온것 ?? ''))
  })
})

// 앞뒤에 ```json 울타리가 붙어 나오는 날이 있다. 있으면 벗긴다
const 울타리벗기기 = (글) => {
  const 다듬 = String(글 ?? '').trim()
  const m = 다듬.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/)
  return (m ? m[1] : 다듬).trim()
}

const 한도말 = /rate limit|usage limit|too many requests|한도|429/i
const 로그인말 = /not logged in|please run \/login|unauthor|로그인/i

// 도구들 — 클로드에게 열어 줄 도구 이름. 기본은 없음(글만 쓴다).
// 「내 글 댓글 답하기」만 ['WebSearch'] 를 준다 — 내 글에 답이 없는 질문을 웹에서 찾아 답하려고.
// 실측 (2026-08-26) — `claude -p --allowedTools WebSearch` 로 검색이 실제로 돈다
export async function 물어보기({
  system, user, 시간제한초 = 240, 돌리기 = 기본돌리기, 도구들 = [],
} = {}) {
  if (!system?.trim() || !user?.trim()) throw new Error('물어볼 지시나 자료가 비었다')

  // ⚠️ --allowedTools 는 뒤에 오는 것을 전부 도구 이름으로 삼킨다 — 맨 뒤에 두면 프롬프트까지
  // 먹어서 "Input must be provided" 로 죽는다 (2026-08-26 실측). 다른 옵션 앞에 둔다
  const 인자들 = [
    '-p',
    ...(도구들.length ? ['--allowedTools', ...도구들] : []),
    '--append-system-prompt', system,
    '--output-format', 'json',
    user,
  ]

  let 나온것
  try {
    나온것 = await 돌리기(인자들, 시간제한초)
  } catch (e) {
    const 글 = `${e?.message ?? ''} ${e?.샌것 ?? ''}`
    if (로그인말.test(글)) throw new 로그인끊김('클로드에 로그인이 안 돼 있습니다 — 터미널에서 claude 를 열어 /login 하세요')
    if (한도말.test(글)) throw new 한도끝('클로드 사용 한도에 걸렸습니다 — 한도가 풀린 뒤 다시 돕니다')
    if (e?.killed) throw new Error(`클로드가 ${시간제한초}초 안에 답하지 않았습니다`)
    throw new Error(`클로드를 부르지 못했습니다 — ${String(e?.message ?? e).slice(0, 200)}`)
  }

  let 봉투
  try {
    봉투 = JSON.parse(나온것)
  } catch {
    throw new Error(`클로드 응답이 봉투 꼴이 아닙니다 — ${나온것.slice(0, 200)}`)
  }

  // 봉투가 스스로 실패라고 말하는 경우. 여기서도 종류를 갈라야 조용히 안 묻힌다
  if (봉투.is_error) {
    const 글 = `${봉투.result ?? ''} ${봉투.terminal_reason ?? ''}`
    if (로그인말.test(글)) throw new 로그인끊김('클로드에 로그인이 안 돼 있습니다 — 터미널에서 claude 를 열어 /login 하세요')
    if (한도말.test(글)) throw new 한도끝('클로드 사용 한도에 걸렸습니다 — 한도가 풀린 뒤 다시 돕니다')
    throw new Error(`클로드가 실패로 끝냈습니다 — ${String(봉투.result ?? 봉투.terminal_reason ?? '까닭을 모른다').slice(0, 200)}`)
  }

  const 알맹이 = 울타리벗기기(봉투.result)
  if (!알맹이) throw new Error('클로드 응답이 비었습니다')
  return 알맹이
}

// 사람이 손대야 하는 실패인가. run.mjs 가 이걸로 종료코드를 가른다
export const 사람이손댈것 = (e) => e instanceof 한도끝 || e instanceof 로그인끊김
