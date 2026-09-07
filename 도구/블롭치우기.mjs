// 발행에 쓰고 남은 영상 조각(Vercel Blob)을 치운다 — 안 치우면 1GB 한도가 차서 발행이 죽는다
//
//   node --env-file=.env.local 도구/블롭치우기.mjs          (얼마나 찼는지만 본다)
//   node --env-file=.env.local 도구/블롭치우기.mjs --치운다   (48시간 넘은 것을 지운다)
//   node --env-file=.env.local 도구/블롭치우기.mjs --치운다 --남길시간 24
//
// 왜 있나. 2026-09-06 에 다섯 계정의 발행이 통째로 죽었다 —
// `Vercel Blob: Storage quota exceeded for Hobby plan (1GB maximum)`.
// 영상을 올리기만 하고 한 번도 안 지워서 19일치 404개가 1.000 GB 를 꽉 채우고 있었다.
//
// 지워도 되는 까닭. 메타는 우리 주소에서 **한 번** 받아 가고 그 뒤로는 제 CDN 에서 내보낸다
// (실측 — 올라간 영상 글의 `media_url` 이 전부 `scontent-…cdninstagram.com` 이었다).
// 블롭은 발행하는 그 순간에만 있으면 된다.
//
// ⚠️ 평소에는 이 도구를 부를 일이 없다. 발행이 끝나면 run.mjs 가 그 자리에서 지우고,
//    하루 한 번 `블롭치우기.sh` 예약이 찌꺼기를 걷는다. 이것은 손으로 볼 때 쓴다.
import { 목록, 묵은것치우기 } from '../src/blob.mjs'

const 치운다 = process.argv.includes('--치운다')
const 남길시간 = Number(process.argv[process.argv.indexOf('--남길시간') + 1]) || 48
const 메가 = (n) => `${(n / 1e6).toFixed(1)} MB`
const 한도 = 1e9 // Hobby 판 1GB

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN 이 없습니다 — `node --env-file=.env.local` 로 부르세요.')
  process.exit(1)
}

if (!치운다) {
  const 것들 = await 목록()
  const 합 = 것들.reduce((a, b) => a + b.크기, 0)
  const 묵은것 = 것들.filter((b) => b.시간 != null && b.시간 >= 남길시간)
  console.log(`블롭 ${것들.length}개 · ${메가(합)} / 1000 MB (${(100 * 합 / 한도).toFixed(1)}% 찼습니다)`)
  console.log(`${남길시간}시간 넘은 것 ${묵은것.length}개 · ${메가(묵은것.reduce((a, b) => a + b.크기, 0))} 를 치울 수 있습니다`)
  const 못읽은것 = 것들.filter((b) => b.시간 == null)
  if (못읽은것.length) console.log(`⚠️ 나이를 못 읽은 것 ${못읽은것.length}개는 안 건드립니다`)
  console.log('\n치우려면 뒤에 --치운다 를 붙이세요.')
  process.exit(0)
}

console.log(`${남길시간}시간 넘은 것을 치웁니다...`)
const r = await 묵은것치우기({ 남길시간 })
console.log(`전체 ${r.전체}개 가운데 ${r.지운수}개를 지웠습니다 — ${메가(r.아낀바이트)} 를 비웠습니다.`)
console.log(`남은 것 ${메가(r.남은바이트)} / 1000 MB (${(100 * r.남은바이트 / 한도).toFixed(1)}%)`)
if (r.나이못읽음) console.log(`⚠️ 나이를 못 읽은 ${r.나이못읽음}개는 안 건드렸습니다`)
if (r.안됨.length) {
  console.error(`⚠️ ${r.안됨.length}묶음은 못 지웠습니다 — ${r.안됨[0].slice(0, 200)}`)
  process.exitCode = 1
}
