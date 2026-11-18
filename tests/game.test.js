import test from 'node:test'
import assert from 'node:assert/strict'
import { biomes, gridData, heightAt } from '../src/biomes.js'
import { fighter, cast, recover, hurt, noticeAttack, heading, sight } from '../src/combat.js'
import { fresh, completeStep, current, main, side } from '../src/journal.js'

test('all four independent terrains give navigable paths from capital to landmark', () => {
  const fingerprints = new Set()
  for (const b of Object.values(biomes)) {
    const heights = gridData(b.id)
    assert.ok(Math.max(...heights) - Math.min(...heights) > 65)
    fingerprints.add(heights.slice(3200, 3220).join())
    assert.ok(heightAt(b.id, 0, 0) - heightAt(b.id, 23, -3) > 4)
    for (let i = 1; i < b.trail.length; i++) {
      const [x, z] = b.trail[i - 1],
        [u, v] = b.trail[i],
        metres = Math.hypot(u - x, v - z)
      for (let k = 0; k < 30; k++) {
        const h = (t) => heightAt(b.id, x + (u - x) * t, z + (v - z) * t)
        assert.ok(Math.abs(h((k + 1) / 30) - h(k / 30)) / (metres / 30) < 1.16, b.name)
      }
    }
  }
  assert.equal(fingerprints.size, 4)
})
test('combat uses free view, checks sight, gates ultimate and rewards directional guard', () => {
  const f = fighter('tide'),
    p = { x: 0, y: 0, z: 0 },
    target = { x: 0, y: 0, z: -8 }
  assert.equal(sight(p, heading(0), target, 15), 8)
  assert.equal(sight(p, heading(Math.PI), target, 15), Infinity)
  assert.equal(cast(f, 'v'), null)
  assert.ok(cast(f, 'q').shot > 10)
  assert.equal(cast(f, 'q'), null)
  recover(f, 1)
  f.guard = true
  assert.ok(hurt(f, 18, true) < 5)
  assert.equal(hurt(f, 18, false), 18)
  f.charge = 100
  assert.equal(cast(f, 'v').name, '三拍')
})
test('only nearby witnesses react to an attack, peaceful bystanders stay neutral', () => {
  const actor = (kind, x) => ({ kind, pos: { x, y: 0, z: 0 }, f: fighter(), angry: false })
  const target = actor('resident', 0),
    guard = actor('guard', 7),
    far = actor('guard', 80),
    civil = actor('resident', 2)
  const all = [target, guard, far, civil]
  noticeAttack(target, all, () => true)
  assert.deepEqual(
    all.map((a) => a.angry),
    [true, true, false, false],
  )
  guard.angry = false
  noticeAttack(target, all, () => false)
  assert.equal(guard.angry, false)
})
test('complete all stories, rewards, clue gate and each possible ending', () => {
  for (const ending of ['old', 'town', 'triple']) {
    const s = fresh()
    for (const q of side) {
      while (current(s, q.id)) completeStep(s, q.id)
    }
    assert.equal(s.secrets.length, 3)
    for (let i = 0; i < 80 && current(s, 'main'); i++) {
      const { q, step } = current(s, 'main')
      if (q.id === 'M07' && step.choice) {
        const missing = { ...s, secrets: [], choices: { ...s.choices } }
        completeStep(missing, 'main', 'triple')
        assert.equal(missing.sub, s.sub)
      }
      completeStep(s, 'main', step.choice ? (q.id === 'M07' ? ending : step.choice[0][0]) : undefined)
    }
    assert.equal(s.main, main.length)
    assert.ok(s.ending)
    assert.ok(s.items.includes('新水位纪念服'))
  }
})
