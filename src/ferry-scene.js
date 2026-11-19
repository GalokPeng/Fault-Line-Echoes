import * as T from 'three'
import { ferrySite } from './medicine.js'
import { heightAt, riverX, waterAt } from './biomes.js'
import { createActor } from './actors.js'

export function makeFerryScene(scene, id) {
  const group = new T.Group(),
    structures = [],
    batches = new Map(),
    textures = []
  const cube = new T.BoxGeometry(),
    flatStone = new T.CylinderGeometry(0.53, 0.57, 1, 8)
  const materials = new Map(),
    arch = new T.Group()
  scene.add(group)
  group.add(arch)
  function mat(color) {
    if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.83 }))
    return materials.get(color)
  }
  function piece(geo, x, y, z, w, h, d, color, yaw = 0) {
    if (!batches.has(geo)) batches.set(geo, [])
    const o = new T.Object3D()
    o.position.set(x, y, z)
    o.scale.set(w, h, d)
    o.rotation.y = yaw
    o.updateMatrix()
    batches.get(geo).push([o.matrix, new T.Color(color)])
  }
  function box(x, y, z, w, h, d, color, solid = false) {
    piece(cube, x, y, z, w, h, d, color)
    if (solid) structures.push({ x, y, z, w, h, d })
  }
  function sign(text, x, y, z, color = '#355a51', yaw = 0) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 108
    const g = c.getContext('2d')
    g.fillStyle = color
    g.fillRect(0, 0, 512, 108)
    g.strokeStyle = '#bbaa78'
    g.lineWidth = 4
    g.strokeRect(7, 7, 498, 94)
    g.fillStyle = '#fff0ca'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = 'bold 42px "Microsoft YaHei",sans-serif'
    g.fillText(text, 256, 56, 470)
    const t = new T.CanvasTexture(c)
    t.colorSpace = T.SRGBColorSpace
    textures.push(t)
    const board = new T.Mesh(
      new T.PlaneGeometry(3.5, 0.74),
      new T.MeshBasicMaterial({ map: t, side: T.DoubleSide }),
    )
    board.position.set(x, y + 1.65, z)
    board.rotation.y = yaw
    arch.add(board)
    box(x, y + 0.86, z - 0.12, 0.15, 1.72, 0.15, '#554433')
  }
  let boatman
  if (id === 'rain') {
    const s = ferrySite(),
      z = s.bridge.z,
      deck = s.bridge.y,
      span = s.east - s.west,
      mid = (s.west + s.east) / 2
    // All planks share a continuous physical deck. Its ends meet both slopes.
    structures.push({ x: mid, y: deck - 0.19, z, w: span + 0.8, h: 0.38, d: 3.05 })
    for (let i = 0, n = Math.ceil(span / 0.5); i < n; i++)
      box(
        s.west + ((i + 0.5) * span) / n,
        deck - 0.1,
        z,
        span / n - 0.022,
        0.2,
        3.22,
        i % 4 === 0 ? '#806143' : '#99784e',
      )
    for (const side of [-1, 1]) {
      const zz = z + side * 1.46
      box(mid, deck - 0.29, zz, span, 0.45, 0.22, '#574638')
      box(mid, deck + 0.88, zz, span, 0.12, 0.14, '#716448', true)
      for (let i = 0, n = Math.ceil(span / 4.6); i <= n; i++) {
        const x = s.west + (i * span) / n
        box(x, deck + 0.44, zz, 0.18, 0.95, 0.18, '#665337')
        if (i % 2 === 0) {
          const bed = heightAt(id, x, zz)
          if (deck - bed > 0.4)
            box(x, (bed + deck) / 2 - 0.22, zz, 0.32, deck - bed + 0.34, 0.37, '#584635')
        }
      }
    }
    const level = s.ford.y + 0.15
    // Let the natural graded banks form the first and last step. A flat-sided
    // stone embedded in either sloping exit would catch the capsule on its lip.
    for (let i = -7; i <= 7; i++) {
      const x = s.ford.x + i * 1.95,
        zz = s.ford.z + Math.sin(i * 1.14) * 0.43
      const bed = heightAt(id, x, zz),
        top = Math.max(bed + 0.08, level - 0.14 + Math.sin(i * 1.5) * 0.09)
      const h = top - bed + 0.32,
        w = 1.77 + Math.cos(i) * 0.23,
        d = 2.58 + Math.sin(i) * 0.26
      piece(flatStone, x, top - h / 2, zz, w, h, d, i % 3 ? '#827f67' : '#9c9679', 0.17 * Math.sin(i))
      structures.push({ x, y: top - h / 2, z: zz, w: w * 0.88, h, d: d * 0.82 })
    }
    sign('浅汊渡口 · 上游高桥', s.fork.x - 1.7, s.fork.y, s.fork.z)
    sign('高岸驿桥', s.west - 1, deck, z + 2)
    const f = s.boatman
    sign('任舟 · 渡工棚', f.x + 2, heightAt(id, f.x + 2, f.z - 1), f.z - 1, '#764c34')
    for (const k of [-1, 1])
      for (const j of [-1, 1])
        box(f.x + k * 1.55, f.y + 1.1, f.z - 2 + j * 1.25, 0.13, 2.7, 0.13, '#70573e')
    box(f.x, f.y + 2.5, f.z - 2, 3.55, 0.13, 2.95, '#a19066')
    boatman = createActor('resident', id, '#8f8061')
    group.add(boatman.group)
    boatman.group.position.set(f.x, f.y, f.z)
    boatman.group.rotation.y = -Math.PI * 0.46
    const gaugeX = riverX(id, s.ford.z) - 12.2,
      gaugeZ = s.ford.z + 2.25
    for (let k = 0; k < 7; k++)
      box(gaugeX, level - 0.72 + k * 0.24, gaugeZ, 0.19, 0.24, 0.19, k % 2 ? '#b9533f' : '#ead9aa')
    // Ochre streamers lead to stepping stones; indigo ones follow the high bank.
    for (let i = 1; i <= 5; i++) {
      const zz = s.fork.z + ((z - s.fork.z) * i) / 5,
        xx = riverX(id, zz) - 30
      const gy = heightAt(id, xx, zz)
      box(xx, gy + 0.72, zz, 0.11, 1.44, 0.11, '#73583d')
      box(xx + 0.22, gy + 1.22, zz, 0.46, 0.31, 0.05, '#365b66')
    }
  }
  for (const [geo, entries] of batches) {
    const instances = new T.InstancedMesh(geo, mat('#ffffff'), entries.length)
    entries.forEach(([m, c], i) => {
      instances.setMatrixAt(i, m)
      instances.setColorAt(i, c)
    })
    instances.castShadow = true
    instances.receiveShadow = true
    group.add(instances)
  }
  const crate = new T.Group()
  group.add(crate)
  function panel(x, y, z, w, h, d, color) {
    const m = new T.Mesh(cube, mat(color))
    m.position.set(x, y, z)
    m.scale.set(w, h, d)
    crate.add(m)
  }
  panel(0, 0.18, 0, 0.68, 0.36, 0.5, '#717e55')
  panel(0, 0.39, 0, 0.72, 0.08, 0.54, '#b2ab7f')
  for (const x of [-0.23, 0.23]) panel(x, 0.22, 0, 0.055, 0.46, 0.55, '#674d36')
  panel(0.075, 0.29, 0.26, 0.1, 0.32, 0.035, '#bd4b38')
  panel(0, 0.57, 0, 0.45, 0.065, 0.06, '#705338')
  for (const x of [-0.2, 0.2]) panel(x, 0.49, 0, 0.05, 0.18, 0.06, '#705338')
  crate.visible = false
  return {
    structures,
    update(q, time, dt, hero) {
      const visible = q.zone === id && (q.phase === 'ground' || q.phase === 'floating')
      crate.visible = visible
      if (visible) {
        const p = q.point,
          afloat = q.phase === 'floating'
        crate.position.set(p.x, p.y + (afloat ? -0.12 + 0.055 * Math.sin(time * 3) : 0.02), p.z)
        crate.rotation.set(
          afloat ? 0.09 * Math.cos(time * 2) : 0,
          afloat ? time * 0.17 : 0.2,
          afloat ? 0.09 * Math.sin(time * 2.3) : 0,
        )
      }
      if (
        boatman &&
        Math.hypot(hero.x - boatman.group.position.x, hero.z - boatman.group.position.z) < 70
      )
        boatman.update(dt, false, false, time)
    },
    dispose() {
      group.removeFromParent()
      boatman?.group.removeFromParent()
      boatman?.dispose()
      for (const o of arch.children) {
        o.material.dispose()
        o.geometry.dispose()
      }
      for (const t of textures) t.dispose()
      group.traverse((o) => {
        if (o.isInstancedMesh) o.dispose()
      })
      cube.dispose()
      flatStone.dispose()
      for (const m of materials.values()) m.dispose()
    },
  }
}
