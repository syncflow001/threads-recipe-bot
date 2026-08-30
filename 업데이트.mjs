// launchd 가 매일 11:00 에 부르는 한 줄 — 새 판이 있으면 받아 덮는다
import { 업데이트하기 } from './src/업데이트.mjs'

const 결과 = await 업데이트하기()
console.log(JSON.stringify(결과))
process.exit(결과.됨 || 결과.까닭 === '이미 최신' || 결과.까닭?.startsWith('제작자 저장소') ? 0 : 1)
