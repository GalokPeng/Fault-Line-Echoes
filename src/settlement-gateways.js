import * as T from 'three'
import { makeContext, at, gable } from './settlement-kit.js'
import { foliageTexture, Shape, random } from './landscape-assets.js'
import { releaseGeometry } from './settlement-geometry.js'

// Each keystone and voussoir is an extrusion of its actual annular sector.
// The structural core behind their joints closes the ring from front to back.
function voussoir(ctx, b, g, yaw, inner, outer, from, to, depth, face, material, color) {
  const outline = new T.Shape()
  outline.moveTo(inner * Math.cos(from), inner * Math.sin(from))
  outline.absarc(0, 0, inner, from, to, false)
  outline.lineTo(outer * Math.cos(to), outer * Math.sin(to))
  outline.absarc(0, 0, outer, to, from, true)
  outline.closePath()
  const block = new T.ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 16 })
  ctx.batch.add(material, block, color, ...b.pt(0, g.spring, face - depth / 2), 1, 1, 1, [0, yaw, 0])
  block.dispose()
}

function portalRing(ctx, b, g, yaw) {
  const c = ctx.colors,
    r = g.radius,
    s = g.spring,
    thickness = 1.44,
    depth = 3
  voussoir(ctx, b, g, yaw, r, r + thickness, 0, Math.PI, depth, 0, 'masonry', c.base)
  const stones = 19
  for (let k = 0; k < stones; k++) {
    const key = k === (stones - 1) / 2
    voussoir(
      ctx,
      b,
      g,
      yaw,
      r,
      r + thickness + (key ? 0.38 : 0.05),
      (Math.PI * (k + 0.018)) / stones,
      (Math.PI * (k + 0.982)) / stones,
      depth + (key ? 0.52 : 0.18),
      0,
      'masonry',
      key ? c.trim : [c.wall, c.stone, c.wall, c.base][k % 4],
    )
  }
  for (const side of [-1, 1]) {
    const x = side * (r + thickness / 2)
    b.hit(x, s / 2, 0, thickness, s, depth)
    for (let i = 0; i < 4; i++)
      b.box(
        'masonry',
        i % 2 ? c.base : c.wall,
        x,
        (s * (i + 0.5)) / 4,
        0,
        thickness,
        s / 4 - 0.015,
        depth + 0.14,
      )
    b.box('masonry', c.edge, x + side * 0.16, s + 0.02, 0, thickness, 0.24, depth + 0.5)
    b.box('metal', c.trim, x + side * 0.04, 1.03, 1.62, 0.4, 0.7, 0.11)
  }
  // Match the curved opening with narrow tangent columns. All near-vertical
  // contacts stay on the masonry side of the visible arch.
  const outer = r + thickness,
    columns = 48,
    width = (2 * outer) / columns
  for (let i = 0; i < columns; i++) {
    const left = -outer + i * width,
      right = left + width
    const near = left <= 0 && right >= 0 ? 0 : Math.min(Math.abs(left), Math.abs(right))
    const bottom = s + Math.sqrt(Math.max(0, r * r - near * near))
    const top = s + Math.sqrt(Math.max(0, outer * outer - near * near))
    if (top > bottom)
      b.hit((left + right) / 2, (bottom + top) / 2, 0, width + 0.006, top - bottom, depth)
  }
}

