// 밖으로 나가는 요청이 IPv6 로 헛디디는 것을 막는다. **불러 쓰기만 하면 된다** (부수 효과).
//
// 무슨 일이었나 (2026-08-31 실측).
// Node 는 주소가 IPv4·IPv6 둘 다 있으면 먼저 것을 250ms 안에 못 붙으면 포기하고 다음으로 넘어간다
// (Happy Eyeballs · `autoSelectFamilyAttemptTimeout` 기본 250ms).
// 그런데 이 맥에서 `api.telegram.org` 의 IPv4 연결이 **251ms** 걸린다. 1ms 차이로 포기하고
// **경로가 아예 없는 IPv6**(EHOSTUNREACH)로 넘어가 `fetch failed ETIMEDOUT` 으로 죽었다.
// curl 은 0.78초에 멀쩡히 받는데 Node 만 286ms 만에 실패하던 것이 이 까닭이다.
//
// 텔레그램 알림이 몇 주째 한 통도 안 나가고 있었다 — 점검·조회수·섀도우밴 알림이 전부.
// 문턱을 1초로 올리면 느린 날에도 IPv4 를 안 버린다. 빠른 날에는 아무 차이가 없다 —
// 붙는 즉시 넘어가지 이 시간을 기다리는 것이 아니다.
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

export const 붙는시간문턱 = 1000

setDefaultAutoSelectFamilyAttemptTimeout(붙는시간문턱)
