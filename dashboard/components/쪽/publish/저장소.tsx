'use client'
// 저장소 카드 — 걷어 온 글 목록·등급 기준·버리기(옛 HTML 838~846, JS 1892~1977)
import { useState } from 'react'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 숫자줄 } from '@/components/공용/숫자줄'
import { 굴림칸 } from '@/components/공용/굴림칸'
import { use계정, use자료 } from '@/lib/hooks'
import { 부르기 } from '@/lib/api'
import { 날짜만 } from '@/lib/글자'

type 저장소글 = {
  code: string
  사진: string | null
  사진주소: string | null
  작성자: string
  등급: string | null
  옛등급: string | null
  확산: number | null
  조회수: number | null
  좋아요: number | null
  팔로워: number | null
  공유: number | null
  리포스트: number | null
  레시피: boolean
  미디어수: number | null
  건진때: string | number | null
  지났나: boolean
  본문: string
}
type 저장소자료 = {
  수: number
  쓸수있는수: number
  지난것수: number
  등급셈: Record<string, number>
  보관기간일: number
  문턱: { 최소조회수: number; 최소팔로워: number; 확산구간: [string, number][] }
  것들: 저장소글[]
}

const 등급색: Record<string, { bg: string; fg: string }> = {
  플래티넘: { bg: '#e8eaf6', fg: '#3f51b5' },
  골드: { bg: '#fef3c7', fg: '#92400e' },
  실버: { bg: '#eef0f3', fg: '#4b5563' },
  브론즈: { bg: '#f5ece4', fg: '#7c4a20' },
  미달: { bg: '#f1f3f2', fg: '#6b7280' },
}
function 등급표(이름?: string | null) {
  const 색 = 등급색[이름 ?? ''] ?? { bg: '#f1f3f2', fg: '#6b7280' }
  return (
    <span className="inline-block rounded-md px-2 py-0.5 text-xs font-extrabold"
      style={{ background: 색.bg, color: 색.fg }}>
      {이름 || '—'}
    </span>
  )
}
const 셈꼴 = (v: number | null | undefined) =>
  v == null ? <span className="text-muted-foreground">—</span> : v.toLocaleString('ko-KR')

function 사진칸({ 사진길 }: { 사진길: string | null }) {
  const [실패, 실패담기] = useState(false)
  if (!사진길 || 실패) {
    return <div className="grid h-14 w-14 place-items-center rounded-md bg-muted text-muted-foreground">▤</div>
  }
  return (
    <img src={사진길} alt="" loading="lazy" referrerPolicy="no-referrer"
      onError={() => 실패담기(true)}
      className="h-14 w-14 rounded-md object-cover" />
  )
}

