// 사진과 영상 자체로 중복을 잡는다 — 원글 번호가 달라도 같은 미디어면 걸린다

// 왜 필요한가. 남의 글을 베끼는 계정이 많아 같은 영상이 여러 원글에 올라온다.
// 실측 — 치즈폭탄 또띠아파이 두 편의 영상은 sha256 이 완전히 같았다 (2,528,100바이트 동일).
//
// 네 가지를 함께 쓴다. 하나가 놓쳐도 다른 것이 잡는다.
//   ① 바이트 해시 — 파일이 통째로 같으면 확실하다
//   ② 그림 해시   — 형식·크기만 바뀐 것을 잡는다 (webp↔jpg 가 2비트, 재인코딩 영상이 1비트)
//   ③ 가운데 해시 — 잘라낸 것을 잡는다. 내 가운데 80% 를 미리 재 두면
//                   남이 20% 잘라 올린 것과 0비트로 맞는다 (실측)
//   ④ 소리 해시   — 화면을 잘라도 소리는 안 바뀐다. 20% 크롭이 0/39 비트였다.
//                   다른 영상과는 17/39 비트로 뚜렷이 갈린다
//
// ①②③ 는 맥에 딸린 sips 로 되고, 영상과 ④ 는 ffmpeg 이 있어야 한다.
// ffmpeg 이 없으면 그 겹만 조용히 놀고 나머지는 그대로 돈다.

import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir, mkdir, rm, mkdtemp } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, extname, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const 실행 = promisify(execFile)

export const 기본날수 = 30
// 무관한 글 481짝을 재 보니 가장 가까운 것이 14비트였다 ("참치 감자 짜글이"↔"고깃집 된장찌개").
// 진짜 중복은 0~8비트다. 그 사이에 여유를 두고 8 로 잡는다
export const 그림문턱 = 8
export const 소리문턱 = 4 // 39비트 중. 같은 영상 0, 다른 영상 17 이었다
export const 가로칸 = 9 // 오른쪽 이웃과 견주므로 한 칸 넓게 뽑는다
export const 세로칸 = 8
export const 가운데비율 = 0.8
export const 볼시각 = [1, 3] // 앞쪽만 보면 검은 화면이나 인트로가 걸린다
export const 장부길 = (뿌리) => `${뿌리}/미디어지문.json`

const 그림꼴 = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'])
const 영상꼴 = new Set(['.mp4', '.mov', '.m4v', '.webm'])
const 볼파일 = (이름) => !이름.endsWith('.json') && !이름.startsWith('.')
const 방만들기 = () => mkdtemp(join(tmpdir(), '지문-'))

export async function 바이트해시(길) {
  return createHash('sha256').update(await readFile(길)).digest('hex')
}

// 밝기값을 오른쪽 이웃과 견줘 밝으면 1 로 적는다 (차이해시).
// 밝기 자체가 아니라 밝기의 '기울기' 를 보므로 전체가 밝거나 어두운 것에 안 흔들린다.
// 평균해시를 쓰다가 파스타와 잔치국수가 4비트 차이로 걸린 적이 있다 — 그래서 바꿨다.
// 한 방향으로만 밋밋한 것은 아무 데나 걸리므로 안 쓴다
export function 밝기로해시(값들, 너비 = 가로칸, 높이 = 세로칸) {
  if (!값들 || 값들.length !== 너비 * 높이) return null
  const 비트 = []
  for (let y = 0; y < 높이; y += 1) {
    for (let x = 0; x < 너비 - 1; x += 1) {
      비트.push(값들[y * 너비 + x] > 값들[y * 너비 + x + 1] ? '1' : '0')
    }
  }
  const 값 = 비트.join('')
  return /^0+$|^1+$/.test(값) ? null : 값
}

