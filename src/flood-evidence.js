import * as T from 'three'
import { Batch } from './settlement-geometry.js'
import { at } from './settlement-kit.js'
import { civicTexture } from './capital-landscape.js'

// These are standing positions on the plaza paving, in front of the evidence.
export const floodSites = {
  gauge: { x: 14.9, z: 11.6, title: '旧汛尺' },
  bell: { x: -14, z: -12.6, title: '警钟台' },
}

const stone = '#bcc2b9',
  coping = '#dedcc9',
  foot = '#7c8983',
  timber = '#685544'
const iron = '#494f49',
  bronze = '#869587',
  rim = '#c0a671',
  rope = '#9b8462'
const gaugeDatum = 0.33,
  chi = 1 / 3

function tablet(ctx, b, name, x, y, z, width, height, paint) {
  if (typeof document === 'undefined') return
  const canvas = document.createElement('canvas')
  const density = 360
  canvas.width = Math.round(width * density)
  canvas.height = Math.round(height * density)
  const ink = canvas.getContext('2d')
  ink.scale(density, density)
  paint(ink)
  const map = new T.CanvasTexture(canvas)
  map.colorSpace = T.SRGBColorSpace
  map.anisotropy = 4
  const mat = new T.MeshStandardMaterial({ map, roughness: 0.78 })
  const mesh = new T.Mesh(new T.PlaneGeometry(width, height), mat)
  mesh.name = name
  mesh.position.set(...b.pt(x, y, z))
  ctx.group.add(mesh)
  ctx.labels.push(mat)
}

function gaugeFace(ctx, b) {
  const bottom = 0.22,
    width = 0.69,
    height = 1.72,
    top = bottom + height
  const mudLine = top - (gaugeDatum + chi * 3)
  tablet(ctx, b, '三尺鲜泥线', 0, (top + bottom) / 2, 0.121, width, height, (h) => {
    const gradient = h.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#ebdfb9')
    gradient.addColorStop(0.75, '#c9c4a7')
    gradient.addColorStop(1, '#909987')
    h.fillStyle = gradient
    h.fillRect(0, 0, width, height)
    let seed = 941
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296
    for (let i = 0; i < 1800; i++) {
      h.fillStyle = random() < 0.5 ? 'rgba(82,76,57,.16)' : 'rgba(255,246,213,.38)'
      h.fillRect(random() * width, random() * height, 0.002 + random() * 0.009, 0.002 + random() * 0.008)
    }
    h.fillStyle = '#3b4d42'
    h.textAlign = 'center'
    h.font = 'bold .115px "Microsoft YaHei", sans-serif'
    h.fillText('旧汛尺', width / 2, 0.155)
    for (let i = 0; i <= 40; i++) {
      const y = top - gaugeDatum - (i * chi) / 10
      const major = i % 10 === 0,
        half = i % 5 === 0
      h.fillStyle = major ? '#823f30' : '#394b41'
      h.fillRect(
        0.045,
        y - (major ? 0.008 : 0.003),
        major ? 0.3 : half ? 0.195 : 0.109,
        major ? 0.016 : 0.006,
      )
      if (major && i) {
        h.font = 'bold .108px "Microsoft YaHei", sans-serif'
        h.fillText(['', '一尺', '二尺', '三尺', '四尺'][i / 10], 0.49, y + 0.038)
      }
    }
    // The uneven upper edge ends exactly on the three-chi witness mark.
    h.beginPath()
    h.moveTo(0.004, mudLine)
    for (let i = 0; i <= 40; i++)
      h.lineTo(0.004 + i * 0.008, mudLine + Math.pow(Math.sin(i * 0.72), 2) * 0.007)
    for (let i = 40; i >= 0; i--)
      h.lineTo(0.004 + i * 0.008, mudLine + 0.03 + 0.028 * Math.pow(Math.sin(i * 0.93), 6))
    h.closePath()
    h.fillStyle = '#68472f'
    h.fill()
    for (let i = 0; i < 85; i++) {
      h.fillStyle = random() < 0.66 ? '#82573a' : '#aa855a'
      h.fillRect(0.008 + random() * 0.3, mudLine + 0.012 + Math.pow(random(), 2) * 0.047, 0.006, 0.004)
    }
    h.fillStyle = 'rgba(106,73,43,.76)'
    for (const [px, dy] of [
      [0.05, 0.11],
      [0.16, 0.07],
      [0.235, 0.085],
    ])
      h.fillRect(px, mudLine + 0.023, 0.01, dy)
  })
}

