'use client'
// 상태 체크 카드 — 개요용 간단 진단 요약. /diagnose(옛개요목록 §B, src/진단.mjs)에
// /inspect(점검이 자동으로 찾은 열린 문제, 과제 6)를 더한다 — 열린 문제가 더 급하니 먼저 보여준다
import Link from 'next/link'
import { 카드 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'

type 진단항목 = { 이름: string; 됨: boolean | null; 지금: string; 조치: string | null; 풀이: string }
type 진단자료 = { 답: { 괜찮나: boolean; 글: string; 조치: string; 더: string } | null; 것들: 진단항목[] }
type 점검문제 = { 갈래: string; 무엇: string; 원인: string; 심각도: '높음' | '보통'; 열쇠: string }
type 점검자료 = { 문제들: 점검문제[]; 켜짐: boolean; 간격분: number }
type 감시자료 = { 헬스체크: { 켜짐: boolean }; 알리미: { 켜짐: boolean } }

export function 상태체크() {
  const 진단 = use자료<진단자료>('/diagnose')
  const 점검 = use자료<점검자료>('/inspect')
  // 감시(헬스체크·조회수 알리미)는 계정을 안 가린다 — 서버가 통째로 도는 것이라서다
  const 감시 = use자료<감시자료>('/watchdog', { 계정무관: true })
  const 것들 = 진단.data?.것들 ?? []
  const 못됨 = 것들.filter((h) => h.됨 === false)
  const 모름 = 것들.filter((h) => h.됨 === null)
  // 됨 === null 은 확인 못 한 것이지 「다 괜찮다」는 개수에 넣지 않는다
  const 확인됨수 = 것들.length - 모름.length
  const 열린문제들 = 점검.data?.문제들 ?? []

  // ⚠️ **꺼진 장치가 가장 급하다.** 점검이 꺼져 있으면 문제가 생겨도 열린문제들 이 늘 비어,
  // 이 칸이 「문제 없음 — 다 괜찮습니다」라고 말한다. 안 재는 것과 괜찮은 것은 다르다
  // (2026-08-29 실측 — 점검·헬스체크·조회수 알리미 셋 다 꺼져 있는데 화면은 아무 말도 안 했다)
  const 꺼진것들 = [
    점검.data && !점검.data.켜짐 ? '점검' : null,
    감시.data && !감시.data.헬스체크.켜짐 ? '헬스체크' : null,
    감시.data && !감시.data.알리미.켜짐 ? '조회수 알리미' : null,
  ].filter(Boolean) as string[]

  // 하나라도 아직 안 왔으면(에러도 아니면) 읽는 중이다
  const 아직읽는중 = (!진단.data && !진단.error) || (!점검.data && !점검.error)
    || (!감시.data && !감시.error)
  // 못 읽은 쪽이나 꺼진 장치가 있으면 「문제 없음」이라고 절대 말하면 안 된다 —
  // 확인 못 한 것을 정상으로 보여주는 것이다
  const 문제없음 = !점검.error && !진단.error && !감시.error
    && !꺼진것들.length && !열린문제들.length && !못됨.length

  return (
    <카드 제목="상태 체크"
      꼬리={<Link href="/check" className="text-sm text-muted-foreground hover:underline">점검 쪽으로 →</Link>}>
      {/* 꺼진 장치는 문제 목록보다 위다. 이게 꺼져 있으면 아래 목록 자체를 믿을 수 없다 */}
      {!아직읽는중 && 꺼진것들.length > 0 && (
        <div className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <b className="text-destructive">지켜보는 장치가 꺼져 있습니다 — {꺼진것들.join(' · ')}</b>
          <div className="mt-1 text-muted-foreground">
            꺼져 있는 동안은 문제가 생겨도 여기에 안 뜹니다. 아래 목록이 비어 있는 것은
            「괜찮다」가 아니라 「안 재고 있다」는 뜻입니다.{' '}
            <Link href="/monitor" className="font-semibold text-foreground underline">모니터링</Link>
            에서 켜 주세요.
          </div>
        </div>
      )}
      {아직읽는중 ? (
        <div className="text-sm text-muted-foreground">살펴보는 중...</div>
      ) : 문제없음 ? (
        <div className="rounded-lg bg-[#e4f3ec] p-3 text-sm font-semibold">
          문제 없음 — 살펴본 {확인됨수}가지가 다 괜찮습니다.
        </div>
      ) : (
        // ⚠️ 진단이 실패해도 점검이 찾은 열린 문제는 늘 그린다. 예전엔 진단 오류 하나가
        // 목록 전체를 가려, 점검이 멀쩡히 잡은 문제가 화면에서 사라졌다 (2026-08-29 검토)
        <div className="space-y-2 text-sm">
          {진단.error && (
            <div className="font-semibold text-destructive">
              진단을 못 읽었어요 — {(진단.error as Error).message} (아래는 점검이 찾은 것만입니다)
            </div>
          )}
          {점검.error && (
            <div className="font-semibold text-destructive">
              점검 결과를 못 읽었어요 — {(점검.error as Error).message} (문제가 있어도 이 목록엔 안 보일 수 있습니다)
            </div>
          )}
          {열린문제들.map((h, i) => (
            <div key={'점검' + i} className={h.심각도 === '높음' ? 'text-destructive' : undefined}>
              <b>{h.무엇}</b>
              {h.원인 && <div className="text-muted-foreground">→ {h.원인}</div>}
            </div>
          ))}
          {못됨.map((h, i) => (
            <div key={'진단' + i}>
              <b>{h.이름}</b> — {h.지금}
              {h.조치 && <div className="text-muted-foreground">→ {h.조치}</div>}
            </div>
          ))}
        </div>
      )}
      {감시.error && (
        <div className="mt-2 text-sm font-semibold text-destructive">
          헬스체크·알리미 상태를 못 읽었어요 — {(감시.error as Error).message}
        </div>
      )}
      {모름.length > 0 && (
        <div className="mt-2 text-sm text-muted-foreground">{모름.length}가지는 아직 확인 못 했습니다.</div>
      )}
    </카드>
  )
}
