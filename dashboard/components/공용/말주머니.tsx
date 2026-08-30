'use client'
// 낱말 칩 — 추천(테두리만, 눌러서 담기)과 담김(채움, ×로 빼기) 두 꼴(옛 .말주머니)
export function 말주머니({ 글, 종류, onClick, onRemove }: {
  글: string
  종류?: '추천' | '담김'
  onClick?: () => void
  onRemove?: () => void
}) {
  if (종류 === '추천') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded-2xl border border-dashed px-2.5 py-1 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
      >
        ＋ {글}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl bg-muted px-2.5 py-1 text-sm font-semibold">
      {글}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="빼기"
          aria-label={`${글} 빼기`}
          className="grid size-[1.15rem] place-items-center rounded-full hover:bg-destructive hover:text-destructive-foreground"
        >
          ×
        </button>
      )}
    </span>
  )
}