function gauge(ctx, ground) {
  const x = 14.9,
    z = 9.08,
    base = ground(x, z),
    b = at(ctx, x, z, 0, base)
  // The overflow from the existing spring enters a separate stilling basin.
  // Face the staff toward the plaza so the observer stands on dry, level paving.
  b.box('stone', foot, 0, 0.09, 0.33, 2.15, 0.18, 1.72, true)
  b.box('stone', stone, 0, 0.29, 0.32, 1.89, 0.3, 1.5, true)
  b.box('water', '#548e88', 0, 0.448, 0.35, 1.61, 0.024, 1.27)
  for (const sign of [-1, 1]) {
    b.box('stone', coping, sign * 0.9, 0.5, 0.32, 0.18, 0.19, 1.55, true)
    b.box('stone', coping, 0, 0.5, 0.32 + sign * 0.685, 1.84, 0.19, 0.18, true)
  }
  b.box('stone', foot, 0, 0.91, -0.03, 1.08, 1.82, 0.3, true)
  b.box('stone', stone, 0, 1.13, -0.078, 0.84, 1.92, 0.22, true)
  b.box('metal', bronze, 0, 1.11, 0.071, 0.76, 1.8, 0.09)
  b.box('stone', coping, 0, 2.105, -0.035, 1.04, 0.16, 0.5)
  for (const y of [0.25, 1.93])
    for (const sign of [-1, 1])
      b.cyl('metal', rim, sign * 0.31, y, 0.133, 0.021, 0.023, 0.021, 1, 1, 8, Math.PI / 2)
  for (const y of [gaugeDatum + chi, gaugeDatum + 2 * chi, gaugeDatum + 3 * chi])
    b.box('metal', '#a98b64', -0.425, y, 0.136, 0.13, 0.016, 0.035)
  gaugeFace(ctx, b)
  const elbow = [-1.93, 1.1, -3.25],
    trough = [-0.63, 0.83, -0.57]
  b.rod('metal', bronze, elbow, trough, 0.102)
  b.rod('metal', bronze, trough, [-0.63, 0.78, 0.32], 0.102)
  b.rod('water', '#8cb9b0', [-0.63, 0.75, 0.32], [-0.63, 0.444, 0.36], 0.035)
  for (const t of [0.24, 0.72]) {
    const px = elbow[0] + (trough[0] - elbow[0]) * t,
      pz = elbow[2] + (trough[2] - elbow[2]) * t
    const top = elbow[1] + (trough[1] - elbow[1]) * t
    b.box('stone', stone, px, top * 0.45, pz, 0.33, top * 0.9, 0.31, true)
    b.box('metal', iron, px, top - 0.08, pz, 0.39, 0.08, 0.35)
  }
  for (let i = 0; i < 2; i++) {
    const radius = 0.1 + i * 0.075
    const ring = new T.TorusGeometry(radius, 0.005, 4, 24)
    ctx.batch.add('water', ring, '#a4c9bc', ...b.pt(-0.63, 0.462, 0.36), 1, 1, 1, [Math.PI / 2, 0, 0])
    ring.dispose()
  }
}

