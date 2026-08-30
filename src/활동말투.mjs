// 하트·댓글(교류하기)과 내 글 댓글 답하기(답하기)가 댓글을 지을 때 넣는 「계정의 목소리」 재료.
// 글쓰기(compose.mjs)와 같은 세 벌 — 말투 파일(persona) · 언어팩 · 분야팩 — 을 참고하되,
// 댓글은 글보다 훨씬 짧으므로 글 구조·도입 유형·레시피 형식처럼 긴 글에만 맞는 항목은 뺀다.
// 2026-08-26 까지 댓글은 「일본어」「요리」 낱말 둘만 보고 지어져 네 계정이 같은 목소리였다 (사용자 지적).
import { readFile } from 'node:fs/promises'
import { 계정길 } from './계정.mjs'
import { join } from 'node:path'
import { 언어규칙 } from './언어규칙.mjs'

// run.mjs 와 같은 규칙 — 첫 계정은 persona.json, 나머지는 persona.<계정>.json. 없으면 null (댓글은 그래도 나간다)
export async function 말투읽기(계정, 뿌리 = process.cwd()) {
  const 파일 = join(뿌리, 계정길(계정, 'persona.json'))
  try { return JSON.parse(await readFile(파일, 'utf8')) } catch { return null }
}

// 프롬프트에 붙일 줄들. 비어 있는 칸은 건너뛴다 — 자리표시 문장이 새면 모델이 그것을 따라 쓴다
export function 활동말투지시(페르소나, { 언어팩 = null, 분야팩 = null } = {}) {
  const ㅍ = 페르소나 ?? {}
  const 글 = (v) => (typeof v === 'string' && v.trim() && !v.includes('여기에 내가') ? v.trim() : '')
  const 목록 = (v) => (Array.isArray(v) ? v.filter((s) => 글(s)) : [])
  const 예시 = 목록(ㅍ['내 글 예시']).filter((s) => s.length >= 20).slice(0, 2)
    .map((s) => s.replace(/#\S+/g, '').trim().slice(0, 160))
  const 줄 = [
    '[내 계정의 목소리 — 댓글도 이 사람이 쓴 것처럼 보여야 한다]',
    분야팩?.이름 ? `- 분야: ${분야팩.이름} 계정이다.${분야팩.글이름 ? ` 만드는 법 글을 「${분야팩.글이름}」라고 부른다.` : ''}` : '',
    글(ㅍ.정체성) ? `- 내가 누구인가: ${글(ㅍ.정체성)}` : '',
    글(ㅍ.말투) ? `- 말투: ${글(ㅍ.말투)}\n  (댓글은 한두 문장이다. 어미와 결만 따르고, 제목·번호·줄나눔 같은 글 짜임은 쓰지 마라)` : '',
    목록(ㅍ['자주 쓰는 표현']).length
      ? `- 자주 쓰는 표현: ${목록(ㅍ['자주 쓰는 표현']).join(' · ')} — 어울릴 때만 하나 이하로.`
      : '',
    목록(ㅍ['쓰지 말 것']).length ? `- 쓰지 말 것: ${목록(ㅍ['쓰지 말 것']).join(' / ')}` : '',
    예시.length ? `- 내 글의 결 (문장을 옮기지 말고 분위기만):\n${예시.map((s) => `  「${s}」`).join('\n')}` : '',
  ].filter(Boolean)
  // 언어팩 지시 — 「日本語で書く」 같은 못. 말투 파일을 어떻게 고쳐도 여기서 박힌다
  let 언어줄 = []
  try { 언어줄 = 언어팩 ? 언어규칙(언어팩) : [] } catch { 언어줄 = [] }
  if (언어줄.length) 줄.push('[언어]', ...언어줄)
  return 줄
}

// CLI 둘이 똑같이 부르는 짧은 길 — 계정 정보로 말투·팩을 다 모아 지시 줄로 만든다
export async function 활동재료(계정, 그정보, 뿌리 = process.cwd()) {
  const 페르소나 = await 말투읽기(계정, 뿌리)
  let 팩 = {}
  try { 팩 = (await import('./팩.mjs')).계정팩(그정보) } catch { 팩 = {} }
  return 활동말투지시(페르소나, { 언어팩: 팩.언어팩 ?? null, 분야팩: 팩.분야팩 ?? null })
}
