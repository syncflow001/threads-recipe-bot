// 감시돌기.mjs 가 계정마다 쓸 것을 모은다 — 계정별 토큰 읽기 · 첫판 날짜 찾기 · 모음 만들기
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { 공유열쇠, 계정길 } from './계정.mjs'
import { 발행격자 } from './대시보드.mjs'
import { 빈칸찾기, 실패찾기 } from './감시.mjs'
import { 막힌글들 } from './관문.mjs'
import { 견주기 } from './도달.mjs'

const 이틀 = (n) => String(n).padStart(2, '0')
const 날짜글 = (d) => `${d.getFullYear()}-${이틀(d.getMonth() + 1)}-${이틀(d.getDate())}`

// .env 한 줄에서 KEY=값 을 뽑는다. 값이 빈 줄이면 없는 것으로 본다 — 절대로 값을 로그에 남기지 않는다
// ⚠️ **따옴표를 벗겨야 한다.** 열쇠 파일은 값을 작은따옴표로 감싼다 (`src/열쇠파일.mjs`).
// 안 벗기면 토큰·쿠키가 `'…'` 인 채로 나가서 스레드가 거절한다 —
// 2026-08-26 전수 점검에서 잡혔다. `--env-file` 로 읽을 때는 node 가 벗겨 주는데,
// 우리가 파일을 직접 읽는 이 길에는 벗기는 사람이 없었다
const 값읽기 = (글, 키) => {
  const m = (글 ?? '').match(new RegExp(`^${키}=(.+)$`, 'm'))
  return m ? m[1].trim().replace(/^(["'])([\s\S]*)\1$/, '$2') : undefined
}

// insights 는 자기 토큰으로만 답한다 (실측: 남의 토큰으로 물으면 null).
// 자동발행.sh 와 같은 순서로 겹쳐 읽는다 — .env.local 먼저, .env.<계정> 이 있으면 그것이 이긴다.
// 이름 없는 첫 계정은 .env.local 하나뿐이다
export async function 계정열쇠읽기(계정, 키, 뿌리 = process.cwd()) {
  const 로컬글 = await readFile(join(뿌리, '.env.local'), 'utf8').catch(() => null)
  const 계정글 = 계정 ? await readFile(join(뿌리, 계정길(계정, '열쇠.env')), 'utf8').catch(() => null) : null
  const 그계정것 = 값읽기(계정글, 키)
  if (그계정것) return 그계정것

  // ⚠️ **계정 전용 열쇠는 `.env.local` 로 물러서지 않는다** (2026-08-26).
  // `.env.local` 은 첫 계정의 파일이기도 하다. 물러서면 **열쇠를 아직 안 넣은 계정이
  // 첫 계정 쿠키·토큰을 물려받는다** — 그 계정으로 누른 활동이 첫 계정으로 나간다.
  // 실제로 그 자리에 있었다: 새로 만든 계정 둘이 열쇠가 빈 채로 첫 계정 쿠키를 받고 있었다
  // (헬스체크 첫 판에서 잡았다, 인계 §7-19). 없으면 **없다고 말해야** 한다.
  // 공유 열쇠(쿠팡·블롭·텔레그램)는 원래 한 곳에 두는 것이라 그대로 물려받는다
  if (계정 && !공유열쇠.has(키)) return undefined
  return 값읽기(로컬글, 키)
}

export const 계정토큰읽기 = (계정, 뿌리 = process.cwd()) =>
  계정열쇠읽기(계정, 'THREADS_ACCESS_TOKEN', 뿌리)

// logs/<계정>-YYYY-MM.log(이름 있는 계정) 또는 logs/YYYY-MM.log(첫 계정)의 첫 '═══' 머리글에서
// 날짜를 뽑는다. 이번 달과 지난달을 함께 봐야 지난달에 시작한 계정도 놓치지 않는다.
// 계정이 그 날짜 이전에 없었으면 그날의 「기록없음」은 실패가 아니다 (빈칸찾기 로 넘긴다)
// 계정이 **처음 돈 때**. 날짜만으로는 모자란다 —
// 계정을 만든 날, 만들기 전 시각의 칸들이 「안 돌았습니다」로 잘못 울린다.
// 실측 (2026-08-25) — 08-24 18:47 에 만든 계정을 두고 그날 02:47·06:47·10:47·13:47
// 네 칸이 경보로 나갔다. 그때는 계정이 아예 없었다. 첫날 경보는 늘 우는 경보의 시작이다
export async function 첫판때찾기(계정, 뿌리 = process.cwd()) {
  const 이름 = (d) => `${계정 ? 계정 + '-' : ''}${d.getFullYear()}-${이틀(d.getMonth() + 1)}.log`
  const 오늘 = new Date()
  const 지난달 = new Date(오늘.getFullYear(), 오늘.getMonth() - 1, 1)

  let 글 = ''
  for (const d of [지난달, 오늘]) {
    글 += await readFile(join(뿌리, 'logs', 이름(d)), 'utf8').catch(() => '')
  }
  // 이름 있는 계정은 머리글 뒤에 "[계정]"이, 첫 계정은 그 뒤에 "· 링크 없음" 같은 말이 더 붙기도 한다.
  // 날짜·시각만 확실히 잡고 그 앞뒤는 신경 쓰지 않는다
  const 때들 = [...글.matchAll(/═══.*?(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2}/g)]
    .map((m) => `${m[1]} ${m[2]}`)
  if (!때들.length) return null
  return 때들.reduce((이른것, d) => (d < 이른것 ? d : 이른것))
}

// 날짜만 쓰던 곳은 그대로 둔다 — 화면 격자와 시험이 이 꼴을 쓴다
export async function 첫판날짜찾기(계정, 뿌리 = process.cwd()) {
  const 때 = await 첫판때찾기(계정, 뿌리)
  return 때 ? 때.slice(0, 10) : null
}

// 계정 하나를 훑어 감시 모음 항목 하나를 만든다. 아침은 빈칸만, 주간은 숫자까지 모은다.
// fetch·격자만들기 는 시험에서만 넘긴다 — 감시돌기.mjs 는 안 넘겨 평소처럼 진짜 그물·진짜 시각표를 쓴다
export async function 계정모음만들기(계정, 별칭, 언제, {
  뿌리 = process.cwd(), fetch: 가져오기, 격자만들기 = 발행격자,
} = {}) {
  const 격자 = await 격자만들기(계정, { 일수: 8, 뿌리 }).catch(() => ({ 줄: [] }))
  // 날짜가 아니라 **때**를 넘긴다. 만든 날의 이른 칸을 세지 않으려면 시각이 있어야 한다
  const 첫판때 = await 첫판때찾기(계정, 뿌리)
  const 어제 = new Date()
  어제.setDate(어제.getDate() - 1)
  const 빈칸 = 빈칸찾기(격자, 날짜글(어제), 첫판때)
  // 돌긴 돌았는데 죽은 판. 빈칸(아예 안 돈 것)과 사람이 할 일이 다르다
  const 실패 = 실패찾기(격자, 날짜글(어제), 첫판때)

  // 시각표없음 — 전에 돈 적 있는 계정(첫판날짜가 있다)인데 어제 줄에 칸이 하나도 없다.
  // LaunchAgent 가 내려갔거나 plist 가 지워진, 감시가 원래 잡아야 할 바로 그 고장이다
  // (격자를 아예 못 만들었을 때도 줄이 비어 마찬가지로 걸린다).
  // 이걸 빈칸 으로 세면 "간격을 지켜 건너뛴 것"과 구분이 안 돼 화면이 "이상 없음"으로 보인다.
  // 계정이 아예 새 것(첫판때 없음)이면 아직 시각표를 안 켠 게 정상이라 조용히 넘어간다
  const 어제줄 = (격자?.줄 ?? []).find((r) => r.날짜 === 날짜글(어제))
  const 시각표없음 = 첫판때 !== null && !(어제줄?.칸 ?? []).length

  if (언제 === '아침') return { 계정, 별칭, 빈칸, 실패, 시각표없음 }

  const 올림 = (격자.줄 ?? []).flatMap((r) => r.칸 ?? []).filter((c) => c.상태 === '올림').length
  const 이레전 = Date.now() - 7 * 24 * 3600 * 1000
  const 막힘 = (await 막힌글들(뿌리, 계정)).filter((b) => Date.parse(b.때) >= 이레전).length
  const 토큰 = await 계정토큰읽기(계정, 뿌리)
  const 도달 = await 견주기(계정, { 뿌리, 토큰, fetch: 가져오기 }).catch(() => null)
  return { 계정, 별칭, 빈칸, 실패, 올림, 막힘, 도달, 시각표없음 }
}