function bmp에서밝기(b) {
  const 시작 = b.readUInt32LE(10)
  const 너비 = b.readInt32LE(18)
  const 높이 = Math.abs(b.readInt32LE(22))
  const 비트 = b.readUInt16LE(28)
  const 줄바이트 = Math.floor((비트 * 너비 + 31) / 32) * 4
  const 값 = []
  for (let y = 0; y < 높이; y += 1) {
    for (let x = 0; x < 너비; x += 1) {
      const o = 시작 + y * 줄바이트 + x * (비트 / 8)
      값.push((b[o] + b[o + 1] + b[o + 2]) / 3)
    }
  }
  return 값
}

// 사진 하나에서 전체 지문과 가운데 지문을 만든다.
// sips 는 webp 로 '쓰지' 를 못해서 출력 형식을 반드시 준다.
// 자르기와 줄이기를 한 번에 주면 9×8 이 아니라 7×6 이 나온다 — 나눠 부른다
export async function 그림해시들(길) {
  if (!그림꼴.has(extname(길).toLowerCase())) return []
  const 방 = await 방만들기()
  const 나온것 = []
  try {
    const 재기 = async (원본) => {
      const 작은것 = join(방, `${Math.random().toString(36).slice(2)}.bmp`)
      await 실행('sips', ['-s', 'format', 'bmp', '-z', String(세로칸), String(가로칸), 원본, '--out', 작은것])
      return 밝기로해시(bmp에서밝기(await readFile(작은것)))
    }
    const 전체 = await 재기(길)
    if (전체) 나온것.push(전체)

    const { stdout } = await 실행('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', 길])
    const W = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1])
    const H = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1])
    if (W > 0 && H > 0) {
      const 자른것 = join(방, '가운데.png')
      await 실행('sips', ['-s', 'format', 'png', '-c',
        String(Math.round(H * 가운데비율)), String(Math.round(W * 가운데비율)), 길, '--out', 자른것])
      const 가운데 = await 재기(자른것)
      if (가운데 && !나온것.includes(가운데)) 나온것.push(가운데)
    }
  } catch { /* sips 가 못 읽는 파일은 건너뛴다 */ } finally {
    await rm(방, { recursive: true, force: true })
  }
  return 나온것
}

// 영상은 바이트가 같을 때만 잡히면 약하다 — 다시 올리면 바이트가 달라진다.
// ffmpeg 이 회색 원시값을 그대로 뱉어 주므로 파일을 거치지 않는다
export async function 장면해시들(길, { 시각들 = 볼시각 } = {}) {
  if (!영상꼴.has(extname(길).toLowerCase())) return []
  const 나온것 = []
  const 자르기 = `crop=iw*${가운데비율}:ih*${가운데비율},`
  for (const 초 of 시각들) {
    for (const [이름, 앞] of [['전체', ''], ['가운데', 자르기]]) {
      try {
        const { stdout } = await 실행('ffmpeg',
          ['-v', 'error', '-ss', String(초), '-i', 길, '-frames:v', '1',
            '-vf', `${앞}scale=${가로칸}:${세로칸}`, '-pix_fmt', 'gray', '-f', 'rawvideo', '-'],
          { encoding: 'buffer', maxBuffer: 1 << 20 })
        const h = 밝기로해시([...stdout])
        if (h && !나온것.includes(h)) 나온것.push(h)
      } catch { void 이름 /* 그 시각이 끝을 넘었거나 ffmpeg 이 없다 */ }
    }
  }
  return 나온것
}

// 화면을 잘라내도 소리는 그대로다. 크롭을 잡는 가장 확실한 길이다.
// 앞 20초를 8000Hz 홑소리로 줄여 마흔 칸의 세기를 재고, 이웃과 견줘 1/0 으로 적는다
export async function 소리해시(길, { 초 = 20, 칸수 = 40 } = {}) {
  if (!영상꼴.has(extname(길).toLowerCase())) return null
  try {
    const { stdout } = await 실행('ffmpeg',
      ['-v', 'error', '-i', 길, '-t', String(초), '-ac', '1', '-ar', '8000', '-f', 's16le', '-'],
      { encoding: 'buffer', maxBuffer: 1 << 26 })
    const 표본수 = Math.floor(stdout.length / 2)
    const 칸크기 = Math.floor(표본수 / 칸수)
    if (칸크기 < 100) return null // 너무 짧으면 지문이 안 된다
    const 세기 = []
    for (let k = 0; k < 칸수; k += 1) {
      let 합 = 0
      for (let i = 0; i < 칸크기; i += 1) 합 += Math.abs(stdout.readInt16LE((k * 칸크기 + i) * 2))
      세기.push(합 / 칸크기)
    }
    const 값 = 세기.slice(0, -1).map((v, i) => (v > 세기[i + 1] ? '1' : '0')).join('')
    // 소리가 없거나 한결같으면 아무 영상에나 걸린다
    return /^0+$|^1+$/.test(값) ? null : 값
  } catch {
    return null
  }
}

