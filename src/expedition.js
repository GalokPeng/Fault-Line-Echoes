import { items, slots, sources, storyLoot, marketFor, aidFor, recipesFor } from './expedition-items.js'
export {
  items,
  slots,
  sources,
  markets,
  bossLoot,
  harvestBySpecies,
  workshopRecipes,
  buyerNames,
  capitalTrades,
  marketFor,
  recipesFor,
  aidFor,
} from './expedition-items.js'

const cap = (n, low, high) => Math.min(high, Math.max(low, n))
const num = (n, fallback, high = Infinity) => (Number.isFinite(n) ? cap(n, 0, high) : fallback)
const itemOf = (id) => (Object.hasOwn(items, id) ? items[id] : null)
const answer = (ok, message, extra = {}) => ({ ok, message, ...extra })
const yes = (message, extra) => answer(true, message, extra)
const no = (message) => answer(false, message)
export const TORCH_HOURS = 4
export const BASE_CAPACITY = 15
export const LARGE_CAPACITY = 28
const daily = { food: 100, water: 88 }
const rates = {
  rest: [0.72, 0.74],
  idle: [1, 1],
  walk: [1.32, 1.32],
  sprint: [2.3, 2.1],
  climb: [2.55, 2.24],
  swim: [1.95, 1.68],
}

export function migrateExpedition(save) {
  const old = save.expedition || {}
  const bag = {}
  for (const [id, qty] of Object.entries(old.items || {}))
    if (itemOf(id) && Number.isSafeInteger(qty) && qty > 0) bag[id] = qty
  const worn = {}
  for (const slot of Object.keys(slots)) {
    const id = old.equipped?.[slot]
    worn[slot] = itemOf(id)?.slot === slot ? id : null
  }
  const pack = {
    version: 1,
    items: bag,
    equipped: worn,
    upgraded: old.upgraded === true,
    food: num(old.food, 100, 100),
    water: num(old.water, 100, 100),
    sickness: num(old.sickness, 0, 12),
    torchHours: num(old.torchHours, 0, TORCH_HOURS),
    torchLit: old.torchLit === true && old.torchHours > 0,
    currency: Math.floor(num(old.currency, 0)),
    elapsed: num(old.elapsed, num(save.hour, 0, 24)),
    damageRemainder: num(old.damageRemainder, 0, 1),
    rng: num(old.rng, 347065819, 4294967295) >>> 0 || 347065819,
    aid: {},
    claimed: [],
    pending: {},
  }
  for (const [key, day] of Object.entries(old.aid || {}))
    if (/^(resident|beggar|baker|butcher|inn|gift)$/.test(key) && Number.isSafeInteger(day) && day >= 0)
      pack.aid[key] = day
  if (Array.isArray(old.claimed)) pack.claimed = old.claimed.filter((id) => Object.hasOwn(storyLoot, id))
  for (const [id, qty] of Object.entries(old.pending || {}))
    if (itemOf(id) && Number.isSafeInteger(qty) && qty > 0) pack.pending[id] = qty
  // The old journal is the ownership record. Remember each conversion even after the item is sold.
  if (Array.isArray(save.items)) {
    for (const title of save.items) {
      if (!Object.hasOwn(storyLoot, title) || pack.claimed.includes(title)) continue
      const id = storyLoot[title]
      if (!addItem(pack, id).ok) pack.pending[id] = (pack.pending[id] || 0) + 1
      pack.claimed.push(title)
    }
  }
  if (old === save.expedition && typeof old === 'object' && !Array.isArray(old)) {
    Object.assign(old, pack)
    return old
  }
  save.expedition = pack
  return pack
}

function load(pack, bag = pack.items) {
  let volume = 0,
    weight = 0
  for (const [id, n] of Object.entries(bag)) {
    const item = items[id]
    volume += item.volume * n
    weight += item.mass * n
  }
  for (const id of Object.values(pack.equipped)) if (id) weight += items[id].mass
  if (pack.torchHours > 0) weight += items.torch.mass
  if (pack.upgraded) weight += items.fieldPack.mass
  return { volume, weight, capacity: pack.upgraded ? LARGE_CAPACITY : BASE_CAPACITY }
}
export function expeditionStats(pack) {
  const { volume, weight, capacity } = load(pack)
  let attack = 0,
    armor = 0,
    gait = 1,
    endurance = 1
  for (const id of Object.values(pack.equipped)) {
    if (!id) continue
    const item = items[id]
    attack += item.attack || 0
    armor += item.armor || 0
    gait += item.speed || 0
    endurance += item.stamina || 0
  }
  const burden = cap((weight - 8) / 28, 0, 1)
  const lean =
    (pack.food < 22 ? 0.12 : 0) + (pack.water < 22 ? 0.19 : 0) + (pack.sickness > 0 ? 0.12 : 0)
  armor = Math.min(65, armor)
  return {
    volume,
    weight,
    capacity,
    attack,
    attackBonus: attack,
    armor,
    defense: armor / 100,
    speed: cap(gait - burden * 0.27 - lean, 0.44, 1.2),
    stamina: cap(endurance - burden * 0.36 - lean, 0.38, 1.25),
    torchLit: pack.torchLit,
    torchHours: pack.torchHours,
    food: pack.food,
    water: pack.water,
    sickness: pack.sickness,
    currency: pack.currency,
    day: Math.floor(pack.elapsed / 24) + 1,
  }
}

