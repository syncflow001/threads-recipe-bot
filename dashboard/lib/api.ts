// 화면이 서버 길을 부르는 한 함수 — 옛 화면의 부르기() 와 같은 규칙
export async function 부르기<T = any>(길: string, 몸통?: unknown, 계정?: string | null): Promise<T> {
  const 고른 = 계정 ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('계정') ?? '' : '')
  const 이음 = 길.includes('?') ? '&' : '?'
  // 옛 화면 호출부는 GET 을 표시할 때 null 을 넘긴다(예: 부르기('/schedule', null, 계정)) — undefined 뿐 아니라 null 도 GET 으로 본다
  const r = await fetch('/api' + 길 + 이음 + 'profile=' + encodeURIComponent(고른), 몸통 == null ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(몸통),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.안됨 || '실패했습니다')
  return j as T
}