export function 다른비트수(가, 나) {
  if (!가 || !나 || 가.length !== 나.length) return Infinity
  let 수 = 0
  for (let i = 0; i < 가.length; i += 1) if (가[i] !== 나[i]) 수 += 1
  return 수
}

// 한 글의 미디어 폴더를 통째로 훑어 지문을 만든다
export async function 지문만들기(폴더) {
  let 이름들 = []
  try { 이름들 = (await readdir(폴더)).filter(볼파일) } catch { return { 바이트: [], 그림: [], 소리: [] } }
  const 바이트 = []
  const 그림 = []
  const 소리 = []
  for (const 이름 of 이름들.sort()) {
    const 길 = join(폴더, 이름)
    try {
      바이트.push(await 바이트해시(길))
      // 사진 지문과 영상 장면 지문을 한 칸에 담는다. 비교하는 코드를 따로 둘 이유가 없다
      for (const h of await 그림해시들(길)) if (!그림.includes(h)) 그림.push(h)
      for (const h of await 장면해시들(길)) if (!그림.includes(h)) 그림.push(h)
      const s = await 소리해시(길)
      if (s && !소리.includes(s)) 소리.push(s)
    } catch { /* 못 읽는 파일은 건너뛴다 */ }
  }
  return { 바이트, 그림, 소리 }
}

async function 읽기(뿌리) {
  try {
    const 것 = JSON.parse(await readFile(장부길(뿌리), 'utf8'))
    return Array.isArray(것) ? 것 : []
  } catch {
    return []
  }
}

const 빈지문 = (지문) => !지문?.바이트?.length && !지문?.그림?.length && !지문?.소리?.length

// 같은 미디어를 이미 올렸으면 그 기록을 돌려준다. 없으면 null
export async function 이미올린미디어(지문, { 뿌리, 날수 = 기본날수, 지금 = Date.now(), 문턱 = 그림문턱, 소리기준 = 소리문턱 } = {}) {
  if (빈지문(지문)) return null
  const 만료 = 지금 - 날수 * 24 * 60 * 60 * 1000
  for (const 기록 of (await 읽기(뿌리)).filter((r) => (r.올린때 ?? 0) >= 만료)) {
    if ((기록.바이트 ?? []).some((h) => 지문.바이트.includes(h))) return { ...기록, 까닭: '같은 파일' }
    for (const g of 지문.그림 ?? []) {
      if ((기록.그림 ?? []).some((h) => 다른비트수(g, h) <= 문턱)) return { ...기록, 까닭: '같은 그림' }
    }
    for (const s of 지문.소리 ?? []) {
      if ((기록.소리 ?? []).some((h) => 다른비트수(s, h) <= 소리기준)) return { ...기록, 까닭: '같은 소리' }
    }
  }
  return null
}

export async function 미디어적기(지문, code, { 뿌리, 지금 = Date.now() } = {}) {
  if (빈지문(지문)) return
  const 장부 = await 읽기(뿌리)
  장부.push({ code, 바이트: 지문.바이트, 그림: 지문.그림, 소리: 지문.소리 ?? [], 올린때: 지금 })
  await mkdir(dirname(장부길(뿌리)), { recursive: true })
  await writeFile(장부길(뿌리), `${JSON.stringify(장부, null, 1)}\n`)
}
