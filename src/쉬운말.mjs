// 기계가 뱉은 오류를 사람 말로 바꾼다 — 대시보드 「돌려 본 기록」은 비개발자가 읽는다

// 왜 필요한가. 스레드·OpenAI 는 영어 JSON 을 통째로 던진다. 그것이 화면에 그대로 흐르면
// 사용자는 무엇이 잘못됐는지도, 무엇을 해야 하는지도 알 수 없다.
// **원문은 뒤에 짧게 남긴다** — 우리가 나중에 원인을 찾아야 하기 때문이다.

const 짧게 = (글, 길이 = 110) => {
  const 한줄 = String(글 ?? '').replace(/\s+/g, ' ').trim()
  return 한줄.length > 길이 ? 한줄.slice(0, 길이) + '…' : 한줄
}

// 위에서부터 맞는 것을 쓴다. 좁은 것을 먼저 둔다
const 표 = [
  [/Object with ID .* does not exist/i,
    '스레드가 이 계정 번호를 모릅니다. 열쇠에 적힌 계정 번호가 틀렸을 수 있어요 — 대시보드 「열쇠」에서 토큰을 다시 저장해 주세요'],
  [/missing permissions|permission|OAuthException/i,
    '스레드가 이 작업을 허락하지 않았습니다 — 토큰을 다시 받아 권한을 켜 주세요'],
  [/expired|Session has been invalidated|access token/i,
    '스레드 토큰이 만료됐습니다 — 토큰을 다시 받아 주세요'],
  [/쿠키가 죽었다|쿠키죽음/,
    '스레드 로그인(쿠키)이 풀렸습니다 — 대시보드 「열쇠」에 새 쿠키를 넣어 주세요'],
  [/insufficient_quota|billing|quota/i,
    'OpenAI 사용량이 다 찼습니다 — 결제나 한도를 확인해 주세요'],
  [/Incorrect API key|invalid_api_key|OpenAI 401/i,
    'OpenAI 열쇠가 맞지 않습니다 — 대시보드 「열쇠」에서 다시 넣어 주세요'],
  [/OpenAI 429|rate limit/i,
    'OpenAI 가 잠깐 너무 바쁩니다 — 조금 뒤에 다시 해 주세요'],
  [/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET|socket hang up/i,
    '인터넷이 잠깐 끊겼습니다 — 다음 판에 다시 해 봅니다'],
  [/Timeout|timed out/i,
    '스레드가 제때 답하지 않았습니다 — 다음 판에 다시 해 봅니다'],
  [/ENOSPC|no space left/i,
    '맥의 저장 공간이 모자랍니다'],
]

export function 쉬운말(원문) {
  const 글 = String(원문 ?? '').trim()
  if (!글) return '까닭을 알 수 없습니다'
  // 영어 JSON 이 통째로 오면 message 칸만 꺼낸다. 나머지는 사람이 읽을 것이 없다
  const 속 = 글.match(/"message"\s*:\s*"([^"]{1,400})"/)?.[1] ?? 글
  const 맞는것 = 표.find(([꼴]) => 꼴.test(속) || 꼴.test(글))
  // 원문은 짧게 남긴다 — 화면은 사람이 읽지만, 원인은 우리가 찾아야 한다
  return 맞는것 ? `${맞는것[1]} (원문: ${짧게(속, 70)})` : 짧게(속)
}
