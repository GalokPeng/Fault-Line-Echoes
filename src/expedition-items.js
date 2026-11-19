import { harvestItems, harvestPrices, workshopRecipes } from './expedition-harvest.js'
export { bossLoot, harvestBySpecies, workshopRecipes } from './expedition-harvest.js'

export const slots = { weapon: '武器', head: '头部', body: '身体', legs: '腿部', feet: '足部' }

// Volume is packed litres, mass is kg, water portions hold half a litre.
const good = (name, volume, mass, extra = {}) => ({ name, volume, mass, ...extra })
export const items = {
  bun: good('炉蒸包子', 0.35, 0.19, { food: 25 }),
  meat: good('烤兽肉', 0.55, 0.32, { food: 44 }),
  rawMeat: good('生兽肉', 0.55, 0.34, {
    food: 18,
    risk: 0.8,
    dish: 'meat',
    source: '市集肉铺',
    purpose: '肉铺或炉灶可以烤成熟肉。',
  }),
  dates: good('风干枣', 0.25, 0.13, { food: 16 }),
  fruit: good('林浆果', 0.32, 0.21, { food: 9, water: 6 }),
  water: good('清水', 0.5, 0.5, { water: 22 }),
  stomachTonic: good('草露药剂', 0.18, 0.16, {
    relief: 4,
    source: '白砥城 · 回春药铺',
    purpose: '服用一瓶，腹部不适的剩余时间缩短 4 个游戏小时。',
  }),
  riverWater: good('溪河生水', 0.5, 0.5, { water: 22, risk: 0.32 }),
  dirtyWater: good('受污染的积水', 0.5, 0.5, { water: 17, risk: 1 }),
  torch: good('松脂火把', 0.95, 0.46),
  resin: good('松脂', 0.29, 0.23),
  hides: good('晒干的兽皮', 1.3, 0.64),
  ore: good('红铁矿', 0.75, 1.9),
  cloth: good('细麻布', 0.6, 0.23),
  fieldPack: good('折叠驮袋', 2, 0.75),
  staff: good('行脚杖', 2.05, 1.4, { slot: 'weapon', attack: 4 }),
  saltKnife: good('盐刃短刀', 1.65, 0.92, { slot: 'weapon', attack: 6 }),
  reedHat: good('箬叶斗笠', 1.15, 0.25, { slot: 'head', armor: 3 }),
  linenCoat: good('麻布护衣', 2.2, 0.86, { slot: 'body', armor: 7 }),
  workLegs: good('巡工护腿', 1.5, 0.73, { slot: 'legs', armor: 5 }),
  boots: good('护底靴', 1.55, 0.79, { slot: 'feet', armor: 4, speed: 0.04 }),
  softBoots: good('软底护套', 0.92, 0.32, { slot: 'feet', armor: 2, speed: 0.06 }),
  harness: good('轻型攀爬背带', 1.7, 0.59, { slot: 'body', armor: 3, stamina: 0.12 }),
  rainFang: good('鸣瀑牙杖', 2.25, 1.67, { slot: 'weapon', attack: 12, boss: 'rain' }),
  saltCrown: good('盐母甲盔', 1.85, 1.45, { slot: 'head', armor: 14, boss: 'salt' }),
  rootMantle: good('古根护身衣', 3.6, 2.75, { slot: 'body', armor: 22, boss: 'root' }),
  gorgeGreaves: good('崖鸣胫甲', 2.45, 2.16, { slot: 'legs', armor: 15, boss: 'gorge' }),
  ...harvestItems,
}
const originNotes = {
  bun: ['程记包子铺、驿站', '行路干粮，可以分给广场的乞儿。'],
  meat: ['梁家肉铺、客栈', '已经烤熟，食用可补充饱食。'],
  dates: ['白盐城驼队、四境行栈', '体积小的干粮，适合留在路上。'],
  fruit: ['古根绳匠铺', '酸甜的林果，可以补充饱食和水分。'],
  water: ['井泉、客栈或煮水', '每份半升，可以直接饮用。'],
  riverWater: ['野外溪河', '可在炉边煮成清水，生饮有引发不适的风险。'],
  dirtyWater: ['盐洼或滞水河段', '含有沉积物，建议在游戏内靠近火源煮成清水。'],
  torch: ['行栈、林区绳匠铺', '点亮后随身照明，松脂燃尽后熄灭。'],
  resin: ['古根绳匠铺、四境行栈', '可在汇流镇或四境行栈换取火把。'],
  hides: ['商队流通的熟皮', '白盐城和青雨林的商人会收购。'],
  ore: ['山地商队', '可卖给铁匠，或在鸣铁铸坊换取短刀。'],
  cloth: ['白砥城 · 练家衣坊', '可用于缝制驮袋，也可在衣坊换护衣。'],
  fieldPack: ['衣坊、行栈与四境工坊', '把驮袋系在背包上，携行容量永久提升至 28 L。'],
  staff: ['古根绳匠铺', '轻便的行脚杖，握在手中可增强近身攻击。'],
  saltKnife: ['白盐城、鸣铁铸坊', '适合近身战斗的单手短刃。'],
  reedHat: ['汇流镇、练家衣坊', '头部护具，轻薄的箬叶和藤圈易于携带。'],
  linenCoat: ['衣坊和峡谷铁匠行', '用夹层布保护躯干。'],
  workLegs: ['鸣铁铸坊、峡谷工坊', '护住腿部，装上后提供减伤。'],
  boots: ['巡线任务、衣坊或雨林工坊', '稳固的靴底保护脚部，穿戴后提升步速。'],
  softBoots: ['巡线任务、衣坊或白盐工坊', '柔软的鞋套减轻足部负担。'],
  harness: ['巡线任务、衣坊或古根工坊', '身上穿戴的轻型背带可增强耐力恢复。'],
  rainFang: ['鸣皇长牙与背鳍条 · 铁匠制作', '专属武器，以鳍条绑固牙尖。'],
  saltCrown: ['盐母头胸甲与螯壳 · 铁匠制作', '头部护具，两侧螯片可保护面颊。'],
  rootMantle: ['守望者肩皮与冠角 · 衣坊制作', '躯干护具，由厚皮和角扣缝合。'],
  gorgeGreaves: ['赤翎胫鳞与覆羽 · 铁匠制作', '腿部护具，覆羽衬在鳞片和绑带之间。'],
}
for (const [id, [source, purpose]] of Object.entries(originNotes))
  Object.assign(items[id], { source, purpose })
