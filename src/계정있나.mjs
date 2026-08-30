// 계정이 하나도 설정 안 된 신규 설치인지 판정한다 — 인계 목록 G절의 판정식 그대로

import { access } from 'node:fs/promises'
import { join } from 'node:path'

const 있나 = (p) => access(p).then(() => true, () => false)

// ⚠️ **계정 목록 규칙을 여기서 다시 적지 않는다** (2026-08-29). 옛 코드는 뿌리의 `.env.<계정>`
// 을 찾았는데, 폴더 개편 뒤 그것이 없어져 **계정 여덟이 멀쩡한데 「처음 오셨네요」 마법사가
// 뜰 뻔했다** (검증 에이전트가 잡았다). 지금은 `.env.local` 이 있어 첫 줄에서 빠져나갔을 뿐이다
export async function 계정이하나도없다(뿌리 = process.cwd()) {
  if (await 있나(join(뿌리, '.env.local'))) return false
  const { 계정목록 } = await import('./계정.mjs')
  // 계정목록 은 하나도 없을 때 마법사 자리로 [''] 를 준다 — 그것은 「없다」는 뜻이다
  return (await 계정목록(뿌리)).every((이름) => !이름)
}
