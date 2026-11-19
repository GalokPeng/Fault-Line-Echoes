import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import { heightAt } from '../src/biomes.js'
import { createCapital } from '../src/capital.js'
import { buildFloodEvidence, floodSites } from '../src/flood-evidence.js'
import { makePhysics } from '../src/physics.js'

test('both investigation points have dry standing room and a sight line to the clue', async () => {
  const scene = new T.Scene(),
    town = createCapital(scene)
  const height = (x, z) => heightAt('capital', x, z)
  const clues = buildFloodEvidence(scene, height)
  const terrain = new T.Mesh(new T.PlaneGeometry(96, 96, 16, 16))
  terrain.geometry.rotateX(-Math.PI / 2)
  const points = terrain.geometry.attributes.position
  for (let i = 0; i < points.count; i++) points.setY(i, height(points.getX(i), points.getZ(i)))
  const physics = await makePhysics(
    terrain,
    [],
    [...town.colliders, ...clues.structures],
    { x: 0, y: 24, z: 22 },
    48,
  )
  try {
    const a = floodSites.gauge,
      b = floodSites.bell
    for (const [x, z, mark] of [
      [a.x, a.z, [14.9, 25.33, 9.21]],
      [3, 12],
      [-4, 0],
      [b.x, b.z, [-14, 25.17, -14.3]],
    ]) {
      let p = physics.feet()
      for (let i = 0; i < 550 && Math.hypot(p.x - x, p.z - z) > 0.12; i++) {
        const l = Math.hypot(x - p.x, z - p.z)
        p = physics.move((0.068 * (x - p.x)) / l, (0.068 * (z - p.z)) / l, 1 / 60)
      }
      assert.ok(Math.hypot(p.x - x, p.z - z) < 0.12)
      assert.ok(Math.abs(p.y - height(x, z)) < 0.065)
      if (mark)
        assert.ok(
          physics.clear({ x: p.x, y: p.y + 1.61, z: p.z }, { x: mark[0], y: mark[1], z: mark[2] }),
        )
    }
  } finally {
    physics.dispose()
    terrain.geometry.dispose()
    clues.dispose()
    assert.equal(clues.group.parent, null)
    town.dispose()
  }
})
