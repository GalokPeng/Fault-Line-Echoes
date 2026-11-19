import test from 'node:test'
import assert from 'node:assert/strict'
import { wildlife } from '../src/perception-species.js'
import { encounters } from '../src/perception-encounters.js'
import { makePeople } from '../src/people.js'
import { heightAt, waterAt } from '../src/biomes.js'
import { fighter } from '../src/combat.js'
import { harvestBySpecies } from '../src/expedition-harvest.js'
import { Group } from 'three'

const regions = ['rain', 'salt', 'root', 'gorge']
function realm(id, field, schedule, solids = []) {
  const hero = { pos: { x: 0, y: 12, z: 0 }, f: fighter('tide'), yaw: 0, pitch: 0 },
    harvest = []
  const view = {
    town: { npcSpawns: [], colliders: [] },
    land: { solids },
    actor: () => ({ group: new Group(), dispose() {}, update() {}, fall() {} }),
    effect() {},
  }
  const people = makePeople(
    view,
    id,
    { clear: () => true },
    hero,
    {
      injury() {},
      hit() {},
      warning() {},
      harvest(parts, name, pos, species) {
        harvest.push({ parts, species, recorded: !!field.bossSeasons[species], name, pos })
      },
    },
    { field, clock: () => ({ hour: ((schedule.now % 24) + 24) % 24, elapsed: schedule.now }) },
  )
  const boss = () => people.all.find((a) => a.boss && !a.retired)
  const defeat = () => {
    const a = boss()
    hero.pos = { x: a.pos.x, y: a.pos.y, z: a.pos.z + 1.9 }
    hero.yaw = 0
    hero.pitch = Math.atan2(a.bodyHeight - 1.64, 1.9)
    people.strike({ shot: 3, dmg: 999 })
  }
  return { people, hero, harvest, boss, defeat }
}
test('each region switches its actual map target at dusk and dawn, and preserves each kill across travel and reload', () => {
  for (const id of regions) {
    const field = {},
      schedule = { now: 17.99 }
    let e = realm(id, field, schedule)
    const day = e.boss(),
      marker = e.people.bossMarkers()[0]
    assert.equal(marker.phase, 'day')
    assert.deepEqual([marker.x, marker.y, marker.z], [day.pos.x, day.pos.y, day.pos.z])
    e.defeat()
    e.defeat()
    assert.equal(e.harvest.length, 1)
    assert.ok(e.harvest[0].recorded)
    assert.deepEqual(e.harvest[0].parts, harvestBySpecies[day.species.id])
    assert.deepEqual(e.people.bossMarkers(), [])
    const save = JSON.parse(JSON.stringify(field))
    e.people.dispose()
    e = realm(id, save, schedule)
    assert.equal(e.boss().f.hp, 0)
    assert.ok(e.boss().corpse > 0)
    e.defeat()
    assert.equal(e.harvest.length, 0)
    schedule.now = 18
    e.people.syncClock()
    const night = e.boss(),
      pm = e.people.bossMarkers()[0]
    assert.equal(pm.phase, 'night')
    assert.equal(pm.actorId, night.species.id)
    assert.notEqual(night.species.form, day.species.form)
    assert.ok(Math.hypot(pm.x - day.home.x, pm.z - day.home.z) > 100)
    assert.ok(Math.hypot(pm.x, pm.z) > 85 && pm.lair && pm.tactic)
    for (const [dx, dz] of [
      [0, 0],
      [4, 0],
      [-4, 0],
      [0, 4],
      [0, -4],
    ])
      assert.equal(waterAt(id, pm.x + dx, pm.z + dz).wet, false)
    assert.equal(pm.y, heightAt(id, pm.x, pm.z))
    e.defeat()
    assert.equal(e.harvest.length, 1)
    schedule.now = 24.1
    e.people.syncClock()
    assert.equal(e.boss().f.hp, 0)
    const savedAgain = JSON.parse(JSON.stringify(save))
    e.people.dispose()
    e = realm(id, savedAgain, schedule)
    assert.deepEqual(e.people.bossMarkers(), [])
    assert.equal(e.boss().corpse, 0)
    schedule.now = 30
    e.people.syncClock()
    assert.equal(e.boss().species.id, day.species.id)
    assert.ok(e.boss().f.hp > 0)
    schedule.now = 42
    e.people.syncClock()
    assert.equal(e.boss().species.id, night.species.id)
    assert.ok(e.boss().f.hp > 0)
    e.people.dispose()
    const anchor = wildlife[id].find((s) => s.phase === 'night').nest
    const rock = { x: anchor[0], z: anchor[1], y: heightAt(id, ...anchor) - 3, h: 20, r: 10 }
    const blocked = realm(id, {}, schedule, [rock])
    const real = blocked.people.bossMarkers()[0]
    assert.ok(
      Math.hypot(real.x - rock.x, real.z - rock.z) > 14.25,
      id + ' should move the true den away from an obstructing rock',
    )
    blocked.people.dispose()
  }
})

test('four night warnings resolve with different hit patterns and repeat timing, and cover or an actual dodge can interrupt them', () => {
  const run = (id, mode) => {
    const s = wildlife[id].find((s) => s.phase === 'night'),
      m = s.moves[0],
      hits = []
    const hero = { f: fighter('leaf'), pos: { x: 0, y: 0, z: 5 }, yaw: 0 }
    const actor = { pos: { x: 0, y: 0, z: 0 }, eye: s.eye, lastKnown: { ...hero.pos }, boss: true }
    let time = 0,
      blocked = false
    const battle = encounters(
      {},
      { clear: () => !blocked },
      hero,
      { injury: (v) => hits.push([time, v]) },
      () => 0,
      [],
      () => {},
    )
    battle.begin(actor, m)
    for (let j = 0; j < 280; j++) {
      time += 1 / 60
      if (mode === 'wall' && j === 5) blocked = true
      if (mode === 'dodge' && j === 9) {
        if (id === 'rain') hero.pos.y = 1.1
        else hero.pos.x = 10
      }
      if (mode === 'switch' && time > m.windup + 0.03) {
        battle.cancel(actor)
        battle.discard(actor)
      }
      if (actor.plan) battle.step(actor, 1 / 60)
      battle.update(1 / 60)
      if (time < m.windup) assert.deepEqual(hits, [])
    }
    battle.dispose()
    return hits
  }
  const rain = run('rain', 'stand')
  assert.equal(rain.length, 2)
  assert.ok(rain[1][0] - rain[0][0] > 0.75)
  const moth = run('root', 'stand')
  assert.equal(moth.length, 2)
  assert.ok(moth[1][0] - moth[0][0] > 0.58)
  assert.equal(run('salt', 'stand').length, 1)
  assert.equal(run('gorge', 'stand').length, 1)
  for (const id of regions)
    for (const mode of ['wall', 'dodge', 'switch']) assert.deepEqual(run(id, mode), [], id + '/' + mode)
})

test('a legacy named corpse bag remains collectible and does not create a second copy on upgrade', () => {
  const old = {
    drops: [
      { kind: 'remains', zone: 'rain', name: '叠瀑鸣皇', parts: { rainTusk: 1 }, x: 30, y: 4, z: -263 },
    ],
  }
  const day = { now: 13 },
    e = realm('rain', old, day)
  assert.deepEqual(e.people.bossMarkers(), [])
  assert.deepEqual(old.drops[0].parts, { rainTusk: 1 })
  assert.equal(e.harvest.length, 0)
  day.now = 37
  e.people.syncClock()
  assert.equal(e.boss().species.id, 'rainCrown')
  assert.ok(e.boss().f.hp > 0)
  e.people.dispose()
})
