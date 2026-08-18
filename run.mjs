// 수집기를 손으로 돌려보는 실행기 — node run.mjs 레시피 요리
// 조회수까지 보려면 로그인 쿠키가 필요하다.  THREADS_COOKIE="..." node run.mjs 레시피
import { 검색, 상세채우기 } from './src/threads.mjs'
import { 줄세우기 } from './src/score.mjs'
import { 내려받기, 안쓴것만 } from './src/media.mjs'
import { 재구성, 레시피있나, 링크넣기 } from './src/compose.mjs'
import { 레시피링크 } from './src/coupang.mjs'
import { 글올리기 } from './src/publish.mjs'
import { 영상갈아끼우기 } from './src/blob.mjs'
import { readFile, writeFile } from 'node:fs/promises'

const 받기 = process.argv.includes('--받기')
const 재쓰기 = process.argv.includes('--재구성')
const 올리기옵션 = process.argv.includes('--발행')
const 키워드들 = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!키워드들.length) { console.error('사용법. node run.mjs <키워드> [키워드...]'); process.exit(1) }
const cookie = process.env.THREADS_COOKIE || undefined
const 상위 = Number(process.env.TOP || 10)

const 모음 = new Map()
for (const kw of 키워드들) {
  const 목록 = await 검색(kw, { cookie })
  목록.forEach((p) => 모음.has(p.code) || 모음.set(p.code, { ...p, 키워드: kw }))
  console.error(`  ${kw} → ${목록.length}개`)
}

// 이미 쓴 것은 여기서 빠진다. 상세 요청도 내려받기도 아낀다
const 남은것 = await 안쓴것만([...모음.values()])
if (남은것.length < 모음.size) console.error(`  이미 쓴 것 ${모음.size - 남은것.length}개 제외`)

// 상세 요청은 무거우니 공유수·좋아요로 먼저 추린다
const 후보 = 남은것.sort((a, b) => b.공유 - a.공유 || b.좋아요 - a.좋아요).slice(0, 상위)
console.error(`후보 ${모음.size}개 → 상위 ${후보.length}개만 상세 확인${cookie ? '' : ' (쿠키 없음 — null 예상)'}`)
await 상세채우기(후보, { cookie })

// 쿠키를 넣었는데도 조회수가 하나도 안 오면 그 쿠키는 죽은 것이다. 조용히 넘기면
// 쿠키 없을 때와 화면이 똑같아서 사용자가 뭘 잘못했는지 알 길이 없다.
if (cookie && 후보.every((p) => p.조회수 == null))
  console.error('  ⚠ 쿠키를 넣었는데 조회수가 안 온다. 만료됐거나 값이 잘렸다 — 다시 복사해야 한다')

const 정렬 = 줄세우기(후보)
for (const p of 정렬) {
  const 비 = p.비율 == null ? '     -' : (p.비율 * 100).toFixed(2) + '%'
  console.log(
    `${p.등급.padEnd(5)} ${비}  좋아요${String(p.좋아요).padStart(5)}` +
    `  조회${String(p.조회수 ?? '-').padStart(7)}  공유${String(p.공유).padStart(4)}` +
    `  ${p.미디어.length}장  ${p.본문.replace(/\s+/g, ' ').slice(0, 30)}`,
  )
}

if (받기) {
  console.error('\n미디어 내려받는 중...')
  for (const p of 정렬) {
    const r = await 내려받기(p)
    if (r.건너뜀) { console.log(`  건너뜀 ${p.code} — ${r.건너뜀}`); continue }
    console.log(`  ${p.code}  받음 ${r.파일.length}개${r.실패.length ? `  실패 ${r.실패.length}개 → ${r.실패[0].이유}` : ''}`)
  }
}

if (재쓰기) {
  const 페르소나 = JSON.parse(await readFile('persona.json', 'utf8'))
  // 레시피가 없는 글은 재구성해봐야 재료만 있고 순서가 빈다. 토큰만 쓰고 버리게 된다
  const 쓸것 = 정렬.filter(레시피있나)
  if (쓸것.length < 정렬.length) console.error(`\n레시피 없는 글 ${정렬.length - 쓸것.length}개 제외`)
  console.error('내 말투로 다시 쓰는 중...')
  for (const p of 쓸것) {
    try {
      const 글 = await 재구성(p, { 페르소나 })

      // 링크는 LLM 이 아니라 여기서 붙인다. 주소를 지어내면 수수료가 날아간다
      if (글.핵심재료) {
        try {
          const 상품 = await 레시피링크(글.핵심재료, p.code)
          if (상품) {
            글.상품 = 상품
            글.레시피 = 링크넣기(글.레시피, [`👉 ${상품.이름.slice(0, 30)} ${상품.url}`])
          } else {
            console.error(`  ${p.code} 링크 없음 — "${글.핵심재료}" 에 로켓 상품이 없다`)
          }
        } catch (e) {
          console.error(`  ${p.code} 링크 실패 — ${e.message}`) // 글은 살리고 링크만 뺀다
        }
      }

      const 파일 = `media/받은것/${p.code}/재구성.json`
      await writeFile(파일, JSON.stringify(글, null, 2))

      if (올리기옵션) {
        // 메타는 자기 CDN 영상을 안 받는다. 우리 주소로 갈아 끼운 뒤 올린다
        const 미디어 = await 영상갈아끼우기(p.미디어, { 받은폴더: `media/받은것/${p.code}`, code: p.code })
        const 결과 = await 글올리기({ ...글, 미디어 })
        const 붙은영상 = 미디어.filter((m) => m.우리가올림).length
        console.log(`  올림 → ${결과.본문번호}  답글 ${결과.답글번호들.length}개` +
          `${붙은영상 ? `  영상 ${붙은영상}개` : ''}${결과.버린영상 ? `  (영상 ${결과.버린영상}개 못 붙임)` : ''}`)
        if (결과.답글오류) console.error(`  ⚠️ 답글이 중간에 끊겼다 — ${결과.답글오류.slice(0, 120)}`)
        // 사진이 없으면 링크 답글에 스레드가 멋대로 미리보기 카드를 붙인다. 숨기지 않는다
        if (결과.미리보기붙음) console.error('  ⚠️ 사진이 없어 링크에 미리보기 카드가 붙었을 수 있다')
      }
      const w = 글.수량경고
      const 경고 = [
        w.추가됨.length ? `⚠️  원문에 없는 분량이 생겼다: ${w.추가됨.join(', ')}` : '',
        w.빠짐.length ? `⚠️  원문 분량이 사라졌다(깨졌을 수 있다): ${w.빠짐.join(', ')}` : '',
      ].filter(Boolean).map((s) => '\n' + s).join('')
      console.log(`\n─── ${p.code} ───\n[본문]\n${글.본문}\n\n[레시피]\n${글.레시피}${경고}\n→ ${파일}`)
    } catch (e) {
      console.error(`  ${p.code} 실패 — ${e.message}`)
    }
  }
}