function adjust(pack, changes) {
  const next = { ...pack.items }
  for (const [id, amount] of Object.entries(changes)) {
    if (!itemOf(id) || !Number.isSafeInteger(amount)) return no('无法辨认这件物品。')
    const qty = (next[id] || 0) + amount
    if (qty < 0) return no(items[id].name + '数量不足。')
    if (qty === 0) delete next[id]
    else next[id] = qty
  }
  const { volume, capacity } = load(pack, next)
  if (volume > capacity + 1e-8)
    return no('行囊装不下，需要腾出 ' + (Math.ceil((volume - capacity) * 10) / 10).toFixed(1) + ' L。')
  pack.items = next
  return yes('')
}
export function addItem(pack, id, qty = 1) {
  if (!Number.isSafeInteger(qty) || qty < 1 || !itemOf(id)) return no('无法拾取这件物品。')
  const result = adjust(pack, { [id]: qty })
  return result.ok ? yes('已收入行囊：' + items[id].name + ' × ' + qty, { id, qty }) : result
}

function drinkOrEat(pack, id) {
  const item = items[id]
  if (!item.food && !item.water) return no('这件物品无法食用。')
  if ((!item.food || pack.food >= 100) && (!item.water || pack.water >= 100))
    return no('当前已补足，可以留在路上用。')
  pack.food = Math.min(100, pack.food + (item.food || 0))
  pack.water = Math.min(100, pack.water + (item.water || 0))
  if (item.risk) {
    pack.rng = (Math.imul(pack.rng, 1664525) + 1013904223) >>> 0
    if (pack.rng / 4294967296 < item.risk) {
      pack.sickness = Math.max(pack.sickness, 6)
      return yes('用了' + item.name + '，腹部不适。接下来六个游戏小时更容易口渴。')
    }
  }
  return yes('已' + (item.food ? '吃下' : '喝下') + item.name + '。')
}

function social(pack, act, ctx) {
  const day = Math.floor(pack.elapsed / 24),
    aid = aidFor(ctx)
  if (!aid) return no('此人未提供施予。')
  const person = aid.key
  if (act === 'offerAid') {
    if (person !== 'beggar') return no('请把干粮交给需要的行脚人。')
    if (pack.aid.gift === day) return no('今天已经一起吃过了。')
    const paid = adjust(pack, { bun: -1 })
    if (!paid.ok) return paid
    pack.aid.gift = day
    return yes('行脚人接过包子，告诉你：' + (aid.clue || '沿着大路可以回到城里。'))
  }
  if (pack.aid[person] === day) return no('今天的份已经领过，明天再来。')
  const received = adjust(pack, aid.goods)
  if (!received.ok) return received
  pack.aid[person] = day
  return yes(
    '收下了' +
      Object.entries(aid.goods)
        .map(([id, n]) => items[id].name + ' × ' + n)
        .join('、') +
      '。',
  )
}

function trade(pack, act, id, ctx) {
  const shop = marketFor(ctx)
  if (!ctx.merchant || !shop) return no('要在城中商人跟前交易。')
  if (act === 'craft') {
    const recipe = recipesFor(ctx).find(([product]) => product === id)?.[1]
    if (!recipe) return no('这位师傅没有这件装备的配方。')
    const cost = { [id]: 1 }
    for (const [ingredient, count] of Object.entries(recipe.materials)) cost[ingredient] = -count
    const result = adjust(pack, cost)
    return result.ok
      ? yes(
          shop.name +
            '已制成' +
            items[id].name +
            (id === 'fieldPack' ? '，在行囊中使用可扩容。' : '，可在行囊中装备。'),
        )
      : result
  }
  if (act === 'barter') {
    if (!shop.barter) return no('这里按行券交易。')
    const { take, qty, give, count } = shop.barter
    const swap = adjust(pack, { [take]: -qty, [give]: count })
    return swap.ok ? yes('换得' + items[give].name + ' × ' + count + '。') : swap
  }
  if (!itemOf(id)) return no('该物品不在货单上。')
  const buy = act === 'buy'
  const price = (buy ? shop.stock : shop.buys)[id]
  if (!price) return no('本地商人没有开出这笔交易。')
  if (buy && pack.currency < price) return no('行券不足，可向商人出售当地收购的材料。')
  const swap = adjust(pack, { [id]: buy ? 1 : -1 })
  if (!swap.ok) return swap
  pack.currency += buy ? -price : price
  return yes(
    (buy ? '购入' : '售出') + items[id].name + '，' + (buy ? '花费' : '得到') + price + ' 行券。',
  )
}

