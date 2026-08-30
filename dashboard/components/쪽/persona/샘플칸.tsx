'use client'
// 샘플 칸 — 저장소 글 한 편을 지금 말투로 다시 써 본다. 발행하지 않는다(옛 3154~3178)
export type 샘플결과 = {
  원글?: { 작성자?: string; 등급?: string }
  본문?: string
  레시피?: string
  글이름?: string
}

export function 샘플칸({ 결과 }: { 결과: 샘플결과 | null }) {
  if (!결과) return null
  return (
    <div className="mt-3 rounded-xl border bg-muted/30 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <b>이 말투로 쓰면 이렇게 나옵니다</b>
        <span className="text-muted-foreground">원글 @{결과.원글?.작성자 || '?'} · {결과.원글?.등급 || ''}</span>
      </div>
      <div className="mb-2">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">본문</label>
        <pre className="whitespace-pre-wrap break-words rounded-lg border bg-background p-2 text-[0.86rem]">
          {결과.본문 || '(비었습니다)'}
        </pre>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">{결과.글이름 || '레시피'}</label>
        <pre className="whitespace-pre-wrap break-words rounded-lg border bg-background p-2 text-[0.86rem]">
          {결과.레시피 || '(비었습니다)'}
        </pre>
      </div>
    </div>
  )
}
