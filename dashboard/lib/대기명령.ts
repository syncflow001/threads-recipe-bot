// 쪽 사이를 넘나드는 쪽지 — 설정 쪽이 「이 명령을 터미널에서 돌려 달라」고 넣고 관리자 도구 쪽이 꺼내 쓴다
// (옛 화면의 window.도구명령돌리기 자리. 쪽이 갈리면서 함수 대신 localStorage 한 칸으로 바꿨다)
const 칸 = '대기명령'

export function 대기명령넣기(명령: string) {
  try { localStorage.setItem(칸, 명령) } catch { /* 저장을 막아 둔 브라우저면 그냥 넘어간다 */ }
}

// 꺼내면 지운다 — 한 번만 돌아야 한다. 새로고침해도 다시 실행되면 안 된다
export function 대기명령꺼내기(): string | null {
  try {
    const 값 = localStorage.getItem(칸)
    if (값) localStorage.removeItem(칸)
    return 값 || null
  } catch { return null }
}