export function operate(pack, act, id, ctx = {}) {
  if (['buy', 'sell', 'barter', 'craft'].includes(act)) return trade(pack, act, id, ctx)
  if (act === 'receiveAid' || act === 'offerAid') return social(pack, act, ctx)
  if (act === 'fill' || act === 'sourceDrink') {
    const source = sources[ctx.waterSource]
    if (!source) return no('请靠近水井、溪流或水洼。')
    return act === 'fill' ? addItem(pack, source.item) : drinkOrEat(pack, source.item)
  }
  if (act === 'light' || act === 'torch' || act === 'extinguish') {
    if (pack.torchLit || act === 'extinguish') {
      pack.torchLit = false
      return yes('火把已熄灭，余下的松脂可留待下次。')
    }
    if (pack.torchHours <= 0) {
      const take = adjust(pack, { torch: -1 })
      if (!take.ok) return no('需要一支松脂火把。')
      pack.torchHours = TORCH_HOURS
    }
    pack.torchLit = true
    return yes('火把已点亮。')
  }
  if (act === 'claim') {
    if (!itemOf(id) || !pack.pending[id]) return no('没有待领的装备。')
    const result = addItem(pack, id)
    if (result.ok && --pack.pending[id] === 0) delete pack.pending[id]
    return result
  }
  if (act === 'unequip') {
    if (!Object.hasOwn(slots, id) || !pack.equipped[id]) return no('这个部位没有穿戴装备。')
    const gear = pack.equipped[id]
    const returned = addItem(pack, gear)
    if (!returned.ok) return returned
    pack.equipped[id] = null
    return yes('已卸下' + items[gear].name + '。')
  }
  const item = itemOf(id)
  if (!item || !pack.items[id]) return no('行囊里没有这件物品。')
  if (act === 'drop') {
    const out = adjust(pack, { [id]: -1 })
    if (out.ok) ctx.onDrop?.(id, 1)
    return out.ok ? yes('已放下' + item.name + '。', { dropped: { id, qty: 1 } }) : out
  }
  if (act === 'upgrade' && id === 'fieldPack') {
    if (pack.upgraded) return no('行囊已经扩容。')
    adjust(pack, { fieldPack: -1 })
    pack.upgraded = true
    return yes('驮袋已系好，行囊容量增至 ' + LARGE_CAPACITY + ' L。')
  }
  if (act === 'equip' && item.slot) {
    const prev = pack.equipped[item.slot]
    if (prev === id) return no('当前已经穿戴同款装备。')
    const moved = adjust(pack, { [id]: -1, ...(prev ? { [prev]: 1 } : {}) })
    if (!moved.ok) return moved
    pack.equipped[item.slot] = id
    return yes('已装备' + item.name + '。')
  }
  if (act === 'use' || act === 'eat' || act === 'drink') {
    const used = drinkOrEat(pack, id)
    if (used.ok) adjust(pack, { [id]: -1 })
    return used
  }
  if (act === 'boil' || act === 'cook') {
    const boil = act === 'boil'
    const butcher = ctx.zone === 'capital' && ctx.service === 'butcher' && ctx.merchant
    if (!ctx.fire && (boil || !butcher))
      return no(boil ? '需要靠近炉灶或营火。' : '可在肉铺、炉灶或营火加工。')
    if (boil ? !['dirtyWater', 'riverWater'].includes(id) : !item.dish) return no('这份材料用不上。')
    const cooked = boil ? 'water' : item.dish
    const result = adjust(pack, { [id]: -1, [cooked]: 1 })
    return result.ok ? yes(boil ? '煮好了一份清水。' : '烤好了' + items[cooked].name + '。') : result
  }
  return no('当前不能这样使用。')
}

export function advanceExpedition(pack, hours, ctx = {}) {
  hours = num(hours, 0)
  const jumps = num(ctx.jumps, 0)
  const [effort, sweat] = rates[ctx.activity] || rates.idle
  const hot = ctx.hot ? 1.37 : 1
  const sickHours = Math.min(hours, pack.sickness)
  // Integrate the exact part of a long trip or rest spent with an empty reserve.
  const emptyHours = (reserve, rate, span) => Math.max(0, span - reserve / rate)
  const fRate = (daily.food / 24) * effort
  const wRate = (daily.water / 24) * sweat * hot
  const food0 = Math.max(0, pack.food - jumps * 0.13)
  const water0 = Math.max(0, pack.water - jumps * 0.09 * hot)
  const regularStart = Math.max(0, water0 - wRate * 1.45 * sickHours)
  const hungry = emptyHours(food0, fRate, hours)
  const thirsty =
    emptyHours(water0, wRate * 1.45, sickHours) + emptyHours(regularStart, wRate, hours - sickHours)
  pack.food = Math.max(0, food0 - fRate * hours)
  pack.water = Math.max(0, regularStart - wRate * (hours - sickHours))
  pack.sickness = Math.max(0, pack.sickness - hours)
  pack.elapsed += hours
  let burnedOut = false
  if (pack.torchLit) {
    pack.torchHours = Math.max(0, pack.torchHours - hours)
    if (pack.torchHours < 1e-8) {
      pack.torchHours = 0
      pack.torchLit = false
      burnedOut = true
    }
  }
  const debt = pack.damageRemainder + hungry * 2 + thirsty * 6
  const damage = Math.floor(debt + 1e-9)
  pack.damageRemainder = Math.max(0, debt - damage)
  return { damage, burnedOut }
}
