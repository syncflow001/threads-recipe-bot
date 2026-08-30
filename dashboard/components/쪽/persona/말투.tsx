'use client'
// 말투 카드 — 정체성·말투·표현·예시 넷 + 추천/저장/내려받기/샘플/대화 다듬기
// (옛 HTML 920~970, JS 추천받기·저장·내려받기·샘플·대화 3050~3239, 그리기(s) 2426~2436,
// 새로고침 복구 1620~1656)
import { useEffect, useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 알림줄 } from '@/components/공용/알림줄'
import { 진행칸 } from '@/components/공용/진행칸'
import { use계정, use자료, use진행따라붙기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 말투추천, type 추천결과 } from './말투추천'
import { 샘플칸, type 샘플결과 } from './샘플칸'
import { 대화다듬기, type 카드값 } from './대화다듬기'

type 뜻자료 = { 정체성: string; 말투: string; 표현: string } | null
type 말투자료 = { 정체성: string; 말투: string; 표현: string; 예시: string[]; 뜻: 뜻자료 } | null
type 상태자료 = { 말투: 말투자료; 정보?: { 언어?: string } }

// 뜻이 다 비었으면 안 지녔던 것으로 친다 — 저장할 때 뜻지움 을 켜서 옛 파일 뜻을 지운다(옛 뜻그리기 3096~3099)
const 정리된뜻 = (뜻?: 뜻자료 | null): 뜻자료 => (뜻 && (뜻.정체성 || 뜻.말투 || 뜻.표현) ? 뜻 : null)

