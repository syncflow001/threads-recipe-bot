// 요리 × 영어 — 낱말과 문장만. 판정 알고리즘은 `분야/요리.mjs` 가 갖는다

// 표본 119편을 실제로 걷어 보고 만들었다 (2026-08-24).
//
// ⚠️ **이 파일에 함수를 두지 마라.** 낱말과 문장만 둔다.
// 분량을 읽어 내는 규칙은 언어팩(`언어/영어.mjs`)에, 그 분량으로 레시피인지 가리는
// 알고리즘은 `분야/요리.mjs` 에 있다. 셋이 섞이면 또 베껴진다.
// 다만 **영양 성분표를 분량으로 세면 안 되는 것은 요리 고유의 함정**이라 `지울꼴` 로 여기 남는다


// ⚠️ **영양 성분 숫자를 분량으로 세면 안 된다.** 영어권에는 요리가 아니라
// 「1. Scallops — 20g protein per 100g / 2. Edamame — 11g protein…」처럼
// 식품 영양을 늘어놓는 글이 흔하다. 숫자·단위·재료 이름·번호 목록이 다 맞아떨어져서
// 그대로 두면 **레시피로 통과한다** — 표본에서 실제로 셋이 새어 들었다 (실측 2026-08-24).
// 따라 만들 수가 없는 글이다. 그래서 영양 성분 자리의 숫자는 세지 않는다.
// 한국어 팩이 장보기 단위를 안 세는 것과 같은 자리다
// ⚠️ **줄바꿈을 넘어가게 두면 안 된다.** `\s` 는 줄바꿈까지 먹어서
// `…20 percent fat` 다음 줄의 `3 teaspoons minced garlic` 에서 **`3` 을 삼켰다.**
// 그 바람에 진짜 레시피(Goulash)가 분량 부족으로 막혔다 (실측 2026-08-24).
// 그래서 사이 공백은 같은 줄의 것(`[ \t]`)만 허용한다
const 영양말 = '(?:protein|calories|carbs?|fat|fibre|fiber|sodium|sugar)'
const 영양단위 = '(?:g|kg|mg|oz|kcal|cal)'
const 영양꼴 = new RegExp(
  `(?:\\d+(?:[./]\\d+)?[ \\t]*${영양단위}?[ \\t]*(?:of[ \\t]+)?${영양말}`
  + `|${영양말}[ \\t]*[:：]?[ \\t]*\\d+(?:[./]\\d+)?[ \\t]*${영양단위}?`
  + `|per[ \\t]+\\d+[ \\t]*(?:g|kg|oz|ml))`, 'gi')

// 분량은 언어팩이 읽는다. 여기서는 **영양 성분표 자리를 먼저 지우라고 일러 줄 뿐**이다 —
// 「1. Scallops — 20g protein per 100g」 처럼 식품 영양을 늘어놓은 글이 흔한데,
// 숫자·단위·재료 이름·번호 목록이 다 맞아떨어져 그대로 두면 레시피로 통과한다 (실측).
// `분야/요리.mjs` 가 판정과 분량 대조 양쪽에서 이 꼴을 지우고 센다
const 지울꼴 = 영양꼴

// 먹는 것을 가리키는 말. 분량만 세면 요리가 아닌 글이 새어 든다 —
// 한국어 팩에서 겪은 사고(프롬프트 8종이 레시피로 발행됨)를 여기서도 막는다.
// ⚠️ `\b` 는 영어에서는 제대로 먹는다 (한글과 달리 단어 경계가 성립한다)
const 먹는말 = /\b(salt|pepper|olive oil|sesame oil|butter|garlic|onions?|shallots?|scallions?|green onions?|sugar|brown sugar|honey|maple syrup|flour|cornstarch|baking powder|baking soda|eggs?|milk|cream|heavy cream|sour cream|yogurt|cheese|parmesan|mozzarella|cheddar|feta|cream cheese|chicken|beef|pork|bacon|sausage|ground turkey|shrimp|salmon|tuna|cod|tofu|pasta|spaghetti|noodles|rice|quinoa|oats|bread|tortillas?|potatoes?|sweet potatoes?|tomatoes?|carrots?|celery|cabbage|broccoli|spinach|kale|zucchini|mushrooms?|peppers?|cucumber|avocado|lemon|lime|beans|chickpeas|lentils|corn|peas|soy sauce|vinegar|balsamic|mayo|mayonnaise|mustard|ketchup|sriracha|hot sauce|chili flakes|paprika|cumin|oregano|basil|parsley|cilantro|thyme|rosemary|cinnamon|vanilla|ginger|broth|stock|coconut milk|peanut butter|chocolate|banana|berries|apples?|protein powder)\b/gi

