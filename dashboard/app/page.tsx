// / 는 갈림길 — 계정이 하나도 없으면 첫 화면(/start), 있으면 개요(/overview)
import { redirect } from 'next/navigation'
import { 엔진 } from '@/lib/엔진'
import { 뿌리 } from '@/lib/뿌리'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { 계정이하나도없다 } = await 엔진('계정있나')
  const 없나 = await 계정이하나도없다(뿌리())
  redirect(없나 ? '/start' : '/overview')
}
