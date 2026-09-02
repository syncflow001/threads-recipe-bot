// 안 쓰고 쌓인 미디어를 치운다 — 기본은 **마른 판**(세기만 하고 안 지운다)
//
//   node 도구/미디어치우기.mjs                  무엇이 얼마나 있는지만 센다
//   node 도구/미디어치우기.mjs --실행            정말 지운다
//   node 도구/미디어치우기.mjs --날 30 --실행     30일보다 오래된 것만
//
// 무엇을 지우나.
//   media/받은것/{code}/ — 내려받았는데 **발행에 못 쓴 것**이다. 쓰면 쓴것/ 으로 옮겨진다
//     (src/media.mjs 의 썼다표시). 그러니 여기 남은 것은 다시 안 쓴다. 필요하면 다시 받으면 된다
//
// 무엇을 안 지우나.
//   media/쓴것/ — **중복 막기의 근거다.** 폴더가 있으면 그 글을 다시 안 올린다(이미썼나).
//     여기를 건드리면 같은 글이 두 번 나간다
//   media/막힌것/ — 왜 못 올렸는지 남긴 기록이라 작다
//   **보관함에 아직 쟁여 둔 글** — 지금 코드는 어차피 다시 받지만, 지워 두면 확실히 다시 받는다.
//     남겨 두면 나중에 「이미 있으면 안 받는다」로 고칠 여지가 생긴다 (2026-08-31 실측:
//     받은것 319개 중 보관함에 남은 것은 23개뿐이었다 — 나머지는 아무도 안 찾는다)
import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { 계정목록, 미디어뿌리, 계정길 } from '../src/계정.mjs'

export const 기본날수 = 14

// 2026-08-31 — 「그날 마지막 판에만 치운다」를 만들었다가 **판마다 치우기**로 바꿨다.
// 마지막 판을 「지금 시(hour)」로 가리면 판이 시간대를 넘길 때 그날 정리가 통째로 빠지고,
// 마지막 판이 안 뜨면(멈춤·GAP_MIN) 조용히 사라진다. 치우는 값이 싸서 아낄 까닭이 없었다.
// run.mjs 는 `날수` 에 **이 판이 걸린 시간**을 넘긴다 — 그보다 먼저 받은 것만 치운다



// 보관함에 쟁여 둔 글 번호들. 파일이 **없으면** 빈 집합(정상), **깨졌으면** null(손대지 마라)
export async function 쟁인코드들(계정, 뿌리 = process.cwd()) {
  let 글
  try { 글 = await readFile(join(뿌리, 계정길(계정, '보관함.json')), 'utf8') }
  catch { return new Set() }          // 아직 쟁인 것이 없다. 정상이다
  try {
    const 것 = JSON.parse(글)
    if (!Array.isArray(것)) return null
    return new Set(것.map((p) => p?.code).filter(Boolean))
  } catch { return null }             // 깨졌다
}

const 크기재기 = async (길) => {
  let 합 = 0
  for (const 것 of await readdir(길, { withFileTypes: true }).catch(() => [])) {
    const 그것 = join(길, 것.name)
    합 += 것.isDirectory() ? await 크기재기(그것) : ((await stat(그것).catch(() => null))?.size ?? 0)
  }
  return 합
}

export const 사람크기 = (바이트) => {
  const 단위 = ['B', 'KB', 'MB', 'GB']
  let n = 바이트
  let i = 0
  while (n >= 1024 && i < 단위.length - 1) { n /= 1024; i++ }
  return `${n < 10 && i ? n.toFixed(1) : Math.round(n)}${단위[i]}`
}

// 한 계정에서 치울 것을 고른다. **지우지는 않는다** — 고르기와 지우기를 나눠야 마른 판이 된다
export async function 고르기(계정, { 뿌리 = process.cwd(), 날수 = 기본날수, 지금 = Date.now() } = {}) {
  const 받은곳 = join(뿌리, 미디어뿌리(계정), '받은것')
  // ⚠️ **없는 것과 깨진 것을 가른다.** 둘 다 빈 목록으로 삼키면, 보관함이 깨진 날
  // 쟁여 둔 글의 재료까지 지울 후보가 된다 (2026-08-31 검수)
  const 쟁인것 = await 쟁인코드들(계정, 뿌리)
  if (쟁인것 === null) return []   // 깨졌다 — 이 계정은 손대지 않는다
  const 것들 = []
  for (const 것 of await readdir(받은곳, { withFileTypes: true }).catch(() => [])) {
    if (!것.isDirectory()) continue
    if (쟁인것.has(것.name)) continue   // 아직 쓸 글이다. 안 건드린다
    const 길 = join(받은곳, 것.name)
    const 잰것 = await stat(길).catch(() => null)
    if (!잰것) continue
    const 지난날 = (지금 - 잰것.mtimeMs) / 86400000
    if (지난날 < 날수) continue
    것들.push({ 계정, code: 것.name, 길, 지난날: Math.floor(지난날), 크기: await 크기재기(길) })
  }
  return 것들
}

export async function 치우기({
  뿌리 = process.cwd(), 날수 = 기본날수, 실행 = false, 기록 = console.log, 계정들: 준계정들,
} = {}) {
  // 계정을 지정하면 그것만 본다 — 발행 마지막 판이 제 계정만 치울 때 쓴다
  const 계정들 = 준계정들 ?? await 계정목록(뿌리)
  const 전부 = []
  for (const 계정 of 계정들) 전부.push(...await 고르기(계정, { 뿌리, 날수 }))

  const 합 = 전부.reduce((a, b) => a + b.크기, 0)
  기록(`${날수}일보다 오래된 「받은것」 ${전부.length}개 · ${사람크기(합)}`)
  for (const 계정 of 계정들) {
    const 것들 = 전부.filter((r) => r.계정 === 계정)
    if (!것들.length) continue
    기록(`  ${(계정 || '첫 계정').padEnd(20)} ${String(것들.length).padStart(4)}개 · ` +
      사람크기(것들.reduce((a, b) => a + b.크기, 0)))
  }
  if (!실행) {
    기록('\n마른 판이다 — 아무것도 안 지웠다. 정말 지우려면 --실행 을 붙여라.')
    return { 것들: 전부, 크기: 합, 실행: false, 지운수: 0 }
  }
  let 지운수 = 0
  for (const r of 전부) {
    await rm(r.길, { recursive: true, force: true })
    지운수++
  }
  기록(`\n${지운수}개를 지웠다 — ${사람크기(합)} 를 비웠다.`)
  return { 것들: 전부, 크기: 합, 실행: true, 지운수 }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const 인자 = process.argv.slice(2)
  // 음수를 주면 오늘 받은 것까지 지운다. 0 은 거짓값이라 우연히 기본값으로 돌아가던 것도 함께 막는다
  const 준것 = Number(인자[인자.indexOf('--날') + 1])
  const 날수 = 인자.includes('--날') && Number.isFinite(준것) && 준것 >= 1 ? 준것 : 기본날수
  await 치우기({ 뿌리: process.cwd(), 날수, 실행: 인자.includes('--실행') })
}