// 「어떻게」를 알려 주는 글이라야 레시피다. 조리 동작이나 순서 표시가 있어야 한다.
// 불을 안 쓰는 무침·드레싱도 있으므로 순서 표시(1️⃣)도 통로로 둔다
// ⚠️ **영어 동사는 어미가 붙는다.** `chop` 만 찾으면 `chopped` 를 못 잡는다 —
// 재료 줄은 대개 `1 small cabbage chopped` 처럼 과거분사로 적는다 (실측).
// 한국어·일본어 팩에는 없던 문제다. 어간에 어미를 붙여 함께 찾는다
const 조리동사 = ['heat', 'preheat', 'cook', 'bake', 'fry', 'air\\s?fry', 'saut[ée]', 'boil', 'simmer',
  'stir', 'mix', 'whisk', 'chop', 'dice', 'slice', 'mince', 'shred', 'grate', 'season', 'combine',
  'roast', 'grill', 'toss', 'drain', 'blend', 'marinate', 'melt', 'pour', 'fold', 'knead', 'sear',
  'sprinkle', 'garnish', 'transfer', 'cover', 'refrigerate', 'chill', 'spread', 'layer', 'assemble']
const 조리머리 = ['instructions?', 'directions?', 'method', 'steps?', 'how to make', 'bring to a boil']
const 만드는말 = new RegExp(
  `\\b(?:(?:${조리동사.join('|')})(?:e?[ds]|ing|ped|ping|red|ring)?|${조리머리.join('|')})\\b|[1-9]️⃣|[①-⑨]`, 'i')

// 레시피에만 나오는 어림말. 장보기 목록이나 메뉴판은 이렇게 안 쓴다.
// ⚠️ **영어 레시피는 `to taste` 를 거의 반드시 쓴다** — `salt and pepper to taste` 가
// 표본 대부분에 있었다. 한국의 「약간」, 일본의 「少々」에 해당한다
const 어림말 = /\b(to taste|a pinch|pinch of|a dash|dash of|a splash|splash of|handful|as needed|optional|drizzle|to garnish|for serving|if desired)\b/i

