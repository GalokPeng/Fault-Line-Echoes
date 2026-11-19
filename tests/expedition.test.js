import test from 'node:test'
import assert from 'node:assert/strict'
import {
  migrateExpedition,
  addItem,
  operate,
  expeditionStats,
  advanceExpedition,
  bossLoot,
  harvestBySpecies,
  workshopRecipes,
  items,
  slots,
  markets,
  marketFor,
  capitalTrades,
  BASE_CAPACITY,
  LARGE_CAPACITY,
  TORCH_HOURS,
} from '../src/expedition.js'
import { nightBossLoot } from '../src/expedition-harvest.js'
import { wildlife } from '../src/perception-species.js'
import { iconIds, iconSvg, itemIcon } from '../src/expedition-icons.js'

const fresh = () => migrateExpedition({ items: [] })

test('each inventory item has an independently drawn, embedded icon, source and use', () => {
  const inventory = Object.keys(items)
  assert.deepEqual(iconIds.toSorted(), inventory.toSorted())
  assert.equal(new Set(iconIds.map(iconSvg)).size, inventory.length)
  for (const id of inventory) {
    assert.match(iconSvg(id), /<path /, id)
    assert.match(itemIcon(id), /^data:image\/svg\+xml/, id)
    assert.ok(items[id].source && items[id].purpose, id)
  }
  for (const slot of Object.keys(slots)) assert.ok(iconSvg(slot), slot)
})

test('capital apothecary sells a portable medicine that reduces actual pollution sickness', () => {
  const p = fresh(),
    pharmacy = { zone: 'capital', service: 'pharmacy', merchant: true }
  const price = marketFor(pharmacy).stock.stomachTonic
  assert.ok(price > 0)
  p.currency = price * 2
  assert.ok(!operate(p, 'buy', 'stomachTonic', { ...pharmacy, service: 'baker' }).ok)
  assert.ok(operate(p, 'buy', 'stomachTonic', pharmacy).ok)
  assert.ok(!operate(p, 'use', 'stomachTonic').ok)
  assert.equal(p.items.stomachTonic, 1)
  p.water = 60
  operate(p, 'sourceDrink', null, { waterSource: 'tainted' })
  assert.equal(p.sickness, 6)
  assert.ok(operate(p, 'use', 'stomachTonic').ok)
  assert.equal(p.sickness, 2)
  const saved = migrateExpedition({ expedition: JSON.parse(JSON.stringify(p)) })
  assert.equal(saved.sickness, 2)
  assert.ok(operate(saved, 'buy', 'stomachTonic', pharmacy).ok)
  assert.ok(operate(saved, 'use', 'stomachTonic').ok)
  assert.equal(saved.sickness, 0)
  assert.equal(saved.items.stomachTonic, undefined)
  assert.equal(saved.currency, 0)
})

test('empty-handed arrival, five physical slots, durable ownership and deferred legacy rewards', () => {
  const save = { items: [], visited: ['root'] },
    p = migrateExpedition(save)
  assert.deepEqual(p.items, {})
  assert.deepEqual(Object.keys(p.equipped), Object.keys(slots))
  assert.ok(Object.values(p.equipped).every((v) => v === null))
  assert.equal(expeditionStats(p).attackBonus, 0)
  assert.equal(expeditionStats(p).armor, 0)
  assert.equal(expeditionStats(p).capacity, BASE_CAPACITY)
  assert.ok(addItem(p, 'water', BASE_CAPACITY * 2).ok)
  save.items.push('护底靴')
  const full = migrateExpedition(save)
  assert.equal(full.pending.boots, 1)
  assert.ok(!operate(full, 'claim', 'boots').ok)
  for (let i = 0; i < 4; i++) operate(full, 'drop', 'water')
  assert.ok(operate(full, 'claim', 'boots').ok)
  assert.ok(operate(full, 'equip', 'boots').ok)
  const loaded = migrateExpedition(JSON.parse(JSON.stringify(save)))
  assert.equal(loaded.equipped.feet, 'boots')
  assert.deepEqual(loaded.pending, {})
  assert.equal(loaded.items.boots, undefined)
})