export function 저장소() {
  const 계정 = use계정()
  const { data: 자료, error, refetch } = use자료<저장소자료>('/archive')
  // 계정이 아직 안 읽혔으면(null) 기다린다 — 아래 사진 주소가 계정을 그대로 문자열로 쓴다
  if (계정 === null) return <카드 제목="저장소" 넓게>불러오는 중…</카드>

  const 버리기 = async (code: string) => {
    await 부르기('/archive-drop', { code }).catch(() => {})
    refetch()
  }

  return (
    <카드 제목="저장소" 넓게
      단추={<button type="button" onClick={() => refetch()}
        className="rounded-lg border border-primary/35 bg-transparent text-primary transition-colors hover:bg-primary/10 px-2.5 py-1 text-xs font-semibold">다시 세기</button>}>
      <귀띔>
        홈에서 걷어 와 쌓아 둔 남의 글이에요. 여기서 한 개씩 꺼내 내 말투로 다시 씁니다.{' '}
        <b>등급은 순서만 정합니다</b> — 좋은 것부터 쓰고, 좋은 게 없으면 그 아래라도 씁니다.
      </귀띔>

      {error ? (
        <div className="text-sm text-destructive">못 읽었어요 — {(error as Error).message}</div>
      ) : (
        <>
          <숫자줄 항목={[
            { 이름: '바로 쓸 수 있는 글', 값: 자료?.쓸수있는수 ?? 0 },
            { 이름: '모아 둔 글 전부', 값: 자료?.수 ?? 0 },
            ...['플래티넘', '골드', '실버', '브론즈', '미달', '알수없음'].map((g) => ({
              이름: g, 값: 자료?.등급셈?.[g] ?? 0,
            })),
          ]} />

          {자료 && 자료.쓸수있는수 === 0 && (
            <div className="my-3 rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-3 text-sm">
              <b>쓸 수 있는 글이 없습니다.</b> <b>저장소에 글 모으기</b> 를 눌러 홈에서 걷어 오세요.
            </div>
          )}
          {자료 && 자료.쓸수있는수 !== 0 && 자료.지난것수 > 0 && (
            <div className="my-3 rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-3 text-sm">
              {자료.지난것수}편은 걷어 온 지 {자료.보관기간일}일이 지나 안 씁니다. 원글이 지워졌을 수 있어서예요.
            </div>
          )}

          {자료?.문턱 && (
            <div className="my-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.78rem]">
              <span><b>등급은 쓰는 순서</b>를 정합니다. 위에서부터 꺼내 씁니다</span>
              <span><b>확산</b> = 조회수 ÷ 팔로워</span>
              {자료.문턱.확산구간.map(([이름, 하한]) => (
                <span key={이름} className="inline-flex items-center gap-1">
                  {등급표(이름)}
                  <span>확산 <b>{하한}배</b> 이상</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1">
                {등급표('미달')} 그 아래거나, 조회 <b>{자료.문턱.최소조회수.toLocaleString('ko-KR')}</b> 미만이거나,
                팔로워 <b>{자료.문턱.최소팔로워}</b> 미만 — <b>미달도 씁니다.</b> 맨 뒤 차례일 뿐입니다
              </span>
            </div>
          )}

          <굴림칸>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th></th><th>등급</th><th>확산</th><th>조회</th><th>좋아요</th>
                  <th>리포스트</th><th>공유</th><th>글</th><th></th>
                </tr>
              </thead>
              <tbody>
                {자료?.것들.length ? 자료.것들.map((g) => {
                  const 사진길 = g.사진
                    ? `/api/photo?where=받은것&code=${encodeURIComponent(g.code)}&file=${encodeURIComponent(g.사진)}&profile=${encodeURIComponent(계정)}`
                    : g.사진주소
                  return (
                    <tr key={g.code} className={g.지났나 ? 'opacity-50' : undefined}>
                      <td>
                        <사진칸 사진길={사진길} />
                        <div className="mt-1 text-center text-[0.66rem] text-muted-foreground">
                          {g.레시피 ? '레시피' : '—'}{g.미디어수 ? ` · ${g.미디어수}장` : ''}
                          {g.건진때 ? <br /> : null}{g.건진때 ? 날짜만(g.건진때) : null}
                        </div>
                      </td>
                      <td>
                        {등급표(g.등급)}
                        {g.옛등급 && <div className="mt-0.5 text-[0.68rem] text-muted-foreground">전 {g.옛등급}</div>}
                      </td>
                      <td>{g.확산 == null ? '—' : `${g.확산.toFixed(1)}배`}</td>
                      <td>{셈꼴(g.조회수)}</td>
                      <td>{셈꼴(g.좋아요)}</td>
                      <td>{셈꼴(g.리포스트)}</td>
                      <td>{셈꼴(g.공유)}</td>
                      <td className="max-w-xs">
                        @{g.작성자} <span className="text-muted-foreground">· 팔로워 {셈꼴(g.팔로워)}</span>
                        <br />{g.본문}
                      </td>
                      <td>
                        <button type="button" onClick={() => 버리기(g.code)}
                          className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 px-2.5 py-1 text-xs font-semibold">버리기</button>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">
                    모아 둔 글이 없어요. 위 <b>저장소에 글 모으기</b> 를 눌러 채우세요.
                  </td></tr>
                )}
              </tbody>
            </table>
          </굴림칸>
        </>
      )}
    </카드>
  )
}
