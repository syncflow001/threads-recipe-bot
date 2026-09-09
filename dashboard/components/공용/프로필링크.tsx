// 계정 아이디를 스레드 프로필로 가는 링크로 그린다 — 누르면 새 탭에서 열린다 (2026-09-07 사용자 요청)
export function 프로필링크({ 아이디, className }: { 아이디: string; className?: string }) {
  return (
    <a
      href={'https://www.threads.com/@' + encodeURIComponent(아이디)}
      target="_blank"
      rel="noopener noreferrer"
      title="스레드 프로필을 새 탭에서 연다"
      className={'hover:underline ' + (className ?? '')}
    >
      @{아이디}
    </a>
  )
}
