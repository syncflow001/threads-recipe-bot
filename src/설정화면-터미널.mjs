// 설정 화면의 「관리자 도구」 — 이 맥의 진짜 터미널을 브라우저에서 쓴다. 최대 네 창.
// 새 대시보드(dashboard/app/api/term/*)가 이 파일의 pty·통행증 함수를 그대로 쓴다. 다만 옛 화면 조각 함수(도구칸HTML 등)는 archive/2026-08-28-옛-대시보드/src/설정화면-html.mjs 만 쓰던 것이라 지금은 아무도 안 부른다.
// 문은 둘이다. 대시보드 열쇠말(모두가 지나는 문) + 이 맥의 로그인 비밀번호(이 칸만의 문).
// 비밀번호는 맥에게 물어만 보고(dscl) 어디에도 안 적는다. 맞으면 통행증 쿠키만 남긴다.
// 창 하나 = 파이썬 껍데기(터미널껍데기.py) 하나 = pty 하나 = zsh 하나.
import './그물.mjs'   // IPv6 헛디딤 막기 (부수 효과) — 왜인지는 그 파일 머리에 있다
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { userInfo } from 'node:os'
import { StringDecoder } from 'node:string_decoder'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 화면 쪽 스크립트가 두드리는 주소. 서버 분기와 화면이 여기 한 곳을 같이 본다.
// ⚠️ 이 서버는 같은 주소를 GET·POST 로 나눠 쓰지 않는다 (위 GET 분기가 POST 를 먼저 삼킨다, 실측)
export const 터미널길들 = {
  check: '/term-check',      // GET  통행증이 살아 있나 + 열린 창
  login: '/term-login',      // POST 비밀번호 → 통행증
  logout: '/term-logout',    // POST 통행증 버리기 + 창 전부 닫기
  open: '/term-open',        // POST 창 열기
  close: '/term-close',      // POST 창 닫기
  input: '/term-input',      // POST 키 입력
  resize: '/term-resize',    // POST 창 크기
  stream: '/term-stream',    // GET  화면 출력 (SSE)
}

export const 최대창 = 4
const 통행증수명 = 8 * 60 * 60 * 1000
const 되감기상한 = 200_000 // 새로고침 뒤 다시 보여 줄 글자 수

const 여기 = dirname(fileURLToPath(import.meta.url))
const 껍데기 = join(여기, '터미널껍데기.py')

// ── 비밀번호 확인 — 맥에게 묻는다. 우리는 맞았는지만 안다 ─────────────────
// ponytail: 비밀번호가 dscl 의 인자로 잠깐 실린다 (ps 에 보일 수 있다). 혼자 쓰는 맥이라 두었다.
// 남과 같이 쓰는 맥이면 stdin 으로 넘기는 길을 찾아야 한다
export function 비밀번호맞나(비밀번호, { 사용자 = userInfo().username, 실행 = spawn } = {}) {
  return new Promise((맞이) => {
    if (typeof 비밀번호 !== 'string' || !비밀번호) return 맞이(false)
    const 아이 = 실행('/usr/bin/dscl', ['.', '-authonly', 사용자, 비밀번호], { stdio: 'ignore' })
    아이.on('error', () => 맞이(false))
    아이.on('close', (코드) => 맞이(코드=== 0))
  })
}

// ── 통행증 — 메모리에만 산다. 서버를 다시 켜면 전부 사라진다 (그게 맞다) ────────
const 통행증들 = new Map() // 값 → 만료 시각

export function 통행증만들기(지금 = Date.now()) {
  const 값 = randomBytes(24).toString('hex')
  통행증들.set(값, 지금 + 통행증수명)
  return 값
}

export function 통행증살았나(값, 지금 = Date.now()) {
  const 만료 = 통행증들.get(값)
  if (!만료) return false
  if (만료 < 지금) { 통행증들.delete(값); return false }
  return true
}

export function 통행증버리기(값) { 통행증들.delete(값) }

export function 쿠키에서통행증(cookie = '') {
  return cookie.match(/(?:^|;\s*)term=([0-9a-f]{48})/)?.[1] ?? null
}

