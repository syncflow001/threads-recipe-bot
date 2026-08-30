// 계정 열쇠가 온전한가·섞이지 않았나를 주기적으로 재고, 이상하면 텔레그램으로 알린다

// ⚠️ **왜 만들었나 (2026-08-26, 사용자가 시켰다).**
// 「전체 알고리즘과 시스템과 자동화에 문제가 발생하면 절대 안 된다」 —
// 같은 날 두 사고가 났고 **둘 다 눈으로는 안 보이는 것**이었다.
//   · `sample_dinner` 로 누른 답글이 `example.cook` 로 나갔다 (§7-17)
//   · 계정 셋의 쿠키가 110자쯤 잘린 채 몇 달을 돌았다 (§7-18) — 잘려도 로그인은 됐다
// 사람이 화면을 봐서는 절대 못 잡는다. **재는 것만이 잡는다.** 그래서 3시간마다 잰다.
//
// 여기서 재는 것은 **열쇠와 계정의 무결성**뿐이다.
// 「발행이 멈췄나·보관함이 비었나」는 이미 `감시.sh`(아침·주간)가 본다. 겹치지 않는다.

import { readFile, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { 자식환경 } from './열쇠파일.mjs'
import { 계정열쇠읽기 } from './감시모음.mjs'
import { 쿠키주인 } from './계정벽.mjs'
import { 보일아이디, 첫계정있나, 계정길, 계정목록 as 계정목록읽기 } from './계정.mjs'

// 계정마다 반드시 제 것이어야 하는 열쇠. 공유 열쇠(쿠팡·블롭·텔레그램)는 안 본다
export const 계정열쇠 = ['THREADS_COOKIE', 'THREADS_ACCESS_TOKEN', 'THREADS_USER_ID']

export const 열쇠파일길 = (계정, 뿌리) => join(뿌리, 계정 ? 계정길(계정, '열쇠.env') : '.env.local')

// 파일에 적힌 값. `--env-file` 이 읽는 것과 견주려고 우리 손으로도 읽는다
export function 파일속값(글, 키) {
  const 줄 = String(글 ?? '').split('\n').find((l) => l.startsWith(`${키}=`))
  if (!줄) return null
  return 줄.slice(키.length + 1).trim().replace(/^(["'])([\s\S]*)\1$/, '$2')
}

// ⚠️ **node 에게 실제로 읽혀 본다.** 표기만 보고 「괜찮겠지」 하면 또 놓친다 —
// 쿠키가 잘린 것을 몇 달 몰랐던 까닭이 그것이다
export function 자식이받는길이(파일들, 뿌리, 돌리기 = spawnSync) {
  const 잰이 = join(뿌리, '.헬스체크-잰이.mjs')
  const r = 돌리기(process.execPath, [
    ...파일들.map((f) => `--env-file=${f}`), '-e',
    `console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(계정열쇠)}`
    + '.map((k) => [k, (process.env[k] ?? "").length]))))',
  ], { cwd: 뿌리, env: 자식환경({ PATH: process.env.PATH }, 파일들.map((f) => join(뿌리, f))), encoding: 'utf8' })
  void 잰이
  try { return JSON.parse(String(r.stdout ?? '{}')) } catch { return {} }
}

// 목록을 뽑는 규칙은 src/계정.mjs 하나뿐이다 — 여기서 다시 적지 않는다 (2026-08-29)
export const 계정목록 = (뿌리) => 계정목록읽기(뿌리)

// 한 판. 네트워크(쿠키 주인 확인)는 `쿠키확인` 을 꺼서 뺄 수 있다 — 검사가 그렇게 쓴다
export async function 한판({
  뿌리 = process.cwd(), 계정정보 = null, 쿠키확인 = true,
  주인묻기 = 쿠키주인, 돌리기 = spawnSync,
} = {}) {
  const 계정들 = await 계정목록(뿌리)
  const 정보 = 계정정보 ?? await readFile(join(뿌리, '계정정보.json'), 'utf8')
    .then(JSON.parse).catch(() => ({}))
  const 탈 = []
  const 잰것 = []
  const 지문표 = new Map()   // 값 → 그 값을 가진 계정들. 섞였는지 본다

  for (const 계정 of 계정들) {
    const 이름 = 계정 || '(첫 계정)'
    const 파일 = 열쇠파일길(계정, 뿌리)
    const 글 = await readFile(파일, 'utf8').catch(() => null)
    if (글 === null) { 탈.push(`${이름} — 열쇠 파일이 없습니다 (${파일})`); continue }

    // ① 자식이 실제로 받는 길이가 파일과 같은가 (잘림)
    const 파일들 = [...(계정 ? ['.env.local'] : []), 계정 ? 계정길(계정, '열쇠.env') : '.env.local']
    const 받는길이 = 자식이받는길이(파일들, 뿌리, 돌리기)
    for (const 키 of 계정열쇠) {
      const 값 = 파일속값(글, 키)
      if (!값) { 탈.push(`${이름} — ${키} 가 없습니다`); continue }
      if (받는길이[키] !== 값.length) {
        탈.push(`${이름} — ${키} 가 **잘려서** 들어갑니다 (파일 ${값.length}자 → 실제 ${받는길이[키] ?? 0}자)`)
      }
      // ② 다른 계정과 같은 값을 쓰고 있나 (섞임)
      const 자리 = `${키} ${값}`
      지문표.set(자리, [...(지문표.get(자리) ?? []), 이름])
    }

    // ③ 우리가 파일을 직접 읽는 길도 같은 값을 주는가 (따옴표를 안 벗기면 여기서 어긋난다)
    for (const 키 of 계정열쇠) {
      const 파일값 = 파일속값(글, 키)
      const 읽은값 = await 계정열쇠읽기(계정, 키, 뿌리)
      if (파일값 && 읽은값 !== 파일값) {
        탈.push(`${이름} — ${키} 를 우리가 읽으면 파일과 다릅니다 (따옴표를 안 벗겼을 수 있습니다)`)
      }
    }
    잰것.push(이름)
  }

  // 같은 열쇠를 두 계정이 함께 쓰면 그 자체가 사고다
  for (const [자리, 주인들] of 지문표) {
    if (주인들.length > 1) 탈.push(`${자리.split(' ')[0]} 을(를) ${주인들.join(' · ')} 가 **함께** 쓰고 있습니다`)
  }

  // ④ 쿠키의 주인이 정말 그 계정인가 — 스레드에게 직접 묻는다
  if (쿠키확인) {
    for (const 계정 of 계정들) {
      const 이름 = 계정 || '(첫 계정)'
      const 쿠키 = await 계정열쇠읽기(계정, 'THREADS_COOKIE', 뿌리)
      if (!쿠키) continue
      const 기대 = 보일아이디(계정, 정보[계정])
      const 진짜 = await 주인묻기(쿠키)
      if (!진짜) { 탈.push(`${이름} — 쿠키 주인을 확인하지 못했습니다 (쿠키가 죽었을 수 있습니다)`); continue }
      if (기대 && 진짜 !== 기대) 탈.push(`${이름} — 쿠키가 **@${진짜}** 것입니다 (기대: @${기대})`)
    }
  }

  return { 때: new Date().toISOString(), 계정수: 잰것.length, 잰것, 탈 }
}

// 사람이 읽는 글월. 이상이 없으면 null (조용히 지나간다)
export function 글월(결과) {
  if (!결과?.탈?.length) return null
  return [
    '🚨 헬스체크 — 계정 열쇠에 문제가 있습니다',
    `잰 때 ${new Date(결과.때).toLocaleString('ko-KR')} · 계정 ${결과.계정수}개`,
    '',
    ...결과.탈.map((t) => `• ${t}`),
    '',
    '대시보드 「감시」 쪽에서 다시 재 볼 수 있습니다.',
  ].join('\n')
}
