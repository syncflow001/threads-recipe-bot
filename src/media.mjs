// 게시물의 영상·이미지를 내려받고, 한 번 쓴 것은 옮겨서 다시 올리지 않게 한다
//
// media/받은것/{code}/   — 내려받았지만 아직 안 쓴 것
// media/쓴것/{code}/     — 발행에 쓴 것. 여기 있으면 다시 내려받지 않는다
import { mkdir, rename, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

export const 기본뿌리 = 'media'
const 받은곳 = (뿌리) => join(뿌리, '받은것')
const 쓴곳 = (뿌리) => join(뿌리, '쓴것')

const 있나 = async (p) => {
  try { await access(p); return true } catch { return false }
}

export const 이미썼나 = (code, 뿌리 = 기본뿌리) => 있나(join(쓴곳(뿌리), code))

// 중복 방지는 여기서 끝난다. 이미 쓴 것이면 내려받지도 않는다.
export async function 내려받기(게시물, { 뿌리 = 기본뿌리, fetch: 가져오기 = fetch } = {}) {
  const { code, 미디어 = [] } = 게시물
  if (await 이미썼나(code, 뿌리)) return { code, 건너뜀: '이미 쓴 것', 파일: [], 실패: [] }

  const 폴더 = join(받은곳(뿌리), code)
  await mkdir(폴더, { recursive: true })

  const 파일 = []
  const 실패 = []
  for (const [i, m] of 미디어.entries()) {
    const 이름 = `${String(i + 1).padStart(2, '0')}.${확장자(m)}`
    try {
      const res = await 가져오기(m.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await writeFile(join(폴더, 이름), Buffer.from(await res.arrayBuffer()))
      파일.push(이름)
    } catch (e) {
      // 조용히 넘기지 않는다. 미디어가 빠진 채로 발행되면 사람이 알아야 한다.
      실패.push({ 이름, url: m.url, 이유: String(e.message ?? e) })
    }
  }

  // 본문·자막·OCR 을 미디어 옆에 같이 둔다. 재구성 단계가 이 폴더만 보면 되게 한다.
  await writeFile(join(폴더, 'post.json'), JSON.stringify(게시물, null, 2))
  return { code, 폴더, 파일, 실패 }
}

// 스레드 이미지는 .jpg 가 아니라 WebP 로 온다. 이름과 내용이 다르면 발행 API 가 거부할 수 있어
// 주소에 적힌 실제 확장자를 쓴다. 못 읽으면 종류로 넘겨짚는다.
function 확장자(m) {
  let ext
  try {
    ext = new URL(m.url).pathname.match(/\.(mp4|webp|jpe?g|png|heic|gif)$/i)?.[1]?.toLowerCase()
  } catch {}
  return ext ?? (m.종류 === '영상' ? 'mp4' : 'jpg')
}

// 발행에 쓴 뒤 부른다. 옮겨야 중복 방지가 작동한다.
export async function 썼다표시(code, 뿌리 = 기본뿌리) {
  const 목적지 = join(쓴곳(뿌리), code)
  if (await 있나(목적지)) return 목적지 // 이미 옮겼다. 두 번 불러도 탈나지 않는다
  await mkdir(쓴곳(뿌리), { recursive: true })
  await rename(join(받은곳(뿌리), code), 목적지)
  return 목적지
}

// 아직 안 쓴 게시물만 남긴다. 수집 직후에 걸러 상세 요청·내려받기를 아낀다.
export async function 안쓴것만(목록, 뿌리 = 기본뿌리) {
  const 판정 = await Promise.all(목록.map((p) => 이미썼나(p.code, 뿌리)))
  return 목록.filter((_, i) => !판정[i])
}
