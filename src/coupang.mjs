// 쿠팡파트너스 오픈 API — 상품을 찾고 글마다 다른 꼬리표를 붙인 제휴 링크를 발급한다
import { createHmac } from 'node:crypto'

const HOST = 'https://api-gateway.coupang.com'
const 기본 = '/v2/providers/affiliate_open_api/apis/openapi'

// 쿠팡이 요구하는 CEA HMAC-SHA256 서명. 쿼리스트링까지 서명에 들어간다.
function 서명(method, path, accessKey, secretKey, now = new Date()) {
  const [p, query = ''] = path.split('?')
  const datetime = now.toISOString().replace(/[-:]/g, '').slice(2, 15) + 'Z'
  const message = datetime + method.toUpperCase() + p + query
  const sig = createHmac('sha256', secretKey).update(message).digest('hex')
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${sig}`
}

async function 부르기(method, path, body, { accessKey = process.env.COUPANG_ACCESS_KEY, secretKey = process.env.COUPANG_SECRET_KEY } = {}) {
  if (!accessKey || !secretKey) throw new Error('COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 가 없다')
  const res = await fetch(HOST + path, {
    method,
    headers: { Authorization: 서명(method, path, accessKey, secretKey), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`쿠팡 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  if (json.rCode !== '0') throw new Error(`쿠팡 오류 ${json.rCode}: ${json.rMessage ?? ''}`)
  return json.data
}

// 글마다 다른 꼬리표. 이 값으로 나중에 어느 글이 벌었는지 가른다.
// 문자를 넓히지 마라 — 쿠팡은 SubID 를 전혀 검증하지 않아서, '&' 가 들어가면
// 남이 자기 제휴 ID 를 끼워 넣어 수수료를 가로챌 수 있다 (docs/coupang-api-facts.md).
const 허용 = /^[0-9A-Za-z_-]+$/
export const SUBID_최대길이 = 20

// 계정을 여럿 굴리면 어느 계정이 벌었는지도 갈라야 한다. 머리글자로 가른다.
// 기본값 't' 는 첫 계정이 지금까지 써 온 값이다 — 바꾸면 지난 통계와 끊긴다.
export function 꼬리표(code, 머리 = 't') {
  const id = `${머리}${code}`
  if (!허용.test(id)) throw new Error(`SubID 에 쓸 수 없는 문자가 있다: ${id}`)
  if (id.length > SUBID_최대길이) throw new Error(`SubID 가 최대 길이를 넘었다: ${id}`)
  return id
}

// 날짜별·SubID별 실적. 우리 꼬리표(t·b + 글번호)가 그대로 들어 있어
// 어느 계정이, 어느 글이 벌었는지까지 갈린다 (docs/coupang-api-facts.md §12-2).
// clicks·orders 엔드포인트는 안 쓴다 — commission 하나에 클릭·주문·수수료가 다 있다.
export async function 실적(시작, 끝, opts = {}) {
  const 날짜꼴 = /^\d{8}$/
  if (!날짜꼴.test(시작) || !날짜꼴.test(끝)) throw new Error('날짜는 YYYYMMDD 여야 한다')
  const data = await 부르기('GET', `${기본}/v1/reports/commission?startDate=${시작}&endDate=${끝}`, null, opts)
  return (data ?? []).map((d) => ({
    날짜: String(d.date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
    꼬리표: d.subId ?? '',
    수수료: Number(d.commission) || 0,
    거래액: Number(d.gmv) || 0,
    클릭: Number(d.click) || 0,
    주문: Number(d.order) || 0,
    취소: Number(d.cancel) || 0,
  }))
}

export async function 상품검색(키워드, { 개수 = 5, ...opts } = {}) {
  const path = `${기본}/products/search?keyword=${encodeURIComponent(키워드)}&limit=${개수}`
  const data = await 부르기('GET', path, null, opts)
  return (data?.productData ?? []).map((p) => ({
    이름: p.productName,
    가격: p.productPrice,
    이미지: p.productImage,
    로켓배송: !!p.isRocket,
    // 검색이 주는 productUrl 은 이미 제휴 링크라 딥링크 API 가 400 을 낸다.
    // 딥링크는 쿼리 없는 순수 상품 주소만 받는다 — itemId 를 붙여도 400 이다.
    url: `https://www.coupang.com/vp/products/${p.productId}`,
  }))
}

// 딥링크 API 는 SubID 가 박힌 쿠팡 단축 링크를 돌려준다. 그대로 글에 붙이면 된다.
export async function 링크만들기(상품url, subId, opts) {
  const data = await 부르기('POST', `${기본}/v1/deeplink`, { coupangUrls: [상품url], subId }, opts)
  const 단축 = data?.[0]?.shortenUrl
  if (!단축) throw new Error('쿠팡 응답에 shortenUrl 이 없다')
  return 단축
}

// 집밥 레시피에 안 맞는 것들. 실제로 검색 1등에 업소용 29,000원짜리 고추장이 올라왔다.
const 덩치 = /업소용|대용량|박스|벌크|[0-9]+\s*(kg|KG)\s*(x|\*|×)|[0-9]{2,}\s*개입/
const 낱말 = (s) => String(s).toLowerCase().replace(/[\[\](),/·]/g, ' ').split(/\s+/).filter((w) => w.length > 1)

// 로켓만 남기고 레시피에 가장 맞는 하나를 고른다.
// 쿠팡의 검색 순위는 이미 관련도순이라, 점수가 같으면 그 순서를 존중한다.
export function 고르기(목록, 키워드) {
  const 로켓 = 목록.filter((p) => p.로켓배송)
  if (!로켓.length) return null // 로켓이 없으면 링크를 안 건다

  const 가격들 = 로켓.map((p) => p.가격).filter((n) => n > 0).sort((a, b) => a - b)
  const 중앙 = 가격들[Math.floor(가격들.length / 2)] ?? 0
  const 원하는말 = 낱말(키워드)

  const 점수 = (p, i) => {
    const 이름낱말 = 낱말(p.이름)
    let s = 원하는말.filter((w) => 이름낱말.some((x) => x.includes(w) || w.includes(x))).length * 2
    if (덩치.test(p.이름)) s -= 3 // 업소용은 집밥에 안 맞는다
    if (중앙 && p.가격 > 중앙 * 2) s -= 2 // 혼자 유난히 비싸면 대개 대용량이다
    return s - i * 0.01 // 동점이면 쿠팡 관련도 순서를 따른다
  }
  return 로켓.map((p, i) => ({ p, s: 점수(p, i) })).sort((a, b) => b.s - a.s)[0].p
}

// 검색 → 로켓 중 가장 맞는 것 → 꼬리표 붙인 링크. 레시피에 넣을 한 줄을 만든다.
export async function 레시피링크(키워드, code, { 개수 = 10, 머리 = 't', ...opts } = {}) {
  const 상품 = 고르기(await 상품검색(키워드, { 개수, ...opts }), 키워드)
  if (!상품) return null // 로켓이 없거나 못 찾으면 지어내지 않는다
  return { 이름: 상품.이름, 가격: 상품.가격, url: await 링크만들기(상품.url, 꼬리표(code, 머리), opts) }
}
