'use client'
// 문서(.md) 를 화면에 읽을 만하게 그린다 — 제목·표·목록·인용·굵게·링크만 다룬다.
// 왜 굳이. 설명 팝업이 `docs/섀도우밴-대응.md` 를 **그대로** 읽어 오기 때문이다.
// 화면에 같은 글을 또 적으면 문서와 팝업이 언젠가 서로 다른 말을 한다 (2026-08-31)
import type { ReactNode } from 'react'

// **굵게** 와 [글](주소) 만 푼다. 그 밖의 표시는 글자 그대로 둔다
function 속글(글: string, 열쇠: string): ReactNode[] {
  const 조각: ReactNode[] = []
  const 무늬 = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g
  let 끝 = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = 무늬.exec(글))) {
    if (m.index > 끝) 조각.push(글.slice(끝, m.index))
    if (m[1]) 조각.push(<b key={`${열쇠}b${i}`}>{m[1]}</b>)
    else if (m[2]) 조각.push(
      <a key={`${열쇠}a${i}`} href={m[3]} target="_blank" rel="noreferrer"
        className="text-primary underline underline-offset-2">{m[2]}</a>)
    else 조각.push(<code key={`${열쇠}c${i}`} className="rounded bg-muted px-1 text-[0.85em]">{m[4]}</code>)
    끝 = m.index + m[0].length
    i++
  }
  if (끝 < 글.length) 조각.push(글.slice(끝))
  return 조각
}

const 칸들 = (줄: string) => 줄.replace(/^\||\|$/g, '').split('|').map((s) => s.trim())
const 가름줄 = (줄?: string) => !!줄 && /^\|?[\s:|-]+\|[\s:|-]*$/.test(줄)

export function 글그리기({ 글 }: { 글: string }) {
  const 줄들 = 글.split('\n')
  const 것들: ReactNode[] = []
  let i = 0
  while (i < 줄들.length) {
    const 줄 = 줄들[i]
    if (!줄.trim()) { i++; continue }

    if (줄.startsWith('|') && 가름줄(줄들[i + 1])) {
      const 머리 = 칸들(줄)
      const 몸 = []
      i += 2
      while (i < 줄들.length && 줄들[i].startsWith('|')) { 몸.push(칸들(줄들[i])); i++ }
      것들.push(
        <div key={i} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr>{머리.map((c, n) => (
              <th key={n} className="border-b px-2 py-1 text-left font-semibold">{속글(c, `h${i}${n}`)}</th>))}</tr></thead>
            <tbody>{몸.map((r, y) => (
              <tr key={y}>{r.map((c, n) => (
                <td key={n} className="border-b border-border/50 px-2 py-1 align-top">{속글(c, `d${i}${y}${n}`)}</td>))}</tr>))}</tbody>
          </table>
        </div>)
      continue
    }

    const 머리표 = 줄.match(/^(#{1,4})\s+(.*)$/)
    if (머리표) {
      const 크기 = ['text-lg', 'text-base', 'text-[0.95rem]', 'text-sm'][머리표[1].length - 1]
      것들.push(<p key={i} className={`mt-4 mb-1 font-bold ${크기}`}>{속글(머리표[2], `t${i}`)}</p>)
      i++; continue
    }

    if (/^[-*]\s+/.test(줄) || /^\d+\.\s+/.test(줄)) {
      const 목록 = []
      const 번호 = /^\d/.test(줄.trim())
      while (i < 줄들.length && (/^[-*]\s+/.test(줄들[i]) || /^\d+\.\s+/.test(줄들[i]))) {
        목록.push(줄들[i].replace(/^([-*]|\d+\.)\s+/, '')); i++
      }
      것들.push(
        번호
          ? <ol key={i} className="my-1 ml-5 list-decimal space-y-0.5 text-sm">{목록.map((t, n) => <li key={n}>{속글(t, `l${i}${n}`)}</li>)}</ol>
          : <ul key={i} className="my-1 ml-5 list-disc space-y-0.5 text-sm">{목록.map((t, n) => <li key={n}>{속글(t, `l${i}${n}`)}</li>)}</ul>)
      continue
    }

    if (줄.startsWith('>')) {
      const 인용 = []
      while (i < 줄들.length && 줄들[i].startsWith('>')) { 인용.push(줄들[i].replace(/^>\s?/, '')); i++ }
      것들.push(
        <div key={i} className="my-2 rounded-md border-l-4 border-primary/40 bg-muted/40 px-3 py-2 text-sm">
          {속글(인용.join(' '), `q${i}`)}
        </div>)
      continue
    }

    if (줄.startsWith('---')) { 것들.push(<hr key={i} className="my-3 border-border" />); i++; continue }

    const 문단 = []
    while (i < 줄들.length && 줄들[i].trim() && !/^[#>|-]|^\d+\./.test(줄들[i])) { 문단.push(줄들[i]); i++ }
    if (문단.length) 것들.push(<p key={i} className="my-1 text-sm leading-relaxed">{속글(문단.join(' '), `p${i}`)}</p>)
    else i++
  }
  return <div className="text-foreground">{것들}</div>
}
