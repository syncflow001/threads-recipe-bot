// 수집기를 손으로 돌려보는 실행기 — node run.mjs 레시피 요리
// 조회수까지 보려면 로그인 쿠키가 필요하다.  THREADS_COOKIE="..." node run.mjs 레시피
import { 검색, 상세채우기, 팔로워수 } from './src/threads.mjs'
import { 홈에서걷기, 쿠키죽음 } from './src/홈수집.mjs'
import { 알리고찍기 } from './src/알림.mjs'
import { 담기, 꺼내기, 빼기 } from './src/보관함.mjs'
import { 지문만들기, 이미올린미디어, 미디어적기 } from './src/미디어지문.mjs'
import { 줄세우기 } from './src/score.mjs'
import { 내려받기, 안쓴것만, 썼다표시 } from './src/media.mjs'
import { 정보, 미디어뿌리, 분야들, 못하는것, 꼬리머리, 돌려쓰기 } from './src/계정.mjs'
import { 재구성, 레시피있나, 링크넣기, 비밀재료빼기 } from './src/compose.mjs'
import { 레시피링크 } from './src/coupang.mjs'
import { 글올리기, 빠진권한 } from './src/publish.mjs'
import { 영상갈아끼우기 } from './src/blob.mjs'
import { readFile, writeFile } from 'node:fs/promises'

const 받기 = process.argv.includes('--받기')
const 재쓰기 = process.argv.includes('--재구성')
const 올리기옵션 = process.argv.includes('--발행')
const 준키워드 = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const cookie = process.env.THREADS_COOKIE || undefined
// 기본은 "5편 들여다보고 1편만 올린다". 사용자가 정한 값이다.
// 등급 높은 것부터 고르므로, 5편 중 제일 좋은 하나가 올라간다
const 상위 = Number(process.env.TOP || 5)
const 올릴한도 = Number(process.env.LIMIT || 1)

// 스레드는 사람을 밖으로 내보내는 글을 싫어한다. 모든 글에 링크를 달면 도달이 떨어진다 —
// 열 편에 한두 편만 링크를 달라는 것이 여러 조사의 공통된 조언이다.
// NOLINK=1 이면 쿠팡 링크도, 그에 딸린 [광고]·대가성 문구도 넣지 않는다
const 링크끄기 = process.env.NOLINK === '1'

// 계정을 여럿 굴린다. PROFILE 을 안 주면 지금까지 쓰던 첫 계정 그대로다.
//   PROFILE=b  →  말투는 persona.b.json, 쿠팡 꼬리표는 b로 시작
// 미디어(media/)는 일부러 계정끼리 함께 쓴다 — 갈라 두면 같은 원글을 두 계정이 올려
// 같은 사진에 같은 레시피가 두 곳에 뜬다. 그러면 한 사람이 굴리는 게 바로 보인다
const 프로필 = (process.env.PROFILE || '').trim()
const 말투파일 = 프로필 ? `persona.${프로필}.json` : 'persona.json'
const 계정정보 = await 정보(프로필)
const 뿌리 = 미디어뿌리(프로필)

// 아직 코드가 없는 분야·언어·제휴사를 고른 계정이면 조용히 요리 글을 뱉지 않는다
// 검색어를 안 주면 그 계정 분야의 기본 검색어를 쓴다. 계정마다 찾는 것이 다르다.
// 다만 넷을 매번 다 두드리면 스레드가 조인다 — 하루 열몇 번이면 결과가 1개로 줄어든다 (실측).
// 그래서 시각에 따라 둘씩 돌려 쓴다. 한 검색어가 받는 횟수가 절반으로 준다
// 시각을 그대로 나누면 안 된다. 시각표가 0·8·12·16·20 처럼 4의 배수뿐이면
// 4로 나눈 나머지가 늘 같아서 매번 같은 검색어가 나온다 — 실제로 그랬다
const 키워드들 = 준키워드.length ? 준키워드 : 돌려쓰기(분야들[계정정보.분야]?.키워드 ?? [])
if (!키워드들.length) { console.error('사용법. node run.mjs <키워드> [키워드...]'); process.exit(1) }

const 막힌것 = 못하는것(계정정보)
if (막힌것.length) {
  console.error(`\n⛔ [${계정정보.별칭}] 이 계정은 아직 못 돌립니다.`)
  for (const m of 막힌것) console.error(`   - ${m}`)
  process.exit(1)
}
const 꼬리표머리 = 꼬리머리(프로필) // 점·긴 이름은 SubID 에 못 들어간다. 줄여서 쓴다