export const 통행증쿠키줄 = (값) => `term=${값}; Path=/; HttpOnly; SameSite=Strict`
export const 통행증지우는쿠키줄 = 'term=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'

// 틀리면 2초 기다린다 — 무작정 두드리는 것을 늦추는 값싼 제동
export const 틀렸을때기다림 = 2000

// ── 창 — 번호 1~4. 서버가 사는 동안만 산다 ─────────────────────────────
const 창들 = new Map() // 번호 → { 아이, 되감기, 듣는이들 }

export function 창번호맞나(번호) {
  return Number.isInteger(번호) && 번호 >= 1 && 번호 <= 최대창
}

export function 열린창들() { return [...창들.keys()].sort() }

export function 창열기(번호, { 뿌리 = process.cwd(), 실행 = spawn } = {}) {
  if (!창번호맞나(번호)) return { 안됨: `창은 1~${최대창} 까지입니다` }
  if (창들.has(번호)) return { 열림: 번호, 이미: true }
  const 아이 = 실행('/usr/bin/python3', [껍데기, 뿌리], {
    cwd: 뿌리,
    stdio: ['pipe', 'pipe', 'pipe', 'pipe'], // 넷째가 크기 줄
    env: { ...process.env, TERM: 'xterm-256color' },
  })
  const 창 = { 아이, 되감기: '', 듣는이들: new Set(), 풀이: new StringDecoder('utf8'), 끝남: null }
  const 흘리기 = (글) => {
    if (!글) return
    창.되감기 = (창.되감기 + 글).slice(-되감기상한)
    for (const 듣는이 of 창.듣는이들) 듣는이(글)
  }
  아이.stdout.on('data', (덩이) => 흘리기(창.풀이.write(덩이)))
  아이.stderr.on('data', (덩이) => 흘리기(String(덩이)))
  아이.on('error', (e) => { 흘리기(`\r\n[터미널을 못 열었습니다: ${e.message}]\r\n`) })
  아이.on('close', (코드) => {
    흘리기(창.풀이.end())
    창.끝남 = 코드 ?? 0
    for (const 듣는이 of 창.듣는이들) 듣는이(null, 창.끝남)
    창들.delete(번호)
  })
  창들.set(번호, 창)
  return { 열림: 번호 }
}

export function 창닫기(번호) {
  const 창 = 창들.get(번호)
  if (!창) return { 닫힘: 번호, 없었음: true }
  창.아이.kill('SIGHUP')
  return { 닫힘: 번호 }
}

export function 창전부닫기() { for (const 번호 of 열린창들()) 창닫기(번호) }

export function 창입력(번호, 글) {
  const 창 = 창들.get(번호)
  if (!창) return { 안됨: '닫힌 창입니다' }
  if (typeof 글 !== 'string' || !글) return { 됨: true }
  창.아이.stdin.write(글)
  return { 됨: true }
}

export function 창크기(번호, cols, rows) {
  const 창 = 창들.get(번호)
  if (!창) return { 안됨: '닫힌 창입니다' }
  cols = Math.floor(Number(cols)); rows = Math.floor(Number(rows))
  if (!(cols > 0 && cols < 1000 && rows > 0 && rows < 1000)) return { 안됨: '크기가 이상합니다' }
  창.아이.stdio[3].write(`${cols} ${rows}\n`)
  return { 됨: true }
}

// 화면 출력을 SSE 로 흘린다. 붙자마자 되감기를 먼저 보낸다 — 새로고침해도 지난 화면이 남는다.
// 껍데기가 끝나면 end 를 보내고 닫는다
export function 창듣기(번호, res) {
  const 창 = 창들.get(번호)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const 보내기 = (이름, 값) => res.write(`event: ${이름}\ndata: ${JSON.stringify(값)}\n\n`)
  if (!창) { 보내기('end', { 코드: null, 없었음: true }); return res.end() }
  보내기('out', 창.되감기)
  const 심장 = setInterval(() => res.write(': 살아있음\n\n'), 25_000)
  const 듣는이 = (글, 코드) => {
    if (글 === null) { clearInterval(심장); 보내기('end', { 코드 }); res.end(); return }
    보내기('out', 글)
  }
  창.듣는이들.add(듣는이)
  res.on('close', () => { clearInterval(심장); 창.듣는이들.delete(듣는이) })
}

