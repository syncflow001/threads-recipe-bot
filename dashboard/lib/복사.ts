// 글자를 클립보드에 담는다 — 폰에서도 되게 두 갈래를 쓴다.
// ⚠️ navigator.clipboard 는 **보안 자리(https · localhost)에서만** 있다.
// 이 대시보드는 폰에서 http://100.64.0.1:7788 로 열리므로 거기서는 없다.
// 그래서 옛 방식(숨은 칸 + execCommand)으로 물러선다
export async function 복사하기(글: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(글)
      return true
    }
  } catch { /* 아래 옛 방식으로 */ }
  try {
    const 칸 = document.createElement('textarea')
    칸.value = 글
    칸.setAttribute('readonly', '')
    칸.style.position = 'fixed'
    칸.style.opacity = '0'
    document.body.appendChild(칸)
    칸.select()
    칸.setSelectionRange(0, 글.length)   // 아이폰 사파리는 이게 있어야 잡힌다
    const 됐나 = document.execCommand('copy')
    document.body.removeChild(칸)
    return 됐나
  } catch {
    return false
  }
}
