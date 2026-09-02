// 자동 업데이트가 장부·열쇠는 두고 코드만 덮는지, 실패하면 되돌리는지 본다 — node 검사/test.업데이트.mjs
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import {
  보존인가, 판비교, 최신판알아보기, 덮기, 되돌리기, 기록읽기, 업데이트하기, 업데이트plist글,
} from '../src/업데이트.mjs'

const 실행 = promisify(execFile)
const 지울것 = []
const 임시 = async (이름) => {
  const 곳 = await mkdtemp(join(tmpdir(), 이름))
  지울것.push(곳)
  return 곳
}
const 읽기 = (곳, 길) => readFile(join(곳, 길), 'utf8')

// ─── (a) 보존인가 ────────────────────────────────────────────────
{
  const 지킬것 = ['.env.local', '.env.abc', 'persona.x.json', '보관함.a.json', 'logs/x.log',
    'media/a.jpg', '크롬프로필/a/Cookies', 'dashboard/.next/x', '.설정화면열쇠',
    '계정정보.json', '활동장부.main.jsonl', 'node_modules/foo/index.js', 'dashboard/node_modules/a/b.js',
    // 남의 묶음 안에도 package.json 이 있다. 설정 json 예외에 걸려 덮이면 그 묶음이 망가진다
    'node_modules/foo/package.json', 'dashboard/node_modules/foo/tsconfig.json',
    '업데이트백업/1.0.0/src/a.mjs', '.git/config',
    // 뿌리 폴더 검사가 설정 json 예외보다 먼저다 — 그 폴더 안이면 package.json 이라도 지킨다
    'logs/package.json', '업데이트백업/1.0.0/package.json']
  for (const 길 of 지킬것) assert.equal(보존인가(길), true, `${길} 은 지켜야 한다`)

  // 설정 json 은 코드의 일부다. 안 덮으면 새 판이 요구하는 묶음이 안 깔린다
  const 덮을것 = ['package.json', 'package-lock.json', 'dashboard/package.json', 'dashboard/package-lock.json',
    'tsconfig.json', 'dashboard/tsconfig.json', 'components.json',
    'src/a.mjs', 'docs/사용법.md', 'dashboard/app/page.tsx']
  for (const 길 of 덮을것) assert.equal(보존인가(길), false, `${길} 은 덮어야 한다`)
  console.log('보존인가 ✓')
}

// ─── (b) 판비교 ──────────────────────────────────────────────────
{
  assert.equal(판비교('1.0.0', 'v1.0.1'), 1)
  assert.equal(판비교('1.2.0', '1.2.0'), 0)
  assert.equal(판비교('2.0.0', '1.9.9'), -1)
  assert.equal(판비교('v1.9.0', '1.10.0'), 1) // 글자로 재면 9 가 10 보다 커진다
  assert.equal(판비교('1.0.0', '1.0.0-rc1'), -1) // 시험판은 정식판보다 아래다
  assert.equal(판비교('1.0.0-rc1', '1.0.0'), 1)
  assert.equal(판비교('1.0.0', '1.0.1-rc1'), 1) // 뼈대가 더 크면 시험판이라도 새것이다
  console.log('판비교 ✓')
}

