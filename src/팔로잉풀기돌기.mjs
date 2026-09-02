// 잘못 나간 팔로잉을 하루 몫만큼 푼다 — 「잘못한 팔로잉 풀기.command」가 부른다
import { 풀기한판, 풀기설정 } from './팔로우하기.mjs'

const 계정 = process.argv[2] ?? 'example.cook'
const 띄우기 = process.argv.includes('--창')

console.log(`\n  @${계정} 의 잘못 나간 팔로잉을 풉니다 (하루 ${풀기설정.하루한계}명까지).\n`)

try {
  const r = await 풀기한판(계정, { 띄우기, 알림: (m) => console.log(m) })
  console.log(`\n  ${r.말}\n`)
} catch (e) {
  console.log(`\n  못 했습니다 — ${e.message}\n`)
  process.exitCode = 1
}
