'use client'
// 팔로워 추이 카드 — 카드 안에 SVG 꺾은선을 그린다(옛 HTML 1044~1052, JS 2207~2271)
import { 카드, 귀띔 } from '@/components/공용/카드'
import { use자료 } from '@/lib/hooks'
import { 팔로워추이차트 } from '@/components/차트/팔로워추이'

type 팔로워자료 = {
  줄들: { 날: string; 수: number }[]
  지금: number | null
  이레: number | null
  하루: number | null
  시작날: string | null
  열쇠없음: boolean
}

export function 팔로워추이() {
  const { data: 자료, error } = use자료<팔로워자료>('/followers')
  const 줄들 = 자료?.줄들 ?? []

  return (
    <카드 제목="팔로워 추이" 넓게
      꼬리={<span>{자료 && !error && !자료.열쇠없음 && 줄들.length ? 줄들[0].날 + ' 부터 ' + 줄들.length + '일치' : ''}</span>}>
      <귀띔>스레드는 <b>지난 팔로워 수를 안 알려줘요.</b>{' '}
        그래서 하루에 한 번 저희가 측정해서 쌓습니다 — <b>측정을 시작한 날부터만 나와요.</b></귀띔>
      {error ? (
        <div className="text-sm text-muted-foreground">못 읽었어요 — {(error as Error).message}</div>
      ) : 자료?.열쇠없음 ? (
        <div className="text-sm text-muted-foreground">
          이 계정의 스레드 열쇠가 없어서 팔로워를 못 읽어요. <b>세팅</b> 쪽 열쇠 칸에서 채워 주세요.
        </div>
      ) : !자료 ? (
        <div className="text-sm text-muted-foreground">불러오는 중…</div>
      ) : 줄들.length < 2 ? (
        <div className="text-sm text-muted-foreground">
          아직 {줄들.length}일치뿐이에요. <b>이틀은 모여야 선이 그려집니다.</b> 하루에 한 번씩 저절로 쌓여요.
        </div>
      ) : (
        <팔로워추이차트 줄들={줄들} />
      )}
    </카드>
  )
}