// 조인 단어는 결과를 1개만 준다. 그 한 판을 통째로 버리지 않도록, 넉넉히 걷힐 때까지
// 다음 단어로 넘어간다. 잘 나오는 단어 하나면 대개 첫 번째에서 끝난다 —
// 예전처럼 매번 둘을 두드리지 않으니 평소 두드리는 횟수는 오히려 준다
// --- 고르기 ---
// **보관함이 먼저다.** 쟁여 둔 것을 다 쓰고 나서야 홈을 훑는다 (사용자가 정했다).
// 홈 스크롤은 브라우저를 띄우고 서른 번 넘게 내리는 무거운 일이라, 매 판 할 까닭이 없다.
// 한 번 훑으면 여러 편이 쟁여지고, 그 뒤 몇 판은 보관함에서 꺼내 쓴다.
const 계정이름 = 프로필 || 'altteul.cart'
const 홈스크롤 = Number(process.env.SCROLL || 25)

const 내려받기묶음 = async (목록) => {
  if (!받기 || !목록.length) return
  console.error('\n미디어 내려받는 중...')
  for (const p of 목록) {
    const r = await 내려받기(p, { 뿌리 })
    if (r.건너뜀) { console.log(`  건너뜀 ${p.code} — ${r.건너뜀}`); continue }
    console.log(`  ${p.code}  받음 ${r.파일.length}개${r.실패.length ? `  실패 ${r.실패.length}개 → ${r.실패[0].이유}` : ''}`)
  }
}

// 사진·영상 자체로 중복을 가린다. 원글 번호도 요리 이름도 다른데 같은 파일인 경우가 있다 —
// 치즈폭탄 또띠아파이는 원글 다섯 개에서 나왔고 그중 하나는 요리 이름조차 비어 있었다.
// 재구성(LLM) 앞에서 막아 값을 아끼고, 지문은 발행 뒤 장부에 적으려고 글에 붙여 둔다
const 안겹친것만 = async (목록) => {
  const 남은것 = []
  for (const p of 목록) {
    p.지문 = await 지문만들기(`${뿌리}/받은것/${p.code}`)
    const 겹침 = await 이미올린미디어(p.지문, { 뿌리 })
    if (겹침) {
      const 며칠 = Math.round((Date.now() - 겹침.올린때) / 86400000)
      console.error(`  ${p.code} 건너뜀 — ${겹침.까닭}을 ${며칠 === 0 ? '오늘' : `${며칠}일 전`} 이미 올렸다 (${겹침.code})`)
      continue
    }
    남은것.push(p)
  }
  return 남은것
}

// 미디어를 받아야 지문을 만들 수 있다. 받지 않았으면 중복을 못 가리므로 그대로 둔다
const 받고거르기 = async (목록) => {
  await 내려받기묶음(목록)
  return 받기 ? await 안겹친것만(목록) : 목록
}

// ① 보관함부터 — 미디어 주소는 하루 반이면 죽으므로 (실측) 담아 둔 주소를 믿지 않고 다시 받는다
let 쓸것 = []
const 쟁인것들 = await 꺼내기()
if (쟁인것들.length) {
  console.error(`보관함에 ${쟁인것들.length}개 있다 — 여기서 먼저 고른다`)
  const 되살린것 = 쟁인것들.slice(0, 상위).map((p) => ({ code: p.code, 작성자: p.작성자, 팔로워: p.팔로워 }))
  await 상세채우기(되살린것, { cookie })
  // **글타래까지 봐야 한다.** 본문과 미디어만 보고 되살렸다고 판단했더니,
  // 레시피 답글이 빈 글이 통과해 뒤에서 "레시피 없음" 으로 다시 걸렸다 (08-21 08시 판)
  const 살아있는것 = 되살린것.filter((p) => p.본문 && (p.미디어 ?? []).length && 레시피있나(p))
  const 죽은것 = 되살린것.filter((p) => !살아있는것.includes(p)).map((p) => p.code)
  if (죽은것.length) {
    await 빼기(죽은것)
    console.error(`  되살리지 못한 ${죽은것.length}개는 보관함에서 뺐다 (원글이 지워졌거나 레시피 답글이 안 온다)`)
  }
  쓸것 = 줄세우기(await 받고거르기(await 안쓴것만(살아있는것, 뿌리)))
  console.error(`  보관함에서 쓸 만한 것 ${쓸것.length}개`)
}

