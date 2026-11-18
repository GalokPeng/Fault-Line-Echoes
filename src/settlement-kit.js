import * as THREE from 'three'
import { Batch, beam, shape } from './settlement-geometry.js'
import { heightAt, biomes } from './biomes.js'

export const palette = {
  rain: {
    wall: '#bcad83',
    base: '#637867',
    wood: '#5a4b39',
    edge: '#958265',
    roof: '#536d60',
    trim: '#be9658',
    cloth: '#be7754',
    shade: '#365e56',
    stone: '#65746d',
  },
  salt: {
    wall: '#cdab78',
    base: '#b3865a',
    wood: '#71523c',
    edge: '#a1754e',
    roof: '#a87651',
    trim: '#72a6a2',
    cloth: '#4d8282',
    shade: '#597475',
    stone: '#a68b67',
  },
  root: {
    wall: '#998060',
    base: '#5c614a',
    wood: '#514538',
    edge: '#82704e',
    roof: '#617d65',
    trim: '#c5a267',
    cloth: '#8a657b',
    shade: '#485f4e',
    stone: '#73796b',
  },
  gorge: {
    wall: '#ba8a72',
    base: '#875f51',
    wood: '#544b42',
    edge: '#876d5c',
    roof: '#736a66',
    trim: '#deae75',
    cloth: '#aa6048',
    shade: '#4d6369',
    stone: '#9c7565',
  },
}
function texture(style) {
  const n = 96,
    data = new Uint8Array(n * n * 4)
  let seed = 88751
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4,
        grain = random()
      let value = 221 + grain * 31
      if (style === 'wood')
        value -=
          13 * Math.abs(Math.sin((x + 2 * Math.sin(y * 0.065)) * 1.2)) +
          9 * Math.sin((x + 3 * Math.sin(y * 0.045)) * 0.38)
      if (style === 'masonry') {
        const course = Math.floor(y / 24),
          j = (x + (course % 2) * 24) % 48
        if (y % 24 < 2 || j < 2) value -= 34
        else if (y % 24 === 2 || j === 2) value += 8
      }
      if (style === 'cloth') value -= (x % 3 === 0 ? 9 : 0) + (y % 3 === 0 ? 9 : 0)
      data[i] = data[i + 1] = data[i + 2] = Math.min(255, value)
      data[i + 3] = 255
    }
  const tex = new THREE.DataTexture(data, n, n)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}
