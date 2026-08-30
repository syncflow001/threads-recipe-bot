// 내려받은 영상을 공개 주소로 올린다 — 메타가 자기 CDN 영상 주소를 안 받기 때문이다
//
// npm 의존성을 늘리지 않으려고 이미 깔려 있는 Vercel CLI 를 부른다.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename } from 'node:path'

const 실행 = promisify(execFile)

// 올린 주소는 영구적이다. 같은 글을 다시 올릴 일은 없으니 덮어쓰기는 신경 쓰지 않는다.
export async function 올리기(파일경로, { 폴더 = 'threads', 토큰 = process.env.BLOB_READ_WRITE_TOKEN } = {}) {
  // 글마다 폴더를 나눈다. 안 그러면 01.mp4 가 서로 덮어쓴다
  if (!토큰) throw new Error('BLOB_READ_WRITE_TOKEN 이 없다')
  // 토큰은 인자로 넘기지 않는다. 인자는 오류 메시지와 프로세스 목록(ps)에 그대로 보인다.
  const { stdout, stderr } = await 실행('vercel', [
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