export function 말투() {
  const 계정 = use계정()
  const 상태 = use자료<상태자료>('/status')

  const [정체성, 정체성담기] = useState('')
  const [말투값, 말투값담기] = useState('')
  const [표현, 표현담기] = useState('')
  const [예시, 예시담기] = useState(['', '', ''])
  const [예시꼬리, 예시꼬리담기] = useState(['', '', ''])
  const [뜻, 뜻담기] = useState<뜻자료>(null)
  const [알림, 알림담기] = useState('')
  const [저장중, 저장중담기] = useState(false)
  const [샘플결과값, 샘플결과담기] = useState<샘플결과 | null>(null)
  const [샘플도는중, 샘플도는중담기] = useState(false)

  // 서버 값으로 채운다. 계정이 바뀌면 앞 계정 흔적을 지우고 다시 채운다(옛 그리기(s) 2383~2436)
  useEffect(() => {
    const m = 상태.data?.말투
    정체성담기(m?.정체성 || '')
    말투값담기(m?.말투 || '')
    표현담기(m?.표현 || '')
    예시담기([0, 1, 2].map((i) => m?.예시?.[i] || ''))
    예시꼬리담기(['', '', ''])
    뜻담기(정리된뜻(m?.뜻))
    알림담기('')
    샘플결과담기(null)
  }, [계정, 상태.data])

  const 지금카드 = (): 카드값 => ({ 정체성, 말투: 말투값, 표현, 예시: 예시.filter((v) => v.trim()) })

  // 추천 결과를 칸에 채운다. 예시는 잘 퍼진 남의 글 — 어느 계정의 몇 배짜리인지 꼬리에 적는다
  const 추천적용 = (r: 추천결과) => {
    정체성담기(r.정체성)
    말투값담기(r.말투)
    표현담기(r.표현)
    뜻담기(정리된뜻(r.뜻))
    let 채운수 = 0
    let 덮은적있나 = false
    const 새예시 = [...예시]
    const 새꼬리 = ['', '', '']
    for (let i = 0; i < 3; i++) {
      const 글 = r.예시들?.[i]
      if (!글) continue
      if (새예시[i].trim() && 새예시[i].trim() !== 글.본문) 덮은적있나 = true
      새예시[i] = 글.본문
      새꼬리[i] = '@' + 글.작성자 + ' · 조회 ' + Number(글.조회수).toLocaleString('ko-KR') +
        (글.확산 ? ' · 확산 ' + 글.확산 + '배' : '')
      채운수 += 1
    }
    예시담기(새예시)
    예시꼬리담기(새꼬리)
    알림담기('추천을 채웠습니다' +
      (채운수 ? ` (잘 퍼진 글 ${채운수}편을 예시로 넣었습니다)` : '') +
      '. 고쳐 쓰신 뒤 「말투 저장」을 눌러 주세요.' +
      (덮은적있나 ? ' 적어 두셨던 예시는 아직 파일에 그대로 있습니다 — 저장하지 않고 새로고침하면 돌아옵니다.' : ''))
  }

  // 대화가 준 카드는 칸에만 넣는다. 파일에는 「말투 저장」을 눌러야 남는다
  const 카드적용 = (ㅋ: 카드값) => {
    정체성담기(ㅋ.정체성)
    말투값담기(ㅋ.말투)
    표현담기(ㅋ.표현)
    예시담기([0, 1, 2].map((i) => ㅋ.예시?.[i] ?? ''))
  }

  const 말투저장 = async () => {
    저장중담기(true)
    try {
      await 부르기('/persona', { 정체성, 말투: 말투값, 표현, 예시, 뜻, 뜻지움: !뜻 })
      알림담기('저장했습니다. 다음 실행부터 반영됩니다. ✓')
      상태.refetch()
    } catch (err: any) { 알림담기('실패 — ' + err.message) }
    finally { 저장중담기(false) }
  }

  // 샘플 결과를 칸에 채운다 — 방금 받았든, 새로고침 뒤 다시 붙잡았든 같은 손으로 한다
  const 샘플적용 = (r: 샘플결과) => {
    샘플결과담기(r)
    알림담기('이 말투로 써 봤습니다. 아직 안 올렸습니다.')
  }

  // ⚠️ 돌던 일을 다시 붙잡는다(옛 진행따라붙기·놓친결과챙기기 1620~1656) — 새로고침 뒤뿐 아니라
  // 「이미 돌고 있습니다」 오류를 받았을 때도 같은 경로로 붙잡는다(옛 3167).
  // 다른 계정이 돌리던 일이면 화면을 억지로 그 계정으로 바꾸지 않는다 — 지금 보는 계정만 잰다
  const 샘플따라붙기 = use진행따라붙기<샘플결과>('말투 샘플', 샘플도는중담기, 샘플적용)

  // 샘플·대화 둘 다 말투 파일을 안 건드린다. 파일에 쓰는 것은 「말투 저장」뿐이다(옛 3133~3134)
  const 샘플보기 = async () => {
    샘플도는중담기(true)
    알림담기('')
    try {
      const r = await 부르기<샘플결과 & { 안됨?: string }>('/persona-sample', 지금카드())
      if (r.안됨) { 알림담기(r.안됨); return }
      샘플적용(r)
    } catch (err: any) {
      알림담기(err.message)
      if (/이미 돌고/.test(err.message)) 샘플따라붙기()
    } finally { 샘플도는중담기(false) }
  }

  // 계정이 아직 안 읽혔으면(null) 기다린다 — 아래 내려받기 링크가 계정을 그대로 문자열로 쓴다
  if (계정 === null || !상태.data) return <카드 제목="말투">불러오는 중…</카드>

  const 그언어 = 상태.data.정보?.언어 ?? '한국어'
  const 한글있나 = /[가-힣]/.test(`${정체성} ${표현}`)
  const 말투경고보임 = 그언어 !== '한국어' && 한글있나

  return (
    <카드 제목="말투" 넓게>
      <귀띔>
        <b>글 예시가 제일 강력합니다.</b> 「추천받기」를 누르면 그 분야에서{' '}
        <b>실제로 잘 퍼진 글</b>을 찾아 정체성·말투·표현·예시를 한 번에 채웁니다.{' '}
        내가 올린 글로 바꿔 넣으셔도 됩니다 — 그게 더 정확합니다.
      </귀띔>
      {말투경고보임 && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          이 계정은 <b>{그언어}</b> 계정인데 말투 칸에 <b>한국어</b>가 들어 있습니다.{' '}
          <b>자주 쓰는 표현은 글에 그대로 박히는 낱말</b>이라 그대로 두면 {그언어} 글에 한국어가 섞입니다.{' '}
          <b>「추천받기」로 다시 채우고 「말투 저장」</b>을 눌러 주세요.
        </div>
      )}
      <말투추천 onApply={추천적용} 초기화신호={계정} />
      <label className="mb-1 block text-sm font-medium">나를 한 줄로</label>
      <input value={정체성} onChange={(e) => 정체성담기(e.target.value)}
        placeholder="30대 직장인. 퇴근하고 해먹는 집밥 계정"
        className="mb-1 w-full rounded-lg border px-2.5 py-1.5 text-sm" />
      {뜻?.정체성 && <div className="mb-2 text-xs text-muted-foreground"><b>뜻</b> {뜻.정체성}</div>}
      <label className="mb-1 block text-sm font-medium">말투</label>
      <textarea value={말투값} onChange={(e) => 말투값담기(e.target.value)}
        placeholder="친한 친구한테 얘기하듯 반말. 마침표를 거의 안 쓴다" rows={2}
        className="mb-1 w-full rounded-lg border px-2.5 py-1.5 text-sm" />
      {뜻?.말투 && <div className="mb-2 text-xs text-muted-foreground"><b>뜻</b> {뜻.말투}</div>}
      <label className="mb-1 block text-sm font-medium">자주 쓰는 표현 (쉼표로 나눠서)</label>
      <input value={표현} onChange={(e) => 표현담기(e.target.value)}
        placeholder="ㅋㅋ, ㅎㅎ, ㅠㅠ"
        className="mb-1 w-full rounded-lg border px-2.5 py-1.5 text-sm" />
      {뜻?.표현 && <div className="mb-2 text-xs text-muted-foreground"><b>뜻</b> {뜻.표현}</div>}
      {(['글 예시 ①', '글 예시 ②', '글 예시 ③'] as const).map((꼬리표, i) => (
        <div key={i}>
          <label className="mb-1 block text-sm font-medium">
            {꼬리표}{' '}
            {예시꼬리[i] && <span className="text-xs font-normal text-muted-foreground">{예시꼬리[i]}</span>}
          </label>
          <textarea value={예시[i]}
            onChange={(e) => 예시담기((이전) => { const n = [...이전]; n[i] = e.target.value; return n })}
            rows={3} className="mb-2 w-full rounded-lg border px-2.5 py-1.5 text-sm" />
        </div>
      ))}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={저장중} onClick={말투저장}
          className="rounded-lg border-transparent bg-primary transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45">
          말투 저장
        </button>
        <a href={`/api/persona-file?profile=${encodeURIComponent(계정)}`} download
          onClick={() => 알림담기('내려받았습니다 — 마지막으로 「말투 저장」한 내용입니다. ✓')}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3.5 py-2 text-sm font-semibold">
          말투 파일 내려받기
        </a>
        <button type="button" disabled={샘플도는중} onClick={샘플보기}
          className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          🧪 샘플 보기
        </button>
      </div>
      <진행칸 켜짐={샘플도는중} 무엇="말투 샘플" onDone={() => { 샘플도는중담기(false); 샘플따라붙기() }} />
      <알림줄 글={알림} />
      <샘플칸 결과={샘플결과값} />
      <대화다듬기 지금카드={지금카드} onApply={카드적용} 초기화신호={계정} />
    </카드>
  )
}