export const storyLoot = {
  护底靴: 'boots',
  软底护套: 'softBoots',
  轻型攀爬背带: 'harness',
  高线巡工服: 'workLegs',
}
export const sources = {
  well: { name: '城中水井', item: 'water' },
  river: { name: '野外溪河', item: 'riverWater' },
  tainted: { name: '积水洼', item: 'dirtyWater' },
}

// Unit prices are in local trade seals. Exchanges offer an alternative to cash.
export const markets = {
  rain: {
    name: '汇流镇渡市',
    craft: '渡工收松脂封船，水驿供应熟食和灯火。',
    stock: { bun: 2, water: 1, meat: 6, torch: 3, reedHat: 7, boots: 13, fieldPack: 19 },
    buys: { hides: 5, resin: 3, rawMeat: 2 },
    barter: { take: 'resin', qty: 1, give: 'torch', count: 1 },
    clue: '听瀑石庭背水的一侧，巨兽留下了爪痕。',
  },
  salt: {
    name: '白盐城驼队',
    craft: '驼队带来干粮和皮货，盐工用红铁打磨短刃。',
    stock: { dates: 1, water: 1, bun: 3, saltKnife: 15, workLegs: 12, fieldPack: 15 },
    buys: { hides: 7, ore: 4, resin: 2 },
    barter: { take: 'hides', qty: 1, give: 'dates', count: 4 },
    clue: '望潮天门前的盐面上，有大螯拖过的两道沟痕。',
  },
  root: {
    name: '古根绳匠铺',
    craft: '采药人晒浆果，绳匠把树皮搓成背带。',
    stock: { fruit: 1, bun: 2, torch: 2, resin: 2, harness: 13, staff: 9, fieldPack: 17 },
    buys: { ore: 6, hides: 5, rawMeat: 3 },
    barter: { take: 'ore', qty: 1, give: 'torch', count: 2 },
    clue: '进古根林后抬头看，断枝比脚印更早暴露兽群的去向。',
  },
  gorge: {
    name: '断潮城铁匠行',
    craft: '崖道磨鞋，赤铁坊备着护具和矿工的肉干。',
    stock: { water: 2, meat: 4, torch: 3, boots: 10, linenCoat: 11, workLegs: 8, fieldPack: 18 },
    buys: { ore: 7, resin: 4, hides: 4 },
    barter: { take: 'ore', qty: 1, give: 'meat', count: 1 },
    clue: '崖风停时会听见谷底石响，去断潮台边可以循声辨位。',
  },
}