// ② 보관함이 비었거나 다 걸러졌으면 홈을 훑는다.
// 검색어를 손으로 주면 그때는 검색을 쓴다 — 되짚어 볼 일이 있을 때를 위해 남겨 둔다
if (!쓸것.length) {
  const 모음 = new Map()
  if (준키워드.length) {
    for (const kw of 키워드들.slice(0, 4)) {
      const 목록 = await 검색(kw, { cookie })
      목록.forEach((p) => 모음.has(p.code) || 모음.set(p.code, { ...p, 키워드: kw }))
      console.error(`  ${kw} → ${목록.length}개`)
    }
  } else {
    console.error('보관함이 비었다 — 홈을 훑는다')
    try {
      const 걷은것 = await 홈에서걷기({ 쿠키: cookie, 계정: 계정이름, 스크롤수: 홈스크롤 })
      걷은것.forEach((p) => 모음.set(p.code, p))
      console.error(`  홈 ${홈스크롤}번 내려 ${걷은것.length}개 걷었다`)
    } catch (e) {
      if (e instanceof 쿠키죽음) {
        await 알리고찍기(
          `⛔ [${계정이름}] 스레드 쿠키가 죽었습니다.\n` +
          `홈에서 글을 못 걷어 발행이 멈췄습니다.\n` +
          `대시보드 「열쇠」 칸에서 THREADS_COOKIE 를 다시 넣어 주세요.`,
          { 종류: `쿠키죽음-${계정이름}` },
        )
        process.exit(1)
      }
      throw e
    }
  }

  const 남은것 = await 안쓴것만([...모음.values()], 뿌리)
  if (남은것.length < 모음.size) console.error(`  이미 쓴 것 ${모음.size - 남은것.length}개 제외`)

  // 홈에서 걷은 글은 번호와 작성자뿐이라 미리 추릴 근거가 없다. 상세가 본문·좋아요·미디어까지 채운다
  const 추릴수 = 준키워드.length ? 상위 : Math.max(상위, 남은것.length)
  const 후보 = 남은것
    .sort((a, b) => (b.공유 ?? 0) - (a.공유 ?? 0) || (b.좋아요 ?? 0) - (a.좋아요 ?? 0))
    .slice(0, 추릴수)
  console.error(`후보 ${모음.size}개 → ${후보.length}개 상세 확인${cookie ? '' : ' (쿠키 없음 — null 예상)'}`)
  await 상세채우기(후보, { cookie })

  // 쿠키를 넣었는데도 조회수가 하나도 안 오면 그 쿠키는 죽은 것이다
  if (cookie && 후보.length && 후보.every((p) => p.조회수 == null)) {
    await 알리고찍기(
      `⛔ [${계정이름}] 스레드 쿠키가 죽은 것 같습니다.\n` +
      `글은 걷었는데 조회수가 하나도 안 옵니다 — 등급을 못 매겨 한 편도 못 올립니다.\n` +
      `대시보드 「열쇠」 칸에서 THREADS_COOKIE 를 다시 넣어 주세요.`,
      { 종류: `조회수없음-${계정이름}` },
    )
  }

  // 레시피 없는 글을 먼저 버린다. 홈에서 걷은 글의 대부분이 그렇다.
  // 여기서 안 버리면 팔로워를 쓸데없이 받고, 등급도 뒤섞인다
  const 레시피있는것 = 후보.filter(레시피있나)
  console.error(`  레시피 없는 글 ${후보.length - 레시피있는것.length}개 제외 → ${레시피있는것.length}개`)

  // 확산(조회수÷팔로워)이 1차 지표다. **본문 글 기준이다** — 글타래 조회수로 재지 않는다
  const 팔로워장부 = new Map()
  for (const p of 레시피있는것) {
    if (!팔로워장부.has(p.작성자)) 팔로워장부.set(p.작성자, await 팔로워수(p.작성자, { cookie }))
    p.팔로워 = 팔로워장부.get(p.작성자)
  }

  const 정렬 = 줄세우기(레시피있는것)
  for (const p of 정렬) {
    const 확 = p.확산 == null ? '      -' : `${p.확산.toFixed(1)}배`.padStart(7)
    const 비 = p.비율 == null ? '     -' : `${(p.비율 * 100).toFixed(2)}%`
    console.log(
      `${p.등급.padEnd(5)} 확산${확}  조회${String(p.조회수 ?? '-').padStart(7)}` +
      `  팔로워${String(p.팔로워 ?? '-').padStart(6)}  ${비}  좋아요${String(p.좋아요).padStart(5)}` +
      `  ${p.미디어.length}장  ${p.본문.replace(/\s+/g, ' ').slice(0, 26)}`,
    )
  }

  // 이번 판에 쓰지 않을 것도 쟁여 둔다. 다음 판부터는 이것을 먼저 꺼내 쓴다
  const 쟁일만한가 = (p) => ['플래티넘', '골드', '실버'].includes(p.등급)
  const 쟁일것 = 정렬.filter(쟁일만한가).map((p) => ({
    code: p.code, 작성자: p.작성자, 등급: p.등급, 비율: p.비율, 확산: p.확산,
    조회수: p.조회수, 좋아요: p.좋아요, 팔로워: p.팔로워,
    미디어수: (p.미디어 ?? []).length, 레시피: true, 본문: p.본문, 올린때: p.올린때, 출처: '홈',
  }))
  if (쟁일것.length) {
    const r = await 담기(쟁일것)
    console.error(`  보관함에 담았다 — 새것 ${r.새것}개 · 전체 ${r.전체}개`)
  }

  쓸것 = await 받고거르기(정렬)
}


