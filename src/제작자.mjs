// 원격 연결이 코드를 보낼 제작자 쪽 상수 — 사용자가 값을 직접 채운다.
// ⚠️ 제작자봇토큰은 「제작자 채팅에 글 보내기」만 되는 전용 봇이어야 한다. 이 파일은 공개 저장소에도 실린다 — 실제 값을 커밋하지 않는다
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { hostname } from 'node:os'

export const 제작자방번호 = '' // 제작자 텔레그램 채팅 번호
export const 제작자봇토큰 = '' // ⚠️ 제작자 채팅에 글 보내기만 되는 전용 봇

export async function 판번호(뿌리 = process.cwd()) {
  const { version } = JSON.parse(await readFile(join(뿌리, 'package.json'), 'utf8'))
  return version
}

export function 맥이름() {
  return hostname()
}

// 순수 — 텔레그램에 보낼 글 한 덩이. 코드는 4-4-4 로 띄워 사람이 옮겨 적기 쉽게 한다
export function 원격메시지({ 코드, 계정, 맥, 판, 때 = new Date() }) {
  const 띈코드 = String(코드).replace(/(\d{4})(?=\d)/g, '$1 ')
  const 때글 = 때.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  return `원격 데스크톱 액세스 코드\n${띈코드}\n\n계정: ${계정 || '(없음)'}\n맥: ${맥}\n판: ${판}\n때: ${때글}`
}
