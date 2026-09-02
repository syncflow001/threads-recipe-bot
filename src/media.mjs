// 게시물의 영상·이미지를 내려받고, 한 번 쓴 것은 옮겨서 다시 올리지 않게 한다
//
// media/받은것/{code}/   — 내려받았지만 아직 안 쓴 것
// media/쓴것/{code}/     — 발행에 쓴 것. 여기 있으면 다시 내려받지 않는다
import './그물.mjs'   // IPv6 헛디딤 막기 (부수 효과) — 왜인지는 그 파일 머리에 있다
import { mkdir, rename, writeFile, access, rm } from 'node:fs/promises'
import { join } from 'node:path'

export const 기본뿌리 = 'media'
// 스레드 글 번호꼴 (src/홈수집.mjs 이 뽑는 것과 같다)
const code꼴 = /^[A-Za-z0-9_-]{1,64}$/
const 받은곳 = (뿌리) => join(뿌리, '받은것')
const 쓴곳 = (뿌리) => join(뿌리, '쓴것')

const 있나 = async (p) => {
  try { await access(p); return true } catch { return false }
}

export const 이미썼나 = (code, 뿌리 = 기본뿌리) => 있나(join(쓴곳(뿌리), code))

// 지문을 재 볼 **엿보기 한 장**을 먼저 받는다. 사진이 있으면 사진부터 — 영상은 보통 스무 배 크다
// (실측: 영상 5.1MB · 사진 257KB). 겹치는 글이면 여기서 멈추니 나머지를 안 받는다
export function 엿볼차례(미디어 = []) {
  if (!미디어.length) return []   // 미디어가 없는 글. 없는 칸을 가리키면 확장자() 에서 터진다
  const 첫사진 = 미디어.findIndex((m) => m?.종류 === '이미지')
  const 앞 = 첫사진 >= 0 ? 첫사진 : 0
  return [앞, ...미디어.map((_, i) => i).filter((i) => i !== 앞)]
}

// 중복 방지는 여기서 끝난다. 이미 쓴 것이면 내려받지도 않는다.
//
// `엿보기` 를 주면 **첫 한 장을 받은 뒤 한 번 물어본다.** 까닭을 돌려주면 거기서 멈추고
// 받다 만 폴더를 지운다 — 겹치는 글의 영상까지 받아 두고 버리던 것을 막는다 (2026-08-31).
//
// ⚠️ **얼마나 아끼나 — 실측 27%다** (겹친 글 아홉 편 23.4MB → 17.0MB).
// 처음에 94% 라 적었다가 검수에서 뒤집혔다. 사진 한 장으로는 아홉 중 여섯만 잡는다.
// 특히 **「같은 소리」로만 걸리는 겹침은 원리상 영영 못 잡는다** — 소리 지문은 영상에서만
// 나오는데 엿보기는 사진이다. 놓친 셋이 겹친 양의 69% 를 들고 있었다.
// 그래도 헛걸림은 **하나도 안 늘어난다** — 한 장의 지문은 온전한 지문의 부분집합이고
// 견주기가 「하나라도 맞나」라서, 미리 걸린 것은 온전한 검사도 반드시 건다
export async function 내려받기(게시물, { 뿌리 = 기본뿌리, fetch: 가져오기 = fetch, 엿보기 } = {}) {
  const { code, 미디어 = [] } = 게시물
  // ⚠️ 이 함수는 이제 **지우기도 한다**(엿보기가 겹침을 알리면 받다 만 폴더를 지운다).
  // code 가 빈 값이면 join 이 받은것 폴더 자체를 가리켜 **그 계정 것이 통째로 날아간다.**
  // 지우는 함수는 지울 자리를 제 손으로 확인한다 (2026-08-31 검수)
  if (!code꼴.test(String(code ?? ''))) return { code, 건너뜀: '이상한 글 번호', 파일: [], 실패: [] }
  if (await 이미썼나(code, 뿌리)) return { code, 건너뜀: '이미 쓴 것', 파일: [], 실패: [] }

  const 폴더 = join(받은곳(뿌리), code)
  await mkdir(폴더, { recursive: true })

  const 파일 = []
  const 실패 = []
  const 차례 = 엿보기 ? 엿볼차례(미디어) : 미디어.map((_, i) => i)
  for (const [몇번째, i] of 차례.entries()) {
    const m = 미디어[i]
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
    // 첫 한 장을 받은 뒤 한 번만 물어본다. 받은 게 없으면 물어볼 것도 없다.
    // ⚠️ **폴더가 아니라 방금 받은 파일 이름을 넘긴다.** 폴더를 넘기면 지난 판이 남긴
    // 파일까지 함께 재게 되어, 「사진 한 장만 봤다」는 말이 거짓이 되고 판정이
    // 찌꺼기가 남았는지에 따라 달라진다 (2026-08-31 검수)
    if (엿보기 && 몇번째 === 0 && 파일.length) {
      const 까닭 = await 엿보기(폴더, 파일[0], code).catch(() => null)
      if (까닭) {
        await rm(폴더, { recursive: true, force: true })
        return { code, 건너뜀: 까닭, 겹침: 까닭, 파일: [], 실패 }
      }
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
