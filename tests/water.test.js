import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {
  biomes,
  gridData,
  gridDivisions,
  heightAt,
  riverX,
  waterAt,
  waterSurfaceData,
} from '../src/biomes.js'
import { outcrops } from '../src/water-profile.js'
import { createWater } from '../src/water-render.js'
import { streamTerrain } from '../src/terrain-stream.js'

const regions = Object.keys(biomes)
const rivers = regions.filter((id) => id !== 'salt')
const close = (actual, expected, tolerance = 0.0001) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`)
}

test('all five water surfaces end exactly at the collision bed and form closed shorelines', () => {
  for (const id of regions) {
    const f = waterSurfaceData(id)
    assert.ok(f.shorelines.length > 100)
    const contacts = new Map()
    for (const line of f.shorelines) {
      for (const p of line) {
        close(p.y, heightAt(id, p.x, p.z), 1e-7)
        assert.ok(Math.max(Math.abs(p.x), Math.abs(p.z)) < biomes[id].radius - 2)
        const key = Math.round(p.x * 1e6) + ',' + Math.round(p.z * 1e6)
        contacts.set(key, (contacts.get(key) || 0) + 1)
      }
    }
    for (const count of contacts.values()) assert.equal(count, 2, id + ' has an open bank')
    for (let i = 0; i < f.positions.length; i += 9) {
      const at = (axis) =>
        (f.positions[i + axis] + f.positions[i + axis + 3] + f.positions[i + axis + 6]) / 3
      const x = at(0),
        z = at(2),
        w = waterAt(id, x, z)
      close(at(1), w.level)
      close(w.depth, Math.max(0, at(1) - heightAt(id, x, z)))
      assert.ok(w.wet || w.depth < 0.0001)
    }
  }
})

test('each river flows downhill and offers a continuous wet passage around its dry islands', () => {
  for (const id of rivers) {
    const { radius } = biomes[id],
      levels = waterSurfaceData(id).levels
    for (let j = 1; j < levels.length; j++) assert.ok(levels[j] < levels[j - 1])
    for (let z = -radius + 65; z < radius - 70; z += 2) {
      let deepest = 0
      for (let dx = -20; dx <= 20; dx += 1) {
        const w = waterAt(id, riverX(id, z) + dx, z)
        if (!w.wet) continue
        deepest = Math.max(deepest, w.depth)
        assert.ok(w.speed > 0 && w.flowZ > 0)
        close(Math.hypot(w.flowX, w.flowZ), 1)
      }
      assert.ok(deepest > 0.65, id + ' is blocked at ' + z)
    }
    for (const z of [-radius, radius]) assert.equal(waterAt(id, riverX(id, z), z).wet, false)
  }
})

test('meanders steer the current, raised solid rock divides it, and a wake forms downstream', () => {
  for (const id of rivers) {
    let splits = 0,
      sheltered = 0
    for (const s of outcrops(biomes[id], gridDivisions)) {
      assert.equal(waterAt(id, s.x, s.z).wet, false)
      const z = s.z - 0.66 * s.rz
      const tangent = (riverX(id, z + 1) - riverX(id, z - 1)) / 2
      const center = s.x + tangent * (z - s.z)
      const left = waterAt(id, center - s.rx * 0.8, z),
        right = waterAt(id, center + s.rx * 0.8, z)
      if (
        left.wet &&
        right.wet &&
        left.flowX / left.flowZ < tangent - 0.1 &&
        right.flowX / right.flowZ > tangent + 0.1
      )
        splits++
      const leeZ = s.z + s.rz * 1.3
      const lee = waterAt(id, s.x + riverX(id, leeZ) - riverX(id, s.z), leeZ)
      if (lee.wet && lee.wake > 0.3 && lee.foam > 0.18) sheltered++
    }
    assert.ok(splits >= 4, id + ' needs visible current on both flanks')
    assert.ok(sheltered >= 4, id + ' needs downstream turbulence')
  }
  const rapid = waterAt('rain', riverX('rain', -282), -282)
  const pool = waterAt('rain', riverX('rain', -207), -207)
  assert.ok(rapid.speed > pool.speed + 0.7)
  assert.ok(rapid.foam > pool.foam + 0.4)
})

test('brine stays in the salt basin, and water collection reaches a low bank only', () => {
  const id = 'salt',
    z = -164,
    x = riverX(id, z)
  const lake = waterAt(id, x, z)
  assert.equal(lake.kind, 'brine')
  assert.ok(lake.depth > 1)
  assert.deepEqual([lake.speed, lake.flowX, lake.flowZ, lake.foam], [0, 0, 0, 0])
  let edge = x
  while (waterAt(id, edge, z).wet) edge += 0.02
  assert.ok(waterAt(id, edge + 0.28, z).canCollect)
  assert.equal(waterAt(id, edge + 0.28, z).wet, false)
  assert.equal(waterAt(id, edge + 5, z).kind, 'dry')
  for (const zz of [-500, -300, 0, 340]) assert.equal(waterAt(id, riverX(id, zz), zz).canCollect, false)
  for (const world of regions) assert.equal(waterAt(world, ...biomes[world].town).canCollect, false)
  assert.equal(waterAt('capital', -85, -60).wet, false)
})

test('low detail keeps physical shore triangles at distance; moving bodies emit persistent local wave rings', () => {
  const n = gridDivisions,
    world = biomes.rain,
    values = gridData('rain')
  const g = new T.BufferGeometry(),
    pos = new Float32Array(values.length * 3)
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const k = j * (n + 1) + i
      pos.set(
        [
          (i / n) * 2 * world.radius - world.radius,
          values[k],
          (j / n) * 2 * world.radius - world.radius,
        ],
        k * 3,
      )
    }
  g.setAttribute('position', new T.BufferAttribute(pos, 3))
  const scene = new T.Scene(),
    ground = new T.Mesh(g)
  scene.add(ground)
  const water = createWater(scene, 'rain', ground, [])
  const mesh = scene.getObjectByName('connected-water-surface'),
    f = waterSurfaceData('rain')
  assert.equal(mesh.geometry.index.count, (f.positions.length / 3) * 16)
  const optics = mesh.material.uniforms
  water.setActor({ x: 82, z: -300 }, { x: 1, z: 2 }, 1)
  water.update(11, 1)
  assert.deepEqual(optics.impacts.value[0].toArray().slice(0, 3), [82, -300, 11])
  water.setActor(null)
  water.update(11.6, 1)
  assert.equal(optics.impacts.value[0].z, 11)
  assert.equal(optics.impacts.value[1].w, 0)
  const stream = streamTerrain(ground),
    tiles = scene.children.at(-1),
    cam = new T.PerspectiveCamera()
  cam.position.set(400, 150, 1100)
  cam.lookAt(0, 0, 0)
  stream.update(1, cam, 'low')
  assert.equal(tiles.children.length, 256)
  const fullSize = 17 ** 2 + 4 * 16,
    coarseSize = 5 ** 2 + 4 * 4
  for (let i = 0; i < 256; i++) {
    assert.equal(
      tiles.children[i].geometry.attributes.position.count,
      f.tileMask[i] ? fullSize : coarseSize,
    )
  }
  stream.dispose()
  scene.traverse((o) => {
    o.geometry?.dispose()
    o.material?.dispose()
  })
})
