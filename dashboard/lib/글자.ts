// 옛 설정화면-html.mjs 의 돈·짧은때·날짜만·이틀을 그대로 옮긴 글자 포맷 도우미
export const 돈 = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR')

export function 이틀(n: number): string {
  return String(n).padStart(2, '0')
}

export function 짧은때(t: string | number): string {
  const d = new Date(t)
  if (Number.isNaN(+d)) return String(t ?? '').slice(0, 16).replace('T', ' ')
  return d.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function 날짜만(t: string | number): string {
  const d = new Date(t)
  if (Number.isNaN(+d)) return ''
  return d.getFullYear() + '-' + 이틀(d.getMonth() + 1) + '-' + 이틀(d.getDate())
}
