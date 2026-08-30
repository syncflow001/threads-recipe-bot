// 엔진(src/*.mjs)을 부르는 문 하나 — 실행 시점에 불러와 번들에 섞지 않는다. 엔진은 뿌리 cwd 를 전제한다
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { 뿌리 } from './뿌리'

const 담김 = new Map<string, Promise<any>>()

export function 엔진<T = any>(이름: string): Promise<T> {
  let p = 담김.get(이름)
  if (!p) {
    // 문자열 주소라 Next 가 따라 들어가 묶지 않는다. 노드가 뿌리의 src/ 를 그대로 돌린다
    p = import(/* turbopackIgnore: true */ pathToFileURL(join(뿌리(), 'src', 이름 + '.mjs')).href)
    // 실패한 것은 다음 부름에 다시 시도한다 — 캐시에 실패를 남기지 않는다
    p.catch(() => 담김.delete(이름))
    담김.set(이름, p)
  }
  return p as Promise<T>
}
