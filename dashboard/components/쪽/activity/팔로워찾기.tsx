'use client'
// 팔로워 찾기 카드 — 검색·초안 생성·새로고침 복구(옛 HTML 734~755, JS 1560~1615·1620~1656)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 속내 } from '@/components/공용/속내'
import { 진행칸 } from '@/components/공용/진행칸'
import { 알림줄 } from '@/components/공용/알림줄'
import { 세밀조정, type 조절항목 } from './세밀조정'
import { use다시그리기, use진행따라붙기 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'

type 후보자료 = { 언어: string; 후보들: { 작성자: string; 팔로워: number; 확산: number }[] }

export function 팔로워찾기({ 차림, 값, onChange, 즉시저장 }: {
  차림: 조절항목[]
  값: Record<string, number>
  onChange: (키: string, v: number) => void
  즉시저장: (새값: Record<string, number>) => void
}) {
  const 다시그리기 = use다시그리기()
  const [찾는중, 찾는중담기] = useState(false)
  const [후보, 후보담기] = useState<후보자료 | null>(null)
  const [알림, 알림담기] = useState('')

  // 찾은 후보는 초안이다 — 아래 「활동초안」이 다시 읽도록 자료를 무효화한다(옛 후보적용 1611~1615)
  const 후보적용 = (r: 후보자료) => {
    알림담기(r.후보들.length + '개 찾았습니다. 아래에서 확인하고 팔로우하세요.')
    후보담기(r)
    다시그리기()
  }

  // ⚠️ 돌던 일을 다시 붙잡는다(옛 진행따라붙기·놓친결과챙기기 1620~1656) — 새로고침 뒤뿐 아니라
  // 「이미 찾고 있습니다」 오류를 받았을 때도, 진행칸이 끝남을 알렸을 때도 같은 경로로 붙잡는다.
  // 다른 계정이 돌리던 일이면 화면을 억지로 그 계정으로 바꾸지 않는다 — 지금 보는 계정만 잰다
  const 진행따라붙기 = use진행따라붙기<후보자료>('팔로워 찾기', 찾는중담기, 후보적용)

  const 지금찾기 = async () => {
    찾는중담기(true)
    알림담기('')
    후보담기(null)
    try {
      const r = await 부르기<후보자료>('/follow-candidates', {})
      후보적용(r)
    } catch (err: any) {
      알림담기(err.message)
      if (/이미 찾고|이미 돌고/.test(err.message)) 진행따라붙기()
    } finally { 찾는중담기(false) }
  }

  return (
    <카드 제목="팔로워 찾기">
      <귀띔>
        비슷한 분야에서 <b>잘 퍼지는 계정</b>을 찾아 줍니다.
        확인하고 「이대로 팔로우」를 누르면 <b>저희가 대신 눌러 드리고 기록에 남깁니다.</b>
      </귀띔>
      <속내 머리="어떻게 찾나요">
        <ol className="ml-[1.1rem] list-decimal space-y-1">
          <li>이 계정의 분야·언어에 맞는 <b>검색어 4개</b>로 스레드를 뒤져요.</li>
          <li>걸린 글에서 계정 후보를 <b>30개</b>까지 모아요.</li>
          <li>계정마다 프로필에 들어가 <b>반응 좋은 글 3편</b>의 조회수를 재요.</li>
          <li><b>확산(조회수 ÷ 팔로워)</b>이 높은 순으로 줄을 세워 보여줍니다.
            팔로워만 많고 안 퍼지는 계정은 걸러져요.</li>
        </ol>
        <p className="mt-2"><b>찾기만 하면 아무것도 안 나갑니다.</b> 목록이 아래 <b>초안</b>으로 담기고,{' '}
          <b>「이대로 팔로우」를 눌러야</b> 실제로 팔로우합니다.</p>
        <p className="mt-2">누를 때도 문을 넷 겁니다 — <b>한 판 3명 · 하루 10명 · 낮에만 · 사람이 누를 때만.</b>{' '}
          한꺼번에 쏟아부으면 계정이 막혀요. 누른 뒤에는 <b>정말 팔로우됐는지 화면에서 확인</b>하고{' '}
          <b>「활동 기록」에 남깁니다</b> (이 계정 파일에만 남습니다).</p>
      </속내>
      <div className="mt-3 flex">
        <button type="button" disabled={찾는중} onClick={지금찾기}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          지금 찾아보기
        </button>
      </div>
      <진행칸 켜짐={찾는중} 무엇="팔로워 찾기" onDone={() => { 찾는중담기(false); 진행따라붙기() }} />
      <알림줄 글={알림} />
      {후보 && (
        <div className="mt-2 space-y-2 text-sm">
          <div className="rounded-lg border bg-muted/40 px-3 py-2">{후보.언어} 계정 — 이름을 누르면 새 창에서 볼 수 있어요</div>
          <div className="flex flex-wrap gap-2">
            {후보.후보들.map((c) => (
              <a key={c.작성자} href={`https://www.threads.com/@${encodeURIComponent(c.작성자)}`}
                target="_blank" rel="noopener" className="rounded-2xl bg-muted px-2.5 py-1 font-semibold hover:underline">
                @{c.작성자} · {c.확산}배
              </a>
            ))}
          </div>
        </div>
      )}
      <세밀조정 갈래="팔로워찾기" 차림={차림} 값={값} onChange={onChange} 즉시저장={즉시저장} />
    </카드>
  )
}