const capitalClue = '向西出雨渡门通青雨林，向东过盐商门进白盐旱漠；古木门在北，赤崖门在南。'
export const capitalTrades = {
  pharmacy: {
    name: '回春药铺',
    craft: '谢兰心将草露封进便携的小药瓶，供饮过坏水的行旅使用。',
    stock: { stomachTonic: 3 },
    buys: {},
    barter: null,
  },
  baker: {
    name: '程记包子铺',
    craft: '程麦的炉屉一早就热，只出蒸包子。',
    stock: { bun: 2 },
    buys: {},
    barter: null,
  },
  butcher: {
    name: '梁家肉铺',
    craft: '梁刀生收鲜肉，灶边卖烤肉。',
    stock: { rawMeat: 3, meat: 5 },
    buys: { rawMeat: 2 },
    barter: { take: 'rawMeat', qty: 2, give: 'meat', count: 1 },
  },
  merchant: {
    name: '四境行栈',
    craft: '云葵收各地材料，售行囊与出城用的火把。',
    stock: { dates: 2, torch: 3, resin: 3, cloth: 4, fieldPack: 16 },
    buys: { ore: 4, rawMeat: 2, resin: 2, hides: 5, cloth: 2 },
    barter: { take: 'resin', qty: 1, give: 'torch', count: 1 },
  },
  smith: {
    name: '鸣铁铸坊',
    craft: '孟砧收红铁，桌上陈着新打的刃具和护腿。',
    stock: { saltKnife: 13, workLegs: 9 },
    buys: { ore: 6 },
    barter: { take: 'ore', qty: 3, give: 'saltKnife', count: 1 },
  },
  outfitter: {
    name: '练家衣坊',
    craft: '练红裁衣缝靴，也替商队修补皮具。',
    stock: { cloth: 3, linenCoat: 10, boots: 10, softBoots: 8, reedHat: 6 },
    buys: { cloth: 2, hides: 5 },
    barter: { take: 'cloth', qty: 3, give: 'linenCoat', count: 1 },
  },
  inn: {
    name: '长灯客栈',
    craft: '客栈掌柜管饭备水，炉灶旁可以处理干粮。',
    stock: { bun: 3, meat: 6, water: 1, torch: 3 },
    buys: { rawMeat: 2 },
    barter: { take: 'rawMeat', qty: 2, give: 'meat', count: 1 },
  },
}
for (const [id, price] of Object.entries(harvestPrices)) {
  const item = harvestItems[id]
  markets[item.zone].buys[id] = price
  capitalTrades[item.buyer].buys[id] = price + 1
}
export const buyerNames = { butcher: '肉铺', smith: '铁匠', outfitter: '衣坊' }
export function recipesFor(ctx) {
  if (!ctx.merchant) return []
  return Object.entries(workshopRecipes).filter(([, recipe]) =>
    ctx.zone === 'capital'
      ? recipe.service === ctx.service
      : recipe.zone === ctx.zone && !!marketFor(ctx),
  )
}
export function marketFor(ctx) {
  return ctx.zone === 'capital'
    ? Object.hasOwn(capitalTrades, ctx.service)
      ? capitalTrades[ctx.service]
      : null
    : Object.hasOwn(markets, ctx.zone)
      ? markets[ctx.zone]
      : null
}
const assistance = {
  resident: {
    title: '邻里饭桌',
    goods: { bun: 2, water: 1 },
    detail: '居民每天留两只包子和半升清水给行路人。',
  },
  baker: {
    title: '程麦的蒸屉',
    goods: { bun: 2 },
    detail: '每天开炉会留两只包子，空手来的人也可以领。',
  },
  butcher: { title: '屠户的饭盒', goods: { meat: 1 }, detail: '梁刀生每天会分出一份熟肉。' },
  inn: { title: '客栈茶水', goods: { water: 1 }, detail: '每天可向掌柜讨半升清水。' },
  beggar: {
    title: '行脚人的饭碗',
    goods: { bun: 1 },
    detail: '他愿意分你一只包子。若有富余，可请他吃一顿，聊聊野外的路。',
  },
}
export function aidFor(ctx) {
  const role = ctx.zone === 'capital' && ctx.service ? ctx.service : ctx.kindness
  if (!Object.hasOwn(assistance, role)) return null
  return {
    key: role,
    ...assistance[role],
    clue: ctx.zone === 'capital' ? capitalClue : markets[ctx.zone]?.clue,
  }
}
