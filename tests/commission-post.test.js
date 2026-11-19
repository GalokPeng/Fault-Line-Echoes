import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import { commissionPostSite, buildCommissionPost } from '../src/commission-post.js'
import { biomes, heightAt, gridData, gridDivisions } from '../src/biomes.js'
import { createSettlement } from '../src/settlements.js'
import { makePhysics } from '../src/physics.js'

test('all four commission boards can be reached from the market street and removed with their scene', async () => {
  for (const zone of ['rain', 'salt', 'root', 'gorge']) {
    const scene = new T.Scene(),
      town = createSettlement(scene, zone)
    const ground = (x, z) => heightAt(zone, x, z),
      board = buildCommissionPost(scene, zone, ground)
    const site = commissionPostSite(zone),
      geometry = new T.PlaneGeometry(
        biomes[zone].radius * 2,
        biomes[zone].radius * 2,
        gridDivisions,
        gridDivisions,
      )
    geometry.rotateX(-Math.PI / 2)
    const h = gridData(zone)
    for (let i = 0; i < h.length; i++) geometry.attributes.position.setY(i, h[i])
    const start = { x: 0, y: ground(0, site.z), z: site.z }
    const physics = await makePhysics(
      new T.Mesh(geometry),
      [],
      town.colliders.concat(board.colliders),
      start,
      biomes[zone].radius,
    )
    try {
      for (let i = 0; i < Math.ceil(Math.abs(site.x) / 0.07); i++)
        physics.move(Math.sign(site.x) * 0.07, 0, 1 / 60)
      const p = physics.feet()
      assert.ok(Math.hypot(p.x - site.x, p.z - site.z) < 0.25, zone)
      assert.equal(board.group.name, site.title)
      assert.equal(board.group.parent, scene)
      assert.ok(board.group.getObjectByName('posted-notices'))
      const target = board.group.localToWorld(new T.Vector3(0, 1.44, 0.23))
      assert.ok(
        physics.clear({ x: p.x, y: p.y + 1.5, z: p.z }, target),
        zone + ' reading position is obstructed',
      )
      assert.equal(board.colliders.length, 3)
    } finally {
      physics.dispose()
      geometry.dispose()
      town.dispose()
      board.dispose()
    }
    assert.equal(board.group.parent, null)
  }
  assert.equal(commissionPostSite('capital'), null)
})
