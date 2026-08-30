'use client'
// 점검 쪽 — 멈춤띠·왜 안 올라갔나·막힌 글·도달 넷(옛 점검 쪽, HTML 1118~1121 · src/설정화면-안전.mjs 60~204)
import { 점검설명 } from '@/components/쪽/check/설명'
import { 멈춤띠 } from '@/components/쪽/check/멈춤띠'
import { 성장진단 } from '@/components/쪽/check/성장진단'
import { 왜안올라갔나 } from '@/components/쪽/check/왜안올라갔나'
import { 막힌글 } from '@/components/쪽/check/막힌글'
import { 도달 } from '@/components/쪽/check/도달'
import { 점검기록 } from '@/components/쪽/check/점검기록'

export default function 점검() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">점검</h1>
      <점검설명 />
      <div className="grid gap-4 md:grid-cols-2">
        <멈춤띠 />
        <성장진단 />
        <왜안올라갔나 />
        <막힌글 />
        <도달 />
        <점검기록 />
      </div>
    </>
  )
}
