'use client'
// 열쇠 이름에 마우스를 올리면 어디서 어떻게 받는지 세 줄이 뜬다. 폰에는 마우스 오버가 없어 눌러도 뜨게 한다(옛 설정화면-html.mjs 1147~1159)
// base-ui Tooltip 의 호버는 mouseOnly 라 탭으로는 안 열린다(node_modules/@base-ui/react/floating-ui-react/hooks/useHoverReferenceInteraction.js) —
// 그래서 onClick 으로 직접 연다. 다만 열려 있을 때 트리거를 다시 누르면 base-ui 의 useDismiss(referencePress) 가
// 스스로 onOpenChange(false) 를 부른다(tooltip/root/TooltipRoot.js) — 그때 onClick 이 또 토글하면 두 번 겹쳐 열자마자 닫힌다.
// 그래서 onClick 은 "닫혀 있을 때만 연다"로 한정하고, 닫는 것은 onOpenChange(=base-ui 의 dismiss·바깥 클릭)에만 맡긴다
import { useEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function 열쇠도움({ 이름, 받는법 }: { 이름: string; 받는법?: string[] }) {
  const [열림, 열림담기] = useState(false)
  const 자리 = useRef<HTMLSpanElement>(null)

  // 눌러서 연 다음 딴 데를 누르면 닫힌다 — 옛 화면의 pointerdown 리스너와 같은 규칙이다
  useEffect(() => {
    if (!열림) return
    const 닫기 = (e: PointerEvent) => {
      if (!자리.current?.contains(e.target as Node)) 열림담기(false)
    }
    document.addEventListener('pointerdown', 닫기)
    return () => document.removeEventListener('pointerdown', 닫기)
  }, [열림])

  if (!받는법?.length) return <>{이름}</>

  return (
    <span ref={자리} className="inline-block">
      <TooltipProvider>
        <Tooltip open={열림} onOpenChange={열림담기}>
          <TooltipTrigger
            render={<button type="button" className="cursor-help underline decoration-dotted underline-offset-4" />}
            onClick={() => { if (!열림) 열림담기(true) }}
          >
            {이름}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs flex-col items-start gap-1 text-left">
            <i className="block font-semibold not-italic">{이름} 받는 법</i>
            {받는법.map((줄) => <span key={줄} className="block">{줄}</span>)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  )
}