function rainGate(b, c, g) {
  const apex = g.spring + g.radius
  for (const side of [-1, 1]) {
    const x = side * (g.radius + 4.0),
      top = g.to === 'capital' ? 11.8 : 13.2
    b.box('masonry', c.stone, x, 1.28, 0, 5.2, 2.58, 6.1, true)
    b.box('masonry', c.base, x, 4.44, 0, 4.52, 6.28, 5.1, true)
    for (const dx of [-1.78, 1.78])
      for (const dz of [-2.1, 2.1])
        b.box('wood', c.wood, x + dx, (top + 7.3) / 2, dz, 0.42, top - 7.3, 0.44)
    for (const y of [3.1, 6.9, 8.1]) b.box('wood', c.edge, x, y, 0, 5.18, 0.24, 5.72)
    for (let j = -2; j <= 2; j++) b.box('wood', c.edge, x + j * 0.61, 8.49, 2.21, 0.09, 1.1, 0.13)
    b.box('wood', c.wood, x, 8.99, 2.22, 4.18, 0.15, 0.19)
    gable(b, c, x, top, 0, 7.8, 7.9, 2.36)
    gable(b, c, x, top + 1.58, 0, 4.45, 4.86, 1.56)
    b.lantern(x - side * 1.64, top - 1.12, 2.35, 2.03)
    for (const dz of [-2.13, 2.13]) {
      b.rod('wood', c.wood, [x, top - 1.9, dz], [x - side * 4.55, apex + 1.5, dz], 0.31, true)
      b.rod('metal', c.trim, [x + side * 2.76, top - 0.62, dz], [x + side * 2.76, 0.4, dz], 0.18)
    }
    b.cyl('masonry', c.base, x + side * 3.25, 1.03, 1.66, 1.5, 2.08, 1.42, 0.91, 1, 8)
  }
  b.box('wood', c.wood, 0, apex + 1.78, 0, 19, 0.42, 3.9, true)
  gable(b, c, 0, apex + 2.05, 0, 16.2, 5.32, 2.0)
}

function saltGate(b, c, g) {
  const apex = g.spring + g.radius,
    top = apex + 1.88
  for (const side of [-1, 1]) {
    const x = side * (g.radius + 4.1),
      height = g.to === 'gorge' ? 18.6 : 16.6
    b.box('masonry', c.base, x, 2.25, 0, 5.7, 4.55, 6.25, true)
    b.box('masonry', c.wall, x, 7.19, 0, 4.67, 8.7, 5.34, true)
    b.box('masonry', c.wall, x, (height + 10.5) / 2, 0, 3.64, height - 10.5, 4.22, true)
    for (const y of [2.9, 4.33, 10.2, 11.45, height - 0.5])
      b.box(
        'plaster',
        y === 4.33 || y === 11.45 ? c.trim : c.base,
        x,
        y,
        0,
        y < 10 ? 5.76 : 4.87,
        0.32,
        y < 10 ? 6.35 : 5.43,
      )
    for (const side2 of [-1, 1]) {
      b.box('plaster', c.shade, x + side2 * 0.7, height - 2.3, 2.13, 0.81, 2.87, 0.065)
      for (let j = 0; j < 3; j++)
        b.box('wood', c.wood, x + side2 * 0.7, height - 3.19 + j * 0.69, 2.21, 0.8, 0.11, 0.14)
    }
    b.ell('plaster', c.trim, x, height + 0.06, 0, 2.37, 1.77, 2.52)
    b.cyl('metal', c.trim, x, height + 2.34, 0, 0.11, 1.77, 0.11)
    b.cyl('metal', c.edge, x, height + 2.13, 0, 0.43, 0.48, 0.43, 0.4, 1, 8)
    for (let i = 0; i < 3; i++) {
      b.box(
        'masonry',
        c.base,
        x + side * (3 + i * 1.02),
        2.36 - i * 0.52,
        0,
        1.43,
        4.72 - i * 1.04,
        5.6 - i * 0.72,
        true,
      )
      b.box(
        'plaster',
        c.wall,
        x + side * (3 + i * 1.02),
        4.79 - i * 1.04,
        0,
        1.53,
        0.23,
        5.72 - i * 0.72,
      )
    }
    b.lantern(x, 6.4, 2.99, 2.12)
  }
  b.box('masonry', c.wall, 0, top + 0.24, 0, 21.6, 0.88, 4.8, true)
  b.box('plaster', c.trim, 0, top + 0.76, 0, 22.1, 0.27, 5.09)
  for (let j = -6; j <= 6; j++) b.box('masonry', c.wall, j * 1.43, top + 1.25, 0, 0.79, 0.79, 4.36)
}