test('physical capacity and mass act independently; equipping and unequipping are atomic', () => {
  const p = fresh()
  for (const id of ['rainFang', 'saltCrown', 'rootMantle', 'gorgeGreaves', 'boots']) {
    assert.ok(addItem(p, id).ok)
    assert.ok(operate(p, 'equip', id).ok)
  }
  const equipped = expeditionStats(p)
  assert.equal(equipped.volume, 0)
  assert.ok(equipped.weight > 0)
  assert.equal(equipped.attackBonus, 12)
  assert.equal(equipped.armor, 55)
  assert.equal(Object.values(p.equipped).filter(Boolean).length, 5)
  assert.ok(addItem(p, 'ore', 20).ok)
  assert.ok(expeditionStats(p).speed < equipped.speed)
  assert.ok(expeditionStats(p).stamina < equipped.stamina)
  assert.ok(!operate(p, 'unequip', 'head').ok)
  assert.equal(p.equipped.head, 'saltCrown')
  assert.ok(!addItem(p, 'bun', 100).ok)
  for (let i = 0; i < 3; i++) operate(p, 'drop', 'ore')
  assert.ok(operate(p, 'unequip', 'head').ok)
  assert.equal(p.items.saltCrown, 1)
  const small = fresh()
  assert.ok(addItem(small, 'fieldPack').ok)
  assert.ok(operate(small, 'upgrade', 'fieldPack').ok)
  assert.equal(expeditionStats(small).capacity, LARGE_CAPACITY)
  assert.ok(addItem(small, 'water', LARGE_CAPACITY * 2).ok)
  assert.ok(!addItem(small, 'water').ok)
})

test('each market has local prices, both kinds of trade preserve full bags and currency', () => {
  const names = new Set()
  for (const [zone, market] of Object.entries(markets)) {
    const p = fresh(),
      context = { zone, merchant: true }
    names.add(market.name)
    assert.ok(!operate(p, 'barter', null, context).ok)
    assert.ok(!operate(p, 'buy', 'bun', context).ok)
    const { take, qty, give, count } = market.barter
    assert.ok(addItem(p, take, qty * 2).ok)
    assert.ok(operate(p, 'barter', null, context).ok)
    assert.equal(p.items[give], count)
    assert.ok(operate(p, 'sell', take, context).ok)
    const balance = p.currency
    assert.equal(balance, market.buys[take])
    assert.ok(!operate(p, 'buy', 'bun', { zone, merchant: false }).ok)
    const cheap = Object.keys(market.stock).find((k) => market.stock[k] <= balance)
    assert.ok(operate(p, 'buy', cheap, context).ok)
    assert.equal(p.currency, balance - market.stock[cheap])
  }
  assert.equal(names.size, 4)
  const full = fresh()
  addItem(full, 'water', BASE_CAPACITY * 2)
  full.currency = 100
  assert.ok(!operate(full, 'buy', 'bun', { zone: 'salt', merchant: true }).ok)
  assert.equal(full.currency, 100)
})

test('standard day, exercise, heat, sickness and skipped hours use a stable world clock', () => {
  const p = fresh()
  advanceExpedition(p, 6, { activity: 'idle' })
  assert.equal(p.food, 75)
  assert.equal(p.water, 78)
  addItem(p, 'bun')
  addItem(p, 'water')
  assert.ok(operate(p, 'eat', 'bun').ok)
  assert.ok(operate(p, 'drink', 'water').ok)
  assert.equal(p.food, 100)
  assert.equal(p.water, 100)
  const resting = fresh(),
    walking = fresh(),
    running = fresh(),
    climbing = fresh()
  advanceExpedition(resting, 2, { activity: 'rest' })
  advanceExpedition(walking, 2, { activity: 'walk' })
  advanceExpedition(running, 2, { activity: 'sprint', hot: true, jumps: 5 })
  advanceExpedition(climbing, 2, { activity: 'climb' })
  assert.ok(resting.food > walking.food && walking.food > running.food && walking.food > climbing.food)
  assert.ok(running.water < walking.water)
  const full = fresh(),
    split = fresh()
  for (const s of [full, split]) Object.assign(s, { food: 18, water: 5, sickness: 1.37 })
  const total = advanceExpedition(full, 8.25, { activity: 'rest' })
  let sum = 0
  for (let i = 0; i < 825; i++) sum += advanceExpedition(split, 0.01, { activity: 'rest' }).damage
  assert.equal(total.damage, sum)
  assert.ok(total.damage > 0)
  assert.ok(Math.abs(full.damageRemainder - split.damageRemainder) < 1e-8)
  const load = migrateExpedition({ expedition: split })
  assert.equal(load.food, 0)
  assert.equal(load.water, 0)
  assert.equal(load.sickness, 0)
})