export function makeContext(group, id) {
  const materials = {}
  for (const key of ['wood', 'masonry', 'plaster', 'cloth', 'metal', 'leaf']) {
    materials[key] = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: key === 'metal' ? 0.55 : 0.94,
      metalness: key === 'metal' ? 0.28 : 0,
      map: key === 'metal' || key === 'leaf' ? null : texture(key),
      side: THREE.DoubleSide,
    })
  }
  materials.lamp = new THREE.MeshStandardMaterial({
    vertexColors: true,
    color: 0xffddaa,
    emissive: 0xff9a43,
    emissiveIntensity: 0.7,
  })
  return {
    group,
    id,
    colors: palette[id],
    materials,
    batch: new Batch(group, materials, true),
    colliders: [],
    features: [],
    signs: [],
    base: biomes[id].level,
  }
}
export function at(ctx, x, z, yaw = 0, baseY = heightAt(ctx.id, x, z)) {
  const cs = Math.cos(yaw),
    sn = Math.sin(yaw),
    batch = ctx.batch
  const pt = (a, b, c) => [x + cs * a + sn * c, baseY + b, z - sn * a + cs * c]
  function hit(a, b, c, w, h, d, turn = 0) {
    const p = pt(a, b, c)
    ctx.colliders.push({ x: p[0], y: p[1], z: p[2], w, h, d, yaw: yaw + turn })
  }
  function box(mat, color, a, b, c, w, h, d, solid = false, rx = 0, rz = 0, turn = 0) {
    batch.add(mat, shape.box(), color, ...pt(a, b, c), w, h, d, [rx, yaw + turn, rz])
    if (solid) hit(a, b, c, w, h, d, turn)
  }
  function cyl(mat, color, a, b, c, w, h, d, top = 1, bottom = 1, n = 12, rx = 0, rz = 0) {
    batch.add(mat, shape.cyl(top, bottom, n), color, ...pt(a, b, c), w, h, d, [rx, yaw, rz])
  }
  function ell(mat, color, a, b, c, w, h, d, rx = 0, rz = 0) {
    batch.add(mat, shape.ball(), color, ...pt(a, b, c), w, h, d, [rx, yaw, rz])
  }
  function rod(mat, color, a, b, r, sq = false) {
    beam(batch, mat, color, pt(...a), pt(...b), r, sq)
  }
  function lantern(a, b, c, scale = 1) {
    const { wood, trim } = ctx.colors
    rod('metal', wood, [a, b + 0.27 * scale, c], [a, b + 0.6 * scale, c], 0.018 * scale)
    cyl('metal', trim, a, b + 0.24 * scale, c, 0.167 * scale, 0.09 * scale, 0.167 * scale, 0.45, 1, 6)
    cyl('lamp', '#ffdc94', a, b, c, 0.145 * scale, 0.41 * scale, 0.145 * scale, 0.87, 1, 6)
    cyl('metal', wood, a, b - 0.23 * scale, c, 0.17 * scale, 0.066 * scale, 0.17 * scale, 0.9, 1, 6)
    for (const k of [-1, 1])
      box(
        'metal',
        wood,
        a + k * 0.113 * scale,
        b,
        c + 0.06 * scale,
        0.022 * scale,
        0.44 * scale,
        0.024 * scale,
      )
  }
  function barrel(a, b, c, size = 1) {
    const { wood, edge } = ctx.colors
    cyl('wood', edge, a, b + 0.39 * size, c, 0.3 * size, 0.77 * size, 0.3 * size, 0.94, 1, 11)
    for (const k of [0.14, 0.59])
      cyl('metal', wood, a, b + k * size, c, 0.312 * size, 0.043 * size, 0.31 * size, 0.98, 1, 11)
  }
  function sign(label, a, b, c, scale = 1) {
    if (typeof document === 'undefined') return
    const cvs = document.createElement('canvas')
    cvs.width = 512
    cvs.height = 160
    const h = cvs.getContext('2d')
    if (!h) return
    h.fillStyle = '#343b33'
    h.fillRect(0, 0, 512, 160)
    h.strokeStyle = '#b49b70'
    h.lineWidth = 4
    h.strokeRect(9, 9, 494, 142)
    h.fillStyle = '#ebdcb6'
    h.font = '600 76px "Microsoft YaHei",serif'
    h.textAlign = 'center'
    h.textBaseline = 'middle'
    h.fillText(label, 256, 80, 460)
    const map = new THREE.CanvasTexture(cvs)
    map.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.63 * scale, 0.51 * scale), mat)
    mesh.position.set(...pt(a, b, c))
    mesh.rotation.y = yaw
    ctx.group.add(mesh)
    ctx.signs.push(mat)
  }
  return { pt, box, cyl, ell, rod, lantern, barrel, sign, hit }
}
export function addFeature(ctx, name, x, y, z, kind) {
  ctx.features.push({ name, x, y, z, kind })
}
export function awning(builder, c, x, y, z, w, d) {
  const { box, rod } = builder
  box('cloth', c.cloth, x, y, z, w, 0.079, d, false, -0.12)
  for (let i = -3; i <= 3; i++)
    box('cloth', c.trim, x + (i * w) / 7, y + 0.044, z, w / 20, 0.035, d, false, -0.12)
  for (const q of [-1, 1])
    rod(
      'wood',
      c.wood,
      [x + q * w * 0.48, 0, z + d * 0.48],
      [x + q * w * 0.48, y + 0.12, z + d * 0.48],
      0.068,
    )
}
export function gable(b, c, x, y, z, w, d, pitch, color = c.roof) {
  const reach = w / 2,
    len = Math.hypot(reach, pitch),
    tilt = Math.atan2(pitch, reach)
  for (const s of [-1, 1]) {
    b.box('wood', color, x + s * w * 0.25, y + pitch * 0.5, z, len, 0.23, d, false, 0, -s * tilt)
    const strips = Math.max(3, Math.ceil(pitch / 0.22))
    for (let i = 0; i < strips; i++) {
      const fraction = (i + 0.5) / strips
      b.hit(x + s * reach * fraction, y + pitch * (1 - fraction), z, reach / strips + 0.014, 0.22, d)
    }
    b.box('wood', c.edge, x + s * reach, y - 0.03, z, 0.17, 0.22, d + 0.17)
    for (const end of [-1, 1])
      b.rod(
        'wood',
        c.edge,
        [x, y + pitch, z + end * d * 0.5],
        [x + s * reach, y, z + end * d * 0.5],
        0.13,
        true,
      )
    for (let i = 1; i < 8; i++)
      b.rod(
        'wood',
        color,
        [x + 0.08 * s, y + pitch + 0.092, z + (i / 8 - 0.5) * d],
        [x + s * reach, y + 0.092, z + (i / 8 - 0.5) * d],
        0.042,
      )
  }
  b.rod('wood', c.edge, [x, y + pitch + 0.12, z - d * 0.52], [x, y + pitch + 0.12, z + d * 0.52], 0.12)
}
