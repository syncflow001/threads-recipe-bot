// 옛 화면 HTML 구간의 사용자 문구가 새 쪽 소스에 다 있는지 잰다 — node 도구.문구뽑기.mjs <옛시작줄> <옛끝줄> <새폴더[,새폴더...]> [옛파일]
// 일부러 뗀 기능의 문구는 아래 「뗀문구」 에 까닭과 함께 적는다 — 조용히 사라지면 잃은 것과 구별이 안 된다
// 새폴더는 콤마로 여러 개 줄 수 있다 — 한 옛 구간의 문구가 새 쪽 여러 폴더에 나뉘어 옮겨질 때 쓴다
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
const [시작, 끝, 폴더들, 옛파일 = 'archive/2026-08-28-옛-대시보드/src/설정화면-html.mjs'] = process.argv.slice(2)
const 옛 = (await readFile(옛파일, 'utf8')).split('\n').slice(Number(시작) - 1, Number(끝)).join('\n')
// 태그·템플릿 조각·블록 주석을 떼고 한글이 든 문구만 남긴다. 4자 미만·변수 조각은 뺀다.
// -안전.mjs 처럼 HTML 과 <script> 가 한 템플릿 리터럴에 섞인 파일은 따옴표 쪼개기만으로
// 코드 조각(변수·함수 호출·className 값·id 값)까지 문구로 잡힌다 — 아래 코드같음 이 그걸 골라낸다
const 걸러낸 = 옛.replace(/<[^>]+>/g, '\n').replace(/\$\{[^}]*\}/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '\n')
const 조각들 = 걸러낸.split(/\n|'|"|`/)
const 코드같음 = (s) => /^(const|let|var|async\s+function|function|if\s*\(|for\s*\(|while\s*\(|return\b|await\b|export\b|import\b)/.test(s)
  || /[{};=]/.test(s) || /===|\?\?|&&|\|\||=>/.test(s) || /^[+?:]/.test(s) || /[+?:]\s*$/.test(s)
  || /getElementById|fetch\(|\.textContent|\.innerHTML|\.dataset|JSON\.|Array\.isArray|closest\(|querySelector|addEventListener|encodeURIComponent/.test(s)
  || /[A-Za-z]{2,}\(/.test(s) || /^[가-힣]+\(\)$/.test(s)
// document.getElementById('id') · el.className = 'x' 뒤의 문자열은 화면에 안 보이는 내부 값이다
const 이전코드끝 = (앞) => { const p = 앞.trim(); return /getElementById\(\s*$/.test(p) || /className\s*=\s*$/.test(p) }
const 문구 = [...new Set(조각들
  .filter((s, i) => !(i > 0 && 이전코드끝(조각들[i - 1])))
  .map((s) => s.trim()).filter((s) => /[가-힣]/.test(s) && s.length >= 4 && !/^[\/\\]/.test(s) && !코드같음(s)))]
const 폴더들목록 = 폴더들.split(',').map((s) => s.trim()).filter(Boolean)
const 새 = (await Promise.all(폴더들목록.map(async (폴더) =>
  (await Promise.all((await readdir(폴더)).map((f) => readFile(join(폴더, f), 'utf8')))).join('\n')
))).join('\n')
// ── 일부러 뗀 문구 ─────────────────────────────────────────────────
// 기능을 없앴으면 그 문구도 없어지는 게 맞다. 다만 **까닭 없이는 못 뺀다** —
// 여기 적혀 있지 않은데 사라진 문구는 옮기다 흘린 것이다
const 뗀문구 = [
  // 2026-08-30 사용자 지시 — 터미널 비밀번호를 뗐다 (archive/2026-08-30-터미널-비밀번호/README.md).
  // 「진짜 터미널이라 파일을 지우는 명령도 막지 않는다」 는 경고는 터미널판에 그대로 남겼다
  '그래서 이 맥의',
  '로그인 비밀번호',
  '를 한 번 더 물어요. 비밀번호는 맥에게 맞는지 물어만 보고 어디에도 저장하지 않아요.',
  '이 맥의 로그인 비밀번호',
  '비밀번호를 넣으면 이 명령이 바로 실행돼요',
  '비밀번호가 맞지 않습니다',
]
const 없음 = 문구.filter((s) => !새.includes(s) && !뗀문구.includes(s))
if (없음.length) { console.error('새 쪽에 없는 옛 문구 ' + 없음.length + '개'); for (const s of 없음) console.error('  · ' + s); process.exit(1) }
console.log('문구 ' + 문구.length + '개 전부 있음 ✓')