function rootGate(b, c, g, ctx) {
  const foliage = new Shape(),
    rng = random(g.z > 0 ? 8823 : 6345)
  const apex = g.spring + g.radius
  for (const side of [-1, 1]) {
    const x = side * (g.radius + 4.13),
      h = g.to === 'rain' ? 20.1 : 17.9
    b.cyl('wood', c.wood, x, h * 0.41, 0, 2.19, h * 0.83, 2.03, 0.68, 1.18, 13)
    b.hit(x, h * 0.41, 0, 3.55, h * 0.82, 3.39)
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399 + side,
        dx = Math.cos(a),
        dz = Math.sin(a)
      const reach = 3.8 + (i % 3),
        bx = x + dx * reach,
        bz = dz * reach
      b.rod(
        'wood',
        i % 2 ? c.wood : c.edge,
        [x + dx * 0.85, h * 0.62, dz * 0.96],
        [bx, h * 0.88 + (i % 3), bz],
        0.53,
      )
      for (let k = 0; k < 13; k++) {
        const theta = k * 2.39996,
          reach = Math.sqrt(rng()) * 2.6
        const center = new T.Vector3(
          ...b.pt(
            bx + Math.cos(theta) * reach,
            h * 0.9 + (i % 3) + 1.05 - reach * 0.39 + rng() * 1.3,
            bz + Math.sin(theta) * reach,
          ),
        )
        const tint = new T.Color(0x96ae70).multiplyScalar(0.72 + rng() * 0.35)
        foliage.leafCard(
          center,
          theta + rng() * 0.65,
          3.2 + rng() * 2.2,
          2.4 + rng() * 1.45,
          (rng() - 0.5) * 1.8,
          tint,
          rng() * 2.6,
        )
      }
      b.rod('wood', c.wood, [x + dx * 0.89, 3.66, dz * 0.88], [x + dx * 3.73, 0, dz * 3.74], 0.53)
      if (i % 2 === 0) {
        b.rod('leaf', c.roof, [bx, h * 0.87, bz], [bx + 0.37, h * 0.63, bz + 0.27], 0.083)
        b.lantern(bx + 0.37, h * 0.63 - 0.5, bz + 0.27, 1.32)
      }
    }
    for (let j = 0; j < 3; j++)
      b.rod(
        'wood',
        j === 0 ? c.wood : c.edge,
        [x + side * j * 0.22, 0.3, 1.38 + j * 0.28],
        [side * (g.radius + 1.6), g.spring + 2.1 + j * 0.69, 1.65 + j * 0.18],
        0.5 - j * 0.09,
      )
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.06 + i * 0.053)
      b.ell(
        'leaf',
        i % 2 ? '#657852' : '#879268',
        side * Math.cos(a) * (g.radius + 1.46),
        g.spring + Math.sin(a) * (g.radius + 1.46) + 0.2,
        1.1,
        0.83,
        0.41,
        0.55,
      )
    }
    b.rod('wood', c.edge, [x, h * 0.62, 1.16], [side * 2.0, apex + 2.55, 0.32], 0.68)
    b.rod('wood', c.wood, [side * 2, apex + 2.55, 0.32], [-side * 1.32, apex + 2.01, -0.34], 0.47)
  }
  const material = new T.MeshLambertMaterial({
    vertexColors: true,
    side: T.DoubleSide,
    alphaTest: 0.36,
    map: typeof document === 'undefined' ? null : foliageTexture('leaf'),
  })
  const crown = new T.Mesh(foliage.geometry(), material)
  crown.castShadow = true
  crown.receiveShadow = true
  ctx.group.add(crown)
  ctx.materials.crown = material
}