function casting(ctx, b) {
  const y = 2.56
  // A closed, hollow bronze casting. The outward flare and rounded sound bow
  // are mirrored on the interior, visible when looking up under its mouth.
  const profile = [
    [0.12, 1.2],
    [0.3, 1.17],
    [0.42, 1.05],
    [0.51, 0.89],
    [0.55, 0.64],
    [0.6, 0.39],
    [0.68, 0.16],
    [0.77, 0.055],
    [0.78, 0.005],
    [0.755, -0.025],
    [0.705, -0.038],
    [0.65, 0.055],
    [0.6, 0.14],
    [0.53, 0.39],
    [0.48, 0.63],
    [0.44, 0.86],
    [0.36, 0.99],
    [0.26, 1.07],
    [0.12, 1.09],
  ]
  const body = new T.LatheGeometry(
    profile.map(([r, h]) => new T.Vector2(r, h)),
    40,
  )
  ctx.batch.add('metal', body, '#849586', ...b.pt(0, y, 0))
  body.dispose()
  for (const [h, r, t] of [
    [0.027, 0.763, 0.028],
    [0.124, 0.704, 0.013],
    [0.32, 0.622, 0.014],
    [0.41, 0.595, 0.014],
    [0.88, 0.516, 0.012],
    [1.0, 0.454, 0.018],
    [1.125, 0.337, 0.014],
  ]) {
    const band = new T.TorusGeometry(r, t, 6, 40)
    ctx.batch.add('metal', band, rim, ...b.pt(0, y + h, 0), 1, 1, 1, [Math.PI / 2, 0, 0])
    band.dispose()
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      dx = Math.sin(a),
      dz = Math.cos(a)
    for (const [h, r] of [
      [0.52, 0.582],
      [0.71, 0.546],
    ]) {
      b.ell('metal', i % 3 ? bronze : rim, dx * r, y + h, dz * r, 0.035, 0.04, 0.035)
    }
    if (i % 2 === 0) {
      b.rod(
        'metal',
        rim,
        [dx * 0.64, y + 0.272, dz * 0.64],
        [Math.sin(a + 0.15) * 0.652, y + 0.214, Math.cos(a + 0.15) * 0.652],
        0.009,
      )
      b.rod(
        'metal',
        rim,
        [Math.sin(a + 0.15) * 0.652, y + 0.214, Math.cos(a + 0.15) * 0.652],
        [Math.sin(a + 0.3) * 0.64, y + 0.272, Math.cos(a + 0.3) * 0.64],
        0.009,
      )
    }
  }
  const loop = new T.TorusGeometry(0.173, 0.064, 8, 24)
  ctx.batch.add('metal', loop, bronze, ...b.pt(0, y + 1.34, 0))
  loop.dispose()
  b.cyl('metal', iron, 0, 3.96, 0, 0.071, 0.38, 0.071)
  b.hit(0, 3.11, 0, 1.2, 1.17, 1.16)
}

