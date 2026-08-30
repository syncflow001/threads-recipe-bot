// 저장소 뿌리와 열쇠말 — 엔진이 뿌리 기준 상대 경로로 파일을 읽으므로 cwd 가 곧 뿌리다
import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

export const 뿌리 = () => process.cwd()

const 열쇠파일 = () => join(뿌리(), '.설정화면열쇠')
let 담긴: Promise<string> | null = null

async function 실제로읽기(): Promise<string> {
  const 있던것 = (await readFile(열쇠파일(), 'utf8').catch(() => '')).trim()
  if (/^[0-9a-f]{32,}$/.test(있던것)) return 있던것
  const 새것 = randomBytes(24).toString('hex')
  await writeFile(열쇠파일(), 새것 + '\n', { mode: 0o600 })
  return 새것
}

// 옛 설정화면.mjs 와 같은 규칙. 파일은 600 이고 git 에 안 올라간다
// 동시에 첫 호출이 여럿 들어와도 생성을 한 번만 하도록 진행 중인 약속 자체를 캐싱한다
export function 열쇠말읽기(): Promise<string> {
  if (!담긴) {
    담긴 = 실제로읽기().catch((에러) => {
      담긴 = null
      throw 에러
    })
  }
  return 담긴
}
