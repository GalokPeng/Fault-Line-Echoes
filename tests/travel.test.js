import test from 'node:test'
import assert from 'node:assert/strict'
import { biomes, heightAt } from '../src/biomes.js'
import { gates, entryAt, nextGate, borderRoads, onBorderRoad } from '../src/borders.js'
import { footfall, gripInReach, climbMotion } from '../src/movement.js'
import { passageFor, crossedPassage } from '../src/passages.js'

test('walk through either end of a city passage, including the edges, but stay on the wall walk', () => {
  for (const dest of ['rain', 'salt', 'root', 'gorge']) {
    for (const [here, there] of [
      ['capital', dest],
      [dest, 'capital'],
    ]) {
      const g = passageFor(
        here,
        gates(here).find((p) => p.to === there),
      )
      const at = (forward, side = 0, h = 0) => ({
        x: g.x + forward * g.nx + side * g.nz,
        y: g.y + h,
        z: g.z + forward * g.nz - side * g.nx,
      })
      assert.equal(crossedPassage([g], at(-2, g.radius - 0.32), at(1, g.radius - 0.32)), g)
      assert.equal(crossedPassage([g], at(1), at(-2)), null)
      assert.equal(crossedPassage([g], at(-2), at(-0.1)), null)
      assert.equal(crossedPassage([g], at(-2, 0, 12), at(1, 0, 12)), null)
      assert.equal(crossedPassage([g], at(-2, g.radius + 1), at(1, g.radius + 1)), null)
      assert.equal(crossedPassage([g], at(-2), at(0)), g)
    }
  }
  assert.equal(
    passageFor(
      'root',
      gates('root').find((p) => p.to === 'rain'),
    ),
    null,
  )
})

test('four reciprocal capital gates and two distinct reciprocal wilderness passes', () => {
  assert.equal(Object.keys(biomes).length, 5)
  const cap = gates('capital')
  assert.equal(cap.length, 4)
  assert.ok(cap.find((g) => g.x < 0 && g.to === 'rain'))
  assert.ok(cap.find((g) => g.x > 0 && g.to === 'salt'))
  for (const id of Object.keys(biomes))
    for (const g of gates(id)) {
      assert.ok(gates(g.to).some((r) => r.to === id))
      const p = entryAt(g.to, id)
      assert.equal(p.y, heightAt(g.to, p.x, p.z))
      assert.ok(Math.hypot(p.x, p.z) > (g.to === 'capital' ? 194 : 565))
    }
  assert.equal(nextGate('rain', 'root').to, 'root')
  assert.equal(nextGate('salt', 'gorge').to, 'gorge')
  for (const id of ['rain', 'root', 'salt', 'gorge'])
    for (const r of borderRoads(id)) {
      assert.ok(r.points.length > 15)
      assert.ok(onBorderRoad(id, r.gate.x, r.gate.z))
    }
})
test('silent walk produces no audio or AI stimulus; materials and sprint change hearing radius', () => {
  const heard = (surface, opts = {}) => {
    const a = { ...opts }
    return [footfall(a, 2.1, surface, true), a.noise]
  }
  assert.deepEqual(heard('wood', { quiet: true }), [null, 0])
  assert.ok(heard('wood')[1] > heard('sand')[1])
  assert.ok(heard('stone', { sprint: true })[1] > heard('stone')[1])
  const a = {}
  assert.equal(footfall(a, 5, 'wood', false), null)
  assert.equal(a.noise, 0)
})
test('a grip must face the player and lie below reach; climbing stops at last purchase', () => {
  const p = { x: 0, y: 0, z: 0 },
    s = { x: 0, y: 0, z: -1, r: 0.4, h: 14, kind: 'tree', grip: 1.5 }
  assert.ok(gripInReach(p, 0, [s]))
  assert.equal(gripInReach(p, Math.PI, [s]), null)
  assert.equal(gripInReach(p, 0, [{ ...s, grip: 3.8 }]), null)
  const h = { pos: p, yaw: 0, f: { stamina: 100 } }
  const move = climbMotion(h, true, true, [s], 0, 0.1)
  assert.ok(move.vy > 1)
  h.pos = { ...p, y: 6 }
  assert.ok(climbMotion(h, true, false, [s], 0, 0.1).vy < 0.1)
  assert.equal(climbMotion(h, false, false, [s], 0, 0.1), null)
})