test('fluid source quality and fire processing change the consumed item and status', () => {
  const p = fresh()
  assert.ok(!operate(p, 'fill').ok)
  for (const source of ['well', 'river', 'tainted'])
    assert.ok(operate(p, 'fill', null, { waterSource: source }).ok)
  assert.equal(p.items.water, 1)
  assert.equal(p.items.riverWater, 1)
  assert.equal(p.items.dirtyWater, 1)
  assert.ok(!operate(p, 'boil', 'dirtyWater', { fire: false }).ok)
  assert.ok(operate(p, 'boil', 'dirtyWater', { fire: true }).ok)
  p.water = 20
  assert.ok(operate(p, 'drink', 'water').ok)
  assert.equal(p.sickness, 0)
  assert.ok(operate(p, 'sourceDrink', null, { waterSource: 'tainted' }).ok)
  assert.equal(p.sickness, 6)
  assert.ok(addItem(p, 'rawMeat').ok)
  assert.ok(operate(p, 'cook', 'rawMeat', { fire: true }).ok)
  assert.equal(p.items.rawMeat, undefined)
  assert.equal(p.items.meat, 1)
})

test('social aid is once a day, works at zero inventory and gifts lead to local advice', () => {
  const p = fresh(),
    resident = { zone: 'rain', kindness: 'resident' },
    beggar = { zone: 'salt', kindness: 'beggar' }
  assert.ok(operate(p, 'receiveAid', null, resident).ok)
  assert.equal(p.items.bun, 2)
  assert.ok(!operate(p, 'receiveAid', null, { ...resident, zone: 'root' }).ok)
  assert.ok(operate(p, 'offerAid', null, beggar).message.includes(markets.salt.clue))
  assert.ok(!operate(p, 'offerAid', null, beggar).ok)
  assert.ok(operate(p, 'receiveAid', null, beggar).ok)
  advanceExpedition(p, 24, { activity: 'rest' })
  assert.ok(operate(p, 'receiveAid', null, resident).ok)
  const evening = migrateExpedition({ hour: 21, items: [] })
  assert.ok(operate(evening, 'receiveAid', null, resident).ok)
  advanceExpedition(evening, 9, { activity: 'rest' })
  assert.ok(operate(evening, 'receiveAid', null, resident).ok)
})

test('individual torch fuel follows game time, unrecoverable expired fuel never relights', () => {
  const p = fresh()
  assert.ok(!operate(p, 'torch').ok)
  assert.ok(addItem(p, 'torch', 2).ok)
  assert.ok(operate(p, 'torch').ok)
  assert.equal(p.items.torch, 1)
  advanceExpedition(p, 1.25)
  assert.ok(operate(p, 'extinguish').ok)
  advanceExpedition(p, 4)
  assert.equal(p.torchHours, TORCH_HOURS - 1.25)
  const save = migrateExpedition({ expedition: p })
  assert.ok(operate(save, 'torch').ok)
  assert.equal(advanceExpedition(save, 5).burnedOut, true)
  assert.equal(save.items.torch, 1)
  assert.equal(save.torchLit, false)
  assert.ok(operate(save, 'torch').ok)
  assert.equal(save.torchHours, TORCH_HOURS)
  const dropped = fresh()
  const events = []
  addItem(dropped, 'bun')
  const drop = operate(dropped, 'drop', 'bun', { onDrop: (...args) => events.push(args) })
  assert.deepEqual(drop.dropped, { id: 'bun', qty: 1 })
  assert.deepEqual(events, [['bun', 1]])
  assert.ok(!operate(dropped, 'drop', 'bun', { onDrop: (...args) => events.push(args) }).ok)
  assert.equal(events.length, 1)
  assert.ok(Object.values(bossLoot).every((id) => items[id].species && !items[id].slot))
})

test('all species provide anatomically named materials with a source, a real regional buyer and an appropriate capital buyer', () => {
  const all = Object.values(wildlife).flat()
  assert.equal(all.length, 21)
  assert.equal(Object.keys(harvestBySpecies).length, all.length)
  const kinds = new Set()
  for (const [zone, roster] of Object.entries(wildlife)) {
    for (const beast of roster) {
      const harvest = harvestBySpecies[beast.id]
      assert.ok(harvest.length >= 2, beast.name)
      for (const { id, qty } of harvest) {
        assert.ok(!kinds.has(id))
        kinds.add(id)
        const item = items[id]
        assert.equal(item.source, beast.name)
        assert.equal(item.zone, zone)
        assert.equal(item.species, beast.id)
        assert.ok(item.purpose && !item.slot && qty >= 1)
        assert.ok(markets[zone].buys[id] > 0)
        const buyer = { zone: 'capital', service: item.buyer, merchant: true }
        const bag = fresh()
        addItem(bag, id)
        assert.ok(!operate(bag, 'sell', id, { ...buyer, service: 'baker' }).ok)
        assert.ok(operate(bag, 'sell', id, buyer).ok)
        assert.ok(bag.currency > 0 && !bag.items[id])
      }
      if (beast.boss)
        assert.ok(
          harvest.some(
            (entry) => entry.id === (beast.phase === 'night' ? nightBossLoot : bossLoot)[zone],
          ),
        )
    }
  }
})