function codeTablet(ctx, b) {
  // Face the open gathering ground. The three engraved marks can be read at a
  // distance even before the smaller inscription becomes legible.
  b.box('stone', foot, 0, 0.56, 1.45, 1.99, 0.9, 0.42, true)
  b.box('stone', stone, 0, 1.06, 1.45, 2.13, 0.19, 0.55, true)
  b.box('metal', rim, 0, 1.17, 1.78, 1.89, 0.96, 0.13, true)
  tablet(ctx, b, '钟约 · 两短一长', 0, 1.17, 1.851, 1.82, 0.87, (h) => {
    h.fillStyle = '#344d49'
    h.fillRect(0, 0, 1.82, 0.87)
    h.strokeStyle = '#ae9870'
    h.lineWidth = 0.013
    h.strokeRect(0.045, 0.044, 1.73, 0.78)
    h.textAlign = 'center'
    h.fillStyle = '#ddd2a8'
    h.font = 'bold .129px "Microsoft YaHei", sans-serif'
    h.fillText('汛　钟　约', 0.91, 0.203)
    h.font = 'bold .235px "Microsoft YaHei", sans-serif'
    h.fillText('两短一长', 0.91, 0.508)
    h.fillStyle = '#c4a06d'
    for (const [x, w] of [
      [0.413, 0.137],
      [0.667, 0.137],
      [0.927, 0.477],
    ]) {
      h.beginPath()
      h.roundRect(x, 0.629, w, 0.074, 0.026)
      h.fill()
    }
  })
}
function bell(ctx, ground) {
  const x = -14,
    z = -16.15,
    b = at(ctx, x, z, 0, ground(x, z))
  b.box('stone', foot, 0, 0.075, 0, 4.83, 0.15, 3.62, true)
  b.box('stone', stone, 0, 0.201, 0, 4.63, 0.102, 3.43, true)
  b.box('stone', coping, 0, 0.071, 1.92, 2.65, 0.142, 0.39, true)
  for (const side of [-1, 1]) {
    const xx = side * 1.78
    b.box('stone', foot, xx, 0.44, 0, 0.71, 0.4, 0.88, true)
    b.box('stone', coping, xx, 0.68, 0, 0.8, 0.13, 0.99, true)
    b.box('wood', timber, xx, 2.53, 0, 0.33, 3.66, 0.41, true)
    for (const y of [0.94, 1.14, 3.78, 4.04]) b.box('metal', iron, xx, y, 0, 0.365, 0.087, 0.456)
    for (const dz of [-0.65, 0.65]) {
      b.rod('wood', timber, [xx, 0.48, dz], [xx, 2.08, 0.03 * Math.sign(dz)], 0.16, true)
      b.rod('wood', timber, [xx, 3.93, dz], [xx, 3.0, 0], 0.15, true)
    }
    b.rod('wood', timber, [xx, 3.09, 0.07], [side * 0.88, 4.08, 0.07], 0.16, true)
    b.box('wood', timber, xx, 4.32, 0, 1.01, 0.25, 2.07)
  }
  b.box('wood', timber, 0, 4.18, 0, 4.6, 0.32, 0.48, true)
  b.box('metal', iron, 0, 4.16, 0, 0.39, 0.37, 0.5)
  for (const side of [-1, 1]) {
    b.box('metal', '#728a7e', 0, 4.57, side * 0.55, 5.12, 0.13, 1.28, false, side * 0.285)
    b.box('metal', rim, 0, 4.4, side * 1.17, 5.2, 0.12, 0.15)
    for (let k = -4; k <= 4; k++)
      b.rod('metal', bronze, [k * 0.54, 4.79, 0], [k * 0.54, 4.43, side * 1.18], 0.024)
  }
  b.rod('metal', rim, [-2.59, 4.79, 0], [2.59, 4.79, 0], 0.072)
  casting(ctx, b)
  // The external timber striker is slung between iron straps. Keep it off the
  // plaza side of the bell so the open mouth and the code plaque read together.
  for (const zz of [-0.6, 0.48]) {
    b.rod('metal', iron, [1.05, 4.17, zz], [1.05, 3.98, zz], 0.046)
    b.rod('wood', rope, [1.05, 3.98, zz], [0.98, 2.82, zz - 0.18], 0.032)
  }
  b.cyl('wood', '#9a7751', 0.98, 2.81, -0.17, 0.115, 1.86, 0.115, 1, 1, 14, Math.PI / 2)
  for (const zz of [-0.84, 0.41])
    b.cyl('metal', iron, 0.98, 2.81, zz, 0.119, 0.09, 0.119, 1, 1, 14, Math.PI / 2)
  codeTablet(ctx, b)
}

export function buildFloodEvidence(scene, ground) {
  const root = new T.Group()
  root.name = '白砥城 · 汛情调查'
  scene.add(root)
  const materials = {
    stone: new T.MeshStandardMaterial({
      map: civicTexture('stone'),
      roughness: 0.88,
      vertexColors: true,
    }),
    wood: new T.MeshStandardMaterial({ map: civicTexture('grain'), roughness: 0.9, vertexColors: true }),
    metal: new T.MeshStandardMaterial({
      metalness: 0.43,
      roughness: 0.57,
      vertexColors: true,
      side: T.DoubleSide,
    }),
    water: new T.MeshStandardMaterial({ roughness: 0.22, metalness: 0.14, vertexColors: true }),
  }
  const structures = [],
    labels = []
  for (const [key, make] of [
    ['gauge', gauge],
    ['bell', bell],
  ]) {
    const group = new T.Group()
    group.name = floodSites[key].title
    root.add(group)
    const batch = new Batch(group, materials, true)
    make({ group, batch, labels, colliders: structures }, ground)
    batch.finish()
  }
  return {
    group: root,
    structures,
    dispose() {
      root.removeFromParent()
      root.traverse((node) => node.geometry?.dispose())
      for (const mat of [...Object.values(materials), ...labels]) {
        mat.map?.dispose()
        mat.dispose()
      }
    },
  }
}
