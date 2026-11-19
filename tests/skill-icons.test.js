import test from 'node:test'
import assert from 'node:assert/strict'
import { roles, attackStyle } from '../src/combat.js'
import { skillIcon, skillHint } from '../src/skill-icons.js'

test('all sixteen skills have distinct SVGs and tooltips reflecting the live kit', (t) => {
  const doc = {
    createElementNS(namespace, tag) {
      return {
        namespace,
        tag,
        attributes: {},
        children: [],
        setAttribute(k, v) {
          this.attributes[k] = v
        },
        append(node) {
          this.children.push(node)
        },
      }
    },
  }
  const previous = globalThis.document
  globalThis.document = doc
  t.after(() => {
    if (previous === undefined) delete globalThis.document
    else globalThis.document = previous
  })
  const shapes = new Set()
  for (const role of Object.keys(roles)) {
    for (const key of ['q', 'e', 'c', 'v']) {
      const icon = skillIcon(role, key),
        spec = attackStyle(role, key)
      assert.equal(icon.namespace, 'http://www.w3.org/2000/svg')
      assert.notEqual(icon, skillIcon(role, key.toUpperCase()))
      assert.ok(icon.children.length >= 3)
      shapes.add(icon.children[0].attributes.d)
      const hint = skillHint(role, key)
      assert.ok(hint.length > 5)
      if (spec.shot && !spec.dash) assert.ok(hint.includes(spec.shot + '米'))
      if (spec.parry) assert.ok(hint.includes(spec.parry + '秒'))
    }
  }
  assert.equal(shapes.size, 16)
  assert.equal(skillHint('leaf', 'x'), '')
})