// ─── (c)(d) 덮기 · 되돌리기 ──────────────────────────────────────
{
  const 뿌리 = await 임시('뿌리-')
  await mkdir(join(뿌리, 'src'), { recursive: true })
  await writeFile(join(뿌리, '.env.local'), '옛 열쇠')
  await writeFile(join(뿌리, '보관함.json'), '{"옛":1}')
  await writeFile(join(뿌리, 'src/옛.mjs'), '옛 내용')
  await writeFile(join(뿌리, 'package.json'), '{"version":"1.0.0"}')

  const 새뿌리 = await 임시('새뿌리-')
  await mkdir(join(새뿌리, 'src'), { recursive: true })
  await writeFile(join(새뿌리, '.env.local'), '새 열쇠')
  await writeFile(join(새뿌리, 'src/옛.mjs'), '새 내용')
  await writeFile(join(새뿌리, 'src/새.mjs'), '새 파일')
  await writeFile(join(새뿌리, 'package.json'), '{"version":"1.0.1"}')

  const 백업폴더 = join(뿌리, '업데이트백업', '1.0.0')
  const { 덮은, 건너뛴 } = await 덮기(새뿌리, 뿌리, { 백업폴더 })

  assert.equal(await 읽기(뿌리, '.env.local'), '옛 열쇠')
  assert.equal(await 읽기(뿌리, '보관함.json'), '{"옛":1}')
  assert.equal(await 읽기(뿌리, 'src/옛.mjs'), '새 내용')
  assert.equal(await 읽기(뿌리, 'src/새.mjs'), '새 파일')
  assert.equal(await 읽기(뿌리, 'package.json'), '{"version":"1.0.1"}')
  assert.equal(await 읽기(백업폴더, 'src/옛.mjs'), '옛 내용')
  assert.deepEqual(덮은.sort(), ['package.json', 'src/새.mjs', 'src/옛.mjs'])
  assert.deepEqual(건너뛴, ['.env.local'])
  console.log('덮기 ✓')

  await 되돌리기(백업폴더, 뿌리)
  assert.equal(await 읽기(뿌리, 'src/옛.mjs'), '옛 내용')
  assert.equal(await 읽기(뿌리, 'package.json'), '{"version":"1.0.0"}')
  console.log('되돌리기 ✓')
}

// ─── (e)(f) 업데이트하기 ─────────────────────────────────────────
// 깃허브를 부르지 않는다. 릴리스 답과 zip 바이트를 우리가 만들어 넣는다
const zip바이트 = await (async () => {
  const 곳 = await 임시('묶음-')
  const 겹 = 'syncflow001-threads-recipe-bot-abc1234'
  await mkdir(join(곳, 겹, 'src'), { recursive: true })
  await writeFile(join(곳, 겹, 'src/옛.mjs'), '새 내용')
  await writeFile(join(곳, 겹, 'src/새.mjs'), '새 파일')
  await writeFile(join(곳, 겹, 'package.json'), '{"version":"1.0.1"}')
  await writeFile(join(곳, 겹, '.env.local'), '새 열쇠')
  await 실행('/usr/bin/zip', ['-q', '-r', '판.zip', 겹], { cwd: 곳 })
  return readFile(join(곳, '판.zip'))
})()

const 가짜받기 = async (주소) => {
  if (주소.includes('releases/latest')) {
    return { ok: true, status: 200, json: async () => ({ tag_name: 'v1.0.1', zipball_url: 'z://판', published_at: '2026-08-28T02:00:00Z' }) }
  }
  if (주소 === 'z://판') return { ok: true, status: 200, arrayBuffer: async () => zip바이트 }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' }
}

const 옛뿌리깔기 = async () => {
  const 뿌리 = await 임시('설치-')
  await mkdir(join(뿌리, 'src'), { recursive: true })
  await writeFile(join(뿌리, '.env.local'), '옛 열쇠')
  await writeFile(join(뿌리, '보관함.json'), '{"옛":1}')
  await writeFile(join(뿌리, 'src/옛.mjs'), '옛 내용')
  await writeFile(join(뿌리, 'package.json'), '{"version":"1.0.0"}')
  return 뿌리
}

