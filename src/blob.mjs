// 내려받은 영상을 공개 주소로 올린다 — 메타가 자기 CDN 영상 주소를 안 받기 때문이다
//
// npm 의존성을 늘리지 않으려고 이미 깔려 있는 Vercel CLI 를 부른다.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename } from 'node:path'

const 실행 = promisify(execFile)

// ⚠️ **올린 것은 반드시 지운다** (2026-09-06). 예전 주석은 「올린 주소는 영구적이다」였는데,
// 그 말대로 한 번도 안 지워서 **19일치 404개가 쌓여 1GB 한도를 꽉 채웠다.**
// 그날 다섯 계정의 발행이 통째로 죽었다 — `Storage quota exceeded for Hobby plan (1GB maximum)`.
//
// 왜 지워도 되나. **메타는 우리 주소에서 한 번 받아 가고, 그 뒤로는 제 CDN 에서 내보낸다.**
// 실측 (2026-09-06) — 우리가 올린 영상 글의 `media_url` 이 전부 `scontent-…cdninstagram.com` 이었다.
// 블롭은 **발행하는 그 순간에만** 있으면 된다.
// 한도가 찼다는 말인가. 이 말이 오면 치우고 한 번 더 해 본다
export const 한도찼나 = (글) => /quota exceeded|storage limit|maximum/i.test(String(글 ?? ''))

export async function 올리기(파일경로, opts = {}) {
  try {
    return await 한번올리기(파일경로, opts)
  } catch (e) {
    // ⚠️ **스스로 치우고 다시 해 본다** (2026-09-06). 한도가 차서 다섯 계정이 하루 죽었는데,
    // 치우는 길이 아예 없어서 사람이 손대기 전까지 판마다 같은 자리에서 죽었다.
    // 48시간을 남기므로 지금 다른 계정이 올리는 중인 것은 안 지운다
    if (!한도찼나(e.message)) throw e
    const r = await 묵은것치우기({ 남길시간: 48, ...opts }).catch(() => null)
    if (!r?.지운수) throw e
    return 한번올리기(파일경로, opts)
  }
}

// `실행기` 는 검사가 갈아 끼운다 — 진짜 CLI 를 부르면 한도가 찬 상태를 시험해 볼 수가 없다
async function 한번올리기(파일경로, {
  폴더 = 'threads', 토큰 = process.env.BLOB_READ_WRITE_TOKEN, 실행기 = 실행,
} = {}) {
  // 글마다 폴더를 나눈다. 안 그러면 01.mp4 가 서로 덮어쓴다
  if (!토큰) throw new Error('BLOB_READ_WRITE_TOKEN 이 없다')
  // 토큰은 인자로 넘기지 않는다. 인자는 오류 메시지와 프로세스 목록(ps)에 그대로 보인다.
  const { stdout, stderr } = await 실행기('vercel', [
    'blob', 'put', 파일경로,
    '--pathname', `${폴더}/${basename(파일경로)}`,
    '--access', 'public',
    // 같은 글을 다시 올릴 때 파일 이름이 겹친다. 내용이 같으니 덮어써도 된다
    '--allow-overwrite',
    '--no-color',
  ], {
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, BLOB_READ_WRITE_TOKEN: 토큰 },
  })

  // CLI 는 사람이 읽는 글을 뱉는다. 그 안에서 주소만 건진다.
  const 주소 = `${stdout}\n${stderr}`.match(/https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/\S+/)?.[0]
  if (!주소) throw new Error(`업로드 주소를 못 찾았다: ${(stdout + stderr).slice(0, 200)}`)
  return 주소.replace(/[)"',]+$/, '')
}

// 우리가 올린 것을 지운다. **못 지워도 던지지 않는다** — 치우다 실패해서 발행을 죽이면
// 아끼려던 것보다 큰 것을 잃는다. 몇 개를 지웠는지만 돌려준다
export async function 지우기(주소들, { 토큰 = process.env.BLOB_READ_WRITE_TOKEN, 실행기 = 실행 } = {}) {
  const 것들 = [...new Set((주소들 ?? []).filter((v) => typeof v === 'string' && v.trim()))]
  if (!것들.length || !토큰) return { 지운수: 0, 안됨: [] }
  const 안됨 = []
  let 지운수 = 0
  // CLI 가 한 번에 여럿을 받는다. 한 묶음이 죽어도 나머지는 살리려고 나눠 부른다
  for (let i = 0; i < 것들.length; i += 50) {
    const 묶음 = 것들.slice(i, i + 50)
    try {
      await 실행기('vercel', ['blob', 'del', ...묶음, '--no-color'],
        { maxBuffer: 10 * 1024 * 1024, env: { ...process.env, BLOB_READ_WRITE_TOKEN: 토큰 } })
      지운수 += 묶음.length
    } catch (e) { 안됨.push(e.message) }
  }
  return { 지운수, 안됨 }
}

