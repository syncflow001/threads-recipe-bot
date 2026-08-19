// 설정 화면이 브라우저에 보여 주는 페이지 한 장 — 바깥에서 아무것도 안 받아온다
export const 화면 = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>스레드 자동화 설정</title>
<style>
  :root{
    --바탕:#faf7f2; --판:#fff; --글:#231f1c; --옅은글:#7a716a;
    --선:#e6ded3; --강조:#c2410c; --좋음:#15803d; --나쁨:#b91c1c;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--바탕);color:var(--글);
    font:16px/1.65 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}
  header{padding:2.5rem 1.5rem 1rem;max-width:820px;margin:0 auto}
  h1{margin:0;font-size:1.6rem;letter-spacing:-.02em}
  header p{margin:.4rem 0 0;color:var(--옅은글);font-size:.92rem}
  main{max-width:820px;margin:0 auto;padding:0 1.5rem 5rem}
  section{background:var(--판);border:1px solid var(--선);border-radius:14px;
    padding:1.5rem;margin-top:1.25rem}
  h2{margin:0 0 .35rem;font-size:1.05rem;letter-spacing:-.01em}
  .귀띔{color:var(--옅은글);font-size:.86rem;margin:0 0 1.1rem}
  label{display:block;font-size:.86rem;font-weight:600;margin:.9rem 0 .3rem}
  input,textarea,select{width:100%;padding:.6rem .7rem;border:1px solid var(--선);
    border-radius:9px;font:inherit;font-size:.93rem;background:#fffdfa;color:var(--글)}
  textarea{resize:vertical;min-height:4.5rem}
  input:focus,textarea:focus,select:focus{outline:2px solid var(--강조);outline-offset:1px;border-color:transparent}
  button{font:inherit;font-weight:600;font-size:.9rem;padding:.55rem 1rem;border-radius:9px;
    border:1px solid var(--글);background:var(--글);color:#fff;cursor:pointer}
  button.연한{background:transparent;color:var(--글)}
  button.위험{background:var(--강조);border-color:var(--강조)}
  button:disabled{opacity:.4;cursor:not-allowed}
  .줄{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:1.1rem}
  table{width:100%;border-collapse:collapse;font-size:.9rem}
  td{padding:.42rem 0;border-bottom:1px solid var(--선);vertical-align:top}
  td:first-child{width:1.6rem}
  td.이름{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.83rem;white-space:nowrap;padding-right:.8rem}
  td.설명{color:var(--옅은글)}
  .좋음{color:var(--좋음)} .나쁨{color:var(--나쁨)}
  pre{background:#1c1917;color:#e7e5e4;padding:1rem;border-radius:10px;overflow:auto;
    max-height:26rem;font-size:.8rem;line-height:1.5;white-space:pre-wrap;word-break:break-all}
  .알림{margin-top:.9rem;font-size:.88rem;font-weight:600;min-height:1.2rem}
  .경고{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:.8rem 1rem;
    font-size:.85rem;color:#7c2d12;margin-top:1rem}
</style></head><body>
<header>
  <h1>스레드 자동화 설정</h1>
  <p>이 화면은 내 컴퓨터에서만 열립니다. 넣은 열쇠는 이 컴퓨터를 벗어나지 않습니다.</p>
</header>
<main>

<section>
  <h2>계정</h2>
  <p class="귀띔">여러 계정을 굴린다면 여기서 고릅니다.</p>
  <select id="계정"></select>
</section>

<section>
  <h2>1. 열쇠</h2>
  <p class="귀띔">채워진 것은 값을 보여 주지 않습니다. 바꾸려면 새 값을 넣고 저장하세요.
    빈 칸으로 두면 그대로 둡니다.</p>
  <table id="열쇠표"></table>
  <div id="열쇠칸"></div>
  <div class="줄"><button id="열쇠저장">열쇠 저장</button></div>
  <div class="알림" id="열쇠알림"></div>
</section>

<section>
  <h2>2. 말투</h2>
  <p class="귀띔"><b>내 글 예시가 제일 강력합니다.</b> 반응 좋았던 글을 그대로 붙여넣으세요.</p>
  <label>나를 한 줄로</label><input id="정체성" placeholder="30대 직장인. 퇴근하고 해먹는 집밥 계정">
  <label>말투</label><textarea id="말투" placeholder="친한 친구한테 얘기하듯 반말. 마침표를 거의 안 쓴다"></textarea>
  <label>자주 쓰는 표현 (쉼표로 나눠서)</label><input id="표현" placeholder="ㅋㅋ, ㅎㅎ, ㅠㅠ">
  <label>내 글 예시 ①</label><textarea id="예시0"></textarea>
  <label>내 글 예시 ②</label><textarea id="예시1"></textarea>
  <label>내 글 예시 ③</label><textarea id="예시2"></textarea>
  <div class="줄"><button id="말투저장">말투 저장</button></div>
  <div class="알림" id="말투알림"></div>
</section>

<section>
  <h2>3. 돌려 보기</h2>
  <p class="귀띔">검색어는 여러 개 넣는 게 좋습니다.</p>
  <label>검색어</label><input id="키워드" value="레시피 요리 한식">
  <div class="줄">
    <button class="연한" data-단계="보기">보기만 — 아무것도 안 올림</button>
    <button class="연한" data-단계="만들기">글만 만들기</button>
    <button class="위험" data-단계="발행">실제로 올리기</button>
    <button class="연한" id="멈추기" disabled>멈추기</button>
  </div>
  <div class="경고">가운데 <b>실제로 올리기</b>만 계정에 글이 올라갑니다. 나머지 둘은 안전합니다.</div>
  <pre id="기록">아직 돌린 것이 없습니다.</pre>
</section>

</main>
<script>
const $ = (id) => document.getElementById(id)
const 계정 = () => $('계정').value
const 주소 = (길) => 길 + '?profile=' + encodeURIComponent(계정())
const 부르기 = async (길, 몸통) => {
  const r = await fetch(주소(길), 몸통 ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(몸통),
  } : {})
  const j = await r.json()
  if (!r.ok) throw new Error(j.안됨 || '실패했습니다')
  return j
}

function 그리기(s) {
  $('열쇠표').innerHTML = s.열쇠.map((k) =>
    '<tr><td class="' + (k.채움 ? '좋음' : k.필수 ? '나쁨' : '') + '">' +
    (k.채움 ? '✓' : k.필수 ? '✗' : '·') + '</td>' +
    '<td class="이름">' + k.이름 + '</td><td class="설명">' + k.설명 +
    (k.필수 ? '' : ' <i>(선택)</i>') + '</td></tr>').join('')
  $('열쇠칸').innerHTML = s.열쇠.map((k) =>
    '<label>' + k.이름 + (k.채움 ? ' — 이미 채워져 있습니다' : '') + '</label>' +
    '<input type="password" autocomplete="off" data-열쇠="' + k.이름 + '" placeholder="' +
    (k.채움 ? '바꿀 때만 넣으세요' : '값을 붙여넣으세요') + '">').join('')
  const m = s.말투 || {}
  $('정체성').value = m.정체성 || ''
  $('말투').value = m.말투 || ''
  $('표현').value = m.표현 || ''
  for (let i = 0; i < 3; i++) $('예시' + i).value = (m.예시 || [])[i] || ''
}

async function 새로고침() {
  const s = await 부르기('/status')
  const 고른것 = 계정()
  $('계정').innerHTML = s.계정들.map((c) =>
    '<option value="' + c + '"' + (c === 고른것 ? ' selected' : '') + '>' +
    (c || '첫 계정 (기본)') + '</option>').join('')
  그리기(s)
}

$('계정').onchange = 새로고침

$('열쇠저장').onclick = async (e) => {
  e.target.disabled = true
  try {
    const 낼것 = {}
    document.querySelectorAll('[data-열쇠]').forEach((el) => {
      if (el.value.trim()) 낼것[el.dataset.열쇠] = el.value.trim()
    })
    if (!Object.keys(낼것).length) { $('열쇠알림').textContent = '바꿀 값이 없습니다.'; return }
    그리기(await 부르기('/keys', 낼것))
    $('열쇠알림').textContent = '저장했습니다. ✓'
  } catch (err) { $('열쇠알림').textContent = '실패 — ' + err.message }
  finally { e.target.disabled = false }
}

$('말투저장').onclick = async (e) => {
  e.target.disabled = true
  try {
    await 부르기('/persona', {
      정체성: $('정체성').value, 말투: $('말투').value, 표현: $('표현').value,
      예시: [0, 1, 2].map((i) => $('예시' + i).value),
    })
    $('말투알림').textContent = '저장했습니다. 다음 실행부터 반영됩니다. ✓'
  } catch (err) { $('말투알림').textContent = '실패 — ' + err.message }
  finally { e.target.disabled = false }
}

document.querySelectorAll('[data-단계]').forEach((b) => {
  b.onclick = async () => {
    if (b.dataset.단계 === '발행' &&
        !confirm('실제로 계정에 글이 올라갑니다. 계속할까요?')) return
    try {
      const r = await 부르기('/run', { 단계: b.dataset.단계, 키워드: $('키워드').value })
      if (r.안됨) return alert(r.안됨)
      보기시작()
    } catch (err) { alert(err.message) }
  }
})

$('멈추기').onclick = () => 부르기('/stop', {})

let 보는중 = null
function 보기시작() {
  clearInterval(보는중)
  보는중 = setInterval(async () => {
    const r = await 부르기('/log')
    $('기록').textContent = r.글 || '기다리는 중...'
    $('기록').scrollTop = $('기록').scrollHeight
    $('멈추기').disabled = !r.도는중
    document.querySelectorAll('[data-단계]').forEach((b) => (b.disabled = r.도는중))
    if (!r.도는중) { clearInterval(보는중); 보는중 = null }
  }, 1000)
}

새로고침()
</script></body></html>`
