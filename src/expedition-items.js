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
  baker: {
    name: '程记炉饼',
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
