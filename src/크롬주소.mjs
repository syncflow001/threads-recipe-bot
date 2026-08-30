// 본 크롬에 열린 탭들 가운데 돌아온 주소(?code=...)를 찾아 준다 — 사람이 주소를 복사하지 않게 한다.
// 왜 애플스크립트인가. 토큰 허용을 누르면 크롬이 https://localhost/?code=... 로 간다.
// 그 창은 우리가 띄운 것이 아니라 **사용자가 늘 쓰는 크롬**이라 코드를 읽을 길이 이것뿐이다.
//
// ⚠️ 이 길은 못 갈 수 있다. 크롬 제어 권한을 처음 물을 때 맥이 창을 띄우는데,
// 그 창을 안 누르면 애플스크립트가 응답 없이 멈춘다(-1712, 2026-08-30 실측).
// 그래서 **못 물어보면 곧바로 물러난다** — 붙여넣는 길이 늘 열려 있으니 거기서 이어가면 된다
import { execFile } from 'node:child_process'

// 창마다 탭마다 훑는다. 사용자가 탭을 옮겨 다녀도 놓치지 않는다
const 스크립트 = (앞머리) => `
tell application "Google Chrome"
  repeat with w in windows
    repeat with t in tabs of w
      set u to URL of t
      if u starts with "${앞머리}" then return u
    end repeat
  end repeat
end tell
return ""
`

// 세 가지로 답한다 — 주소(찾음) · null(물어봤는데 없음) · false(못 물어봤음)
export function 한번찾기(앞머리, { 실행 = execFile, 제한 = 4000 } = {}) {
  return new Promise((맞이) => {
    실행('/usr/bin/osascript', ['-e', 스크립트(앞머리)], { timeout: 제한 }, (오류, 나온것) => {
      if (오류) return 맞이(false)
      const 주소 = String(나온것 ?? '').trim()
      맞이(주소.startsWith(앞머리) ? 주소 : null)
    })
  })
}

// 못 물어본 것이 이만큼 이어지면 그만둔다. 권한 창이 안 눌렸다는 뜻이라 기다려 봐야 헛일이다
export const 포기까지 = 3

export async function 지켜보기(앞머리, {
  실행 = execFile, 간격 = 1500, 제한 = 5 * 60 * 1000, 지금 = () => Date.now(), 쉬기, 알림 = () => {},
} = {}) {
  const 쉰다 = 쉬기 ?? ((밀리) => new Promise((r) => setTimeout(r, 밀리)))
  const 끝날때 = 지금() + 제한
  let 못물어본수 = 0
  while (지금() < 끝날때) {
    const 답 = await 한번찾기(앞머리, { 실행 })
    if (typeof 답 === 'string') return 답
    if (답 === false) {
      if (++못물어본수 >= 포기까지) {
        알림('크롬에 물어볼 수가 없다 — 주소를 손으로 붙여넣어 주세요')
        return null
      }
    } else 못물어본수 = 0
    await 쉰다(간격)
  }
  return null
}
