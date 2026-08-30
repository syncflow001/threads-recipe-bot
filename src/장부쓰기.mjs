// 장부를 쓰다 죽어도 반쪽 파일이 남지 않게 한다. 같은 폴더의 임시 파일에 다 쓴 뒤 이름을 바꾼다(rename 은 한 번에 된다)
import { writeFile, rename, unlink, mkdir, appendFile } from 'node:fs/promises'
import { dirname } from 'node:path'

// ⚠️ **쓸 자리를 스스로 만든다** (2026-08-29, 계정 폴더 개편).
// 장부가 `계정/<이름>/` 안으로 들어가면서 「폴더가 아직 없다」가 실제 실패가 됐다.
// 이걸 부르는 쪽마다 mkdir 을 적게 하면 언젠가 한 곳이 빠지고, 그 계정만 조용히 기록을 잃는다.
// 쓰는 함수가 제 자리를 책임지는 것이 한 곳에서 끝나는 유일한 길이다
export async function 안전쓰기(경로, 글, { mode } = {}) {
  await mkdir(dirname(경로), { recursive: true })
  const 임시 = `${경로}.쓰는중-${process.pid}-${Date.now()}`
  try {
    await writeFile(임시, 글, { mode })
    await rename(임시, 경로)
  } catch (에러) {
    await unlink(임시).catch(() => {})
    throw 에러
  }
}

// 줄을 이어 붙이는 길. 안전쓰기와 같은 이유로 **여기서 자리를 만든다** —
// 부르는 쪽마다 mkdir 을 적게 하면 언젠가 한 곳이 빠진다
export async function 이어쓰기(경로, 글) {
  await mkdir(dirname(경로), { recursive: true })
  await appendFile(경로, 글)
}
