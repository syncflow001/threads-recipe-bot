'use client'
// 최근 올린 글 100 — 개요용 표(옛 글그리기() 설정화면-html.mjs 2347~2380줄, 옛개요목록 §A-3·D)
import { useState } from 'react'
import { 카드 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'
import { use계정, use자료 } from '@/lib/hooks'

type 글 = {
  code: string
  사진: string | null
  본문: string
  상품이름: string | null
  상품주소: string | null
  올린때: string | number
  글주소: string | null
}

function 사진칸({ 사진길 }: { 사진길: string | null }) {
  const [실패, 실패담기] = useState(false)
  if (!사진길) {
    return <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted text-[1.1rem]">🎬</div>
  }
  if (실패) return <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
  // 이 카드는 접힌 탭 속에 숨는 일이 없다 — 그래서 lazy 를 써도 안 뜨는 사고가 안 난다(옛 코드는 접힌 판이라 lazy 를 피했다)
  return (
    <img src={사진길} alt="" loading="lazy" onError={() => 실패담기(true)}
      className="h-14 w-14 shrink-0 rounded-lg bg-muted object-cover" />
  )
}

export function 최근글() {
  const 계정 = use계정()
  const { data: 글들, error } = use자료<글[]>('/posts?개수=100')

  return (
    <카드 제목="최근 올린 글" 넓게>
      {error ? (
        <div className="text-sm text-destructive">못 읽었어요 — {(error as Error).message}</div>
      ) : 계정 === null ? (
        <div className="text-sm text-muted-foreground">불러오는 중…</div>
      ) : (
        <굴림칸>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th></th><th>본문</th><th>쿠팡 상품</th><th>시각</th>
              </tr>
            </thead>
            <tbody>
              {(글들 ?? []).length ? (글들 ?? []).map((p) => {
                const 사진길 = p.사진
                  ? `/api/photo?code=${encodeURIComponent(p.code)}&file=${encodeURIComponent(p.사진)}&profile=${encodeURIComponent(계정)}`
                  : null
                const 때 = String(p.올린때 || '').slice(5, 16).replace('T', ' ')
                return (
                  <tr key={p.code} className="align-top">
                    <td className="py-1.5"><사진칸 사진길={사진길} /></td>
                    <td className="max-w-[22rem] py-1.5 text-[0.84rem] leading-relaxed whitespace-pre-line">{p.본문}</td>
                    <td className="py-1.5">
                      {p.상품이름 ? (
                        <>
                          {p.상품이름}
                          {p.상품주소 && (
                            <><br /><a href={p.상품주소} target="_blank" rel="noreferrer"
                              className="text-primary hover:underline">링크 열기 ↗</a></>
                          )}
                        </>
                      ) : <span className="text-muted-foreground">없음</span>}
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-xs text-muted-foreground">
                      {p.글주소
                        ? <a href={p.글주소} target="_blank" rel="noreferrer" className="hover:underline">{때} ↗</a>
                        : 때}
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">아직 올린 글이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </굴림칸>
      )}
    </카드>
  )
}
