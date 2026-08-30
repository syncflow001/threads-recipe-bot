'use client'
// 성과 측정 카드 — 스위치·간격·지금 측정하기(옛 HTML 1001~1023, JS 2125~2205)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 카드, 귀띔 } from '@/components/공용/카드'
import { 켜짐표 } from '@/components/공용/켜짐표'
import { 스위치 } from '@/components/공용/스위치'
import { 알림줄 } from '@/components/공용/알림줄'
import { 부르기 } from '@/lib/api'
import { 짧은때 } from '@/lib/글자'
import { useState } from 'react'

export type 성적자료 = {
  켜짐: boolean
  간격시간: number
  기본간격: number
  찍는개수: number
  마지막: string | null
  것들: any[]
}

export function 성과측정({ 자료, 에러, 다시읽기, 측정후 }: {
  자료?: 성적자료
  에러?: unknown
  다시읽기: () => void
  측정후: () => void
}) {
  const [간격, 간격담기] = useState<string | null>(null)
  const [측정중, 측정중담기] = useState(false)
  const [알림, 알림담기] = useState('')

  if (에러) return <카드 제목="성과 측정" 넓게><알림줄 글={'못 읽었어요 — ' + (에러 as Error).message} 종류="나쁨" /></카드>
  if (!자료) return <카드 제목="성과 측정" 넓게>확인하는 중</카드>

  const 간격값 = 간격 ?? String(자료.간격시간)

  // 스위치 하나로 켜고 끈다. 실패했으면 화면이 거짓말하면 안 된다 — 서버에 다시 물어 진짜 상태로 그린다(옛 2161~2178)
  const 스위치누름 = async () => {
    try {
      if (자료.켜짐) await 부르기('/score-off', {})
      else await 부르기('/score-on', { 간격시간: Number(간격값) })
    } catch (err: any) {
      알림담기('실패 — ' + err.message)
    } finally {
      다시읽기()
    }
  }

  // 켜진 채로 간격을 바꾸면 그 자리에서 시각표를 다시 건다(옛 2181~2186)
  const 간격바꿈 = async (v: string) => {
    간격담기(v)
    if (!자료.켜짐) return
    try { await 부르기('/score-on', { 간격시간: Number(v) }) }
    catch (err: any) { 알림담기('실패 — ' + err.message) }
    다시읽기()
  }

  const 지금측정 = async () => {
    측정중담기(true)
    알림담기('측정하는 중이에요...')
    try {
      const r = await 부르기<{ 팔로워: number | null; 본글: number; 찍음: number; 그대로?: number; 못읽음?: number }>('/score-run', {})
      알림담기(
        '팔로워 ' + (r.팔로워 == null ? '못 읽음' : Number(r.팔로워).toLocaleString('ko-KR')) + ' · 글 ' +
        r.본글 + '편 가운데 ' + r.찍음 + '개 새로 기록했어요' +
        (r.그대로 ? ' (' + r.그대로 + '편은 값이 그대로라 안 쌓았어요)' : '') +
        (r.못읽음 ? ' · ' + r.못읽음 + '편은 못 읽었습니다' : '') + '.'
      )
    } catch (err: any) {
      알림담기('실패 — ' + err.message)
    } finally {
      측정중담기(false)
      측정후()
    }
  }

  return (
    <카드 제목="성과 측정" 넓게
      꼬리={
        <span className="flex items-center gap-2">
          <켜짐표 켜짐={자료.켜짐} />
          <스위치 켜짐={자료.켜짐} onChange={스위치누름} aria-label="성과 측정 시각표 켜고 끄기" />
        </span>
      }>
      <귀띔><b>스레드는 지난 성과를 안 알려줘요.</b> 물어보면 「지금 이만큼」만 답합니다.
        그래서 켜 두면 정해진 간격마다 저희가 직접 측정해서 쌓아요 —
        팔로워 수와 최근 글의 <b>조회수 · 좋아요 · 답글 · 리포스트 · 인용 · 공유</b>입니다.{' '}
        <b>꺼 두는 동안은 영영 빈칸으로 남아요.</b> 나중에 채울 방법이 없습니다.</귀띔>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">몇 시간마다</label>
        <Select value={간격값} items={{ '1': '1시간', '3': '3시간', '6': '6시간', '12': '12시간', '24': '하루 한 번' }}
          onValueChange={(v) => v && 간격바꿈(v)}>
          <SelectTrigger className="w-auto min-w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1시간</SelectItem>
            <SelectItem value="3">3시간</SelectItem>
            <SelectItem value="6">6시간</SelectItem>
            <SelectItem value="12">12시간</SelectItem>
            <SelectItem value="24">하루 한 번</SelectItem>
          </SelectContent>
        </Select>
        <button type="button" disabled={측정중} onClick={지금측정}
          className="rounded-lg border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary-hover px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
          지금 측정하기
        </button>
      </div>
      <알림줄 글={알림 || (자료.켜짐
        ? 자료.간격시간 + '시간마다 최근 ' + 자료.찍는개수 + '개를 측정합니다.' + (자료.마지막 ? ' 마지막 측정 ' + 짧은때(자료.마지막) + '.' : '')
        : '꺼져 있어요. 켜기 전까지는 아무것도 안 쌓입니다.' + (자료.마지막 ? ' 마지막 측정 ' + 짧은때(자료.마지막) + '.' : ''))} />
    </카드>
  )
}