if (재쓰기) {
  const 페르소나 = JSON.parse(await readFile(말투파일, 'utf8'))
  // 레시피가 없는 글은 재구성해봐야 재료만 있고 순서가 빈다. 토큰만 쓰고 버리게 된다
  // TOP 은 '몇 편을 들여다볼까' 고, LIMIT 은 '몇 편을 올릴까' 다. 둘을 섞으면
  // 레시피 없는 글이 걸러진 만큼 후보를 늘려야 하는데 그러다 여러 편이 한꺼번에 올라간다
  // 사진도 영상도 없는 글은 올려봐야 맹숭맹숭한 글덩이다. 링크 미리보기도 못 막는다
  const 볼거리있나 = (p) => (p.미디어 ?? []).length > 0
  const 볼거리 = 쓸것.filter(볼거리있나)
  if (볼거리.length < 쓸것.length) console.error(`\n미디어 없는 글 ${쓸것.length - 볼거리.length}개 제외`)
  const 걸러진 = 볼거리.filter(레시피있나)
  if (걸러진.length < 볼거리.length) console.error(`레시피 없는 글 ${볼거리.length - 걸러진.length}개 제외`)
  // 한도만큼 채울 때까지 위에서부터 훑는다. 중간에 걸러지는 글이 있어서
  // 미리 잘라 두면 아무것도 못 올리고 끝난다 — 비밀재료를 모르는 글이 그렇다
  if (걸러진.length > 올릴한도) console.error(`LIMIT=${올릴한도} — 후보 ${걸러진.length}편 중 ${올릴한도}편까지만 만든다`)
  // 권한이 모자라면 본문만 올라가고 레시피 답글이 죽는다. 한 편도 올리기 전에 멈춘다
  if (올리기옵션) {
    const 모자람 = await 빠진권한()
    if (모자람.length) {
      console.error(`\n‼️  권한이 모자라 발행을 멈춘다: ${모자람.join(', ')}`)
      console.error(`   node --env-file=.env.local threads-login.mjs ${프로필} 으로 토큰을 다시 받아라.`)
      process.exit(1)
    }
  }
  console.error(`내 말투로 다시 쓰는 중...${링크끄기 ? ' (NOLINK=1 — 링크 없이)' : ''}`)
  let 채운수 = 0
  for (const p of 걸러진) {
    if (채운수 >= 올릴한도) break
    try {
      const 글 = await 재구성(p, { 페르소나 })

      // 정체를 모르는 별명 재료는 그 줄만 빼고 올린다. 예전에는 글을 통째로 버렸다 —
      // 살펴보니 "킥소스" 는 준비물이 아니라 원글 작성자의 광고 블록이고 준비물은 이미 완전했다
      const 뺀결과 = 비밀재료빼기(글.레시피, 글.비밀재료)
      if (뺀결과.뺀줄.length) {
        글.레시피 = 뺀결과.레시피
        console.error(`  ${p.code} 비밀재료 ${뺀결과.뺀줄.length}줄 뺐다 — "${뺀결과.뺀줄[0].slice(0, 30)}"`)
      }

      // 핵심재료가 비면 링크 단계를 통째로 건너뛴다. 아무 말도 안 하면 왜 링크가 없는지 알 길이 없다 —
      // 드레싱 4종처럼 주인공 재료가 하나로 안 떨어지는 글에서 실제로 그랬다
      if (!글.핵심재료 && !링크끄기) console.error(`  ${p.code} 링크 없음 — 핵심재료를 못 뽑았다`)
      // 링크는 LLM 이 아니라 여기서 붙인다. 주소를 지어내면 수수료가 날아간다
      if (글.핵심재료 && !링크끄기) {
        try {
          const 상품 = await 레시피링크(글.핵심재료, p.code, { 머리: 꼬리표머리 })
          if (상품) {
            글.상품 = 상품
            // 상품 이름은 한 번, 주소는 두 줄. 사용자가 벤치마킹한 계정들이 그렇게 한다 —
            // 두 줄이면 사람들이 더 잘 누른다. 이름까지 두 번 쓰면 지저분하다
            글.레시피 = 링크넣기(글.레시피, [상품.이름.slice(0, 30), 상품.url, 상품.url],
              { 소개: 글.한줄소개 })
          } else {
            console.error(`  ${p.code} 링크 없음 — "${글.핵심재료}" 에 로켓 상품이 없다`)
          }
        } catch (e) {
          console.error(`  ${p.code} 링크 실패 — ${e.message}`) // 글은 살리고 링크만 뺀다
        }
      }

      const 파일 = `${뿌리}/받은것/${p.code}/재구성.json`
      await writeFile(파일, JSON.stringify(글, null, 2))

      if (올리기옵션) {
        // 메타는 자기 CDN 영상을 안 받는다. 우리 주소로 갈아 끼운 뒤 올린다
        const 미디어 = await 영상갈아끼우기(p.미디어, { 받은폴더: `${뿌리}/받은것/${p.code}`, code: p.code })
        // 원칙 — 모든 미디어를 올린다. 영상 하나가 빠진 반쪽짜리 글은 올리지 않고 다음 후보로 넘어간다.
        // 예전에는 조용히 빼고 올렸다. 사진만 붙은 글이 나가는데 아무도 몰랐다
        const 못올린것 = 미디어.filter((m) => m.종류 === '영상' && !m.우리가올림)
        if (못올린것.length) {
          console.error(`  ${p.code} 건너뜀 — 영상 ${못올린것.length}개를 못 올렸다: ` +
            `${못올린것[0].올리기실패 ?? '까닭을 모른다'}`)
          continue
        }
        const 결과 = await 글올리기({ ...글, 미디어 })
        const 붙은영상 = 미디어.filter((m) => m.우리가올림).length
        console.log(`  올림 → ${결과.본문번호}  답글 ${결과.답글번호들.length}개` +
          `${붙은영상 ? `  영상 ${붙은영상}개` : ''}${결과.버린영상 ? `  (영상 ${결과.버린영상}개 못 붙임)` : ''}`)
        // 어느 계정이 언제 올렸는지 남긴다. 미디어를 계정끼리 함께 쓰기 때문에
        // 이걸 안 적으면 나중에 어느 계정 글인지 가릴 방법이 없다
        글.발행 = {
          계정: 프로필,
          본문번호: 결과.본문번호,
          답글수: 결과.답글번호들.length,
          올린때: new Date().toISOString(),
        }
        await writeFile(파일, JSON.stringify(글, null, 2))
        // 이걸 빼먹으면 다음 판에 같은 글이 또 올라간다. 실제로 하루 만에 겪었다
        await 썼다표시(p.code, 뿌리)
        // 보관함에서 꺼내 쓴 글이면 거기서도 뺀다. 안 빼면 다음 판에 또 1등으로 올라온다
        await 빼기([p.code])
        // 사진·영상 지문을 적는다. 중복은 이것으로만 가린다 —
        // 요리 이름이 같아도 남이 직접 만들어 새로 찍었으면 다른 콘텐츠다 (사용자가 정했다)
        await 미디어적기(p.지문, p.code, { 뿌리 })
        if (결과.답글오류) console.error(`  ⚠️ 답글이 중간에 끊겼다 — ${결과.답글오류.slice(0, 120)}`)
        // 사진이 없으면 링크 답글에 스레드가 멋대로 미리보기 카드를 붙인다. 숨기지 않는다
        if (결과.미리보기붙음) console.error('  ⚠️ 사진이 없어 링크에 미리보기 카드가 붙었을 수 있다')
      }
      const w = 글.수량경고
      const 경고 = [
        w.추가됨.length ? `⚠️  원문에 없는 분량이 생겼다: ${w.추가됨.join(', ')}` : '',
        w.빠짐.length ? `⚠️  원문 분량이 사라졌다: ${w.빠짐.join(', ')}` : '',
        w.깨짐?.length ? `⚠️  원문에 없는 분량꼴이다(글자가 깨졌을 수 있다): ${w.깨짐.join(', ')}` : '',
      ].filter(Boolean).map((s) => '\n' + s).join('')
      console.log(`\n─── ${p.code} ───\n[본문]\n${글.본문}\n\n[레시피]\n${글.레시피}${경고}\n→ ${파일}`)
      채운수 += 1
    } catch (e) {
      console.error(`  ${p.code} 실패 — ${e.message}`)
    }
  }
}
