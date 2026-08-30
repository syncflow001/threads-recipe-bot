// 설정 쪽 「자동발급」 단추 → 같은 쪽 아래 터미널로 명령을 보내는 길 (2026-08-30).
// 부모-자식 사이가 아니라 카드 둘이 나란히 있는 꼴이라, 창 이벤트 하나로 잇는다
export const 터미널명령이름 = '터미널명령'

export function 터미널로보내기(명령: string) {
  window.dispatchEvent(new CustomEvent<string>(터미널명령이름, { detail: 명령 }))
}
