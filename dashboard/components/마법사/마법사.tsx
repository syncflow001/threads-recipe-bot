'use client'
// 계정 연결 설정 마법사 — 한 화면에 하나씩 묻고, 중간에 닫아도 이어서 한다(옛 설정화면-html.mjs 640~651 · 2721~2802)
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { use계정, use자료, 계정바뀜 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { cn } from '@/lib/utils'
import { 걸음들, 단추모양, type 걸음속성, type 마법사값, type 열쇠통 } from './걸음들'

// 이어 하기 통. 열쇠 값(앱 ID·시크릿·토큰·쿠키·텔레그램·쿠팡)은 여기 절대 안 담는다
const 저장이름 = '마법사'
// 걸음은 번호가 아니라 이름으로 담는다 — 채워진 공유 열쇠 때문에 걸음이 빠지면 번호는 딴 걸음을 가리킨다
type 저장꼴 = { 계정: string; 걸음: string; 칸값: 마법사값 }

const 빈값: 마법사값 = {
  계정: '', 별칭: '', 분야: '요리', 언어: '한국어', 제휴: '쿠팡파트너스',
  정체성: '', 말투: '', 표현: '', 예시: ['', '', ''], 뜻: null, 칸들: [],
}

export function 마법사({ 말투만, 계정매개, 옛분야, 새분야 }: {
  말투만: boolean
  계정매개: string
  옛분야: string
  새분야: string
}) {
  const router = useRouter()
  const client = useQueryClient()
  const 보는계정 = use계정()
  const { data: 상태 } = use자료<any>('/status')

  const [준비, 준비담기] = useState(false)
  const [걸음, 걸음담기] = useState(0)
  const [값, 값담기] = useState<마법사값>(빈값)
  const [열쇠, 열쇠담기] = useState<열쇠통>({})
  const [계정이름, 계정이름담기] = useState('')
  const [켠시각, 켠시각담기] = useState<number[]>([])
  const [알림, 알림담기속] = useState<{ 글: ReactNode; 종류?: '좋음' | '나쁨' }>({ 글: '' })
  const [이어서, 이어서담기] = useState(false)
  const [이어했나, 이어했나담기] = useState(false)
  const [바쁨, 바쁨담기] = useState(false)
  // 걸음 목록은 처음 한 번만 정한다 — 열쇠를 저장하는 순간 목록이 줄면 걸음 번호가 어긋난다
  const [건너뛸것, 건너뛸것담기] = useState<{ 페북: boolean; 텔레: boolean } | null>(null)

  const 알림담기 = (글: ReactNode, 종류?: '좋음' | '나쁨') => 알림담기속({ 글, 종류 })
  // 건너뛴 경고가 떠 있으면 덮지 않고 뒤에 잇는다 — 무엇을 건너뛴 것인지가 더 중요하다
  const 알림잇기 = (글: ReactNode) => 알림담기속((이전) =>
    이전.종류 === '나쁨' ? { 글: <>{이전.글} {글}</>, 종류: '나쁨' } : { 글, 종류: '좋음' })

  // 말투만 모드는 고친 그 계정을 본다 — 옆바가 딴 계정을 물고 있으면 이리로 맞춘다
  useEffect(() => {
    if (!말투만 || 보는계정 === null || 계정매개 === 보는계정) return
    계정바뀜(client, 계정매개)
  }, [말투만, 계정매개, 보는계정, client])

  useEffect(() => {
    if (준비 || !상태) return
    const 채움 = (이름: string) => !!(상태.열쇠 ?? []).find((k: any) => k.이름 === 이름)?.채움
    const 뺄것 = {
      페북: 채움('THREADS_APP_ID') && 채움('THREADS_APP_SECRET'),
      텔레: 채움('TELEGRAM_BOT_TOKEN') && 채움('TELEGRAM_CHAT_ID'),
    }
    건너뛸것담기(뺄것)
    if (말투만) {
      값담기({
        ...빈값, 계정: 계정매개, 별칭: 상태.정보?.별칭 ?? '', 분야: 상태.정보?.분야 ?? 빈값.분야,
        언어: 상태.정보?.언어 ?? 빈값.언어, 제휴: 상태.정보?.제휴 ?? 빈값.제휴,
        정체성: 상태.말투?.정체성 ?? '', 말투: 상태.말투?.말투 ?? '', 표현: 상태.말투?.표현 ?? '',
        예시: [0, 1, 2].map((i) => 상태.말투?.예시?.[i] ?? ''), 뜻: 상태.말투?.뜻 ?? null,
      })
      계정이름담기(계정매개)
      // 수정판이 분야를 바꾸고 넘겨준 길이면 왜 여기 왔는지 밝힌다(옛 2874)
      if (옛분야 && 새분야) {
        알림담기(`분야를 ${옛분야} → ${새분야} 로 바꿨습니다. 말투를 새 분야에 맞게 이어서 잡아 주세요.`, '좋음')
      }
    } else {
      const 이어 = 이어읽기()
      if (이어) {
        값담기({ ...빈값, ...이어.칸값 })
        계정이름담기(이어.계정 ?? '')
        // 이름으로 그 걸음을 다시 찾는다. 없어진 걸음이면 처음부터
        const 그자리 = 걸음들({ 말투만: false, 건너뛸것: 뺄것 }).findIndex((g) => g.제목 === 이어.걸음)
        걸음담기(그자리 < 0 ? 0 : 그자리)
        // 옆바가 딴 계정을 물고 있으면 /status·추천이 남의 계정을 본다 — 이어받은 계정으로 맞춘다
        if (이어.계정) 계정바뀜(client, 이어.계정)
        이어했나담기(true)
      }
    }
    준비담기(true)
  }, [상태]) // eslint-disable-line react-hooks/exhaustive-deps

  const 목록 = useMemo(
    () => 걸음들({ 말투만, 건너뛸것: 건너뛸것 ?? { 페북: false, 텔레: false } }),
    [말투만, 건너뛸것],
  )
  const 지금 = Math.min(걸음, 목록.length - 1)
  const 걸음정보 = 목록[지금]

  // 걸음·칸값만 남긴다. 열쇠 값은 담지 않는다
  useEffect(() => {
    if (!준비 || 말투만) return
    try {
      localStorage.setItem(저장이름, JSON.stringify({ 계정: 계정이름, 걸음: 걸음정보.제목, 칸값: 값 } satisfies 저장꼴))
    } catch { /* 저장 못 해도 마법사는 돈다 */ }
  }, [준비, 말투만, 계정이름, 걸음정보, 값])

  const 고치기 = (조각: Partial<마법사값>) => 값담기((이전) => ({ ...이전, ...조각 }))

  const 속성: 걸음속성 = {
    값, 고치기, 열쇠,
    열쇠고치기: (조각) => 열쇠담기((이전) => ({ ...이전, ...조각 })),
    상태, 계정: 계정이름,
    계정정하기: (이름) => { 계정이름담기(이름); 계정바뀜(client, 이름) },
    이어서표시: () => 이어서담기(true),
    알림담기, 알림잇기, 켠시각, 켠시각담기,
  }

  const 나가기 = async () => {
    if (계정이름) { router.push('/overview'); return }
    const r = await 부르기<{ 없음: boolean }>('/first-run').catch(() => ({ 없음: false }))
    router.push(r.없음 ? '/start' : '/overview')
  }

  const 넘어가기 = async (건너뛰나: boolean) => {
    if (걸음정보.마지막) {
      localStorage.removeItem(저장이름)
      router.push('/overview')
      return
    }
    바쁨담기(true)
    알림담기('')
    try {
      if (!건너뛰나) await 걸음정보.저장?.(속성)
      걸음담기(지금 + 1)
      // 건너뛴 안내는 다음 단계 화면에 뜬다. 무엇을 건너뛴 것인지 말머리로 밝힌다
      if (건너뛰나 && 걸음정보.건너뛴뒤) {
        알림담기(<>「{걸음정보.제목}」 건너뜀 — {걸음정보.건너뛴뒤}</>, '나쁨')
      } else if (이어서) {
        // 조용히 넘어가면 사용자가 방금 적은 별칭·분야가 반영된 줄 안다 — 그것은 「수정」이 하는 일이다
        이어서담기(false)
        알림담기(
          <>&quot;{값.별칭 || 계정이름}&quot; 은 이미 있는 계정이라 <b>이어서 채웁니다.</b>{' '}
            별칭·분야·언어·제휴를 바꾸려면 마법사를 닫고 「수정」을 쓰세요.</>,
          '좋음')
      }
    } catch (err) { 알림담기((err as Error).message, '나쁨') }
    finally { 바쁨담기(false) }
  }

  const 처음부터 = () => {
    localStorage.removeItem(저장이름)
    값담기(빈값); 계정이름담기(''); 걸음담기(0); 이어했나담기(false); 알림담기('')
  }

  if (!준비) return <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>

  return (
    <main className="mx-auto w-full max-w-xl p-4 md:p-6">
      <div className="mb-2 flex gap-1" aria-hidden>
        {목록.map((_, i) => (
          <i key={i} className={cn('h-1 flex-1 rounded-full bg-muted', i < 지금 && 'bg-primary/40', i === 지금 && 'bg-primary')} />
        ))}
      </div>
      <div className="mb-2 text-sm text-muted-foreground">{지금 + 1} / {목록.length}</div>

      {이어했나 && (
        <p className="mb-2 text-[0.86rem] text-muted-foreground">
          하다 만 곳부터 이어서 합니다.{' '}
          <button type="button" onClick={처음부터} className="font-semibold underline">처음부터</button>
        </p>
      )}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-lg font-semibold">{걸음정보.제목}</h2>
        {걸음정보.본문(속성)}
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={바쁨} onClick={() => 넘어가기(false)}
          className="rounded-lg border-transparent bg-primary transition-colors hover:bg-primary-hover px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-45">
          {걸음정보.마지막 ? '대시보드로' : (!말투만 && 지금 === 0) ? '이 계정 만들기' : '다음'}
        </button>
        {/* 계정 만들기 다음 걸음에서는 뒤로 갈 곳이 없다 — 계정은 이미 만들어졌다 */}
        {!(걸음정보.마지막 || 지금 === 0 || (!말투만 && 지금 === 1)) && (
          <button type="button" className={단추모양} onClick={() => { 걸음담기(지금 - 1); 알림담기('') }}>뒤로</button>
        )}
        {걸음정보.건너뛸수있나 && (
          <button type="button" className={단추모양} disabled={바쁨} onClick={() => 넘어가기(true)}>건너뛰기</button>
        )}
        {!걸음정보.마지막 && (
          <button type="button" className={단추모양} onClick={나가기}>{지금 === 0 ? '취소' : '나중에 하기'}</button>
        )}
      </div>

      {알림.글 ? (
        <div className={cn('mt-3 text-[0.86rem] font-semibold text-pretty',
          알림.종류 === '좋음' && 'text-green-600', 알림.종류 === '나쁨' && 'text-destructive')}>
          {알림.글}
        </div>
      ) : null}
    </main>
  )
}

function 이어읽기(): 저장꼴 | null {
  try {
    const 글 = localStorage.getItem(저장이름)
    if (!글) return null
    const v = JSON.parse(글)
    return v && typeof v === 'object' && v.칸값 ? (v as 저장꼴) : null
  } catch { return null }
}
