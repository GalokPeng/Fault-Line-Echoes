import * as THREE from 'three'
import { assetUrl } from './asset-url.js'
import { clamp, mix } from './biomes.js'

export function random(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
const v = (x, y, z) => new THREE.Vector3(x, y, z)
const tint = (hex, n = 1) => new THREE.Color(hex).multiplyScalar(n)
// Curved branches, bark fluting, hand-shaped stone strata and foliage all share
// a small mesh writer, keeping the number of draw calls independent of tree count.
export class Shape {
  constructor() {
    this.p = []
    this.c = []
    this.uv = []
    this.i = []
  }
  vert(p, c, u = 0, vv = 0) {
    const j = this.p.length / 3
    this.p.push(p.x, p.y, p.z)
    this.c.push(c.r, c.g, c.b)
    this.uv.push(u, vv)
    return j
  }
  join(a, b, c, d) {
    this.i.push(a, b, d, b, c, d)
  }
  tube(path, colors, sides = 8, phase = 0, ruffle = 0) {
    const rings = []
    let length = 0
    for (let j = 0; j < path.length; j++) {
      const [x, y, z, rx, rz = rx] = path[j],
        next = path[Math.min(j + 1, path.length - 1)],
        prev = path[Math.max(0, j - 1)]
      const tangent = v(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize()
      const basis = (Math.abs(tangent.y) > 0.92 ? v(1, 0, 0) : v(0, 1, 0)).cross(tangent).normalize()
      const side = tangent.clone().cross(basis),
        ring = []
      const color = typeof colors === 'function' ? colors(j) : colors
      if (j) length += Math.hypot(x - prev[0], y - prev[1], z - prev[2])
      for (let k = 0; k <= sides; k++) {
        const ang = (2 * Math.PI * k) / sides + phase,
          ir = 1 + ruffle * Math.sin(3 * ang + 0.4 * j)
        const p = v(x, y, z)
          .addScaledVector(basis, Math.cos(ang) * rx * ir)
          .addScaledVector(side, Math.sin(ang) * rz * ir)
        ring.push(this.vert(p, color, (k / sides) * Math.max(0.35, path[0][3] * 2.6), length / 2.8))
      }
      if (j)
        for (let k = 0; k < sides; k++)
          this.join(rings[j - 1][k], rings[j - 1][k + 1], ring[k + 1], ring[k])
      rings.push(ring)
    }
    const end = path.at(-1),
      cap = this.vert(
        v(end[0], end[1], end[2]),
        typeof colors === 'function' ? colors(path.length - 1) : colors,
        0.5,
        0.5,
      )
    for (let k = 0; k < sides; k++) this.i.push(cap, rings.at(-1)[k], rings.at(-1)[k + 1])
  }
  leafCard(center, angle, w, h, tilt, color, roll = 0) {
    const across = v(Math.cos(angle), 0, Math.sin(angle))
    const along = v(-Math.sin(angle) * Math.sin(tilt), Math.cos(tilt), Math.cos(angle) * Math.sin(tilt))
    const original = across.clone()
    across.multiplyScalar(Math.cos(roll)).addScaledVector(along, Math.sin(roll))
    along.multiplyScalar(Math.cos(roll)).addScaledVector(original, -Math.sin(roll))
    const p = []
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 3; i++) {
        const pos = center
          .clone()
          .addScaledVector(across, ((i - 1) * w) / 2)
          .addScaledVector(along, ((j - 1) * h) / 2)
        pos.y -= Math.abs(i - 1) * Math.abs(j - 1) * h * 0.08
        p.push(this.vert(pos, color, i / 2, j / 2))
      }
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const a = j * 3 + i
        this.join(p[a], p[a + 1], p[a + 4], p[a + 3])
      }
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setIndex(this.i)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }
}
export function foliageTexture(kind) {
  const rv = random(kind === 'frond' ? 4923 : 7842)
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  if (kind === 'frond') {
    ctx.lineCap = 'round'
    for (let i = 0; i < 35; i++) {
      const u = i / 35,
        y = 247 - u * 235,
        len = 11 + 94 * Math.pow(Math.sin(Math.PI * u), 0.68)
      const x = 128 + 5 * Math.sin(u * 4)
      for (const side of [-1, 1]) {
        const l = len * (0.87 + 0.13 * rv())
        ctx.fillStyle = `rgb(${142 + Math.floor(53 * rv())},${174 + Math.floor(54 * rv())},${114 + Math.floor(43 * rv())})`
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + side * l * 0.45, y - 6, x + side * l, y - 31 + 15 * u)
        ctx.quadraticCurveTo(x + side * l * 0.55, y - 4, x, y + 3)
        ctx.fill()
      }
    }
    ctx.strokeStyle = '#c6c38d'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(128, 253)
    ctx.quadraticCurveTo(135, 120, 125, 4)
    ctx.stroke()
  } else {
    // Individual leaf silhouettes on arced scaffold twigs; the gaps admit skylight.
    const branches = []
    for (let i = 0; i < 32; i++) {
      const angle = rv() * Math.PI * 2,
        r = Math.sqrt(rv()) * 0.82
      const x = 128 + Math.cos(angle) * 104 * r,
        y = 128 + Math.sin(angle) * 90 * r
      branches.push([x, y])
      ctx.strokeStyle = 'rgba(101,103,68,.85)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(127, 178)
      ctx.quadraticCurveTo((x + 128) / 2, y + 19, x, y)
      ctx.stroke()
    }
    for (const [cx, cy] of branches)
      for (let j = 0; j < 31; j++) {
        const a = rv() * 6.28,
          r = Math.sqrt(rv()) * 22,
          x = cx + Math.cos(a) * r,
          y = cy + Math.sin(a) * r
        const light = clamp((1 - y / 256) * 0.4 + rv() * 0.6)
        ctx.fillStyle = `rgb(${Math.floor(111 + light * 116)},${Math.floor(139 + light * 103)},${Math.floor(85 + light * 94)})`
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(a + 0.45)
        ctx.beginPath()
        ctx.ellipse(0, 0, 4 + rv() * 5.2, 1.7 + rv() * 1.7, 0, 0, 6.29)
        ctx.fill()
        ctx.restore()
      }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 2
  return tex
}
export function plantMaterials() {
  const verts = { vertexColors: true, roughness: 1 }
  const foliage = (map) =>
    new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, vertexColors: true, alphaTest: 0.36 })
  return {
    wood: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    leaves: foliage(foliageTexture('leaf')),
    fronds: foliage(foliageTexture('frond')),
    stone: new THREE.MeshStandardMaterial({ ...verts, side: THREE.DoubleSide }),
    grass: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  }
}
export function photoSet(name) {
  const loader = new THREE.TextureLoader()
  const make = (kind) => {
    const t = loader.load(assetUrl('/terrain-materials/' + name + '-' + kind + '.webp'))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
    if (kind === 'albedo') t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  return { map: make('albedo'), normalMap: make('normal') }
}
export function photographedRock(mat, forest) {
  Object.assign(mat, photoSet(forest ? 'forest-rock' : 'desert-rock'))
  mat.normalScale.set(0.88, 0.88)
  mat.flatShading = true
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
      #ifdef USE_INSTANCING
      vec2 tile=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz))*.49;
      vMapUv*=tile;vNormalMapUv*=tile;
      #endif`,
    )
  }
  return mat
}
export function treeKit(type, seed) {
  const rng = random(seed),
    wood = new Shape(),
    leaves = new Shape(),
    palmy = type === 'palm' || type === 'fern'
  const old = type === 'old',
    dry = type === 'acacia',
    small = type === 'fern',
    h = small ? 2.6 : palmy ? 13 : old ? 31 : dry ? 8.4 : 16.5
  const bark = tint(old ? 0x685647 : dry ? 0x755e45 : palmy ? 0x827951 : 0x6b6451)
  const moss = tint(old ? 0x72724b : dry ? 0x857054 : 0x7b7956)
  const leaf = old ? 0x86a86a : dry ? 0xa5ab72 : palmy ? 0x96ba68 : 0x91b569
  const phase = rng() * 6.28,
    lean = palmy ? h * 0.14 : h * 0.024
  const tx = Math.cos(phase) * lean,
    tz = Math.sin(phase) * lean
  const rad = small ? 0.11 : palmy ? 0.39 : old ? 1.72 : dry ? 0.48 : 0.75
  wood.tube(
    [
      [0, -0.43, 0, rad * (old ? 2.1 : 1.5)],
      [0, h * 0.12, 0, rad],
      [tx * 0.3, h * 0.42, tz * 0.3, rad * 0.83],
      [tx * 0.7, h * 0.68, tz * 0.7, rad * 0.61],
      [tx, h, tz, rad * 0.25],
    ],
    (j) => (j < 2 ? moss : bark),
    old ? 11 : 8,
    phase,
    0.06,
  )
  if (!palmy) {
    for (let j = 0; j < (old ? 10 : 6); j++) {
      const a = j * 2.4 + phase,
        d = (old ? 4.7 : 1.9) * (0.7 + 0.5 * rng()),
        dx = Math.cos(a),
        dz = Math.sin(a)
      wood.tube(
        [
          [0, rad * 2.5, 0, rad * 0.63],
          [dx * rad * 0.85, rad * 0.95, dz * rad * 0.85, rad * 0.78],
          [dx * d, 0.05, dz * d, rad * 0.26],
          [dx * d * 1.35, -0.22, dz * d * 1.35, 0.06],
        ],
        moss,
        6,
        a,
        0.08,
      )
    }
    const branches = old ? 10 : dry ? 8 : 8
    for (let j = 0; j < branches; j++) {
      const a = phase + j * 2.399 + 0.36 * rng(),
        rank = j / (branches - 1),
        by = h * (0.47 + 0.4 * rank)
      const extent = (dry ? 6.8 : old ? 9.1 : 6.2) * (0.72 + 0.45 * rng()) * (1 - rank * 0.37)
      const bx = tx + Math.cos(a) * extent,
        bz = tz + Math.sin(a) * extent
      const crownY = by + (dry ? h - by - 1 : h * (0.11 + 0.08 * rng()))
      wood.tube(
        [
          [tx * 0.6, by, tz * 0.6, rad * 0.53],
          [mix(tx, bx, 0.54), by + (crownY - by) * 0.3, mix(tz, bz, 0.54), rad * 0.33],
          [bx, crownY, bz, 0.08],
        ],
        bark,
        6,
        a,
      )
      const w = (dry ? 8.7 : old ? 11.9 : 8.1) * (0.83 + 0.34 * rng()),
        hh = w * (dry ? 0.41 : 0.72)
      for (let k = 0; k < 4; k++) {
        const col = tint(leaf, 0.68 + 0.32 * rank + 0.13 * rng())
        const angle = k * 2.399 + a,
          y = crownY + (k === 3 ? 0.22 : 0) * hh
        leaves.leafCard(
          v(bx, y, bz),
          angle,
          w,
          hh,
          k === 3 ? 1.05 : 0.12 + 0.65 * rng(),
          col,
          (rng() - 0.5) * 0.41,
        )
      }
      if (old && j % 2 === 0) {
        const len = h * (0.17 + rng() * 0.32)
        const narrow = tint(0x637449)
        wood.tube(
          [
            [bx - 1, crownY, bz, 0.1],
            [bx - 1.4, crownY - len * 0.4, bz + 0.4, 0.085],
            [bx - 0.6, crownY - len, bz + 0.7, 0.045],
          ],
          narrow,
          5,
        )
      }
    }
  } else {
    for (let k = 0; k < (small ? 13 : 17); k++) {
      const a = phase + 2.399 * k,
        scale = small ? 0.28 : 1,
        len = scale * (5.3 + 2 * rng()),
        raise = scale * (1 + 2.8 * rng())
      const dx = Math.cos(a),
        dz = Math.sin(a),
        sx = -dz,
        sz = dx
      const rows = []
      for (let j = 0; j <= 6; j++) {
        const t = j / 6,
          w = len * (small ? 0.24 : 0.17) * Math.pow(Math.sin(Math.PI * t), 0.65)
        const x = tx + dx * len * t,
          z = tz + dz * len * t,
          y = h + raise * Math.sin(t * Math.PI) - len * 0.24 * t * t
        const c = tint(leaf, 0.77 + 0.23 * Math.sin(t * Math.PI) + 0.06 * rng())
        rows.push([
          leaves.vert(v(x - sx * w, y - w * 0.17, z - sz * w), c, 0, 1 - t),
          leaves.vert(v(x, y, z), c, 0.5, 1 - t),
          leaves.vert(v(x + sx * w, y - w * 0.17, z + sz * w), c, 1, 1 - t),
        ])
        if (j)
          for (let m = 0; m < 2; m++)
            leaves.join(rows[j - 1][m], rows[j - 1][m + 1], rows[j][m + 1], rows[j][m])
      }
    }
  }
  return { wood: wood.geometry(), crown: leaves.geometry(), frond: palmy, r: rad, h }
}
export function grassKit(arid, seed) {
  const rng = random(seed),
    g = new Shape()
  for (let k = 0; k < (arid ? 12 : 26); k++) {
    const a = k * 2.399 + rng(),
      d = rng() * 0.48,
      h = (arid ? 0.5 : 0.48) + rng() * (arid ? 0.85 : 0.74)
    const x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      w = (arid ? 0.12 : 0.041) * (0.55 + 0.8 * rng()),
      sx = Math.sin(a) * w,
      sz = -Math.cos(a) * w
    const reach = (arid ? 0.61 : 0.36) * h,
      dx = Math.cos(a) * reach,
      dz = Math.sin(a) * reach
    const lo = tint(arid ? 0x637157 : 0x566641, 0.84 + rng() * 0.35),
      hi = tint(arid ? 0xacad78 : 0xa2b46b, 0.8 + rng() * 0.29)
    const p = [
      g.vert(v(x - sx, 0, z - sz), lo),
      g.vert(v(x + sx, 0, z + sz), lo),
      g.vert(v(x + dx * 0.51 + sx * 0.62, h * 0.56, z + dz * 0.51 + sz * 0.62), hi),
      g.vert(v(x + dx * 0.48 - sx * 0.62, h * 0.54, z + dz * 0.48 - sz * 0.62), hi),
      g.vert(v(x + dx, h, z + dz), hi),
    ]
    g.join(p[0], p[1], p[2], p[3])
    g.i.push(p[3], p[2], p[4])
  }
  return g.geometry()
}
// Torn blades and a paler central vein distinguish young bananas from the finer
// palm and bracken fronds. The arced lamina catches light from either side.
export function broadHerb(seed) {
  const rng = random(seed),
    g = new Shape(),
    base = tint(0x758348),
    vein = tint(0xb2c773)
  for (let stem = 0; stem < 3; stem++) {
    const sx = (rng() - 0.5) * 0.84,
      sz = (rng() - 0.5) * 0.72,
      h = 0.46 + rng() * 0.57
    g.tube(
      [
        [sx, 0, sz, 0.079],
        [sx, h, sz, 0.051],
      ],
      base,
      6,
    )
    for (let k = 0; k < 7; k++) {
      const a = k * 2.399 + stem * 2 + rng() * 0.48,
        dx = Math.cos(a),
        dz = Math.sin(a),
        len = 0.89 + rng() * 1.06
      const lift = 1.0 + rng() * 0.85,
        width = 0.12 + rng() * 0.16,
        tilt = 0.13 + rng() * 0.23,
        rows = []
      const color = tint(k % 2 ? 0x81a847 : 0x6e9f4d, 0.82 + rng() * 0.25)
      for (let j = 0; j <= 10; j++) {
        const t = j / 10,
          x = sx + dx * len * t,
          z = sz + dz * len * t,
          y = h + t * lift + Math.sin(t * Math.PI) * len * 0.43 - t * t * len * 0.54
        const w = width * Math.sin(t * Math.PI) ** 0.62
        const left = w * (j === 6 && k % 3 === 1 ? 0.39 : 1),
          right = w * (j === 7 && k % 2 === 1 ? 0.51 : 1)
        const edge = color.clone().multiplyScalar(0.82 + 0.18 * Math.cos(2.1 * t))
        rows.push([
          g.vert(v(x - dz * left, y - left * tilt, z + dx * left), edge),
          g.vert(v(x, y + 0.013, z), vein),
          g.vert(v(x + dz * right, y - right * tilt, z - dx * right), color),
        ])
        if (j)
          for (let m = 0; m < 2; m++)
            g.join(rows[j - 1][m], rows[j - 1][m + 1], rows[j][m + 1], rows[j][m])
      }
    }
  }
  return g.geometry()
}
export function distantTree(type, seed, height) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 160
  const ctx = c.getContext('2d'),
    rng = random(seed)
  const palm = type === 'palm',
    old = type === 'old',
    dry = type === 'acacia',
    cx = 65
  ctx.fillStyle = old ? '#5d5847' : '#70654c'
  ctx.beginPath()
  ctx.moveTo(57, 158)
  ctx.lineTo(62, 24)
  ctx.lineTo(66, 24)
  ctx.lineTo(68, 159)
  ctx.fill()
  if (palm) {
    for (let k = 0; k < 19; k++) {
      const d = (k % 2 ? -1 : 1) * (14 + rng() * 45),
        y = 15 + rng() * 30
      ctx.strokeStyle = k % 3 ? '#6b8c54' : '#8ea66b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(64, 26)
      ctx.quadraticCurveTo(64 + d * 0.6, 1, 64 + d, y + 18)
      ctx.stroke()
      for (let j = 0; j < 14; j++) {
        const t = j / 14,
          x = 64 + d * t,
          h = (1 - t) ** 2 * 26 + 2 * (1 - t) * t + t * t * (y + 18)
        ctx.beginPath()
        ctx.moveTo(x, h)
        ctx.lineTo(x + d * 0.12, h + 3 + 10 * Math.sin(Math.PI * t))
        ctx.stroke()
      }
    }
  } else {
    const clusters = []
    for (let j = 0; j < (old ? 17 : 13); j++) {
      const t = j / 17,
        x = cx + (rng() - 0.5) * (85 - 52 * t),
        y = dry ? 24 + rng() * 18 : 26 + (1 - t) * 52
      ctx.strokeStyle = '#6c644c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, 93)
      ctx.quadraticCurveTo(cx, 74, x, y)
      ctx.stroke()
      clusters.push([x, y, 13 + rng() * 15, dry ? 8 + rng() * 8 : 12 + rng() * 11])
    }
    clusters.sort((a, b) => b[1] - a[1])
    for (const [x, y, rx, ry] of clusters)
      for (let k = 0; k < 165; k++) {
        const a = rng() * 6.28,
          l = Math.sqrt(rng()),
          px = x + Math.cos(a) * rx * l,
          py = y + Math.sin(a) * ry * l
        const light = clamp(((y - py) / ry) * 0.3 + rng() * 0.45 + 0.26)
        ctx.fillStyle = dry
          ? `rgb(${87 + light * 47},${92 + light * 51},${59 + light * 34})`
          : `rgb(${54 + light * 54},${75 + light * 56},${49 + light * 36})`
        ctx.fillRect(px, py, 2 + rng() * 3, 1 + rng() * 3)
      }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const g = new Shape(),
    white = tint(0xffffff),
    w = height * (dry ? 1.95 : palm ? 1.11 : old ? 0.98 : 1.05)
  for (const a of [0, Math.PI * 0.5]) g.leafCard(v(0, height * 0.48, 0), a, w, height * 1.08, 0, white)
  return {
    geometry: g.geometry(),
    material: new THREE.MeshLambertMaterial({
      map: tex,
      side: THREE.DoubleSide,
      emissive: 0x181c10,
      alphaTest: 0.35,
    }),
  }
}
export function rockKit(id, seed, spire = false) {
  const g = new Shape(),
    rng = random(seed),
    n = spire ? 14 : 10
  const colors =
    id === 'gorge'
      ? [0xa56b4e, 0xb58662, 0x8a5a48, 0xcb976a]
      : id === 'salt'
        ? [0xb89164, 0xcfaf7d, 0x9e7c59, 0xd9ae77]
        : id === 'root'
          ? [0x6e7462, 0x777f6b, 0x586554, 0x87906c]
          : [0x718077, 0x879089, 0x64746c, 0x909585]
  const count = spire ? 14 : 7,
    facet = Array.from({ length: n }, () => 0.74 + rng() * 0.4),
    ring = []
  let offX = 0,
    offZ = 0
  for (let j = 0; j < count; j++) {
    const t = j / (count - 1),
      common = spire
        ? 1.02 - t * 0.39 + 0.042 * Math.sin(t * 13 + seed) + 0.042 * (j % 2)
        : 0.36 + 0.69 * Math.pow(Math.sin(Math.PI * t), 0.45)
    offX += (rng() - 0.51) * (spire ? 0.13 : 0.075)
    offZ += (rng() - 0.46) * (spire ? 0.105 : 0.069)
    const col = tint(colors[j % colors.length], 0.81 + t * 0.18)
    ring.push([])
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n,
        rad = facet[k] * common * (0.94 + rng() * 0.1),
        wy = (0.026 * Math.sin(a * 2.1 + 0.9) + 0.016 * rng()) * (j === 0 ? 0 : 1)
      ring[j].push(
        g.vert(
          v(offX + Math.cos(a) * rad, t + wy - 0.065, offZ + Math.sin(a) * rad),
          col,
          (k / n) * 6,
          t,
        ),
      )
    }
    if (j)
      for (let k = 0; k < n; k++) {
        const l = (k + 1) % n
        g.join(ring[j - 1][l], ring[j - 1][k], ring[j][k], ring[j][l])
      }
  }
  const top = g.vert(v(offX, 1.035, offZ), tint(colors[1]))
  for (let k = 0; k < n; k++) g.i.push(ring.at(-1)[(k + 1) % n], ring.at(-1)[k], top)
  return g.geometry()
}
