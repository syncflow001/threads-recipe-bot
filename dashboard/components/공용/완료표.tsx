'use client'
// 열쇠 칸이 이미 채워졌음을 알리는 초록 딱지 — 글자로 길게 쓰면 이름과 뒤섞여 안 읽힌다 (2026-08-30 사용자 요청)
export function 완료표({ 보임 }: { 보임: boolean }) {
  if (!보임) return null
  return (
    <span className="ml-1.5 inline-block rounded-md bg-green-100 px-1.5 py-0.5 align-middle text-[0.7rem] font-bold text-green-900">
      완료
    </span>
  )
}
