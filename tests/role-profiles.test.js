import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Box3, Group, Vector3 } from 'three'
import { roles } from '../src/combat.js'
import { roleProfiles } from '../src/role-profiles.js'
import { avatarLook } from '../src/avatar.js'
import { createActor } from '../src/actors.js'
import { preparePhaseDial } from '../src/avatar-phase-dial.js'
import { wristRig } from '../src/avatar-wrists.js'
import { skins } from '../src/story.js'

test('each original character has an individual origin and a playable field tip', () => {
  assert.deepEqual(Object.keys(roleProfiles).sort(), Object.keys(roles).sort())
  const tips = new Set()
  for (const [key, { origin, fieldcraft }] of Object.entries(roleProfiles)) {
    assert.ok(origin.includes(roles[key].name))
    assert.ok(fieldcraft.length > 15)
    tips.add(fieldcraft)
  }
  assert.equal(tips.size, 4)
})

test('self-contained left-wrist gauge loads on every Tide costume in both camera perspectives', async () => {
  const file = await readFile(new URL('../src/avatar-models/phase-dial.glb', import.meta.url))
  const binary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  const geometry = await preparePhaseDial(binary)
  assert.equal(file.subarray(0, 4).toString(), 'glTF')
  assert.ok(file.length < 25 * 1024)
  assert.ok(geometry.index.count / 3 <= 480)
  assert.ok(geometry.getAttribute('color').normalized)
  const size = new Box3()
    .setFromBufferAttribute(geometry.getAttribute('position'))
    .getSize(new Vector3())
  assert.ok(Math.abs(size.x - 0.086) < 0.0001 && Math.abs(size.y - 0.1) < 0.0001)
  for (const role of Object.keys(roles))
    for (const skin of Object.keys(skins)) {
      const arms = [new Group(), new Group()]
      const wrist = wristRig(arms, avatarLook(role, skin))
      const external = createActor('duelist', 'capital', { role, skin })
      const visible = external.group.getObjectByName('潮汐听针')
      const wearable = arms[0].getObjectByName('潮汐听针')
      assert.equal(Boolean(visible), role === 'tide')
      assert.equal(Boolean(wearable), role === 'tide')
      assert.equal(arms[1].getObjectByName('潮汐听针'), undefined)
      if (visible) {
        assert.ok(visible.parent.position.x > 0)
        assert.equal(wearable.geometry.index.count, geometry.index.count)
        assert.equal(
          visible.geometry.getAttribute('position').count,
          geometry.getAttribute('position').count,
        )
        assert.notEqual(visible.geometry, wearable.geometry)
        assert.equal(visible.material, wearable.material)
      }
      wrist.dispose()
      external.dispose()
    }
})