// 재료 문단이 끝나고 만드는 법이 시작되는 자리. 링크는 이 앞에 넣는다
const 만드는법머리 = /^\s*(?:[👩🧑🍳👨]|#{0,3}\s*(?:instructions?|directions?|method|steps?|how to make|to make)\b)/iu

// 원글이 정식 이름 대신 부르는 별명. 여기 걸리면 정체를 알아야 쓴다.
//
// 실측 (2026-08-26) — **감추는 쓰임이 실재한다.** 다만 흔하지는 않다.
//   · 영어 요리 검색어 23개 · 표본 262편 중 요리 글 127편에서 `secret ingredient` 는 **0건**.
//     걸린 것은 「Recipe in comments below!」 「my mom's secret sauce」 셋뿐이었다
//   · 낱말로 직접 찾으면 22편이 나오고 그중 감추는 쓰임이 또렷했다 —
//     「There's no way I will ever divulge my secret ingredient」
//     「I'm exceptionally sharing my recipe with you, keeping my secret ingredient of course」
//     「* 5–6 tbsp secret ingredient」 ← **재료 줄에 정체 없이 들어간다. 한국어 「킥소스」와 같은 꼴이다**
//   · 밝히는 쓰임도 섞인다 (「the secret ingredient really is love」). 그건 잡담이라 재료 줄에 안 온다
// 그래서 낱말은 그대로 둔다. 일본어와 갈린 자리다 — 일본어는 밝히는 쓰임이 압도적이라 걷어냈다
export const 별명꼴 = /\b(secret (?:ingredient|sauce|weapon|seasoning)|magic ingredient|my secret|that one ingredient)\b|㊙️|🤫/i

// 깨진 분량을 잡는 그물. 단위 목록에 기대지 않는 것이 핵심이다 — 깨진 글자는 목록에 없다.
// 한국어 팩의 `숫자+한글` 과 같은 자리다
// ⚠️ 시간·온도·인분은 LLM 이 말을 바꿔도 지어낸 것이 아니다 —
// 원문 `10 mins` 를 `10 minutes` 로 풀어 쓰는 일이 흔하다. 이걸 깨진 것으로 치면
// 헛경보가 매번 나고, 헛경보가 잦으면 진짜 경고도 아무도 안 읽는다

// 조리 계량이 촘촘하면 재료 목록만 적은 글이라도 레시피로 본다 (드레싱·양념 꼴)
const 촘촘단위꼴 = /^(tbsps?|tablespoons?|tsps?|teaspoons?|cups?|ml|servings?|serves)$/i

const 지시문 = ['You write cooking posts on Threads. Using the source post below as reference, write something completely new.']

const 출력지시 = [
  'The 핵심재료 is the one ingredient that makes this dish what it is. Pick the one named in the',
  'dish title, or the one whose absence would make it a different dish.',
  'Example: "French toast" -> bread (not eggs, milk, or sugar)',
  'Do not pick supporting players — salt, sugar, soy sauce, oil, water, garlic, pepper.',
  'Every kitchen already has those, so nobody goes shopping for them.',
  'Write it as a short product name you could search for (e.g. "brioche bread", "oyster sauce").',
  'If nothing fits, leave it as an empty string.',
  // ↓ 한국어 팩에만 있던 대목을 옮겼다 (2026-08-26). 위 일본어 팩과 같은 자리다
  'The 비밀재료 is an ingredient the source post calls by a **nickname** instead of its real name',
  '(e.g. "my secret ingredient", "the secret sauce").',
  'If there is a nickname, copy it into 별명 exactly. If there is none, leave both fields empty.',
  'Put the real name into 실제 — but only if the source post says it somewhere.',
  '**If the source never names it, leave 실제 empty. Never guess.**',
  '**Drop a nickname ingredient you cannot identify from the ingredient list entirely.** It is usually',
  'the author\'s ad hidden behind a link, and the ingredients are already complete without it.',
  'If you do know what it is, write it into the ingredients under its real name.',
  'If you know what the 비밀재료 is, make it the 핵심재료. If not, pick from the remaining ingredients.',
  'The 한줄소개 is one short line recommending that 핵심재료 to a friend. It sits right above the link.',
  'Give one reason to use it. Write it in your own voice.',
  'Do not write product names, prices, or brands. If there is no 핵심재료, leave it as an empty string.',
]

const 부가글지시 = [
  '[Ingredients] Write the amount for every ingredient. Copy the amounts exactly as the source wrote them.',
  'If the source gives no amount for an ingredient, write the name alone. Do not make one up.',
  '[Units] tbsp is 15ml and tsp is 5ml — three times apart. Never change whichever the source used.',
  '[Paragraphs] Put a blank line between the ingredients and the steps. They are posted separately.',
]

const 규칙 = ['- Do not invent. Never add an ingredient or amount that is not in the source; if unsure, leave it out.']

// 검색어. 홈 스크롤이 1차라 자동 발행에는 안 쓰이고, 말투 추천과 손으로 돌릴 때 쓴다.
// ⚠️ 길이는 **24와 어긋나게** 잡는다 (한국어·일본어와 같은 23) —
// 20이면 0시와 20시가 같은 자리를 집는다. test.mjs 가 지킨다.
// ⚠️ 넓게 둔다. 한 단어를 하루 몇 번만 두드려도 스레드가 그 단어를 조인다 —
// 표본을 걷을 때 `recipe` 한 단어가 이미 조여 있어 20개 대신 1개만 왔다 (실측 2026-08-24)
const 검색어 = [
  'easy dinner recipe', 'weeknight dinner', 'meal prep recipe', 'high protein recipe',
  'air fryer recipe', 'chicken recipe', 'pasta recipe', 'one pan dinner',
  'quick lunch idea', '30 minute meal', 'budget dinner', 'ground beef recipe',
  'salmon recipe', 'crockpot recipe', 'sheet pan dinner', 'easy breakfast',
  'healthy dinner idea', 'rice bowl recipe', 'soup recipe', 'salad recipe',
  'pasta salad', 'taco recipe', 'stir fry recipe',
]

// 새 영어 요리 계정을 만들 때 깔아 주는 말투 뼈대.
// ⚠️ 도입 유형에 라벨과 괄호 설명을 붙이지 마라 — 그 문장이 본문에 그대로 실려 나간다 (한국어에서 겪었다)
const 말투서식 = {
  _설명: 'Voice for an English cooking account. The "레시피 …" fields refer to the recipe posted below the main post.',
  '도입 유형': [
    'open by saying this is the one dish you are actually confident about',
    'open by saying you are finally sharing a recipe you had been keeping to yourself',
    'open by asking what a restaurant would charge for this',
    'open by telling someone to go make this tonight',
    'open with the memory this dish is tied to',
    'open with who ate it and how they reacted',
  ],
  '글 구조': [
    'one opening line — start it the way [도입] tells you to',
    'two or three lines on what it actually tastes like',
    'one line on when you make it or who ate it',
    'a last line telling people the recipe is below',
  ],
  '지켜야 할 것': [
    'use only the opening named in [도입]. Do not mix in another way of opening',
    'copy only the ingredients and amounts that are in the source post',
    'write in English. Do not mix in Korean or Japanese',
  ],
  '쓰지 말 것': ['mentioning the original author or where it came from', 'stating prices as fact — they change'],
  '본문 길이': '4 to 5 lines, including the closing line that points to the recipe',
  '본문 이모지': 'one at the end. Pick one that fits the dish.',
  '레시피 길이': '25 lines or fewer, ingredients and steps together',
  '레시피 규칙': 'Ingredients, amounts, and the cooking method that matters stay as the source wrote them. Do not change or add anything — only tidy it up so it reads well. Leave blank whatever the source does not say.',
  '레시피 형식': 'First line is "emoji **Dish Name**". Then "🛒 Ingredients" with one ingredient per line. Then "🍳 Instructions" with steps numbered 1️⃣2️⃣3️⃣.',
}

const 마법사안내 = {
  정체성: {
    귀띔: 'It reads better if you sound like someone who actually cooks and eats this, not a professional chef.',
    예: '30s, full time job, cooking dinner after work on weeknights',
  },
  말투: {
    귀띔: 'Say how your sentences end — casual and clipped, or warm and full.',
    예: 'Casual, like talking to a friend. Short lines, few periods, lots of line breaks',
  },
  표현: { 귀띔: 'Short phrases you say out of habit, separated by commas.', 예: 'honestly, obsessed, so good' },
  예시: {
    귀띔: 'Paste a cooking post that did well, exactly as you wrote it. This tells the voice better than anything else.',
    예: 'made this last night and my husband asked for it again today\nit is embarrassing how easy it is',
  },
}

export default {
  글이름: 'recipe',
  검색어,
  마법사안내,
  말투서식,
  먹는말,
  만드는말,
  어림말,
  촘촘단위꼴,
  만드는법머리,
  별명꼴,
  지울꼴,
  // 영어도 어림말(`to taste`)에 많이 기대서 숫자 분량은 둘이면 된다
  숫자최소: 2,
  // ⚠️ **영어권은 레시피가 본문에 있다. 한국·일본과 반대다.**
  // 표본 119편에서 레시피꼴이 글타래에 8편, **본문에 20편**이었다 (실측 2026-08-24).
  // 글타래만 보면 진짜 레시피가 통째로 전멸한다
  본문도본다: true,
  지시문,
  출력지시,
  부가글지시,
  형식라벨: '형식',
  규칙,
}
