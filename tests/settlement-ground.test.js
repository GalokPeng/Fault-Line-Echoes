import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import { biomes, heightAt, gridData, gridDivisions, waterAt } from '../src/biomes.js'
import { houseFoundation, settlementLayouts } from '../src/settlement-sites.js'
import { gates, entryAt } from '../src/borders.js'
import { crossedPassage, passageFor } from '../src/passages.js'
import { createGateway } from '../src/settlement-gateways.js'
import { createSettlement } from '../src/settlements.js'
import { makePhysics } from '../src/physics.js'

function collisionGround(id) {
  const radius = biomes[id].radius
  const geo = new T.PlaneGeometry(radius * 2, radius * 2, gridDivisions, gridDivisions)
  geo.rotateX(-Math.PI / 2)
  const heights = gridData(id),
    pos = geo.attributes.position
  for (let i = 0; i < heights.length; i++) pos.setY(i, heights[i])
  return new T.Mesh(geo)
}
for (const id of Object.keys(settlementLayouts)) {
  test(id + ' houses, approaches and border arches share the collision terrain', async () => {
    const scene = new T.Scene(),
      town = createSettlement(scene, id)
    const portals = gates(id).map((g) => passageFor(id, g))
    const fixtures = portals.map((g) => createGateway(scene, id, g))
    const colliders = town.colliders.concat(...fixtures.map((f) => f.colliders))
    const ground = collisionGround(id)
    const world = await makePhysics(
      ground,
      [],
      colliders,
      { x: 0, z: 18, y: biomes[id].level },
      biomes[id].radius,
    )
    try {
      for (const [x, z, a, w, d] of settlementLayouts[id]) {
        const site = houseFoundation(id, x, z, a, w, d)
        const [ax, az] = site.approach
        world.teleport(ax, heightAt(id, ax, az), az)
        const inward = [-Math.sin(a), -Math.cos(a)]
        const distance = Math.hypot(ax - x, az - z) - d / 2 + 1.04
        for (let i = 0; i < Math.ceil(distance / 0.07); i++)
          world.move(inward[0] * 0.07, inward[1] * 0.07, 1 / 60)
        const pos = world.feet(),
          label = id + ' ' + x + ',' + z
        assert.ok(
          (pos.x - x) * -inward[0] + (pos.z - z) * -inward[1] < d / 2 - 0.45,
          label + ' enter ' + JSON.stringify(pos),
        )
        assert.ok(Math.abs(site.floor - pos.y) < 0.065, label + ' floor ' + pos.y + ' vs ' + site.floor)
        for (let i = 0; i < Math.ceil(distance / 0.07); i++)
          world.move(-inward[0] * 0.07, -inward[1] * 0.07, 1 / 60)
        const out = world.feet()
        assert.ok(
          (out.x - ax) * inward[0] + (out.z - az) * inward[1] < 0.33,
          label + ' return past the steps',
        )
        assert.ok(
          Math.abs((out.x - ax) * inward[1] - (out.z - az) * inward[0]) < 0.25,
          label + ' exit alignment',
        )
      }
      for (const [startKind, endKind] of [
        ['stairs', 'upper'],
        ['entrance', 'underground'],
      ]) {
        const a = town.features.find((p) => p.kind === startKind),
          b = town.features.find((p) => p.kind === endKind)
        const length = Math.hypot(a.x - b.x, a.z - b.z),
          dx = (b.x - a.x) / length,
          dz = (b.z - a.z) / length
        world.teleport(a.x, heightAt(id, a.x, a.z), a.z)
        for (let i = 0; i < Math.ceil((2 * length) / 0.07); i++) {
          if ((world.feet().x - b.x) * dx + (world.feet().z - b.z) * dz >= -0.3) break
          world.move(dx * 0.07, dz * 0.07, 1 / 60)
        }
        assert.ok(
          Math.hypot(world.feet().x - b.x, world.feet().z - b.z) < 0.65,
          id + ' reach ' + endKind + ' ' + JSON.stringify({ a, b, pos: world.feet() }),
        )
        assert.ok(Math.abs(world.feet().y - b.y) < 0.25, id + ' elevation ' + endKind)
      }
      for (const g of portals) {
        const entry = entryAt(id, g.to)
        for (const side of [0, g.radius - 0.68, -g.radius + 0.68]) {
          const x = entry.x + side * g.nz,
            z = entry.z - side * g.nx
          assert.equal(waterAt(id, x, z).wet, false)
          assert.ok(Math.abs(heightAt(id, x, z) - g.y) < 0.01)
          world.teleport(x, heightAt(id, x, z), z)
          let crossed = false
          for (let i = 0; i < 150; i++) {
            const before = world.feet(),
              after = world.move(g.nx * 0.085, g.nz * 0.085, 1 / 60)
            crossed ||= !!crossedPassage([g], before, after)
          }
          assert.ok(crossed, id + ' border ' + g.name + ' at ' + side)
        }
        const x = g.x + (g.radius + 0.59) * g.nz,
          z = g.z - (g.radius + 0.59) * g.nx
        world.teleport(x - g.nx * 4, g.y, z - g.nz * 4)
        for (let i = 0; i < 100; i++) world.move(g.nx * 0.085, g.nz * 0.085, 1 / 60)
        assert.ok(
          (world.feet().x - g.x) * g.nx + (world.feet().z - g.z) * g.nz < -1,
          g.name + ' stone jamb',
        )
      }
    } finally {
      world.dispose()
      ground.geometry.dispose()
      town.dispose()
      fixtures.forEach((f) => f.dispose())
    }
  })
}
