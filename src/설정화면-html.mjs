// 설정 화면이 브라우저에 보여 주는 페이지 한 장 — 바깥에서 아무것도 안 받아온다
export const 화면 = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>스레드 자동화</title>
<style>
  :root{
    --바탕:#faf7f2; --판:#fff; --글:#231f1c; --옅은글:#7a716a;
    --선:#e6ded3; --강조:#c2410c; --좋음:#15803d; --나쁨:#b91c1c; --회색:#c4bdb4;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--바탕);color:var(--글);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}
  header{padding:2rem 1.5rem .5rem;max-width:880px;margin:0 auto;
    display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap}
  h1{margin:0;font-size:1.45rem;letter-spacing:-.02em}
  header select{width:auto;min-width:11rem}
  .계정줄{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}
  .계정줄 input{width:11rem}
  button.지움{background:var(--나쁨);border-color:var(--나쁨);color:#fff}
  #새계정판 section,#삭제판 section{border-color:var(--강조)}
  #삭제판 section{border-color:var(--나쁨)}
  #계정알림{max-width:880px;margin:.6rem auto 0;padding:0 1.5rem;font-size:.86rem;font-weight:600}
  main{max-width:880px;margin:0 auto;padding:0 1.5rem 5rem}
  section{background:var(--판);border:1px solid var(--선);border-radius:14px;
    padding:1.4rem;margin-top:1.1rem}
  h2{margin:0 0 .3rem;font-size:1.02rem;letter-spacing:-.01em}
  .귀띔{color:var(--옅은글);font-size:.84rem;margin:0 0 1rem}
  summary{cursor:pointer;font-size:1.02rem;font-weight:700;letter-spacing:-.01em;
    list-style:none;display:flex;align-items:center;gap:.5rem}
  summary::-webkit-details-marker{display:none}
  summary::before{content:'▸';color:var(--옅은글);transition:transform .15s}
  details[open]>summary::before{transform:rotate(90deg)}
  details[open]>summary{margin-bottom:.9rem}
  label{display:block;font-size:.85rem;font-weight:600;margin:.85rem 0 .3rem}
  input,textarea,select{width:100%;padding:.55rem .7rem;border:1px solid var(--선);
    border-radius:9px;font:inherit;font-size:.92rem;background:#fffdfa;color:var(--글)}
  textarea{resize:vertical;min-height:4.2rem}
  input:focus,textarea:focus,select:focus{outline:2px solid var(--강조);outline-offset:1px;border-color:transparent}
  button{font:inherit;font-weight:600;font-size:.89rem;padding:.5rem 1rem;border-radius:9px;
    border:1px solid var(--글);background:var(--글);color:#fff;cursor:pointer}
  button.연한{background:transparent;color:var(--글)}
  button.위험{background:var(--강조);border-color:var(--강조)}
  button:disabled{opacity:.4;cursor:not-allowed}
  .줄{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:1rem}
  table{width:100%;border-collapse:collapse;font-size:.88rem}
  td,th{padding:.45rem .5rem;border-bottom:1px solid var(--선);vertical-align:top;text-align:left}
  th{font-size:.78rem;color:var(--옅은글);font-weight:600}
  .이름{font-family:ui-monospace,Menlo,monospace;font-size:.81rem;white-space:nowrap}
  .좋음{color:var(--좋음)} .나쁨{color:var(--나쁨)}
  pre{background:#1c1917;color:#e7e5e4;padding:1rem;border-radius:10px;overflow:auto;
    max-height:24rem;font-size:.79rem;line-height:1.5;white-space:pre-wrap;word-break:break-all}
  .알림{margin-top:.8rem;font-size:.86rem;font-weight:600;min-height:1.1rem}
  .경고{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:.75rem .9rem;
    font-size:.83rem;color:#7c2d12;margin-top:.9rem}
  .숫자줄{display:flex;gap:2rem;flex-wrap:wrap;margin:.2rem 0 1.2rem}
  .숫자 b{display:block;font-size:1.7rem;letter-spacing:-.03em;line-height:1.15}
  .숫자 span{font-size:.78rem;color:var(--옅은글)}
  .막대{display:flex;align-items:flex-end;gap:3px;height:72px;border-bottom:1px solid var(--선);
    padding-bottom:2px;overflow:visible}
  /* 막대가 2px 밖에 안 될 때가 있어 거기에 마우스를 올리기 어렵다. 기둥 전체를 잡이로 쓴다 */
  .칸{flex:1;height:100%;display:flex;align-items:flex-end;position:relative;cursor:default}
  .칸 i{width:100%;background:var(--강조);border-radius:3px 3px 0 0;min-height:2px;opacity:.85}
  .칸:hover i,.칸.짚음 i{opacity:1}
  .칸 i.빔{background:var(--선)}
  .칸 i.깎임{background:var(--나쁨)}
  .칸 b{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
    margin-bottom:8px;background:var(--글);color:#fff;padding:.45rem .65rem;border-radius:9px;
    font-size:.73rem;font-weight:600;line-height:1.45;white-space:nowrap;text-align:center;z-index:9;
    box-shadow:0 4px 14px rgba(0,0,0,.18)}
  .칸 b::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);
    border:5px solid transparent;border-top-color:var(--글)}
  .칸:hover b,.칸.짚음 b{display:block}
  /* 맨 끝 기둥은 말풍선이 화면 밖으로 나간다 */
  .칸:first-child b{left:0;transform:none}
  .칸:first-child b::after{left:1rem}
  .칸:last-child b{left:auto;right:0;transform:none}
  .칸:last-child b::after{left:auto;right:1rem}
  .막대날짜{display:flex;gap:3px;font-size:.62rem;color:var(--옅은글);margin-top:.3rem}
  .막대날짜 span{flex:1;text-align:center}
  .격자{border-collapse:separate;border-spacing:0 .1rem}
  .격자 td{border:none;padding:.3rem .5rem}
  .날{white-space:nowrap;color:var(--옅은글);font-size:.8rem}
  .동그라미{font-size:1.15rem;line-height:1}
  .ㄱ올림{color:var(--좋음)} .ㄱ못올림{color:var(--회색)}
  .ㄱ건너뜀{color:var(--회색)} .ㄱ실패{color:var(--나쁨)}
  .ㄱ기록없음,.ㄱ아직{color:var(--선)}
  .뜻{display:flex;gap:1.1rem;flex-wrap:wrap;font-size:.78rem;color:var(--옅은글);margin-top:.9rem}
  .공유표{display:inline-block;font-size:.68rem;padding:.05rem .35rem;border-radius:5px;
    background:#e0f2fe;color:#075985;vertical-align:middle;margin-left:.3rem;font-weight:700}
  .사진{width:56px;height:56px;object-fit:cover;border-radius:8px;background:var(--선);display:block}
  .사진없음{width:56px;height:56px;border-radius:8px;background:var(--선);display:grid;
    place-items:center;font-size:1.1rem;color:var(--옅은글)}
  .본문칸{max-width:22rem;font-size:.84rem;line-height:1.5}
  a{color:var(--강조)}
</style></head><body>
<header>
  <h1>스레드 자동화</h1>
  <div class="계정줄">
    <select id="계정"></select>
    <button class="연한" id="계정추가단추">＋ 계정 추가</button>
    <button class="지움" id="계정삭제단추">계정 삭제</button>
  </div>
</header>
<div id="계정알림"></div>

<main id="새계정판" hidden><section>
  <h2>새 계정 만들기</h2>
  <p class="귀띔">이게 어떤 계정인지 알려 주세요.
    <b>스레드 User ID 는 안 물어봅니다</b> — 열쇠를 넣으면 저희가 알아냅니다.</p>
  <label>1. 스레드 계정 이름 <span style="font-weight:400;color:var(--옅은글)">— @ 뒤의 영문입니다</span></label>
  <input id="ㄴ계정" maxlength="30" placeholder="altteul.cart" autocapitalize="off" autocomplete="off">
  <label>2. 별칭 <span style="font-weight:400;color:var(--옅은글)">— 화면에 보일 이름. 비우면 계정 이름을 씁니다</span></label>
  <input id="ㄴ별칭" maxlength="20" placeholder="알뜰카트">
  <label>3. 계정 분야</label><select id="ㄴ분야"></select>
  <label>4. 사용 언어</label><select id="ㄴ언어"></select>
  <label>5. 제휴 마케팅</label><select id="ㄴ제휴"></select>
  <div id="ㄴ못함"></div>
  <div class="줄">
    <button id="ㄴ저장">이 계정 만들기</button>
    <button class="연한" id="ㄴ취소">취소</button>
  </div>
</section></main>

<main id="삭제판" hidden><section>
  <h2 style="color:var(--강조)">계정 삭제</h2>
  <div class="경고" id="삭제설명"></div>
  <label>확인을 위해 <b id="삭제별칭"></b> 를 그대로 입력해 주세요</label>
  <input id="ㅅ별칭" autocomplete="off">
  <div class="줄">
    <button class="지움" id="ㅅ저장">되돌릴 수 없습니다. 지웁니다</button>
    <button class="연한" id="ㅅ취소">취소</button>
  </div>
  <div class="알림" id="삭제알림"></div>
</section></main>
<main>

<section>
  <h2>수익</h2>
  <p class="귀띔">쿠팡파트너스 실적입니다. 5분마다 새로 받아옵니다.</p>
  <div class="숫자줄" id="수익숫자"></div>
  <div class="막대" id="막대"></div>
  <div class="막대날짜" id="막대날짜"></div>
  <div id="수익알림"></div>
</section>

<section>
  <h2>발행 현황</h2>
  <p class="귀띔">예정된 시각마다 한 편씩 올라갑니다. 최근 7일입니다.</p>
  <table class="격자"><tbody id="격자"></tbody></table>
  <div class="뜻">
    <span class="ㄱ올림">● 올림</span>
    <span class="ㄱ못올림">◌ 돌았지만 못 올림</span>
    <span class="ㄱ건너뜀">⏸ 너무 붙어서 건너뜀</span>
    <span class="ㄱ실패">✕ 실패</span>
    <span>○ 발행 전 · 기록 없음</span>
  </div>
  <hr style="border:none;border-top:1px solid var(--선);margin:1.2rem 0 .2rem">
  <label>올릴 시각 (쉼표로 나눠서. 24는 밤 12시입니다)</label>
  <div class="줄" style="margin-top:.3rem">
    <input id="시각칸" style="max-width:16rem" placeholder="8, 12, 16, 20, 24">
    <button id="시각표켜기">자동 발행 켜기</button>
    <button class="연한" id="시각표끄기">끄기</button>
  </div>
  <div class="알림" id="시각표알림"></div>
</section>

<section><details>
  <summary>최근 올린 글</summary>
  <table><thead><tr><th></th><th>본문</th><th>쿠팡 상품</th><th>시각</th></tr></thead>
  <tbody id="글목록"></tbody></table>
</details></section>

<section><details>
  <summary>열쇠</summary>
  <p class="귀띔">채워진 것은 값을 보여 주지 않습니다. 바꿀 때만 새로 넣으세요.<br>
    <b>스레드 User ID 는 안 넣으셔도 됩니다.</b> 토큰을 저장하면 저희가 알아내 채웁니다.<br>
    <b class="공유표">공유</b> 가 붙은 것은 <b>모든 계정이 함께 씁니다.</b>
    어느 화면에서 넣든 한 곳에 저장되고, 새 계정은 그대로 물려받습니다.</p>
  <div id="나정보"></div>
  <table id="열쇠표"></table>
  <div id="열쇠칸"></div>
  <div class="줄"><button id="열쇠저장">열쇠 저장</button></div>
  <div class="알림" id="열쇠알림"></div>
</details></section>

<section><details>
  <summary>말투</summary>
  <p class="귀띔"><b>내 글 예시가 제일 강력합니다.</b> 반응 좋았던 글을 그대로 붙여넣으세요.</p>
  <label>나를 한 줄로</label><input id="정체성" placeholder="30대 직장인. 퇴근하고 해먹는 집밥 계정">
  <label>말투</label><textarea id="말투" placeholder="친한 친구한테 얘기하듯 반말. 마침표를 거의 안 쓴다"></textarea>
  <label>자주 쓰는 표현 (쉼표로 나눠서)</label><input id="표현" placeholder="ㅋㅋ, ㅎㅎ, ㅠㅠ">
  <label>내 글 예시 ①</label><textarea id="예시0"></textarea>
  <label>내 글 예시 ②</label><textarea id="예시1"></textarea>
  <label>내 글 예시 ③</label><textarea id="예시2"></textarea>
  <div class="줄"><button id="말투저장">말투 저장</button></div>
  <div class="알림" id="말투알림"></div>
</details></section>

<section><details>
  <summary>지금 돌려 보기</summary>
  <label>검색어</label><input id="키워드" value="레시피 요리 한식">
  <div class="줄">
    <button class="연한" data-단계="보기">보기만 — 아무것도 안 올림</button>
    <button class="연한" data-단계="만들기">글만 만들기</button>
    <button class="위험" data-단계="발행">실제로 올리기</button>
    <button class="연한" id="멈추기" disabled>멈추기</button>
  </div>
  <div class="경고"><b>실제로 올리기</b>만 계정에 글이 올라갑니다. 나머지 둘은 안전합니다.</div>
  <pre id="기록">아직 돌린 것이 없습니다.</pre>
</details></section>

</main>
<script>
const $ = (id) => document.getElementById(id)
const 계정 = () => $('계정').value
const 부르기 = async (길, 몸통) => {
  const r = await fetch(길 + '?profile=' + encodeURIComponent(계정()), 몸통 ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(몸통),
  } : {})
  const j = await r.json()
  if (!r.ok) throw new Error(j.안됨 || '실패했습니다')
  return j
}
const 안전 = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const 돈 = (n) => '\\u20a9' + Math.round(n).toLocaleString('ko-KR')

async function 수익그리기() {
  const r = await 부르기('/revenue')
  $('수익숫자').innerHTML =
    '<div class="숫자"><b>' + 돈(r.오늘) + '</b><span>오늘</span></div>' +
    '<div class="숫자"><b>' + 돈(r.이번달) + '</b><span>이번 달</span></div>' +
    '<div class="숫자"><b>' + r.클릭.toLocaleString('ko-KR') + '</b><span>이번 달 클릭</span></div>' +
    '<div class="숫자"><b>' + r.주문.toLocaleString('ko-KR') + '</b><span>이번 달 주문</span></div>'
  const 최대 = Math.max(1, ...r.최근.map((d) => Math.abs(d.수수료)))
  $('막대').innerHTML = r.최근.map((d) => {
    const 높이 = Math.max(2, (Math.abs(d.수수료) / 최대) * 70)
    const 말풍선 = 안전(d.날짜.slice(5).replace('-', '월 ') + '일') + '<br>' +
      '<span style="font-size:.95rem">' + 돈(d.수수료) + '</span><br>' +
      '클릭 ' + d.클릭 + ' · 주문 ' + d.주문
    return '<div class="칸"><b>' + 말풍선 + '</b><i class="' +
      (d.수수료 < 0 ? '깎임' : d.수수료 ? '' : '빔') + '" style="height:' + 높이 + 'px"></i></div>'
  }).join('')
  // 아이폰에는 마우스 오버가 없다. 눌러도 뜨게 한다 — 폰에서 대시보드를 보기 때문이다
  $('막대').querySelectorAll('.칸').forEach((칸) => {
    칸.onpointerdown = () => {
      const 이미 = 칸.classList.contains('짚음')
      $('막대').querySelectorAll('.칸').forEach((c) => c.classList.remove('짚음'))
      if (!이미) 칸.classList.add('짚음')
    }
  })
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.칸')) $('막대').querySelectorAll('.칸').forEach((c) => c.classList.remove('짚음'))
  })

  $('막대날짜').innerHTML = r.최근.map((d, i) =>
    '<span>' + (i % 3 === 0 ? d.날짜.slice(5).replace('-', '/') : '') + '</span>').join('')
  $('수익알림').innerHTML = r.안됨
    ? '<div class="경고">쿠팡 실적을 못 받았습니다 — ' + 안전(r.안됨) + '</div>'
    : (r.계정별가능 ? '' :
      '<div class="경고">쿠팡이 꼬리표(SubID)를 빈 값으로 돌려줘서 <b>계정별로는 아직 안 갈립니다.</b> ' +
      '위 숫자는 이 쿠팡 계정 전체 실적입니다.</div>')
}

const 표시 = { 올림: ['\\u25cf', 'ㄱ올림'], 못올림: ['\\u25cc', 'ㄱ못올림'],
  건너뜀: ['\\u23f8', 'ㄱ건너뜀'], 실패: ['\\u2715', 'ㄱ실패'],
  기록없음: ['\\u25cb', 'ㄱ기록없음'], 아직: ['\\u25cb', 'ㄱ아직'] }

// 계정마다 시각을 엇갈리게 권한다. 같은 시각에 두 계정이 올리면 한 사람이 굴리는 게 보인다
const 권하는시각 = (있는것) => (있는것.length ? 있는것 : [8, 12, 16, 20, 24])
  .map((h) => (h === 0 ? 24 : h)).join(', ')

async function 격자그리기() {
  const g = await 부르기('/schedule')
  $('시각칸').value = 권하는시각(g.시각들)
  $('시각표끄기').disabled = !g.시각들.length
  if (!g.시각들.length) {
    $('격자').innerHTML = '<tr><td class="날">이 계정은 자동 발행이 꺼져 있습니다.' +
      '<br>켜는 법은 사용법 문서 10-1·10-2절에 있습니다. 그전에도 아래 <b>지금 돌려 보기</b> 로 올릴 수 있습니다.</td></tr>'
    return
  }
  const 머리 = '<tr><td></td>' + g.시각들.map((h) =>
    '<td class="날">' + String(h).padStart(2, '0') + '시</td>').join('') + '</tr>'
  $('격자').innerHTML = 머리 + g.줄.map((줄) =>
    '<tr><td class="날">' + 줄.날짜.slice(5).replace('-', '/') + ' (' + 줄.요일 + ')</td>' +
    줄.칸.map((c) => {
      const [글자, 반] = 표시[c.상태] || ['\\u25cb', 'ㄱ아직']
      return '<td><span class="동그라미 ' + 반 + '" title="' +
        안전(c.상태 + (c.때 ? ' ' + c.때 : '')) + '">' + 글자 + '</span></td>'
    }).join('') + '</tr>').join('')
}

async function 글그리기() {
  const 글들 = await 부르기('/posts')
  if (!글들.length) { $('글목록').innerHTML = '<tr><td colspan="4">아직 올린 글이 없습니다.</td></tr>'; return }
  $('글목록').innerHTML = 글들.map((p) => {
    const 사진 = p.사진
      // loading="lazy" 를 쓰면 접힌 details 안에서 영영 안 불러온다 (실측). 20장뿐이라 그냥 받는다
      ? '<img class="사진" alt="" src="/photo?code=' + encodeURIComponent(p.code) +
        '&file=' + encodeURIComponent(p.사진) + '&profile=' + encodeURIComponent(계정()) + '">'
      : '<div class="사진없음">\\ud83c\\udfac</div>'
    const 본문 = 안전(p.본문).replace(/\\n/g, '<br>')
    const 상품 = p.상품이름
      ? 안전(p.상품이름) + (p.상품주소
        ? '<br><a href="' + 안전(p.상품주소) + '" target="_blank" rel="noreferrer">링크 열기 \\u2197</a>' : '')
      : '<span style="color:var(--옅은글)">없음</span>'
    const 때 = String(p.올린때 || '').slice(5, 16).replace('T', ' ')
    const 시각 = p.글주소
      ? '<a href="' + 안전(p.글주소) + '" target="_blank" rel="noreferrer">' + 때 + ' \\u2197</a>' : 때
    return '<tr><td>' + 사진 + '</td><td class="본문칸">' + 본문 + '</td><td>' + 상품 +
      '</td><td class="날">' + 시각 + '</td></tr>'
  }).join('')
}

function 그리기(s) {
  $('열쇠표').innerHTML = s.열쇠.map((k) =>
    '<tr><td style="width:1.6rem" class="' + (k.채움 ? '좋음' : k.필수 ? '나쁨' : '') + '">' +
    (k.채움 ? '\\u2713' : k.필수 ? '\\u2717' : '\\u00b7') + '</td>' +
    '<td class="이름">' + k.이름 + (k.공유 ? '<span class="공유표">공유</span>' : '') +
    '</td><td style="color:var(--옅은글)">' + k.설명 +
    (k.필수 ? '' : ' <i>(선택)</i>') + '</td></tr>').join('')
  $('열쇠칸').innerHTML = s.열쇠.map((k) =>
    '<label>' + k.이름 + (k.공유 ? '<span class="공유표">공유</span>' : '') +
    (k.채움 ? ' — 이미 채워져 있습니다' : '') + '</label>' +
    '<input type="password" autocomplete="off" data-열쇠="' + k.이름 + '" placeholder="' +
    (k.채움 ? '바꿀 때만 넣으세요' : '값을 붙여넣으세요') + '">').join('')
  const uid = s.정보?.userId
  $('나정보').innerHTML = uid
    ? '<div class="경고" style="background:#f0fdf4;border-color:#bbf7d0;color:#14532d">' +
      '스레드 User ID <b>' + 안전(uid) + '</b> 가 들어 있습니다.</div>' : ''
  const m = s.말투 || {}
  $('정체성').value = m.정체성 || ''
  $('말투').value = m.말투 || ''
  $('표현').value = m.표현 || ''
  for (let i = 0; i < 3; i++) $('예시' + i).value = (m.예시 || [])[i] || ''
}

function 계정칸그리기(s, 고를것) {
  마지막상태 = s
  $('계정').innerHTML = s.계정들.map((c) =>
    '<option value="' + 안전(c) + '"' + (c === 고를것 ? ' selected' : '') + '>' +
    안전(s.이름표?.[c] || (c || '첫 계정')) + '</option>').join('')
  $('계정삭제단추').disabled = !고를것
}

async function 새로고침() {
  const s = await 부르기('/status')
  계정칸그리기(s, 계정())
  그리기(s)
  $('계정알림').innerHTML = (s.못함 ?? []).length
    ? '<span class="나쁨">이 계정은 아직 못 돌립니다 — ' + 안전(s.못함.join(' / ')) + '</span>' : ''
  격자그리기(); 글그리기(); 수익그리기()
}
$('계정').onchange = 새로고침

let 마지막상태 = null

const 판보이기 = (어느것) => {
  $('새계정판').hidden = 어느것 !== '추가'
  $('삭제판').hidden = 어느것 !== '삭제'
  document.querySelectorAll('main').forEach((m) => {
    if (m.id !== '새계정판' && m.id !== '삭제판') m.hidden = !!어느것
  })
}

const 고르기채우기 = (id, 목록, 고른것) => {
  $(id).innerHTML = 목록.map((v) =>
    '<option' + (v === 고른것 ? ' selected' : '') + '>' + 안전(v) + '</option>').join('')
}

const 못함그리기 = () => {
  const 고름 = { 분야: $('ㄴ분야').value, 언어: $('ㄴ언어').value, 제휴: $('ㄴ제휴').value }
  const 안됨 = []
  if (고름.분야 !== '요리') 안됨.push('분야 "' + 안전(고름.분야) + '" 는 아직 글을 못 씁니다 (지금은 요리만)')
  if (고름.언어 !== '한국어') 안됨.push('언어 "' + 안전(고름.언어) + '" 는 아직 못 씁니다 (지금은 한국어만)')
  if (고름.제휴 !== '쿠팡파트너스' && 고름.제휴 !== '없음')
    안됨.push('"' + 안전(고름.제휴) + '" 는 아직 링크를 못 만듭니다 (지금은 쿠팡만)')
  $('ㄴ못함').innerHTML = 안됨.length
    ? '<div class="경고">만들 수는 있지만 <b>아직 안 돌아갑니다.</b><br>' + 안됨.join('<br>') + '</div>'
    : ''
}

$('계정추가단추').onclick = () => {
  $('계정알림').textContent = ''
  const g = 마지막상태?.고를것 ?? { 분야: ['요리'], 언어: ['한국어'], 제휴: ['쿠팡파트너스'] }
  고르기채우기('ㄴ분야', g.분야, '요리')
  고르기채우기('ㄴ언어', g.언어, '한국어')
  고르기채우기('ㄴ제휴', g.제휴, '쿠팡파트너스')
  $('ㄴ계정').value = ''; $('ㄴ별칭').value = ''
  못함그리기(); 판보이기('추가'); $('ㄴ계정').focus()
}
;['ㄴ분야', 'ㄴ언어', 'ㄴ제휴'].forEach((id) => { $(id).onchange = 못함그리기 })
$('ㄴ취소').onclick = () => 판보이기(null)

$('ㄴ저장').onclick = async (e) => {
  e.target.disabled = true
  try {
    const s = await 부르기('/account', {
      계정: $('ㄴ계정').value, 별칭: $('ㄴ별칭').value,
      분야: $('ㄴ분야').value, 언어: $('ㄴ언어').value, 제휴: $('ㄴ제휴').value,
    })
    판보이기(null)
    계정칸그리기(s, s.계정)
    그리기(s); 격자그리기(); 글그리기(); 수익그리기()
    $('계정알림').innerHTML = '<span class="좋음">"' + 안전(s.정보.별칭) +
      '" 계정을 만들었습니다. 아래 <b>열쇠</b> 와 <b>말투</b> 를 채워 주세요.</span>'
  } catch (err) {
    $('계정알림').innerHTML = '<span class="나쁨">' + 안전(err.message) + '</span>'
  } finally { e.target.disabled = false }
}

$('계정삭제단추').onclick = () => {
  if (!계정()) {
    $('계정알림').innerHTML = '<span class="나쁨">첫 계정은 지울 수 없습니다.</span>'
    return
  }
  const 별칭 = 마지막상태?.정보?.별칭 ?? 계정()
  $('삭제별칭').textContent = 별칭
  $('ㅅ별칭').value = ''
  $('삭제알림').textContent = ''
  $('삭제설명').innerHTML = '<b>' + 안전(별칭) + '</b> 계정의 열쇠 · 말투 · 시각표 · 기록이 지워집니다.' +
    '<br>내려받은 사진과 이미 올린 글은 그대로 남습니다.'
  판보이기('삭제'); $('ㅅ별칭').focus()
}
$('ㅅ취소').onclick = () => 판보이기(null)

$('ㅅ저장').onclick = async (e) => {
  e.target.disabled = true
  try {
    const s = await 부르기('/account-delete', { 별칭: $('ㅅ별칭').value })
    판보이기(null)
    계정칸그리기(s, '')
    그리기(s); 격자그리기(); 글그리기(); 수익그리기()
    $('계정알림').innerHTML = '<span class="좋음">지웠습니다.</span>'
  } catch (err) {
    $('삭제알림').innerHTML = '<span class="나쁨">' + 안전(err.message) + '</span>'
  } finally { e.target.disabled = false }
}

$('열쇠저장').onclick = async (e) => {
  e.target.disabled = true
  try {
    const 낼것 = {}
    document.querySelectorAll('[data-열쇠]').forEach((el) => {
      if (el.value.trim()) 낼것[el.dataset.열쇠] = el.value.trim()
    })
    if (!Object.keys(낼것).length) { $('열쇠알림').textContent = '바꿀 값이 없습니다.'; return }
    그리기(await 부르기('/keys', 낼것))
    $('열쇠알림').textContent = '저장했습니다. \\u2713'
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
    $('말투알림').textContent = '저장했습니다. 다음 실행부터 반영됩니다. \\u2713'
  } catch (err) { $('말투알림').textContent = '실패 — ' + err.message }
  finally { e.target.disabled = false }
}

document.querySelectorAll('[data-단계]').forEach((b) => {
  b.onclick = async () => {
    if (b.dataset.단계 === '발행' && !confirm('실제로 계정에 글이 올라갑니다. 계속할까요?')) return
    try {
      const r = await 부르기('/run', { 단계: b.dataset.단계, 키워드: $('키워드').value })
      if (r.안됨) return alert(r.안됨)
      보기시작()
    } catch (err) { alert(err.message) }
  }
})
$('멈추기').onclick = () => 부르기('/stop', {})

const 시각표알림 = (반, 글) => { $('시각표알림').innerHTML = '<span class="' + 반 + '">' + 글 + '</span>' }

$('시각표켜기').onclick = async (e) => {
  if (!confirm('이 계정의 자동 발행을 켭니다. 정해진 시각마다 실제로 글이 올라갑니다. 계속할까요?')) return
  e.target.disabled = true
  try {
    const r = await 부르기('/schedule-on', { 시각: $('시각칸').value })
    시각표알림('좋음', '켰습니다. ' + r.시각들.map((h) => (h === 0 ? 24 : h) + '시').join(' · ') +
      (r.좁은간격 ? ' <span class="나쁨">— 간격이 ' + r.좁은간격 +
        '시간뿐입니다. 4시간 이상 띄우는 게 좋습니다.</span>' : ''))
    격자그리기()
  } catch (err) { 시각표알림('나쁨', 안전(err.message)) }
  finally { e.target.disabled = false }
}

$('시각표끄기').onclick = async (e) => {
  if (!confirm('이 계정의 자동 발행을 끕니다. 계속할까요?')) return
  e.target.disabled = true
  try {
    await 부르기('/schedule-off', {})
    시각표알림('좋음', '껐습니다. 이제 저절로 올라가지 않습니다.')
    격자그리기()
  } catch (err) { 시각표알림('나쁨', 안전(err.message)) }
  finally { e.target.disabled = false }
}

let 보는중 = null
function 보기시작() {
  clearInterval(보는중)
  보는중 = setInterval(async () => {
    const r = await 부르기('/log')
    $('기록').textContent = r.글 || '기다리는 중...'
    $('기록').scrollTop = $('기록').scrollHeight
    $('멈추기').disabled = !r.도는중
    document.querySelectorAll('[data-단계]').forEach((b) => (b.disabled = r.도는중))
    if (!r.도는중) { clearInterval(보는중); 보는중 = null; 격자그리기(); 글그리기() }
  }, 1000)
}

새로고침()
</script></body></html>`
