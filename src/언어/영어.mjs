// 영어 팩 — 이 언어로 글을 쓸 때 언어 자체가 정하는 것들

import { 씻기 } from '../글자.mjs'

// ── 수량 — 이 언어에서 분량을 어떻게 적는가 ─────────────────────────
// ⚠️ 아래는 **요리 팩에서 그대로 베껴 온 것이다. 기억에 기대 다시 쓰지 마라.**
// 옮기면서 다시 썼더니 `1 1/2 cups` 를 못 잡고 단위 스무 개가 빠졌다 (2026-08-26).
// 팩을 옮길 때는 옛 것을 베끼고 **실제 값으로 견준다.**
//
// ⚠️ **영어는 낱말이 대소문자로 갈린다.** 재료 줄은 `Olive oil`·`Salt` 처럼 대문자로 시작한다.
// 숫자는 단위 앞에 온다 — 한국어와 같고 일본어(`大さじ1`)와 반대다.
const 수 = '(?:\\d+\\s+)?(?:\\d+(?:[./]\\d+)?|[½¼¾⅓⅔⅛])'
// tbsp = 15ml, tsp = 5ml 로 3배 차이다. 한국의 큰술/작은술과 똑같은 함정이다.
// `tbsp.` 처럼 마침표를 붙이거나 `tbsps` 처럼 복수로 쓰기도 한다 (실측)
const 단위 = '(?:tbsps?|tablespoons?|tsps?|teaspoons?|cups?|pints?|quarts?|gallons?|'
  + 'fl\\s?oz|ounces?|oz|pounds?|lbs?|lb|grams?|g|kg|ml|mls|liters?|litres?|l|'
  + 'cloves?|cans?|jars?|bunch(?:es)?|sticks?|slices?|pieces?|sprigs?|heads?|stalks?|'
  + 'packets?|packs?|scoops?|strips?|ears?|servings?|serves|cubes?|fillets?|breasts?|thighs?)'
// 미국 레시피는 `2 (15-ounce) cans tomato sauce` 처럼 숫자와 단위 사이에 괄호를 끼운다 (실측).
// 그 괄호를 넘기지 않으면 통조림 분량이 통째로 안 잡힌다
const 수량꼴 = new RegExp(`(${수})\\s*(?:\\([^)]{1,24}\\)\\s*)?(${단위})\\b`, 'gi')

// 같은 양인데 표기만 다른 것들. 하나로 모아 두지 않으면
// "2 tbsp" 와 "2 tablespoons" 가 서로 다른 분량인 줄 알고 헛경보가 난다
const 단위한줄 = {
  tbsp: 'T', tbsps: 'T', tablespoon: 'T', tablespoons: 'T',
  tsp: 't', tsps: 't', teaspoon: 't', teaspoons: 't',
  cup: 'cup', cups: 'cup', g: 'g', grams: 'g', gram: 'g',
  oz: 'oz', ounce: 'oz', ounces: 'oz', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  clove: 'clove', cloves: 'clove', can: 'can', cans: 'can', slice: 'slice', slices: 'slice',
}
const 고른단위 = (u) => 단위한줄[String(u).toLowerCase().replace(/\.$/, '')] ?? String(u).toLowerCase()

// ⚠️ 시간·온도·인분은 LLM 이 말을 바꿔도 지어낸 것이 아니다 —
// 원문 `10 mins` 를 `10 minutes` 로 풀어 쓰는 일이 흔하다. 이걸 깨진 것으로 치면
// 헛경보가 매번 나고, 헛경보가 잦으면 진짜 경고도 아무도 안 읽는다
const 안세는말 = /^(mins?|minutes?|hrs?|hours?|secs?|seconds?|days?|degrees?|f|c|people|servings?|serves|calories|cals?|kcal|protein|carbs|grams?|g)$/i

export const 수량 = {
  뽑기: (글) => [...씻기(글).matchAll(수량꼴)].map((m) => ({ 수: m[1].trim(), 단위: m[2] })),
  고른단위,
  같은표기: {
    T: ['tbsp', 'tbsps', 'tablespoon', 'tablespoons'],
    t: ['tsp', 'tsps', 'teaspoon', 'teaspoons'],
    cup: ['cup', 'cups'], g: ['g', 'gram', 'grams'], oz: ['oz', 'ounce', 'ounces'],
    lb: ['lb', 'lbs', 'pound', 'pounds'], clove: ['clove', 'cloves'],
    can: ['can', 'cans'], slice: ['slice', 'slices'],
  },
  깨짐꼴: /\d+(?:[./]\d+)?\s*[a-z]{1,10}/gi,
  안세는말,
  대소문자무시: true,
}

export default {
  이름: '영어',
  코드: 'en',

  // 미국 FTC 는 「명확하고 눈에 띄게(clear and conspicuous)」 밝히라고 요구하고,
  // 2023년 개정 지침에서 **글 맨 앞**을 못 박았다. 영어권 계정이 실제로 쓰는 표기도
  // `#ad` 가 압도적으로 흔하다 — `#sponsored` 도 쓰이지만 짧은 쪽이 첫 줄에 얹기 좋다.
  // ⚠️ `#affiliate` 나 `#partner` 만 쓰면 안 된다. FTC 가 「뜻이 불분명하다」고 본 표현이다
  광고표기: '#ad',

  쓰기지시: [
    'Write in English. Do not mix in Korean or Japanese.',
    // 영어권 계량은 분수와 약어를 쓴다 (1/2 cup, 2 tbsp). 원문 표기를 못 바꾸게 못 박는다 —
    // tbsp(15ml) 와 tsp(5ml) 는 3배 차이라 한국의 큰술/작은술과 똑같은 함정이다
    'Copy amounts and units exactly as written in the source. Never swap tbsp and tsp.',
  ],

  // 이 언어에서 분량을 어떻게 적는가. 분야팩(요리)이 이것으로 레시피를 가리고 분량을 대조한다
  수량,

  됨: true,
}
