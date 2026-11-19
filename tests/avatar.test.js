import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { avatarLook, gestureFor } from '../src/avatar.js'
import { createActor } from '../src/actors.js'
import { roles, cast, fighter, heading, attackStyle, practiceMoves } from '../src/combat.js'
import { advanceFlight, launchVolley } from '../src/perception-flight.js'
import { match } from '../src/room.js'
import { skins } from '../src/story.js'

const open = () => true
const origin = { x: 0, y: 1.64, z: 0 }
const body = (z, x = 0) => ({ actor: 'target', center: { x, y: 1.48, z }, radius: 0.65 })
function sample(p, bodies, clear = open) {
  const hits = []
  for (let i = 0; i < 180 && !p.every((b) => b.done); i++)
    for (const bolt of p) {
      const hit = advanceFlight(bolt, 1 / 60, clear, bodies(i))
      if (hit) hits.push([i, hit])
    }
  return hits
}
test('every costume is identified on every avatar; body geometry and colour distinguish all 24 looks', () => {
  const looks = new Set()
  for (const role of Object.keys(roles))
    for (const skin of Object.keys(skins)) {
      const actor = createActor('player', 'rain', { role, skin })
      assert.deepEqual(actor.group.userData.avatar, avatarLook(role, skin))
      assert.equal(avatarLook(role, skins[skin]).skin, skin)
      const hash = createHash('sha256')
      actor.group.traverse((node) => {
        for (const key of ['position', 'color']) {
          const floats = node.geometry?.attributes[key]?.array
          if (floats) hash.update(Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength))
        }
      })
      assert.ok(!looks.has(hash.copy().digest('hex')))
      looks.add(hash.digest('hex'))
      actor.perform('heavy')
      actor.update(0.1, false, false, 1)
      actor.dispose()
    }
  assert.equal(looks.size, 24)
  assert.equal(avatarLook('stone', 'unknown').skin, '巡线原色')
})
test('midrange and ranged basics travel in aim direction with time to dodge, limited reach and scenery collision', () => {
  for (const role of Object.keys(roles))
    for (const key of ['light', 'heavy']) {
      const f = fighter(role),
        castAt = { yaw: 0, pitch: 0 }
      const spec = cast(f, key)
      assert.equal(spec.pose, gestureFor(role, key))
      if (role === 'leaf' || role === 'stone') {
        assert.ok(spec.dist && !spec.flight)
        continue
      }
      assert.ok(spec.flight > 0 && spec.shot >= 9)
      const shots = () => launchVolley(origin, heading(castAt.yaw, castAt.pitch), spec)
      const hits = sample(shots(), () => [body(-7)])
      assert.equal(hits.length, 1)
      assert.ok(hits[0][0] > 10)
      const dodged = sample(shots(), (i) => [body(-7, i < 6 ? 0 : 3)])
      assert.equal(dodged.length, 0)
      const obstructed = shots()
      assert.equal(
        sample(
          obstructed,
          () => [body(-7)],
          (_a, b) => b.z > -4,
        ).length,
        0,
      )
      assert.ok(obstructed[0].pos.z >= -4.02)
      assert.equal(sample(shots(), () => [body(-(spec.shot + 3))]).length, 0)
      castAt.yaw = Math.PI / 2
      assert.equal(sample(shots(), () => [body(-7)]).length, 0)
      assert.equal(sample(shots(), () => [body(0, -7)]).length, 1)
    }
})
test('sparring partners release the attacks of their selected character', () => {
  for (const role of Object.keys(roles)) {
    const moves = practiceMoves(role)
    assert.deepEqual(
      new Set(moves.filter((m) => !['light', 'heavy'].includes(m.key)).map((m) => m.name)),
      new Set([roles[role].skills[role === 'tide' ? 1 : 0]]),
    )
    for (const move of moves) {
      const spec = cast(fighter(role), move.key)
      assert.equal(move.name, spec.name)
      assert.equal(move.damage, spec.dmg)
      assert.equal(move.reach, spec.shot || spec.dist)
      if (spec.shot) {
        assert.equal(move.type, 'bolt')
        assert.equal(move.speed, spec.flight)
        assert.equal(move.spread, spec.spread)
      } else assert.notEqual(move.type, 'bolt')
    }
  }
})
test('three-pulse ultimate remains three separately dodgeable releases, fan bands share one hit', () => {
  const f = fighter('tide')
  f.charge = 100
  const skill = cast(f, 'v'),
    bolts = launchVolley(origin, heading(0), skill)
  assert.equal(bolts.length, 3)
  assert.equal(new Set(bolts.map((p) => p.bandId)).size, 3)
  const hits = sample(bolts, () => [body(-8)])
  assert.equal(hits.length, 3)
  assert.ok(hits.every(([frame], i) => !i || frame - hits[i - 1][0] >= 9))
  assert.equal(
    sample(launchVolley(origin, heading(0), attackStyle('tide', 'e')), () => [body(-4)]).length,
    1,
  )
})
test('host validates empty-handed ranged attacks, sends their role/key and keeps all cosmetic stats neutral', () => {
  const packets = [],
    models = [],
    first = []
  let receive
  const hero = {
    world: 'rain',
    pos: { x: 3, y: 0, z: 11 },
    origin: { x: 3, y: 0, z: 11 },
    yaw: Math.PI / 2,
    pitch: 0,
    f: fighter('tide'),
    skin: '雨枝纹',
    color: skins['雨枝纹'],
  }
  hero.f.attackBonus = 99
  const physics = { teleport() {}, feet: () => ({ x: 3, y: 0, z: 11 }), clear: open }
  const view = {
    actor: (_kind, _id, look) => {
      models.push(look)
      return { group: { position: { set() {} }, rotation: {} }, perform() {}, update() {}, dispose() {} }
    },
    punch: (s) => first.push(s.key),
    effect() {},
  }
  const game = match(
    {
      host: true,
      send: (p) => packets.push(p),
      listen: (f) => {
        receive = f
      },
      close() {},
    },
    hero,
    view,
    physics,
    () => {},
  )
  receive({ type: 'hello', role: 'beam', skin: '高线巡工服', attackBonus: 500 })
  assert.equal(models[0].skin, '高线巡工服')
  assert.equal(models[0].role, 'beam')
  assert.equal(hero.f.attackBonus, 0)
  game.cast('light')
  game.cast('heavy')
  assert.equal(packets.filter((p) => p.type === 'wave').length, 1)
  assert.deepEqual(first, ['light'])
  game.update(0.06)
  const snap = () => packets.filter((p) => p.type === 'state').at(-1)
  assert.equal(snap().players[1].hp, 100)
  for (let i = 0; i < 45; i++) game.update(1 / 60)
  assert.equal(snap().players[1].hp, 91)
  receive({ type: 'act', key: 'light', yaw: -Math.PI / 2, pitch: 0, dmg: 5000 })
  for (let i = 0; i < 45; i++) game.update(1 / 60)
  assert.equal(snap().players[0].hp, 90)
  assert.ok(packets.some((m) => m.type === 'wave' && m.i === 1 && m.key === 'light'))
  game.close()
})
