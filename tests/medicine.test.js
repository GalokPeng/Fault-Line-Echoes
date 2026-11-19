import test from 'node:test'
import assert from 'node:assert/strict'
import { fresh } from '../src/journal.js'
import { addItem, expeditionStats, migrateExpedition, operate } from '../src/expedition.js'
import {
  acceptCase,
  deliverCase,
  ferrySite,
  medicineState,
  pickUpCase,
  putCaseDown,
  stepCase,
} from '../src/medicine.js'
import { heightAt, waterAt } from '../src/biomes.js'
import { placeMapLabels } from '../src/map-labels.js'

function run() {
  const save = fresh(),
    pack = migrateExpedition(save)
  return { save, pack, q: medicineState(save, pack) }
}
test('pharmacy reserves four litres once; full bags keep the offer and failed salvage leaves the case in place', () => {
  const { save, pack, q } = run()
  addItem(pack, 'water', 26)
  assert.equal(acceptCase(q, pack).ok, false)
  assert.equal(q.phase, 'offered')
  delete pack.items.water
  assert.ok(acceptCase(q, pack).ok)
  assert.equal(expeditionStats(pack).volume, 4)
  assert.equal(acceptCase(q, pack).ok, false)
  const at = ferrySite().fork
  operate(pack, 'drop', 'medicineCase', { onDrop: () => putCaseDown(q, 'rain', at) })
  assert.equal(q.phase, 'ground')
  addItem(pack, 'water', 26)
  assert.equal(pickUpCase(q, pack).ok, false)
  const restored = JSON.parse(JSON.stringify(save)),
    bag = migrateExpedition(restored),
    job = medicineState(restored, bag)
  assert.equal(bag.items.medicineCase, undefined)
  assert.deepEqual(job.point, at)
  delete bag.items.water
  assert.ok(pickUpCase(job, bag).ok)
  assert.equal(bag.items.medicineCase, 1)
  assert.equal(pickUpCase(job, bag).ok, false)
})
test('actual low and high crossings both deliver once; dry bridge abutments meet the terrain', () => {
  const s = ferrySite()
  assert.ok(Math.abs(heightAt('rain', s.west, s.bridge.z) - s.bridge.y) < 0.4)
  assert.ok(Math.abs(heightAt('rain', s.east, s.bridge.z) - s.bridge.y) < 0.4)
  for (const route of ['ford', 'ridge']) {
    const { save, pack, q } = run()
    acceptCase(q, pack)
    assert.equal(deliverCase(q, pack, save).ok, false)
    stepCase(q, pack, 'rain', s.fork, false, 0.1)
    stepCase(q, pack, 'rain', route === 'ford' ? s.ford : s.bridge, false, 0.1)
    if (route === 'ridge') stepCase(q, pack, 'rain', { ...s.bridge, x: s.east }, false, 0.1)
    stepCase(q, pack, 'rain', s.boatman, false, 0.1)
    assert.equal(q.route, route)
    assert.ok(deliverCase(q, pack, save, 'rain', s.boatman).ok)
    assert.equal(deliverCase(q, pack, save).ok, false)
    assert.equal(pack.currency, 8)
    assert.deepEqual(save.items, ['渡工的水尺签'])
    assert.equal(pack.items.medicineCase, undefined)
  }
})
test('an unsecured case drifts in the sampled river, survives reload, strands within reach, and stays tied after recovery', () => {
  const { save, pack, q } = run()
  acceptCase(q, pack)
  const at = ferrySite().ford
  stepCase(q, pack, 'rain', { ...at, y: at.y - 0.7 }, true, 0.1)
  assert.equal(q.phase, 'floating')
  assert.equal(pack.items.medicineCase, undefined)
  for (let i = 0; i < 300; i++) stepCase(q, pack, 'rain', at, false, 1 / 30)
  assert.ok(q.point.z > at.z + 3)
  assert.ok(waterAt('rain', q.point.x, q.point.z).wet)
  const restored = JSON.parse(JSON.stringify(save)),
    bag = migrateExpedition(restored),
    job = medicineState(restored, bag)
  const p = { ...job.point }
  stepCase(job, bag, 'salt', at, false, 0.5)
  assert.deepEqual(job.point, p)
  for (let i = 0; i < 9000 && !job.stranded; i++) stepCase(job, bag, 'rain', at, false, 1 / 30)
  assert.ok(job.stranded)
  assert.ok(waterAt('rain', job.point.x, job.point.z).depth < 0.45)
  assert.ok(pickUpCase(job, bag).ok)
  stepCase(job, bag, 'rain', at, true, 0.1)
  assert.equal(job.phase, 'carried')
  assert.equal(bag.items.medicineCase, 1)
  stepCase(job, bag, 'rain', ferrySite().boatman, false, 0.1)
  assert.ok(deliverCase(job, bag, restored, 'rain', ferrySite().boatman).ok)
  assert.ok(restored.items.includes('回水湾草图'))
})
test('nearby map labels keep their geographic anchors and receive disjoint screen rectangles', () => {
  const labels = Array.from({ length: 9 }, (_, i) => ({
    x: 179 + i,
    y: 99 + i,
    name: '地点' + i,
    priority: i,
  }))
  const packed = placeMapLabels(labels, 460, 240, () => 63)
  assert.equal(packed.length, labels.length)
  for (let i = 0; i < packed.length; i++)
    for (const b of packed.slice(i + 1)) {
      const a = packed[i]
      assert.ok(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top)
    }
})
