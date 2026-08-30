// 발행 직전 마지막 문 — 원글에 없던 분량이 생긴 글을 막는다. 못 볼 때는 막는 쪽으로 실패한다
import { mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { 미디어뿌리 } from './계정.mjs'

// 계정마다 제 폴더다 (2026-08-29). 계정 칸이 없던 옛 글은 주인을 모르니 따로 둔다 —
// 아무 계정 폴더에나 넣으면 그 계정 화면에 남의 글이 뜬다
const 보류함 = (뿌리, 계정) => (계정
  ? join(뿌리, 미디어뿌리(계정), '막힌것')
  : join(뿌리, 'media', '막힌것.주인모름'))
const 배열인가 = (것) => Array.isArray(것) && 것.every((x) => typeof x === 'string')

// 관문이 못 돌 때 통과시키면 관문이 없는 것보다 나쁘다 — 있다고 믿고 방심하기 때문이다.
// 그래서 모양이 조금이라도 어긋나면 막는다 (fail-closed)
const 못봄 = (설명) => ({ 판정: '막음', 까닭: [{ 종류: '못봄', 무엇: '수량경고', 설명 }] })

export function 판정(글) {
  const w = 글?.수량경고
  if (!w || typeof w !== 'object') return 못봄('수량경고가 없어서 글을 검사하지 못했다')
  if (!배열인가(w.추가됨) || !배열인가(w.빠짐) || !배열인가(w.깨짐 ?? [])) {
    return 못봄('수량경고의 모양이 예상과 달라 믿을 수 없다')
  }

  // 원글에 없던 분량이 생긴 것은 LLM 이 지어낸 것이다. 요리 글에서 실제 피해로 이어진다
  if (w.추가됨.length) {
    return {
      판정: '막음',
      까닭: w.추가됨.map((무엇) => ({ 종류: '날조', 무엇, 설명: '원글에 없던 분량이다' })),
    }
  }

  // 원글 분량이 빠진 것은 날조가 아니라 요약이다. 글자 깨짐은 사람이 봐야 하지만 거짓은 아니다.
  // 이런 것까지 막으면 곧 아무것도 안 나가게 된다
  const 주의 = [
    ...w.빠짐.map((무엇) => ({ 종류: '빠짐', 무엇, 설명: '원글에 있던 분량이 사라졌다' })),
    ...(w.깨짐 ?? []).map((무엇) => ({ 종류: '깨짐', 무엇, 설명: '분량꼴이 원글과 다르다' })),
  ]
  return 주의.length ? { 판정: '주의', 까닭: 주의 } : { 판정: '통과', 까닭: [] }
}

export async function 막힌글적기(code, 글, 판정결과, 뿌리 = process.cwd(), 계정 = '') {
  const 곳 = join(보류함(뿌리, 계정), code)
  await mkdir(곳, { recursive: true })
  await writeFile(join(곳, '재구성.json'), JSON.stringify(글, null, 2))
  // 계정 칸은 2026-08-29 에 생겼다. 이게 없으면 모든 계정 화면에 남의 글이 뜬다
  await writeFile(join(곳, '까닭.json'), JSON.stringify({
    때: new Date().toISOString(), 판정: 판정결과.판정, 까닭: 판정결과.까닭, 계정,
  }, null, 2))
  return 곳
}

// 계정을 주면 그 계정 폴더만 본다. 안 주면(null) 주인 모르는 것까지 다 본다 — 옮기는 도구가 쓴다
export async function 막힌글들(뿌리 = process.cwd(), 계정 = null) {
  const 볼곳들 = 계정 != null ? [보류함(뿌리, 계정)] : [보류함(뿌리, '')]
  const 모음 = []
  for (const 자리 of 볼곳들) {
  let 폴더 = []
  try { 폴더 = await readdir(자리) } catch { continue }
  for (const code of 폴더) {
    const 곳 = join(자리, code)
    const 글 = await readFile(join(곳, '재구성.json'), 'utf8').then(JSON.parse).catch(() => null)
    const 까닭 = await readFile(join(곳, '까닭.json'), 'utf8').then(JSON.parse).catch(() => null)
    if (!글 || !까닭) continue // 반쪽짜리는 보여 주지 않는다. 틀린 것을 보여주느니 감춘다
    // 계정을 주면 그 계정 것만. 계정 칸이 없는 옛 글은 어느 계정 것인지 알 수 없어 뺀다 —
    // 넣으면 계정마다 남의 글이 계속 뜬다 (2026-08-29 에 이걸 고쳤다)
    if (계정 != null && (까닭.계정 ?? '') !== 계정) continue
    모음.push({
      code,
      때: 까닭.때 ?? await stat(곳).then((s) => s.mtime.toISOString()).catch(() => ''),
      계정: 까닭.계정 ?? '',
      본문: String(글.본문 ?? '').slice(0, 300),
      까닭: 까닭.까닭 ?? [],
    })
  }
  }
  return 모음.sort((a, b) => String(b.때).localeCompare(String(a.때)))
}

export async function 막힌글버리기(code, 뿌리 = process.cwd(), 계정 = '') {
  // code 는 화면에서 온다. 경로 조각이 섞이면 보류함 밖을 지울 수 있다
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new Error('글 이름이 이상합니다')
  await rm(join(보류함(뿌리, 계정), code), { recursive: true, force: true })
}
