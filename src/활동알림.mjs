// 스레드 활동 화면(좋아요·팔로우·답글 등)의 인라인 JSON 을 읽어 계정 파일에 남긴다

import { readFile, writeFile } from 'node:fs/promises'
import { 안전쓰기 } from './장부쓰기.mjs'
import { 계정길 } from './계정.mjs'
import { join } from 'node:path'
import { 문서받기 } from './threads.mjs'
import { 계정열쇠읽기 } from './감시모음.mjs'

const 종류표 = { like: '좋아요', follow: '팔로우', repost: '리포스트', reply: '답글', mention: '언급', quote: '인용' }

export const 파일길 = (계정, 뿌리) => join(뿌리, 계정길(계정, '활동알림.json'))

// 활동 화면 인라인 JSON 은 { __typename: 'XDTActivityFeedStory', story_type, args } 꼴 노드로 온다.
// 걷는 방식은 게시물뽑기(threads.mjs 26~76줄)와 같다 — script 블록 전부 JSON.parse 뒤 깊이 훑는다.
export function 알림뽑기(html) {
  const 것들 = []

  const 훑기 = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 30) return
    if (Array.isArray(node)) return node.forEach((v) => 훑기(v, depth + 1))

    if (node.__typename === 'XDTActivityFeedStory' && node.story_type && node.args) {
      const { profile_name, timestamp, destination, extra = {} } = node.args
      const 아이콘 = extra.icon_name || ''
      const 몇명 = Number(extra.title?.match(/외\s*(\d+)명/)?.[1] ?? 0) + 1
      const 대상 = destination?.match(/shortcode=([^&]+)/)?.[1] ?? null
      것들.push({
        종류: 종류표[아이콘] ?? '알림',
        ...(종류표[아이콘] ? {} : { 종류원문: 아이콘 }),
        누가: profile_name ?? null,
        몇명,
        글조각: extra.context ?? null,
        대상코드: 대상,
        대상주인: 대상 ? (destination.match(/username=([^&]+)/)?.[1] ?? null) : null,
        때: timestamp ? new Date(timestamp * 1000).toISOString() : null,
      })
    }
    Object.values(node).forEach((v) => 훑기(v, depth + 1))
  }

  for (const [, body] of html.matchAll(/<script type="application\/json"[^>]*>(.*?)<\/script>/gs)) {
    try {
      훑기(JSON.parse(body.replace(/\\u003C/g, '<')))
    } catch {
      // JSON 이 아닌 블록은 그냥 넘어간다
    }
  }
  return 것들
}

export async function 걷기(계정, { 뿌리 = process.cwd(), 쿠키 } = {}) {
  const cookie = 쿠키 ?? (await 계정열쇠읽기(계정, 'THREADS_COOKIE', 뿌리))
  if (!cookie) throw new Error('쿠키없음')

  const html = await 문서받기('https://www.threads.com/activity', { cookie })
  const 것들 = 알림뽑기(html)
  if (것들.length === 0) throw new Error('못읽음')

  const 때 = new Date().toISOString()
  await 안전쓰기(파일길(계정, 뿌리), JSON.stringify({ 때, 것들 }, null, 2))
  return { 때, 것들 }
}

export async function 읽기(계정, 뿌리 = process.cwd()) {
  try {
    return JSON.parse(await readFile(파일길(계정, 뿌리), 'utf8'))
  } catch {
    return null
  }
}