function gorgeGate(b, c, g) {
  const apex = g.spring + g.radius,
    bridge = apex + 2.4
  for (const side of [-1, 1]) {
    const x = side * (g.radius + 4.2),
      top = g.to === 'salt' ? 17.2 : 15.9
    b.box('masonry', c.stone, x, 2.62, 0, 5.42, 5.25, 6.18, true)
    b.box('masonry', c.base, x, 6.62, 0, 4.48, 7.1, 5.35, true)
    for (const dx of [-1.9, 1.9])
      for (const dz of [-2.18, 2.18]) {
        b.box('metal', c.shade, x + dx, top / 2, dz, 0.39, top, 0.44, true)
        b.box('metal', c.trim, x + dx, 5.26, dz, 0.51, 0.27, 0.56)
      }
    for (const face of [-2.22, 2.22]) {
      for (let k = 0; k < 3; k++) {
        const y = 4.9 + k * 3.5
        b.rod('metal', c.shade, [x - 1.9, y, face], [x + 1.9, y + 3.47, face], 0.21, true)
        b.rod('metal', c.shade, [x + 1.9, y, face], [x - 1.9, y + 3.47, face], 0.21, true)
      }
      b.rod('metal', c.shade, [x, top, face], [x + side * 3.75, top - 2.3, face], 0.33, true)
      b.rod(
        'metal',
        c.shade,
        [x + side * 3.75, top - 2.2, face],
        [x + side * 3.75, top - 6.4, face],
        0.059,
      )
    }
    b.box('metal', c.shade, x, top, 0, 5.16, 0.4, 5.4)
    b.box('wood', c.edge, x + side * 3.75, top - 6.75, 0, 1.24, 0.78, 4.75)
    b.lantern(x - side * 0.83, 6.5, 2.95, 2.18)
  }
  b.box('metal', c.shade, 0, bridge, 0, 22, 0.44, 4.8, true)
  for (const depth of [-2.11, 2.11]) {
    b.box('metal', c.shade, 0, bridge + 2.28, depth, 22, 0.29, 0.3)
    for (let k = -5; k < 5; k++)
      b.rod(
        'metal',
        c.trim,
        [k * 2, bridge + (k % 2 === 0 ? 0.18 : 2.16), depth],
        [(k + 1) * 2, bridge + (k % 2 === 0 ? 2.16 : 0.18), depth],
        0.18,
        true,
      )
  }
}

const treatments = { rain: rainGate, salt: saltGate, root: rootGate, gorge: gorgeGate }
export function createGateway(parent, id, g) {
  const group = new T.Group()
  group.name = g.name
  parent.add(group)
  const ctx = makeContext(group, id),
    yaw = Math.atan2(-g.nx, -g.nz)
  const b = at(ctx, g.x, g.z, yaw, g.y),
    c = ctx.colors,
    apex = g.spring + g.radius
  portalRing(ctx, b, g, yaw)
  treatments[id](b, c, g, ctx)
  const boardY = apex + (id === 'root' ? 1.56 : 1.83)
  b.box('wood', c.wood, 0, boardY, 2.79, 6.15, 1.81, 0.31)
  b.sign(g.name, 0, boardY, 2.966, 3.36)
  for (const side of [-1, 1]) {
    b.box('masonry', c.stone, side * (g.radius + 1.24), 0.34, 5.48, 1.73, 0.68, 1.78, true)
    b.box('masonry', c.base, side * (g.radius + 1.24), 1.6, 5.48, 0.91, 1.93, 0.98, true)
    b.lantern(side * (g.radius + 1.24), 2.96, 5.48, 1.86)
  }
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 4; j++) {
      const x = i * 1.68 + (j % 2 === 0 ? 0.35 : -0.35)
      b.box(
        'masonry',
        [id === 'salt' ? '#cbaf85' : c.stone, c.base, c.stone][Math.abs(i + j) % 3],
        x,
        0.012,
        j * 1.36,
        1.65,
        0.064,
        1.33,
      )
    }
  ctx.batch.finish()
  return {
    colliders: ctx.colliders,
    dispose() {
      releaseGeometry(group)
      for (const m of [...Object.values(ctx.materials), ...ctx.signs]) {
        m.map?.dispose()
        m.dispose()
      }
    },
  }
}