// ── 화면 조각 — 자물쇠 판과 터미널 판 ────────────────────────────────────
// xterm.js 는 이 칸에서만 쓴다. 관리자 도구 쪽을 처음 열 때만 내려받는다 (다른 쪽은 무겁게 안 한다)
export function 도구칸HTML() {
  return `
<div id="도구칸">
  <div id="도구자물쇠">
    <p class="귀띔" style="margin:0 0 10px">이 칸은 <b>이 맥에 직접 명령을 내리는 진짜 터미널</b>이에요.
      맥 터미널 앱과 같은 것이라 <b>파일을 지우는 명령도 막지 않아요.</b>
      그래서 이 맥의 <b>로그인 비밀번호</b>를 한 번 더 물어요. 비밀번호는 맥에게 맞는지 물어만 보고 어디에도 저장하지 않아요.</p>
    <form id="도구잠금틀" class="줄" autocomplete="off">
      <input id="도구비밀번호" type="password" placeholder="이 맥의 로그인 비밀번호" autocomplete="current-password" style="flex:1;min-width:12rem">
      <button id="도구열기단추" type="submit">열기</button>
    </form>
    <div id="도구잠금알림"></div>
    <div id="도구대기명령" class="귀띔" hidden style="margin:.6rem 0 0"></div>
  </div>
  <div id="도구터미널판" hidden>
    <div class="줄" id="도구도구줄">
      <button id="도구나누기단추" class="연한 작은">창 나누기</button>
      <span class="귀띔" id="도구창수"></span>
      <span style="flex:1"></span>
      <button id="도구잠그기단추" class="연한 작은">잠그기</button>
    </div>
    <div id="도구창격자"></div>
  </div>
</div>

<style>
  #도구창격자 { display: grid; gap: 8px; grid-template-columns: 1fr; min-height: 60vh; }
  #도구창격자.둘 { grid-template-columns: 1fr 1fr; }
  #도구창격자.넷 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  #도구창격자.넷 { min-height: 70vh; }
  .도구창 { display: flex; flex-direction: column; border: 1px solid var(--칸선); border-radius: 10px;
    overflow: hidden; background: #1e1e1e; min-height: 16rem; }
  .도구창 .머리 { display: flex; align-items: center; gap: 8px; padding: 4px 10px; background: #2b2b2b;
    color: #ddd; font-size: .85rem; }
  .도구창 .머리 b { flex: 1; font-weight: 600; }
  .도구창 .머리 button { background: none; border: 0; color: #bbb; cursor: pointer; font-size: 1rem; padding: 0 4px; }
  .도구창 .머리 button:hover { color: #fff; }
  .도구창.끝남 .머리 { background: #4a2b2b; }
  .도구창 .몸 { flex: 1; min-height: 0; padding: 4px; }
  .도구창 .몸 .xterm { height: 100%; }
  #도구잠금알림 .경고 { margin-top: 8px; }
  @media (max-width: 720px) {
    #도구창격자.둘, #도구창격자.넷 { grid-template-columns: 1fr; grid-template-rows: none; }
  }
</style>

<script>
// 관리자 도구 — 자물쇠 → 터미널 창 1~${최대창}. 서버가 창을 기억하므로 새로고침해도 이어진다
(() => {
  const 길 = ${JSON.stringify(터미널길들)}
  const 최대 = ${최대창}
  const ㄷ = (id) => document.getElementById(id)
  const 창들 = new Map() // 번호 → { 터미널, 맞춤, 흐름, 칸, 보내기줄 }
  let 부품준비 = null
  let 살펴봄 = false // 쪽을 한 번이라도 열어 통행증을 확인했나

  // xterm.js 를 처음 열 때만 붙인다
  const 부품붙이기 = () => {
    if (부품준비) return 부품준비
    부품준비 = new Promise((되면, 안되면) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/xterm.css'
      document.head.appendChild(css)
      const 하나 = (src) => new Promise((ok, no) => {
        const s = document.createElement('script'); s.src = src
        s.addEventListener('load', ok); s.addEventListener('error', () => no(new Error(src + ' 를 못 받았습니다')))
        document.head.appendChild(s)
      })
      하나('/xterm.js').then(() => 하나('/addon-fit.js')).then(되면, 안되면)
    })
    return 부품준비
  }

  const 요청 = async (어디, 몸통) => {
    const r = await fetch(어디, 몸통 ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(몸통) } : {})
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.안됨 || '실패했습니다')
    return j
  }

  const 격자꼴 = () => {
    const n = 창들.size
    ㄷ('도구창격자').className = n >= 3 ? '넷' : n === 2 ? '둘' : ''
    ㄷ('도구창수').textContent = n + ' / ' + 최대
    ㄷ('도구나누기단추').disabled = n >= 최대
    for (const 창 of 창들.values()) 창.맞춤()
  }

  const 창그리기 = (번호) => {
    const 칸 = document.createElement('div'); 칸.className = '도구창'; 칸.dataset.번호 = 번호
    칸.innerHTML = '<div class="머리"><b>터미널 ' + 번호 + '</b><button title="닫기">✕</button></div><div class="몸"></div>'
    ㄷ('도구창격자').appendChild(칸)
    const 터미널 = new window.Terminal({ cursorBlink: true, fontSize: 13, scrollback: 3000,
      theme: { background: '#1e1e1e' }, allowProposedApi: true })
    const 맞춤부품 = new window.FitAddon.FitAddon()
    터미널.loadAddon(맞춤부품)
    터미널.open(칸.querySelector('.몸'))
    // 키 입력은 순서가 생명이라 한 줄로 세워 보낸다 — fetch 는 먼저 보낸 것이 먼저 닿는다고 보장하지 않는다
    let 줄 = Promise.resolve()
    터미널.onData((글) => { 줄 = 줄.then(() => 요청(길.input, { 번호, 글 })).catch(() => {}) })
    let 지난크기 = ''
    const 맞춤 = () => {
      if (칸.offsetWidth === 0) return
      맞춤부품.fit()
      const 크기 = 터미널.cols + 'x' + 터미널.rows
      if (크기 === 지난크기) return
      지난크기 = 크기
      요청(길.resize, { 번호, cols: 터미널.cols, rows: 터미널.rows }).catch(() => {})
    }
    new ResizeObserver(() => 맞춤()).observe(칸)
    const 흐름 = new EventSource(길.stream + '?번호=' + 번호)
    흐름.addEventListener('out', (e) => 터미널.write(JSON.parse(e.data)))
    흐름.addEventListener('end', (e) => {
      const { 코드 } = JSON.parse(e.data)
      터미널.write('\\r\\n[셸이 끝났습니다' + (코드 == null ? '' : ' · 종료코드 ' + 코드) + '. 닫기를 누르세요]\\r\\n')
      칸.classList.add('끝남'); 흐름.close()
    })
    칸.querySelector('.머리 button').onclick = () => 창닫기(번호)
    창들.set(번호, { 터미널, 맞춤, 흐름, 칸 })
    격자꼴()
    setTimeout(() => { 맞춤(); 터미널.focus() }, 50)
  }

  const 창닫기 = async (번호) => {
    const 창 = 창들.get(번호)
    if (!창) return
    창.흐름.close(); 창.터미널.dispose(); 창.칸.remove(); 창들.delete(번호)
    격자꼴()
    await 요청(길.close, { 번호 }).catch(() => {})
  }

  const 창열기 = async () => {
    let 번호 = 1
    while (창들.has(번호)) 번호++
    if (번호 > 최대) return
    await 요청(길.open, { 번호 })
    창그리기(번호)
  }

  const 터미널판보이기 = async (열린것) => {
    await 부품붙이기()
    ㄷ('도구자물쇠').hidden = true
    ㄷ('도구터미널판').hidden = false
    for (const 번호 of 열린것 || []) if (!창들.has(번호)) 창그리기(번호)
    if (창들.size === 0) await 창열기()
    격자꼴()
  }

  // 다른 쪽(세팅의 열쇠 카드)이 「이 명령을 터미널에서 돌려 달라」고 부르는 손잡이.
  // 잠겨 있으면 비밀번호를 넣은 뒤에 돌린다. 새 창을 하나 열어 거기에 친다
  let 대기명령 = null
  const 명령치기 = async (명령) => {
    await 창열기()
    const 번호 = Math.max(...창들.keys())
    const 창 = 창들.get(번호)
    await new Promise((r) => setTimeout(r, 900)) // 셸 프롬프트가 뜰 시간
    await 요청(길.input, { 번호, 글: 명령 + '\\r' })
    창.터미널.focus()
  }
  window.도구명령돌리기 = async (명령) => {
    window.쪽보이기?.('도구')
    const r = await 요청(길.check).catch(() => ({ 통과: false }))
    if (r.통과) { 살펴봄 = true; await 터미널판보이기(r.열린것); await 명령치기(명령); return }
    대기명령 = 명령
    ㄷ('도구대기명령').hidden = false
    ㄷ('도구대기명령').innerHTML = '비밀번호를 넣으면 이 명령이 바로 실행돼요 — <code>' + 명령.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]) + '</code>'
    ㄷ('도구비밀번호').focus()
  }

  const 잠그기 = async () => {
    for (const 번호 of [...창들.keys()]) {
      const 창 = 창들.get(번호)
      창.흐름.close(); 창.터미널.dispose(); 창.칸.remove(); 창들.delete(번호)
    }
    await 요청(길.logout, {}).catch(() => {})
    ㄷ('도구터미널판').hidden = true
    ㄷ('도구자물쇠').hidden = false
    ㄷ('도구비밀번호').value = ''
  }

  ㄷ('도구잠금틀').onsubmit = async (e) => {
    e.preventDefault()
    const 단추 = ㄷ('도구열기단추'); 단추.disabled = true
    ㄷ('도구잠금알림').innerHTML = ''
    try {
      const r = await 요청(길.login, { 비밀번호: ㄷ('도구비밀번호').value })
      ㄷ('도구비밀번호').value = ''
      await 터미널판보이기(r.열린것)
      if (대기명령) { const 명령 = 대기명령; 대기명령 = null; ㄷ('도구대기명령').hidden = true; await 명령치기(명령) }
    } catch (err) {
      ㄷ('도구잠금알림').innerHTML = '<div class="경고">' + (err.message || '비밀번호가 맞지 않습니다') + '</div>'
    } finally { 단추.disabled = false }
  }
  ㄷ('도구나누기단추').onclick = () => 창열기().catch((err) => alert(err.message))
  ㄷ('도구잠그기단추').onclick = 잠그기

  // 쪽을 열 때 통행증이 살아 있으면 자물쇠를 건너뛴다. 창이 화면에 보여야 크기를 잴 수 있어서
  // 관리자 도구 쪽 단추를 누른 뒤에만 그린다
  document.querySelector('.쪽단추[data-쪽="도구"]')?.addEventListener('click', async () => {
    if (살펴봄) { 격자꼴(); return }
    살펴봄 = true
    const r = await 요청(길.check).catch(() => ({ 통과: false }))
    if (r.통과) await 터미널판보이기(r.열린것).catch((err) => {
      ㄷ('도구잠금알림').innerHTML = '<div class="경고">' + err.message + '</div>'
    })
  })
  // 새로고침으로 곧장 이 쪽에 돌아왔을 때 — 쪽보이기() 가 쏘는 신호를 받는다
  document.addEventListener('쪽바뀜', (e) => { if (e.detail === '도구') document.querySelector('.쪽단추[data-쪽="도구"]')?.click() })
})()
</script>`
}

export { 창들 }