{
  const 뿌리 = await 옛뿌리깔기()
  const 부른것 = []
  const 알림글 = []
  const 알림옵션 = []
  const 발자국 = []
  const r = await 업데이트하기({
    뿌리,
    받기: 가짜받기,
    실행: async (명령, 인자) => { 부른것.push([명령, ...인자].join(' ')); return { stdout: '' } },
    알림: async (글, 옵션) => { 알림글.push(글); 알림옵션.push(옵션) },
    지금판: '1.0.0',
    진행: (단계) => 발자국.push(단계),
  })

  assert.equal(r.됨, true, `업데이트가 됐어야 한다 — ${r.까닭}`)
  assert.equal(await 읽기(뿌리, '.env.local'), '옛 열쇠')
  assert.equal(await 읽기(뿌리, '보관함.json'), '{"옛":1}')
  assert.equal(await 읽기(뿌리, 'src/옛.mjs'), '새 내용')
  assert.equal(await 읽기(뿌리, 'src/새.mjs'), '새 파일')
  assert.equal(await 읽기(뿌리, 'package.json'), '{"version":"1.0.1"}')

  const 기록 = await 기록읽기(뿌리)
  assert.equal(기록.length, 1)
  assert.equal(기록[0].판전, '1.0.0')
  assert.equal(기록[0].판후, '1.0.1')
  assert.equal(알림글.length, 1)
  assert.match(알림글[0], /1\.0\.0 → 1\.0\.1/)
  // 6시간 잠잠에 눌리면 되돌림·구조 알림을 놓친다
  assert.equal(알림옵션[0].잠잠시간, 0)
  assert.ok(부른것.some((c) => c.startsWith('npm install')), '묶음을 받았어야 한다')
  assert.ok(부른것.some((c) => c.includes('next') && c.includes('build')), '화면을 빌드했어야 한다')
  assert.ok(부른것.some((c) => c.includes('kickstart')), '대시보드를 다시 켰어야 한다')
  assert.ok(발자국.includes('받는 중') && 발자국.includes('덮는 중'), `진행 단계가 빠졌다 — ${발자국}`)
  console.log('업데이트하기(성공) ✓')

  // 같은 판이면 다시 받지 않는다
  const r2 = await 업데이트하기({ 뿌리, 받기: 가짜받기, 실행: async () => ({}), 알림: async () => {}, 지금판: '1.0.1' })
  assert.deepEqual({ 됨: r2.됨, 까닭: r2.까닭 }, { 됨: false, 까닭: '이미 최신' })
  // 매일 도는 일이다. 「이미 최신」을 적으면 50줄이 그것으로만 찬다
  assert.equal((await 기록읽기(뿌리)).length, 1)
  const r3 = await 업데이트하기({ 뿌리, 받기: async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' }), 알림: async () => {} })
  assert.equal(r3.까닭, '최신 판을 확인하지 못했어요.')
  assert.equal((await 기록읽기(뿌리)).length, 1)
  console.log('이미 최신 · 확인 실패는 기록에 안 남는다 ✓')
}

{
  const 뿌리 = await 옛뿌리깔기()
  const 알림글 = []
  const r = await 업데이트하기({
    뿌리,
    받기: 가짜받기,
    실행: async (명령, 인자) => {
      if (인자.includes('build')) throw new Error('빌드가 깨졌다')
      return { stdout: '' }
    },
    알림: async (글) => { 알림글.push(글) },
    지금판: '1.0.0',
  })

  assert.equal(r.됨, false)
  assert.equal(r.되돌림, true)
  assert.equal(await 읽기(뿌리, 'src/옛.mjs'), '옛 내용')
  assert.equal(await 읽기(뿌리, 'package.json'), '{"version":"1.0.0"}')
  assert.equal(await 읽기(뿌리, '.env.local'), '옛 열쇠')
  assert.equal(알림글.length, 1)
  assert.match(알림글[0], /되돌렸어요/)
  // 옛 판 다시 빌드도 같은 이유로 막힌다. 조용히 삼키면 사람은 화면이 왜 안 뜨는지 모른다
  assert.match(알림글[0], /옛 판 다시 빌드도 막혔어요 — 관리자 도구 터미널에서/)
  assert.equal((await 기록읽기(뿌리))[0].결과, '되돌림')
  console.log('업데이트하기(실패 → 되돌림) ✓')
}

// ─── 덮기도 되돌리기도 막히면 조용히 넘어가지 않는다 ────────────
{
  const 뿌리 = await 옛뿌리깔기()
  // 백업폴더 자리에 파일을 놔 둔다 — mkdir 도 되돌리기(readdir) 도 여기서 막힌다
  await mkdir(join(뿌리, '업데이트백업'), { recursive: true })
  await writeFile(join(뿌리, '업데이트백업', '1.0.0'), '파일이 폴더 자리를 막고 있다')
  const 알림글 = []
  const r = await 업데이트하기({
    뿌리,
    받기: 가짜받기,
    실행: async () => ({ stdout: '' }),
    알림: async (글) => { 알림글.push(글) },
    지금판: '1.0.0',
  })

  assert.equal(r.됨, false)
  assert.equal(r.되돌림, false)
  assert.equal(r.되돌리기실패, true)
  assert.equal((await 기록읽기(뿌리))[0].결과, '되돌리기실패')
  assert.equal(알림글.length, 1)
  assert.match(알림글[0], /손으로 복사해 주세요/)
  console.log('업데이트하기(덮기 실패 → 되돌리기도 실패) ✓')
}

// ─── 제작자 저장소에서는 아무것도 안 한다 ───────────────────────
{
  const 뿌리 = await 옛뿌리깔기()
  await mkdir(join(뿌리, '도구'), { recursive: true })
  await writeFile(join(뿌리, '도구', '공개판올리기.mjs'), '// 제작자만 쓰는 도구')
  let 받아봤나 = false
  const r = await 업데이트하기({
    뿌리,
    받기: async () => { 받아봤나 = true; throw new Error('여기까지 오면 안 된다') },
    실행: async () => ({ stdout: '' }),
    알림: async () => {},
    지금판: '1.0.0',
  })

  assert.deepEqual({ 됨: r.됨, 까닭: r.까닭 },
    { 됨: false, 까닭: '제작자 저장소에서는 자동 업데이트를 하지 않아요.' })
  assert.equal(받아봤나, false, '깃허브를 부르면 안 된다')
  assert.equal((await 기록읽기(뿌리)).length, 0, '기록도 남기지 않는다')
  console.log('제작자 저장소는 건너뛴다 ✓')
}

// ─── (h) 켜기만 막히면 되돌리지 않는다 ──────────────────────────
{
  const 뿌리 = await 옛뿌리깔기()
  const 알림글 = []
  const r = await 업데이트하기({
    뿌리,
    받기: 가짜받기,
    실행: async (명령) => {
      if (명령 === 'launchctl') throw new Error('안 켜진다')
      return { stdout: '' }
    },
    알림: async (글) => { 알림글.push(글) },
    지금판: '1.0.0',
  })

  assert.equal(r.됨, true)
  assert.equal(r.다시켜기실패, true)
  assert.equal(await 읽기(뿌리, 'src/옛.mjs'), '새 내용') // 되돌리지 않는다
  assert.equal(await 읽기(뿌리, 'package.json'), '{"version":"1.0.1"}')
  assert.equal(알림글.length, 1)
  assert.match(알림글[0], /직접 다시 켜 주세요/)
  const 기록들 = await 기록읽기(뿌리)
  assert.equal(기록들.at(-1).결과, '됨-다시켜기실패') // 라벨 정직 — '됨' 이 아니다
  console.log('업데이트하기(켜기만 실패) ✓')
}

// ─── (g) 릴리스도 태그도 없으면 null ─────────────────────────────
{
  const 없는곳 = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' })
  assert.equal(await 최신판알아보기({ 받기: 없는곳 }), null)
  // 길이 끊겨도 던지지 않는다. 새벽에 던지면 아무도 못 본다
  assert.equal(await 최신판알아보기({ 받기: async () => { throw new Error('끊김') } }), null)
  // 릴리스가 없으면 태그로 넘어간다
  const 태그만 = async (주소) => (주소.includes('releases/latest')
    ? { ok: false, status: 404, json: async () => ({}), text: async () => '' }
    : { ok: true, status: 200, json: async () => ([{ name: 'v2.3.4', zipball_url: 'zz' }]) })
  assert.deepEqual(await 최신판알아보기({ 받기: 태그만 }), { 판: '2.3.4', zip: 'zz' })
  console.log('최신판알아보기 ✓')
}

// ─── plist 글 (실제 launchd 는 건드리지 않는다) ─────────────────
{
  const 글 = 업데이트plist글('/뿌리/자리')
  assert.match(글, /<key>Label<\/key><string>com\.threads\.update<\/string>/)
  assert.match(글, /<key>Hour<\/key><integer>11<\/integer>/)
  assert.match(글, /<key>Minute<\/key><integer>0<\/integer>/)
  assert.match(글, /<key>WorkingDirectory<\/key><string>\/뿌리\/자리<\/string>/)
  assert.ok(글.includes(`<string>${process.execPath}</string>`), '지금 도는 node 로 적어야 한다')
  assert.ok(글.includes('<string>/뿌리/자리/업데이트.mjs</string>'), '실행기는 절대경로로 적어야 한다')
  console.log('업데이트plist글 ✓')
}

for (const 곳 of 지울것) await rm(곳, { recursive: true, force: true })
console.log('\n전부 통과 ✓')
