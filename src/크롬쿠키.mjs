// 사람이 늘 쓰는 크롬의 쿠키 저장소에서 스레드 쿠키를 꺼낸다 — 프로필(계정 칸)마다 따로 읽는다
//
// 왜 있나. 2026-09-08 사용자가 정했다 — 「본 크롬 새 탭에서 진행하게 해 달라」.
// 옛 길(도구/쿠키받기.mjs)은 플레이라이트가 **제 크롬 창**을 따로 띄웠다. 그 창은 프로필이 달라
// 계정마다 새로 로그인해야 했다. 사용자는 이미 본 크롬의 프로필 13개에 계정마다 로그인해 두고 있다 —
// 그것을 그대로 쓰면 로그인이 아예 필요 없다.
//
// ⚠️ **쿠키 값은 어디에도 찍지 않는다.** 이 파일이 돌려주는 것은 부르는 쪽이 파일에 넣을 값이다.
//
// ⚠️ 깨지기 쉬운 길이라는 것을 알고 쓴다 (사용자에게 알리고 골랐다). 크롬이 저장 방식을 바꾸면
//    여기가 먼저 깨진다. 그래서 **못 읽으면 조용히 빈손을 주지 않고 까닭을 말한다** —
//    틀린 쿠키를 넣느니 아무것도 안 넣는 편이 낫다.
import { DatabaseSync } from 'node:sqlite'
import { execFile } from 'node:child_process'
import { copyFile, mkdtemp, rm, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { pbkdf2Sync, createDecipheriv, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const 실행 = promisify(execFile)

export const 크롬뿌리 = () => join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome')

// 맥 키체인에 든 크롬의 「금고 열쇠」. 처음 부를 때 맥이 허용 창을 띄운다 — 사람이 눌러 줘야 한다
export async function 금고열쇠({ 실행하기 = 실행 } = {}) {
  const { stdout } = await 실행하기('security', ['find-generic-password', '-w', '-s', 'Chrome Safe Storage'])
    .catch(() => { throw new Error('키체인거부') })
  const 비밀 = String(stdout).trim()
  if (!비밀) throw new Error('키체인거부')
  // 크롬이 정해 둔 값이다 — 우리가 고르는 것이 아니다
  return pbkdf2Sync(비밀, 'saltysalt', 1003, 16, 'sha1')
}

// 크롬은 값을 'v10' + AES-128-CBC 로 넣어 둔다. IV 는 공백 16개다.
// ⚠️ 크롬 130 부터 **평문 앞에 도메인 SHA256 32바이트**가 붙는다. 안 떼면 값이 통째로 어긋난다 —
//    도메인 지문과 실제로 견줘 보고 맞을 때만 뗀다 (버전마다 다르니 넘겨짚지 않는다)
export function 값풀기(암호문, 열쇠, 도메인) {
  if (!암호문?.length) return ''
  const 머리 = Buffer.from(암호문).subarray(0, 3).toString('latin1')
  if (머리 !== 'v10') return Buffer.from(암호문).toString('utf8') // 옛 크롬이 안 잠그고 넣은 값
  const 몸 = Buffer.from(암호문).subarray(3)
  const 푸는이 = createDecipheriv('aes-128-cbc', 열쇠, Buffer.alloc(16, 0x20))
  let 평문 = Buffer.concat([푸는이.update(몸), 푸는이.final()])
  const 지문 = createHash('sha256').update(도메인).digest()
  if (평문.length >= 32 && 평문.subarray(0, 32).equals(지문)) 평문 = 평문.subarray(32)
  return 평문.toString('utf8')
}

// 크롬 시각은 **1601년부터 잰 마이크로초**다. 0 이면 「창 닫으면 지워지는」 쿠키라 안 따진다.
// ⚠️ 마이크로초 그대로는 자바스크립트가 정확히 담을 수 있는 크기를 넘어 `node:sqlite` 가 통째로 던진다
//    (2026-09-08 실측 — 13462001090256144). 그래서 **SQL 에서 초로 줄여** 받는다. 여기 들어오는 것은 초다
export const 지났나 = (만료초) => {
  const v = Number(만료초 ?? 0)
  if (!v) return false
  return (v - 11644473600) * 1000 < Date.now()
}

// 프로필 한 칸의 쿠키를 읽는다. 크롬이 켜져 있으면 원본이 잠겨 있어 **사본을 떠서** 읽는다
async function 프로필쿠키(프로필폴더, 열쇠, 도메인조각, 방) {
  const 사본 = join(방, '쿠키.db')
  try {
    await copyFile(join(프로필폴더, 'Cookies'), 사본)
  } catch { return null }
  // 크롬이 쓰다 만 것(-wal)이 있으면 함께 떠야 방금 로그인한 쿠키가 보인다
  for (const 꼬리 of ['-wal', '-shm']) {
    await copyFile(join(프로필폴더, `Cookies${꼬리}`), `${사본}${꼬리}`).catch(() => {})
  }
  let db
  try {
    db = new DatabaseSync(사본)
    const 것들 = db.prepare(
      'SELECT host_key, name, encrypted_value, expires_utc/1000000 AS 만료초 FROM cookies WHERE host_key LIKE ?',
    ).all(`%${도메인조각}%`)
    const 살아있는 = 것들.filter((c) => !지났나(c.만료초))
    const 짝들 = []
    for (const c of 살아있는) {
      const 값 = 값풀기(c.encrypted_value, 열쇠, c.host_key)
      if (값) 짝들.push(`${c.name}=${값}`)
    }
    return 짝들.length ? 짝들.join('; ') : null
  } catch {
    return null
  } finally {
    try { db?.close() } catch {}
  }
}

// 본 크롬의 프로필을 전부 훑어 「프로필 이름 → 쿠키 한 줄」 을 돌려준다.
// 여러 계정이 프로필마다 로그인돼 있으니, 어느 것이 누구 것인지는 부르는 쪽이 스레드에 물어 가린다
export async function 크롬쿠키들({ 뿌리 = 크롬뿌리(), 도메인조각 = 'threads.com', 열쇠 } = {}) {
  const 쓸열쇠 = 열쇠 ?? (await 금고열쇠())
  const 것들 = await readdir(뿌리, { withFileTypes: true }).catch(() => {
    throw new Error('크롬없음')
  })
  const 칸들 = 것들
    .filter((d) => d.isDirectory() && /^(Default|Profile \d+)$/.test(d.name))
    .map((d) => d.name)
    .sort()
  const 방 = await mkdtemp(join(tmpdir(), '크롬쿠키-'))
  try {
    const 모음 = []
    for (const 칸 of 칸들) {
      const 한줄 = await 프로필쿠키(join(뿌리, 칸), 쓸열쇠, 도메인조각, 방)
      // sessionid 가 없으면 그 프로필은 로그인 전이다. 스레드에 물어봐야 헛일이다
      if (!한줄 || !/(^|;\s*)sessionid=/.test(한줄)) continue
      // 같은 계정이 프로필 둘에 로그인돼 있을 수 있다 (실측 — Default 와 Profile 4 가 둘 다 example.cook).
      // 그때는 **최근에 쓴 쪽**을 고른다. 오래 안 쓴 쿠키가 먼저 죽는다
      const 때 = await stat(join(뿌리, 칸, 'Cookies')).then((s) => s.mtimeMs).catch(() => 0)
      모음.push({ 프로필: 칸, 쿠키: 한줄, 때 })
    }
    return 모음.sort((a, b) => b.때 - a.때)
  } finally {
    await rm(방, { recursive: true, force: true }).catch(() => {})
  }
}

// ⚠️ 2026-09-08 — **창을 여는 함수는 두지 않는다.** 사용자가 정했다 —
//    「지금 대시보드가 떠 있는 그 크롬 창에서 찾아라. 새 창을 열지 마라」.
//    한때 새 탭을 열거나(그 창은 이미 딴 계정이라 로그인 화면이 안 뜬다) 빈 프로필 창을 띄웠는데,
//    둘 다 사용자가 원한 것이 아니었다. 이 파일은 **읽기만** 한다.
//    되돌릴 일이 생기면 커밋 `eac824e` 에 그 함수들이 그대로 있다.
