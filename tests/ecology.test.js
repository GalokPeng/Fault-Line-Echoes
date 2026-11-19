import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import { fighter, cast, heading, hurt } from '../src/combat.js'
import { biomes, heightAt } from '../src/biomes.js'
import { makePeople } from '../src/people.js'
import { sees, hears } from '../src/perception.js'
import { launchVolley, advanceFlight } from '../src/perception-flight.js'
import { wildlife } from '../src/perception-species.js'
import { harvestBySpecies, harvestItems } from '../src/expedition-harvest.js'
import { createActor } from '../src/actors.js'
import { match } from '../src/room.js'

const clear = () => true
const position = (x, z, y = 0) => ({ x, y, z })
const model = () => ({
  group: new T.Group(),
  update() {},
  fall(s) {
    this.group.userData.fallTime = s
  },
  dispose() {
    this.group.removeFromParent()
  },
})
const point = (id, x, z) => position(x, z, heightAt(id, x, z))
function situation(id, visibility = clear, npcSpawns = [], features = [], ecology = {}) {
  const [x, z] = biomes[id].spawn
  const hero = {
    pos: point(id, x, z),
    f: fighter('tide'),
    yaw: 0,
    pitch: 0,
    quiet: false,
    crouch: false,
    noise: 0,
  }
  const log = { injuries: [], hits: [], loot: [], warn: [], duel: [] }
  const view = { actor: model, town: { npcSpawns, features }, land: { solids: [] }, effect() {} }
  const people = makePeople(
    view,
    id,
    { clear: visibility },
    hero,
    {
      injury: (n, a) => {
        hero.f.hp -= n
        log.injuries.push([n, a])
      },
      hit: (...v) => log.hits.push(v),
      warning: (...v) => log.warn.push(v),
      loot: (...v) => log.loot.push(v),
      duel: (v) => log.duel.push(v),
    },
    ecology,
  )
  return { people, hero, log }
}
function tick(people, s, night = false) {
  for (let t = 0; t < s; t += 1 / 60) people.update(1 / 60, night)
}
function isolate(people, actor) {
  for (const a of people.all)
    if (a !== actor) {
      a.f.hp = 0
      a.dead = 999
    }
}
test('sight requires a bounded view cone and clear ray; hearing requires a real audible step', () => {
  const a = { pos: position(0, 0), yaw: 0, eye: 1.45 },
    hero = { pos: position(0, -5), noise: 0 }
  assert.equal(sees(a, hero.pos, clear), false)
  assert.equal(sees(a, position(0, 6), clear), true)
  assert.equal(
    sees(a, position(0, 6), () => false),
    false,
  )
  assert.equal(sees(a, position(0, 68), clear), false)
  assert.equal(sees(a, position(0, 3, 14), clear), false)
  assert.equal(hears(a, hero, clear), false)
  hero.noise = 14
  assert.equal(hears(a, hero, clear), true)
  hero.quiet = true
  assert.equal(hears(a, hero, clear), false)
  hero.quiet = false
  hero.pos = position(0, -10)
  assert.equal(
    hears(a, hero, () => false),
    false,
  )
})
test('wildlife investigates a footprint, searches its recorded position, and ultimately disengages', () => {
  let wall = false
  const { people, hero } = situation('rain', () => !wall)
  const a = people.all.find((a) => a.kind === 'beast' && !a.boss)
  isolate(people, a)
  a.yaw = 0
  hero.pos = point('rain', a.home.x, a.home.z - 5)
  hero.quiet = true
  people.update(0.014, false)
  assert.equal(a.state, 'idle')
  hero.quiet = false
  hero.noise = 13
  people.update(0.014, false)
  assert.equal(a.state, 'search')
  const mark = { ...a.lastKnown }
  hero.noise = 0
  hero.quiet = true
  wall = true
  hero.pos = point('rain', mark.x + 9, mark.z - 2)
  tick(people, 1)
  assert.deepEqual(a.lastKnown, mark)
  assert.equal(a.lastSeen, null)
  wall = false
  hero.pos = point('rain', a.home.x + 100, a.home.z)
  tick(people, 3.3)
  assert.equal(a.state, 'idle')
  assert.equal(a.angry, false)
  assert.ok(Math.hypot(a.pos.x - a.home.x, a.pos.z - a.home.z) < 4)
  people.dispose()
})
test('a witnessed city theft needs both the goods and the thief in view, preserves vendor metadata', () => {
  let wall = false
  const npc = {
    name: '程麦',
    id: 'baker',
    job: '炉饼师',
    service: 'baker',
    owned: 'loaves',
    x: 0,
    z: 0,
    y: 24,
    yaw: 0,
  }
  const { people, hero } = situation('capital', () => !wall, [npc])
  const vendor = people.all[0]
  assert.equal(people.all.length, 1)
  assert.equal(vendor.owned, 'loaves')
  assert.equal(vendor.service, 'baker')
  hero.pos = position(0, -2, 24)
  assert.equal(people.witnessTheft(position(0, 2, 24)), false)
  hero.pos = position(0, 2.4, 24)
  wall = true
  assert.equal(people.witnessTheft(position(0, 2, 24)), false)
  wall = false
  assert.equal(people.witnessTheft(position(0, 2, 24)), true)
  assert.equal(vendor.angry, true)
  hero.pos = position(110, 2, 24)
  tick(people, 3.3)
  assert.equal(vendor.state, 'idle')
  people.dispose()
})
test('a duel also ends on its leash instead of pursuing across a continent', () => {
  const { people, hero, log } = situation('capital')
  const a = people.startDuel('tide', '顾潮')
  assert.equal(a.kind, 'duelist')
  hero.pos = position(a.home.x + 110, a.home.z, a.home.y)
  tick(people, 0.3)
  assert.equal(people.training, null)
  assert.deepEqual(log.duel, [false])
  people.dispose()
})
test('ranged sparring partners animate and release their own basic projectile from their selected kit', () => {
  for (const [role, basic] of [
    ['beam', '切弦'],
    ['tide', '音滴'],
  ]) {
    const { people, hero, log } = situation('capital')
    const a = people.startDuel(role)
    const gestures = []
    a.model.perform = (key) => gestures.push(key)
    a.cooldown = 0
    hero.pos = { ...a.home, z: a.home.z + 6 }
    a.yaw = 0
    people.update(0.02, false)
    const move = a.plan?.move
    assert.equal(move?.type, 'bolt')
    assert.equal(move?.key, 'light')
    assert.equal(move.name, basic)
    tick(people, move.windup + 0.025)
    assert.deepEqual(gestures, ['light'])
    assert.deepEqual(log.injuries, [])
    tick(people, 0.6)
    assert.equal(log.injuries.length, 1)
    people.dispose()
  }
})
test('a stallholder reports a witnessed theft to a guard in earshot, who can approach and hurt the thief', () => {
  const at = (id, x, z, guard = false) => ({
    id,
    name: id,
    x,
    z,
    y: 24,
    guard,
    service: guard ? 'guard' : 'baker',
    yaw: 0,
  })
  const goods = { id: 'stock', owner: 'shop', kind: 'owned', ...position(0, 2, 24) }
  const { hero, people, log } = situation(
    'capital',
    clear,
    [at('shop', 0, 0), at('local-watch', 4, 4, true), at('far-watch', 90, 0, true)],
    [goods],
  )
  hero.pos = position(0, 2.5, 24)
  assert.ok(people.witnessTheft(goods))
  assert.equal(people.report.guard, 'local-watch')
  assert.equal(people.all[1].angry, true)
  assert.equal(people.all[2].angry, false)
  tick(people, 4)
  assert.ok(log.injuries.some(([, a]) => a.name === 'local-watch'))
  hero.pos = position(105, 2.5, 24)
  tick(people, 6)
  assert.equal(people.all[1].angry, false)
  people.dispose()
})
test('three wave bolts take time, can miss a sidestep, stop at cover and hit one target once', () => {
  const spec = cast(fighter('tide'), 'e'),
    actor = {}
  let bodies = [{ actor, center: position(0, -10, 1), radius: 0.65 }]
  const from = position(0, 0, 1),
    dir = heading(0)
  const simulate = (dodge, wall) => {
    const shots = launchVolley(from, dir, spec)
    let hits = 0,
      first = Infinity
    for (let j = 0; j < 85; j++) {
      if (dodge && j === 12) bodies[0].center = position(4, -10, 1)
      for (const p of shots)
        if (advanceFlight(p, 1 / 60, (a, b) => !wall || !(a.z > -4 && b.z <= -4), bodies)) {
          hits++
          first = Math.min(first, j / 60)
        }
    }
    return { shots, hits, first }
  }
  const direct = simulate(false, false)
  assert.equal(direct.hits, 1)
  assert.ok(direct.first > 0.44)
  assert.equal(simulate(true, false).hits, 0)
  bodies[0].center = position(0, -10, 1)
  const blocked = simulate(false, true)
  assert.equal(blocked.hits, 0)
  assert.ok(blocked.shots.every((p) => p.pos.z >= -4.02))
})
test('each region has its local species and a distinct boss windup that can be dodged', () => {
  const moves = new Set()
  for (const [id, roster] of Object.entries(wildlife))
    for (const night of [false, true]) {
      const { people, hero, log } = situation(id)
      people.syncClock(night)
      assert.deepEqual(
        new Set(people.all.map((a) => a.species?.id)),
        new Set(roster.filter((s) => !s.boss || s.phase === (night ? 'night' : 'day')).map((s) => s.id)),
      )
      const boss = people.all.find((a) => a.boss)
      assert.ok(boss)
      isolate(people, boss)
      boss.yaw = 0
      boss.cooldown = 0
      hero.pos = point(id, boss.home.x, boss.home.z + 6)
      hero.f.hp = 500
      people.update(0.02, night)
      assert.ok(boss.plan, id)
      const first = boss.plan.move
      moves.add(first.type)
      tick(people, first.windup * 0.5, night)
      assert.equal(log.injuries.length, 0, id)
      hero.pos = point(id, boss.home.x + 24, boss.home.z + 6)
      tick(people, first.windup * 0.5 + 2.12, night)
      assert.equal(log.injuries.length, 0, id)
      for (const species of roster.filter((s) => !s.boss || s.phase === (night ? 'night' : 'day'))) {
        const rig = createActor('beast', id, species)
        rig.update(0.05, true, false, 1, { type: first.type, progress: 0.7 })
        rig.group.updateMatrixWorld(true)
        assert.ok(new T.Box3().setFromObject(rig.group).max.y > species.scale * 0.7)
        rig.fall(0.8)
        assert.ok(Math.abs(rig.group.children[1].rotation.z) > 1.2)
        rig.update(1 / 60, false, false)
        assert.equal(rig.group.children[1].rotation.z, 0)
        rig.dispose()
      }
      people.dispose()
    }
  assert.deepEqual(
    moves,
    new Set(['bolt', 'eruption', 'ring', 'charge', 'echoPair', 'sandTrail', 'scaleFan', 'echoCone']),
  )
})
test('all live species yield their own anatomical parts at the defeated body and cannot drop twice', () => {
  const materials = {
    poolBell: ['bellSac', 'bellWeb'],
    sailViper: ['sailFang', 'sailHood'],
    atlasMoth: ['mothSilkWing', 'mothAntenna'],
    echoBat: ['batMembrane', 'batHook'],
    reedDrake: ['reedScale', 'reedSkin'],
    mireBoar: ['mirePork', 'mireHide'],
    kingfisher: ['kingQuill', 'kingBreast'],
    riverOx: ['oxBeef', 'oxHide'],
    rainCrown: ['rainTusk', 'rainFin'],
    saltClaw: ['saltClawPlate', 'saltPincer'],
    duneFox: ['dunePelt', 'foxTuft'],
    sunDrake: ['sunScale', 'sunHide'],
    saltQueen: ['queenPlate', 'queenClaw'],
    mossHart: ['hartVenison', 'hartAntler'],
    shelfBoar: ['shelfPork', 'shelfBristle'],
    duskOwl: ['owlFeather', 'owlDown'],
    elderHart: ['elderHide', 'elderAntler'],
    redTalon: ['redTalonQuill', 'redTalonClaw'],
    cliffRam: ['ramMutton', 'ramHorn'],
    slateClaw: ['slatePincer', 'slatePlate'],
    faultRaptor: ['raptorScute', 'raptorPlume'],
  }
  let sampled = 0
  for (const [world, roster] of Object.entries(wildlife))
    for (const species of roster) {
      const { people, hero, log } = situation(world)
      const night = species.phase === 'night'
      people.syncClock(night)
      const a = people.all.find((actor) => actor.species.id === species.id)
      isolate(people, a)
      const defeat = { ...a.pos }
      hero.pos = point(world, a.pos.x, a.pos.z + 5)
      hero.yaw = 0
      hero.pitch = Math.atan2(a.pos.y + a.bodyHeight - hero.pos.y - 1.55, 5)
      const blow = () => people.strike({ name: '采集验证', shot: 12, dmg: 999 })
      blow()
      blow()
      assert.equal(a.f.hp, 0)
      assert.deepEqual(
        log.loot.map((parts) => parts[0]),
        materials[species.id],
      )
      for (const [id, qty, name, location, source] of log.loot) {
        assert.deepEqual(location, defeat)
        assert.notEqual(location, a.pos)
        assert.equal(name, a.name)
        assert.equal(source, species.id)
        assert.equal(harvestItems[id].source, name)
        assert.equal(harvestItems[id].species, source)
        assert.equal(harvestItems[id].zone, world)
        assert.equal(harvestItems[id].slot, undefined)
        assert.equal(qty, harvestBySpecies[source].find((entry) => entry.id === id).qty)
        assert.ok(Number.isInteger(qty) && qty > 0)
      }
      people.update(0.85, night)
      assert.equal(a.model.group.visible, true)
      assert.ok(a.model.group.userData.fallTime > 0.8)
      people.update(24, night)
      assert.equal(a.model.group.visible, false)
      assert.equal(a.f.hp, 0)
      people.update(151, night)
      assert.equal(a.f.hp, a.boss ? 0 : a.f.maxHp)
      assert.equal(a.corpse, 0)
      people.dispose()
      sampled++
    }
  assert.equal(sampled, Object.keys(materials).length)
})
test('hosted PvP resolves fold-wave damage on the flight tick, including scenery occlusion', () => {
  for (const wall of [false, true]) {
    let receive
    const packets = [],
      hero = {
        world: 'rain',
        origin: position(0, 0, 11),
        pos: position(3, 11, 11),
        yaw: Math.PI / 2,
        pitch: 0,
        f: fighter('tide'),
      }
    const game = match(
      { host: true, send: (m) => packets.push(m), listen: (f) => (receive = f), close() {} },
      hero,
      { actor: model, punch() {}, effect() {} },
      {
        feet: () => position(3, 11, 11),
        teleport() {},
        clear: (a, b) => !wall || !(a.x > 0 && b.x <= 0),
      },
      () => {},
    )
    receive({ type: 'hello', role: 'leaf', color: '#556677' })
    game.cast('e')
    assert.ok(packets.some((x) => x.type === 'wave'))
    game.update(0.065)
    assert.equal(packets.filter((p) => p.type === 'state').at(-1).players[1].hp, 100)
    for (let i = 0; i < 48; i++) game.update(1 / 60)
    assert.equal(packets.filter((p) => p.type === 'state').at(-1).players[1].hp, wall ? 100 : 76)
    assert.ok(packets.some((x) => x.type === 'wave-stop'))
    game.close()
  }
})
test('equipment attack and armor apply outside neutral PvP defaults', () => {
  const a = fighter('leaf'),
    b = fighter('stone')
  a.attackBonus = 5
  b.armor = 20
  const hit = cast(a, 'light')
  assert.equal(hit.dmg, 16)
  assert.equal(hurt(b, hit.dmg), 13)
  assert.equal(hurt(fighter('stone'), hit.dmg), 16)
})