test('eligible meat cuts each become their corresponding dish in a fire or butcher shop; feathers, plates, antlers and hides stay inedible', () => {
  const raw = Object.values(harvestBySpecies)
    .flat()
    .map(({ id }) => id)
  assert.equal(raw.filter((id) => items[id].dish).length, 6)
  for (const id of raw) {
    const item = items[id]
    for (const ctx of [{ fire: true }, { zone: 'capital', service: 'butcher', merchant: true }]) {
      const p = fresh()
      p.food = 10
      addItem(p, id)
      assert.ok(!operate(p, 'cook', id, { zone: 'capital', service: 'smith', merchant: true }).ok)
      assert.equal(operate(p, 'cook', id, ctx).ok, !!item.dish, id)
      if (item.dish) {
        assert.equal(p.items[id], undefined)
        assert.equal(p.items[item.dish], 1)
        assert.ok(operate(p, 'eat', item.dish).ok && p.food > 10)
      } else {
        assert.ok(!operate(p, 'eat', id).ok)
        assert.equal(p.items[id], 1)
      }
    }
  }
})

test('each boss equipment is made by a matching workshop, keeps old save ownership and cannot be obtained as a raw drop', () => {
  const original = ['rainFang', 'saltCrown', 'rootMantle', 'gorgeGreaves']
  const allLoot = Object.values(harvestBySpecies)
    .flat()
    .map((e) => e.id)
  for (const product of original) {
    const recipe = workshopRecipes[product]
    assert.ok(!allLoot.includes(product))
    for (const ctx of [
      { zone: 'capital', service: recipe.service, merchant: true },
      { zone: recipe.zone, merchant: true },
    ]) {
      const p = fresh(),
        inputs = Object.entries(recipe.materials)
      assert.ok(!operate(p, 'craft', product, ctx).ok)
      for (const [part, qty] of inputs) addItem(p, part, qty)
      assert.ok(
        !operate(p, 'craft', product, { zone: 'capital', service: 'butcher', merchant: true }).ok,
      )
      assert.ok(operate(p, 'craft', product, ctx).ok)
      for (const [part] of inputs) assert.equal(p.items[part], undefined)
      assert.equal(p.items[product], 1)
      assert.ok(operate(p, 'equip', product).ok)
      const saved = migrateExpedition({ expedition: JSON.parse(JSON.stringify(p)) })
      assert.equal(saved.equipped[items[product].slot], product)
    }
  }
  const full = fresh()
  addItem(full, 'rainTusk', 1)
  addItem(full, 'rainFin', 2)
  addItem(full, 'water', 26)
  const prev = { ...full.items }
  assert.ok(!operate(full, 'craft', 'rainFang', { zone: 'rain', merchant: true }).ok)
  assert.deepEqual(full.items, prev)
})

test('capital crafts, free portions and local buying codes remain distinct across full save cycles', () => {
  const p = fresh(),
    ctx = (service) => ({ zone: 'capital', merchant: true, kindness: 'resident', service })
  assert.deepEqual(Object.keys(marketFor(ctx('baker')).stock), ['bun'])
  assert.deepEqual(Object.keys(marketFor(ctx('butcher')).stock), ['rawMeat', 'meat'])
  assert.equal(marketFor(ctx('beggar')), null)
  assert.ok(!operate(p, 'buy', 'torch', ctx('baker')).ok)
  assert.ok(!operate(p, 'receiveAid', null, ctx('outfitter')).ok)
  assert.ok(operate(p, 'receiveAid', null, ctx('baker')).ok)
  assert.deepEqual(p.items, { bun: 2 })
  assert.ok(operate(p, 'receiveAid', null, ctx('butcher')).ok)
  assert.deepEqual(p.items, { bun: 2, meat: 1 })
  const saved = migrateExpedition({ expedition: p })
  assert.ok(!operate(saved, 'receiveAid', null, ctx('butcher')).ok)
  assert.ok(operate(saved, 'receiveAid', null, ctx('inn')).ok)
  assert.ok(operate(saved, 'offerAid', null, ctx('beggar')).message.includes('雨渡门'))
  assert.ok(addItem(saved, 'cloth', 3).ok)
  assert.ok(operate(saved, 'barter', null, ctx('outfitter')).ok)
  assert.equal(saved.items.linenCoat, 1)
  const gear = new Set(Object.values(capitalTrades).flatMap((shop) => Object.keys(shop.stock)))
  assert.ok(gear.has('boots') && gear.has('saltKnife') && gear.has('torch'))
})
