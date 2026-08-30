'use client'
// 「글에 걸어 둔 상품」 카드 — /posts 에서 상품이름 있는 것만(옛 HTML 907~918, JS 1522~1537)
import { use자료 } from '@/lib/hooks'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 굴림칸 } from '@/components/공용/굴림칸'

type 글자료 = { 올린때: string; 상품이름?: string; 상품주소?: string; 글주소?: string }

export function 걸어둔상품() {
  const 자료 = use자료<글자료[]>('/posts')
  const 있는것 = (Array.isArray(자료.data) ? 자료.data : []).filter((p) => p.상품이름)

  return (
    <카드 제목="글에 걸어 둔 상품" 넓게
      꼬리={있는것.length ? <span className="text-sm text-muted-foreground">{있는것.length}개</span> : null}>
      <귀띔><b>글별로 얼마를 벌었는지는 알 수 없어요.</b>
        쿠팡이 링크마다 붙인 꼬리표(SubID)를 빈 값으로 돌려주기 때문입니다.
        쿠팡이 채워 주기 시작하면 그때 만들겠습니다 — 지금 추측해서 보여주면 거짓 숫자예요.</귀띔>
      <굴림칸>
        <table className="w-full text-sm">
          <thead><tr><th>올린 때</th><th>상품</th><th>글</th></tr></thead>
          <tbody>
            {있는것.length ? 있는것.map((p, i) => {
              const 때 = String(p.올린때).slice(5, 16).replace('-', '/').replace('T', ' ')
              return (
                <tr key={i}>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{때}</td>
                  <td>
                    {p.상품이름}
                    {p.상품주소 && (
                      <><br /><a href={p.상품주소} target="_blank" rel="noreferrer" className="text-primary underline">상품 열기 ↗</a></>
                    )}
                  </td>
                  <td>
                    {p.글주소
                      ? <a href={p.글주소} target="_blank" rel="noreferrer" className="text-primary underline">글 열기 ↗</a>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">아직 상품을 건 글이 없어요.</td></tr>
            )}
          </tbody>
        </table>
      </굴림칸>
    </카드>
  )
}
