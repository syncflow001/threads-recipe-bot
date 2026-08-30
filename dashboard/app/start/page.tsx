// /start — 계정이 하나도 없을 때 보이는 첫 화면. 가운데 큰 단추 하나뿐이다(설계서 §3)
import Link from 'next/link'

export default function 시작쪽() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">스레드 자동화</h1>
      <p className="text-pretty text-muted-foreground">
        아직 계정이 하나도 없습니다. 아래 단추를 누르면 <b>한 화면에 하나씩</b> 물어보며 계정을 만들어 드립니다.
        중간에 그만두셔도 하던 곳부터 다시 이어서 합니다.
      </p>
      <Link href="/wizard"
        className="rounded-xl border-transparent bg-primary transition-colors hover:bg-primary-hover px-6 py-3 text-base font-semibold text-primary-foreground">
        스레드 자동화 시작하기
      </Link>
    </main>
  )
}
