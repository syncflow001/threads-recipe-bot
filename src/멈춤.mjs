// 자동 발행을 급히 멈추는 스위치 — launchctl 을 안 건드려서 시각표가 그대로 남는다
import { writeFile, unlink, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { 계정길 } from './계정.mjs'
import { 안전쓰기 } from './장부쓰기.mjs'

// 계정이 빈 문자열이면 전체를 멈추는 파일이다. 첫 계정도 이름이 빈 문자열이라
// 「전체」와 「첫 계정」이 같은 파일을 쓴다 — 이 제품은 혼자 쓰므로 그래도 된다
// 뿌리의 `멈춤` 은 전체를 멈추는 파일이다. 계정 것은 그 계정 폴더 안에 산다 (2026-08-29)
export const 멈춤파일이름 = (계정) => (계정 ? 계정길(계정, '멈춤') : '멈춤')

const 언제 = async (곳) => {
  try { return (await stat(곳)).mtime.toISOString() } catch { return null }
}

// 전체가 계정보다 앞선다. 전체를 켜 두고 계정을 푸는 실수로 글이 나가면 안 된다
export async function 멈춤인가(계정, 뿌리 = process.cwd()) {
  const 전체 = await 언제(join(뿌리, '멈춤'))
  if (전체) return { 멈춤: true, 어느것: '전체', 때: 전체 }
  if (!계정) return { 멈춤: false, 어느것: null, 때: null }
  const 그계정 = await 언제(join(뿌리, 멈춤파일이름(계정)))
  if (그계정) return { 멈춤: true, 어느것: '계정', 때: 그계정 }
  return { 멈춤: false, 어느것: null, 때: null }
}

export async function 멈추기(계정, 뿌리 = process.cwd()) {
  await 안전쓰기(join(뿌리, 멈춤파일이름(계정)), `${new Date().toISOString()}\n`)
}

// 없는 것을 풀어도 터지지 않는다. 급할 때 두 번 눌리는 단추다
export async function 풀기(계정, 뿌리 = process.cwd()) {
  await unlink(join(뿌리, 멈춤파일이름(계정))).catch(() => {})
}