// 「19d」·「15h」·「30m」 처럼 사람이 읽는 나이를 시간으로 바꾼다.
// ⚠️ 못 알아본 것은 **0 이 아니라 null 이다.** 0 으로 두면 「방금 올린 것」이 되어
// 치우기가 영영 안 지우고, 반대로 크게 잡으면 지금 쓰는 것을 지운다. 모르면 안 건드린다
export function 나이시간(글) {
  const m = String(글 ?? '').trim().match(/^(\d+(?:\.\d+)?)\s*([smhdwy])$/i)
  if (!m) return null
  const 곱 = { s: 1 / 3600, m: 1 / 60, h: 1, d: 24, w: 168, y: 8760 }
  return Number(m[1]) * 곱[m[2].toLowerCase()]
}

// 블롭 store 에 무엇이 남아 있나. CLI 는 사람이 읽는 표를 뱉으므로 줄에서 캐낸다
export async function 목록({ 토큰 = process.env.BLOB_READ_WRITE_TOKEN, 실행기 = 실행, 최대판 = 40 } = {}) {
  if (!토큰) throw new Error('BLOB_READ_WRITE_TOKEN 이 없다')
  const 것들 = []
  let 커서 = null
  for (let 판 = 0; 판 < 최대판; 판 += 1) {
    const { stdout, stderr } = await 실행기('vercel',
      ['blob', 'list', '--limit', '1000', '--no-color', ...(커서 ? ['--next', 커서] : [])],
      { maxBuffer: 60 * 1024 * 1024, env: { ...process.env, BLOB_READ_WRITE_TOKEN: 토큰 } })
    const 글 = `${stdout}\n${stderr}`
    for (const 줄 of 글.split('\n')) {
      const m = 줄.match(/^\s+(\S+)\s+(\d+)\s+(\S+)\s+(https:\S+)/)
      if (m) 것들.push({ 나이: m[1], 시간: 나이시간(m[1]), 크기: Number(m[2]), 길: m[3], url: m[4] })
    }
    커서 = 글.match(/--next\s+(\S+)/)?.[1] ?? null
    if (!커서) break
  }
  return 것들
}

// 묵은 것을 치운다. **나이를 못 읽은 것은 안 건드린다** (위 `나이시간` 참고).
// 발행이 끝나면 그 자리에서 지우지만(run.mjs), 판이 중간에 죽으면 그때 올린 것이 남는다.
// 이 함수가 그 찌꺼기를 걷는 그물이다 — 하루 한 번 예약으로 돈다
export async function 묵은것치우기({ 남길시간 = 48, ...opts } = {}) {
  const 것들 = await 목록(opts)
  const 지울것 = 것들.filter((b) => b.시간 != null && b.시간 >= 남길시간)
  const { 지운수, 안됨 } = await 지우기(지울것.map((b) => b.url), opts)
  return {
    전체: 것들.length,
    지운수,
    안됨,
    아낀바이트: 지울것.slice(0, 지운수).reduce((a, b) => a + b.크기, 0),
    남은바이트: 것들.reduce((a, b) => a + b.크기, 0) - 지울것.slice(0, 지운수).reduce((a, b) => a + b.크기, 0),
    나이못읽음: 것들.filter((b) => b.시간 == null).length,
  }
}

// 발행 직전에 부른다. 메타 CDN 영상만 우리 주소로 갈아 끼우고 나머지는 그대로 둔다.
export async function 영상갈아끼우기(미디어 = [], { 받은폴더, code, ...opts } = {}) {
  const 결과 = []
  for (const [i, m] of 미디어.entries()) {
    if (m.종류 !== '영상') { 결과.push(m); continue }
    try {
      const 파일 = `${받은폴더}/${String(i + 1).padStart(2, '0')}.mp4`
      결과.push({ ...m, url: await 올리기(파일, { 폴더: `threads/${code}`, ...opts }), 우리가올림: true })
    } catch (e) {
      // 못 올렸으면 조용히 빼는 게 낫다. 메타 주소를 그대로 두면 발행 전체가 실패한다
      결과.push({ ...m, 올리기실패: e.message })
    }
  }
  return 결과
}
