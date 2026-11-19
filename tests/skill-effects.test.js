import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import { attackStyle } from '../src/combat.js'
import { createSkillEffects } from '../src/skill-effects.js'

test('ground waves stay on the caster’s bridge or tunnel floor and follow nearby terrain slopes', () => {
  for (const floorY of [12, -8, 2.12]) {
    const scene = new T.Scene()
    const kit = createSkillEffects(scene, (_x, z) => 2 - 0.25 * z)
    const geometry = scene.getObjectByName('skill-cast-and-contact').geometry
    const position = geometry.attributes.position
    kit.cast(
      { ...attackStyle('stone', 'c'), groundY: floorY },
      { x: 0, y: floorY + 1.64, z: 0 },
      { x: 0, y: 0, z: -1 },
    )
    kit.update(0.17)
    for (let i = 0; i < geometry.drawRange.count; i++) {
      const z = position.getZ(i)
      const support = floorY === 2.12 ? floorY - 0.25 * z : floorY
      assert.ok(position.getY(i) >= support + 0.025 && position.getY(i) <= support + 1.36)
    }
    kit.dispose()
  }
})

test('all sixteen casts make distinct directed geometry, respect the first-person near field, and expire', () => {
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera()
  scene.add(camera)
  camera.position.set(2, 4, 5)
  const origin = camera.position,
    dir = new T.Vector3(0.7, 0, -0.5).normalize(),
    v = new T.Vector3()
  const kit = createSkillEffects(scene, () => origin.y - 1.64),
    mesh = scene.getObjectByName('skill-cast-and-contact')
  const g = mesh.geometry,
    attr = g.attributes.position,
    looks = new Set()
  for (const role of ['leaf', 'stone', 'tide', 'beam'])
    for (const key of ['q', 'e', 'c', 'v']) {
      const spec = attackStyle(role, key)
      kit.clear()
      assert.ok(kit.cast(spec, origin, dir))
      kit.update(0.045)
      const n = g.drawRange.count
      assert.ok(mesh.visible && n > 0 && n % 3 === 0)
      const floats = attr.array.slice(0, n * 3)
      looks.add(JSON.stringify([...floats].map((c) => Math.round(c * 100))))
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(attr, i).sub(origin)
        assert.ok(v.length() < Math.min(3.6, (spec.shot || spec.dist) + 0.5))
        assert.ok(v.length() > 0.5, 'near-plane geometry')
        assert.ok(v.dot(dir) > -0.1, 'effect unintentionally behind the caster')
      }
      kit.update(1.3)
      assert.equal(g.drawRange.count, 0)
      assert.equal(mesh.visible, false)
    }
  assert.equal(looks.size, 16)
  kit.dispose()
  assert.equal(mesh.parent, null)
})
test('blocked contacts differ from hits, ground strokes sample the slope, and spam uses one bounded buffer', () => {
  const scene = new T.Scene(),
    cam = new T.PerspectiveCamera()
  cam.position.set(0, 2, 0)
  scene.add(cam)
  const points = []
  const kit = createSkillEffects(scene, (x, z) => {
    points.push([x, z])
    return -0.21 * z
  })
  const obj = scene.getObjectByName('skill-cast-and-contact'),
    g = obj.geometry,
    p = g.attributes.position
  const at = { x: 0, y: 2, z: -2 },
    dir = { x: 0, y: 0, z: -1 },
    c = attackStyle('stone', 'c')
  assert.ok(kit.cast(c, cam.position, dir))
  kit.update(0.17)
  assert.ok(points.length > 20)
  kit.clear()
  kit.impact(c, at)
  kit.update(0.1)
  const hit = g.drawRange.count,
    hitColor = g.attributes.color.array.slice(0, 12)
  kit.clear()
  kit.impact(c, at, true)
  kit.update(0.1)
  assert.notEqual(g.drawRange.count, hit)
  assert.notDeepEqual(g.attributes.color.array.slice(0, 12), hitColor)
  for (let i = 0; i < 180; i++) kit.cast(attackStyle('beam', 'v'), cam.position, { x: 0, y: 1, z: 0 })
  kit.update(0.06)
  assert.ok(g.drawRange.count <= p.count && g.drawRange.count > 0)
  assert.equal(scene.children.filter((o) => o.isMesh).length, 1)
  assert.ok(p.array.subarray(0, g.drawRange.count * 3).every(Number.isFinite))
  kit.clear()
  assert.equal(obj.visible, false)
  assert.equal(kit.cast({ role: 'unknown', key: 'v' }, at, dir), false)
  assert.equal(kit.cast(c, at, { x: 0, y: 0, z: 0 }), false)
  kit.dispose()
  assert.equal(kit.impact(c, at), false)
})
