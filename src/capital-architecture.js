import * as T from 'three'
import { Batch } from './settlement-geometry.js'
import { at } from './settlement-kit.js'
import { civicTexture } from './capital-landscape.js'
import { civicLevel } from './capital-data.js'

export const hue = {
  ivory: '#e1dfd2',
  cool: '#c6cfca',
  ash: '#a4ada6',
  base: '#8c9894',
  bronze: '#a59061',
  ink: '#414f50',
  water: '#56858a',
  slate: '#546b78',
  copper: '#658c87',
  wood: '#665442',
  flag: '#3f7180',
  red: '#98605a',
}
const pediment = new T.BufferGeometry()
pediment.setAttribute('position', new T.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0], 3))
pediment.computeVertexNormals()
export function architect(scene) {
  const group = new T.Group()
  group.name = '白砥城 · 建筑'
  scene.add(group)
  const materials = {
    marble: new T.MeshStandardMaterial({
      map: civicTexture('marble'),
      vertexColors: true,
      roughness: 0.74,
      side: T.DoubleSide,
    }),
    roof: new T.MeshStandardMaterial({
      map: civicTexture('roof'),
      vertexColors: true,
      roughness: 0.74,
      side: T.DoubleSide,
    }),
    wood: new T.MeshStandardMaterial({
      map: civicTexture('grain'),
      vertexColors: true,
      roughness: 0.94,
    }),
    metal: new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.24, roughness: 0.62 }),
    lamp: new T.MeshStandardMaterial({ vertexColors: true, emissive: '#f9ac53', emissiveIntensity: 1 }),
    ember: new T.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#ff5c1e',
      emissiveIntensity: 1.45,
      roughness: 0.72,
    }),
    window: new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.51,
      emissive: '#d6a361',
      emissiveIntensity: 0.1,
    }),
  }
  const lights = [new T.PointLight(0xffad60, 0, 16, 2), new T.PointLight(0xffbf78, 0, 13, 2)]
  group.add(...lights)
  const flames = [
    [-5, 18],
    [-42, 64],
    [104, 77],
    [-200, -7],
    [200, 7],
    [-7, -200],
    [7, 200],
    [-65, -53],
    [-43, -53],
  ]
  let lastX = Infinity,
    lastZ = Infinity
  const sectors = new Map(),
    colliders = [],
    signs = []
  function kit(x, z, angle = 0, y = civicLevel, detail = false) {
    const tx = Math.floor(x / 64),
      tz = Math.floor(z / 64),
      key = [tx, tz, detail].join('/')
    if (!sectors.has(key)) {
      const tile = new T.Group()
      tile.name = '城坊 ' + key
      group.add(tile)
      sectors.set(key, {
        group: tile,
        batch: new Batch(tile, materials, true),
        cx: tx * 64 + 32,
        cz: tz * 64 + 32,
        detail,
      })
    }
    const sector = sectors.get(key)
    const b = at(
      { ...sector, id: 'capital', colliders, signs, colors: { wood: hue.wood, trim: hue.bronze } },
      x,
      z,
      angle,
      y,
    )
    b.gable = (a, h, c, w, rise, back) =>
      sector.batch.add('marble', pediment, hue.cool, ...b.pt(a, h, c), w, rise, 1, [
        0,
        angle + (back ? Math.PI : 0),
        0,
      ])
    return b
  }
  function finish() {
    for (const tile of sectors.values()) {
      tile.batch.finish()
      for (const o of tile.group.children) {
        o.geometry?.computeBoundingSphere()
        if (tile.detail) o.castShadow = false
      }
    }
  }
  return {
    group,
    materials,
    colliders,
    kit,
    finish,
    update(day, time) {
      materials.lamp.emissiveIntensity = 0.38 + 2.5 * (1 - day) + 0.06 * Math.sin(time * 4.3)
      materials.window.emissiveIntensity = 0.045 + (1 - day) * 0.95
      const pos = scene.userData.capitalCamera
      if (pos) {
        if (Math.abs(pos.x - lastX) + Math.abs(pos.z - lastZ) > 4) {
          lastX = pos.x
          lastZ = pos.z
          for (const tile of sectors.values())
            tile.group.visible = !tile.detail || Math.hypot(pos.x - tile.cx, pos.z - tile.cz) < 168
          const nearest = [...flames].sort(
            (a, b) =>
              (a[0] - pos.x) ** 2 + (a[1] - pos.z) ** 2 - (b[0] - pos.x) ** 2 - (b[1] - pos.z) ** 2,
          )
          lights.forEach((light, i) => {
            const f = nearest[i]
            light.position.set(f[0], civicLevel + (f[1] === -53 ? 6.3 : 1.8), f[1])
          })
        }
        lights.forEach((light, i) => {
          light.intensity = (1 - day) * (42 + 3 * Math.sin(time * 5 + i))
        })
      }
    },
    dispose() {
      group.traverse((o) => o.geometry?.dispose())
      group.removeFromParent()
      for (const m of [...Object.values(materials), ...signs]) {
        m.map?.dispose()
        m.dispose()
      }
    },
  }
}
export function cornice(b, x, y, z, w, d) {
  b.box('marble', hue.ash, x, y - 0.16, z, w + 0.24, 0.25, d + 0.24)
  b.box('marble', hue.ivory, x, y + 0.08, z, w + 0.57, 0.23, d + 0.57)
}
export function column(b, x, z, base, h, r) {
  b.box('marble', hue.cool, x, base + 0.16, z, r * 2.85, 0.32, r * 2.85)
  b.cyl('marble', hue.ash, x, base + 0.39, z, r * 1.33, 0.2, r * 1.33, 1, 1, 12)
  b.cyl('marble', hue.ivory, x, base + h / 2, z, r, h - 0.82, r, 0.8, 1, 12)
  b.cyl('marble', hue.bronze, x, base + h - 0.46, z, r * 0.96, 0.1, r * 0.96, 1, 1, 12)
  b.cyl('marble', hue.cool, x, base + h - 0.26, z, r * 1.24, 0.32, r * 1.24, 1, 0.73, 12)
  b.box('marble', hue.ivory, x, base + h - 0.07, z, r * 2.85, 0.19, r * 2.85)
  b.hit(x, base + h / 2, z, r * 1.65, h, r * 1.65)
}
// Tapered keystones form an open arch; its passable aperture is retained in the physics.
export function arch(b, x, y, z, r, thick, depth, pier = true) {
  if (pier)
    for (const s of [-1, 1])
      b.box('marble', hue.cool, x + s * (r + thick / 2), y / 2, z, thick, y, depth, true)
  const count = r > 4 ? 15 : 11,
    arc = r + thick / 2
  for (let i = 0; i < count; i++) {
    const a = ((i + 0.5) * Math.PI) / count
    b.box(
      'marble',
      i === count >> 1 ? hue.ivory : i % 3 === 0 ? hue.cool : hue.ivory,
      x + Math.cos(a) * arc,
      y + Math.sin(a) * arc,
      z,
      arc * 2 * Math.sin(Math.PI / count / 2) * 1.06,
      thick * (i === count >> 1 ? 1.18 : 1),
      depth,
      false,
      0,
      a - Math.PI / 2,
    )
  }
}
export function roof(b, x, y, z, w, d, pitch, color = hue.slate) {
  for (const s of [-1, 1]) {
    const len = Math.hypot(w / 2, pitch),
      angle = Math.atan2(pitch, w / 2)
    b.box('roof', color, x + (s * w) / 4, y + pitch / 2, z, len, 0.29, d, false, 0, -s * angle)
    b.box('metal', hue.bronze, x + s * w * 0.5, y, z, 0.125, 0.14, d)
  }
  b.box('metal', hue.bronze, x, y + pitch + 0.1, z, 0.18, 0.22, d + 0.28)
  for (const s of [-1, 1]) {
    b.gable(x, y, z + s * (d / 2 - 0.26), w - 0.99, pitch - 0.19, s < 0)
    b.rod(
      'marble',
      hue.ivory,
      [x - (w - 0.83) / 2, y + 0.02, z + s * (d / 2 - 0.17)],
      [x, y + pitch - 0.02, z + s * (d / 2 - 0.17)],
      0.16,
      true,
    )
    b.rod(
      'marble',
      hue.ivory,
      [x + (w - 0.83) / 2, y + 0.02, z + s * (d / 2 - 0.17)],
      [x, y + pitch - 0.02, z + s * (d / 2 - 0.17)],
      0.16,
      true,
    )
  }
}
export function sash(b, x, y, z, w, h) {
  b.box('marble', hue.cool, x, y, z, w + 0.27, h + 0.31, 0.22)
  b.box('wood', hue.ink, x, y, z + 0.13, w, h, 0.09)
  b.box('window', '#667e84', x, y + 0.05, z + 0.19, w * 0.79, h * 0.85, 0.025)
  b.box('wood', hue.wood, x, y, z + 0.22, 0.095, h, 0.05)
  b.box('wood', hue.wood, x, y + 0.04 * h, z + 0.22, w, 0.075, 0.05)
  b.box('marble', hue.ivory, x, y - h / 2 - 0.11, z + 0.15, w + 0.36, 0.14, 0.36)
}
export function banner(b, x, y, z, h, w, col = hue.flag) {
  b.box('metal', hue.bronze, x, y + h / 2, z, w + 0.3, 0.12, 0.19)
  b.box('roof', col, x, y, z, w, h, 0.095)
  b.box('metal', hue.bronze, x, y, z + 0.059, w * 0.056, h * 0.92, 0.02)
  b.box('metal', hue.bronze, x, y + 0.09 * h, z + 0.072, w * 0.36, 0.09, 0.024, false, 0, 0.44)
  b.box('metal', hue.bronze, x, y - 0.087 * h, z + 0.072, w * 0.36, 0.09, 0.024, false, 0, -0.44)
}
export function flag(b, x, y, z, scale = 1) {
  b.cyl('metal', hue.bronze, x, y + 1.82 * scale, z, 0.055 * scale, 3.64 * scale, 0.055 * scale)
  b.box(
    'roof',
    hue.flag,
    x + 0.75 * scale,
    y + 2.84 * scale,
    z,
    1.53 * scale,
    0.75 * scale,
    0.065 * scale,
    false,
    0,
    -0.07,
  )
  b.ell('metal', hue.bronze, x, y + 3.74 * scale, z, 0.1 * scale, 0.14 * scale, 0.1 * scale)
}
export function brazier(b, x, z) {
  b.cyl('marble', hue.ash, x, 0.14, z, 0.65, 0.27, 0.65, 1, 1, 8)
  b.cyl('marble', hue.cool, x, 0.64, z, 0.34, 0.86, 0.34, 0.89, 1.16, 8)
  b.cyl('metal', hue.bronze, x, 1.13, z, 0.63, 0.42, 0.63, 1, 0.45, 10)
  b.cyl('metal', hue.ink, x, 1.34, z, 0.55, 0.06, 0.55, 1, 1, 10)
  for (let j = 0; j < 4; j++)
    b.cyl(
      'lamp',
      '#ffc77a',
      x + Math.sin(j * 1.83) * 0.2,
      1.55 + (j % 2) * 0.07,
      z + Math.cos(j * 1.79) * 0.2,
      0.19,
      0.58 + (j % 2) * 0.14,
      0.16,
      0,
      1,
      7,
      0,
      (j - 2) * 0.12,
    )
  b.hit(x, 0.63, z, 0.83, 1.26, 0.83)
}
export function stairFlight(b, x, front, back, y, w) {
  const n = Math.ceil(y / 0.23),
    run = (back - front) / n
  for (let i = 0; i < n; i++) {
    const h = (y * (i + 1)) / n,
      z = front + run * (i + 0.5)
    b.box('marble', i % 3 === 0 ? hue.cool : hue.ivory, x, h / 2, z, w, h, Math.abs(run) + 0.012, true)
  }
  for (const s of [-1, 1]) {
    b.rod(
      'marble',
      hue.ash,
      [x + s * (w / 2 + 0.16), 0.5, front],
      [x + s * (w / 2 + 0.16), y + 0.52, back],
      0.27,
      true,
    )
    for (let i = 0; i <= 4; i++) {
      const t = i / 4
      b.box(
        'marble',
        hue.cool,
        x + s * (w / 2 + 0.16),
        y * t + 0.36,
        front + (back - front) * t,
        0.36,
        0.72,
        0.36,
      )
    }
  }
}
