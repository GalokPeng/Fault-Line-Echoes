import { biomes, gridDivisions, heightAt } from './biomes.js'
import * as THREE from 'three'
import { at } from './settlement-kit.js'

// Each city has an industry with its own silhouette along the north approach.
function waterworks(ctx) {
  const c = ctx.colors,
    b = at(ctx, 27, -30, -0.18)
  for (const s of [-1, 1]) {
    b.box('masonry', c.stone, s * 3.07, 1.93, 0, 0.78, 3.87, 3.02, true)
    b.rod('wood', c.wood, [s * 3.07, 3.7, 0], [s * 3.07, 8.0, -1.18], 0.28)
    b.rod('wood', c.edge, [s * 3.07, 3.7, 1.23], [s * 3.07, 8, -1.18], 0.23)
  }
  b.rod('wood', c.wood, [-3.5, 4.0, 0], [3.56, 4, 0], 0.3)
  for (let i = 0; i < 18; i++) {
    const a = (i * 2 * Math.PI) / 18,
      d = ((i + 1) * 2 * Math.PI) / 18,
      y = 4 + Math.sin(a) * 3.51,
      z = Math.cos(a) * 3.51
    for (const s of [-1, 1]) {
      b.rod(
        'wood',
        c.edge,
        [s * 0.92, y, z],
        [s * 0.92, 4 + Math.sin(d) * 3.51, Math.cos(d) * 3.51],
        0.18,
        true,
      )
      if (i % 2 === 0) b.rod('wood', c.wood, [s * 0.92, 4, 0], [s * 0.92, y, z], 0.13, true)
    }
    b.box('wood', i % 2 ? c.wood : c.edge, 0, y, z, 2.16, 0.12, 0.65, false, -a)
  }
  for (let i = 0; i < 6; i++) {
    const x = i * 2.15 + 3.1
    b.box('wood', c.edge, x, 5.9, -1.4, 2.31, 0.15, 0.91)
    for (const s of [-1, 1]) b.box('wood', c.wood, x, 6.1, -1.4 + s * 0.47, 2.31, 0.4, 0.1)
    if (i % 2 === 0) b.cyl('wood', c.wood, x, 2.97, -1.4, 0.18, 5.94, 0.18)
  }
}
function fortifiedWall(ctx) {
  const s = ctx.id === 'salt',
    c = ctx.colors,
    h = s ? 3.0 : 4.1
  for (const sign of [-1, 1]) {
    const b = at(ctx, sign * 19.5, -34.7)
    b.box('masonry', c.base, 0, 0.42, 0, 24.1, 0.83, 1.92, true)
    b.box('masonry', c.wall, 0, 1.64, 0, 23.7, h, 1.53, true)
    b.box('masonry', c.base, 0, 1.73 + h * 0.5, 0, 24.1, 0.25, 1.8, true)
    for (let k = -5; k <= 5; k++) b.box('masonry', c.wall, k * 2.13, 2.08 + h * 0.5, 0, 1.19, 0.57, 1.58)
    const tower = at(ctx, sign * 32.65, -34.3)
    tower.cyl('masonry', c.base, 0, 2.42, 0, 2.28, 4.84, 2.28, 0.91, 1, s ? 10 : 6)
    tower.hit(0, 2.42, 0, 3.13, 4.84, 3.13)
    tower.cyl('masonry', c.wall, 0, 5.45, 0, 2.23, 1.36, 2.23, 1, 0.94, s ? 10 : 6)
    tower.cyl('masonry', c.base, 0, 6.26, 0, 2.41, 0.31, 2.41)
    if (s) {
      tower.ell('plaster', c.trim, 0, 6.38, 0, 1.85, 1.18, 1.85)
      tower.rod('metal', c.trim, [0, 7.11, 0], [0, 8.26, 0], 0.07)
    } else {
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI) / 3
        tower.box(
          'masonry',
          c.wall,
          1.9 * Math.cos(angle),
          6.69,
          1.9 * Math.sin(angle),
          0.83,
          0.75,
          0.94,
          false,
          0,
          0,
          -angle,
        )
      }
    }
  }
}
function grove(ctx) {
  const c = ctx.colors
  for (const [x, z, r, h, spin] of [
    [-34, 11, 1.78, 24, 2],
    [24, -35, 2.12, 27, 1],
    [39, -7, 1.68, 21, 0],
    [-26, -32, 1.82, 23, 3],
  ]) {
    const b = at(ctx, x, z)
    b.cyl('wood', c.wood, 0, h * 0.47, 0, r, h * 0.95, r * 0.97, 0.61, 1.15, 13)
    b.hit(0, h * 0.47, 0, r * 1.52, h * 0.93, r * 1.56)
    for (let j = 0; j < 8; j++) {
      const a = j * 2.399 + spin,
        dx = Math.cos(a),
        dz = Math.sin(a)
      const y = h * (0.67 + (j % 3) * 0.094),
        extent = 3.3 + (j % 4) * 0.85
      b.rod(
        'wood',
        j % 2 ? c.edge : c.wood,
        [dx * r * 0.72, h * 0.17, dz * r * 0.72],
        [dx * r * 2.29, 0.1, dz * r * 2.29],
        r * 0.37,
      )
      b.rod(
        'wood',
        c.wood,
        [0, y * 0.79, 0],
        [dx * extent, y + 1.98, dz * extent],
        0.55 - (j % 3) * 0.06,
      )
      b.ell(
        'leaf',
        j % 3 === 0 ? '#536b5c' : j % 3 === 1 ? '#6a8264' : '#809064',
        dx * extent,
        y + 2.6,
        dz * extent,
        3.72,
        1.71,
        3.44,
      )
      if (j % 2 === 0)
        b.rod(
          'leaf',
          '#526d58',
          [dx * extent, y + 2.02, dz * extent],
          [dx * extent + 0.3, y - 3.2, dz * extent - 0.47],
          0.09,
        )
    }
  }
}
function overhead(ctx) {
  const c = ctx.colors,
    id = ctx.id
  for (const [z, slant] of [
    [2, -2],
    [-18, 2],
  ]) {
    const b = at(ctx, 0, z)
    for (const s of [-1, 1]) {
      b.cyl('wood', c.wood, s * 5.6, 2.64, s * slant, 0.15, 5.28, 0.15, 0.77, 1, 9)
      b.hit(s * 5.6, 2.64, s * slant, 0.24, 5.28, 0.24)
      b.cyl('cloth', c.trim, s * 5.6, 3.55, s * slant, 0.16, 0.18, 0.16)
    }
    for (let j = 0; j < 10; j++) {
      const x = (j - 5) * 1.1,
        k = (j + 1 - 5) * 1.1,
        dip = Math.cos(((j - 5) * Math.PI) / 10) * 0.76,
        ndip = Math.cos(((j + 1 - 5) * Math.PI) / 10) * 0.76
      b.rod(
        id === 'gorge' ? 'metal' : 'cloth',
        c.wood,
        [x, 5.12 - dip, (x * slant) / 5.6],
        [k, 5.12 - ndip, (k * slant) / 5.6],
        id === 'gorge' ? 0.041 : 0.031,
      )
      if (id === 'salt') {
        b.box(
          'cloth',
          j % 3 === 0 ? c.trim : c.cloth,
          x + 0.53,
          5.06 - (dip + ndip) / 2,
          ((x + 0.53) * slant) / 5.6 + 0.65,
          1.16,
          0.064,
          1.76,
          false,
          -0.16,
          (dip - ndip) * 0.37,
        )
      } else if (id === 'rain' || id === 'root') {
        if (j % 2 === 0)
          b.box(
            'cloth',
            j % 4 === 0 ? c.cloth : c.trim,
            x + 0.25,
            4.82 - dip,
            (x * slant) / 5.6,
            0.53,
            0.59,
            0.045,
            false,
            0.08,
            (j % 3) * 0.075,
          )
      } else if (j === 3 || j === 7) b.lantern(x, 4.17 - dip, (x * slant) / 5.6, 0.83)
    }
  }
}
function palm(ctx, x, z, h, date = false) {
  const b = at(ctx, x, z),
    drift = Math.sin(x * 7 + z) * 0.72,
    c = ctx.colors
  const crown = [drift, h, 0.27]
  for (let i = 0; i < 6; i++) {
    const a = i / 6,
      d = (i + 1) / 6
    b.rod(
      'wood',
      i % 2 ? '#89795a' : '#82785b',
      [drift * a * a, a * h, 0.27 * a],
      [drift * d * d, d * h, 0.27 * d],
      0.25 * (1 - 0.45 * a),
    )
    b.cyl(
      'wood',
      '#a69875',
      drift * d * d,
      h * d,
      0.27 * d,
      0.22 * (1 - 0.42 * d),
      0.095,
      0.22 * (1 - 0.42 * d),
      0.85,
      1,
    )
  }
  b.hit(0, h * 0.48, 0, 0.38, h * 0.96, 0.38)
  for (let j = 0; j < (date ? 11 : 13); j++) {
    const a = j * 2.399 + x * 0.41,
      dx = Math.cos(a),
      dz = Math.sin(a),
      r = h * (0.44 + (j % 3) * 0.045),
      lift = 0.86 + (j % 3) * 0.38
    const verts = []
    const core = (t) => [
      crown[0] + dx * r * t,
      h + Math.sin(t * Math.PI) * lift - 0.95 * t * t,
      crown[2] + dz * r * t,
    ]
    const perp = [-dz, dx]
    for (let i = 0; i < 13; i++) {
      const t = i / 13,
        end = (i + 1) / 13,
        p = core(t),
        q = core(end),
        width = (0.17 + 0.68 * Math.sin((t * 0.94 + 0.025) * Math.PI)) * (date ? 0.73 : 1)
      for (const sign of [-1, 1]) {
        const tip = [
          q[0] + perp[0] * sign * width + dx * 0.15,
          q[1] - 0.1 - width * 0.58,
          q[2] + perp[1] * sign * width + dz * 0.15,
        ]
        verts.push(...p, ...tip, ...q)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.computeVertexNormals()
    ctx.batch.add(
      'leaf',
      geo,
      ['#617d4b', '#6d8651', '#879759', '#587a50'][j % 4],
      x,
      b.pt(0, 0, 0)[1],
      z,
    )
    geo.dispose()
    b.rod('leaf', date ? c.edge : '#657b4b', core(0), core(0.49), 0.042)
  }
  for (let j = 0; j < 4; j++)
    b.ell(
      'leaf',
      date ? '#9c7944' : '#737548',
      drift + Math.cos(j) * 0.21,
      h - 0.19,
      0.27 + Math.sin(j) * 0.23,
      0.15,
      0.24,
      0.15,
    )
}
function foreground(ctx) {
  const c = ctx.colors,
    id = ctx.id,
    b = at(ctx, 5.4, 13.8, -0.62)
  if (id === 'rain') {
    for (const [x, z, h] of [
      [-6.8, 10.9, 8.3],
      [12.3, 3.5, 9.4],
      [-19, -21, 7.3],
      [28, 22, 8.1],
      [5.9, 32, 8.7],
      [7.4, -30, 6.6],
      [31, -39, 9.3],
    ])
      palm(ctx, x, z, h)
    b.box('masonry', c.stone, 0, 0.25, 0, 1.15, 0.48, 2.64, true)
    b.box('metal', '#6c9283', 0, 0.506, 0, 0.91, 0.034, 2.37)
    b.cyl('wood', c.edge, -0.51, 0.77, 0.91, 0.09, 1.46, 0.09)
    b.rod('wood', c.edge, [-0.51, 1.45, 0.91], [0.04, 1.35, 0.76], 0.091)
  } else if (id === 'salt') {
    for (const [x, z, h] of [
      [-8.3, 14.3, 6.8],
      [9.1, -7.8, 7.8],
      [33, 16, 9.06],
      [15, -30, 8.1],
    ])
      palm(ctx, x, z, h, true)
    for (const [x, z, h, k] of [
      [0, 0.1, 1.05, 1],
      [-0.49, 0.53, 0.57, 0],
      [0.52, -0.25, 0.74, 1],
    ]) {
      b.ell('plaster', k ? '#b27d53' : '#bda47b', x, h * 0.45, z, h * 0.3, h * 0.45, h * 0.3)
      b.cyl(
        'plaster',
        k ? '#bc936c' : '#897b63',
        x,
        h * 0.85,
        z,
        h * 0.17,
        h * 0.26,
        h * 0.17,
        0.9,
        1,
        12,
      )
      b.cyl('plaster', c.base, x, h * 0.98, z, h * 0.21, 0.071, h * 0.21, 1, 0.85, 12)
      b.cyl('plaster', c.wood, x, h * 1.02, z, h * 0.146, 0.018, h * 0.146)
    }
  } else if (id === 'root') {
    for (const [x, z, k] of [
      [-7, 8.4, 1],
      [7.1, 3, -1],
    ]) {
      const a = at(ctx, x, z)
      a.rod('wood', c.wood, [0, 0, 0], [-k * 0.66, 5.9, -0.44], 0.42)
      a.rod('wood', c.wood, [-k * 0.66, 5.9, -0.44], [k * 2.78, 8.05, -1.38], 0.35)
      a.rod('wood', c.edge, [k * 2.78, 8.05, -1.38], [k * 4.58, 8.34, -0.28], 0.2)
      a.hit(0, 2.79, 0, 0.7, 5.58, 0.7)
      for (let j = 0; j < 5; j++) {
        a.ell(
          'leaf',
          j % 2 ? '#668160' : '#778b66',
          k * (1 + j * 0.68),
          8.06 + (j % 2) * 0.67,
          -0.54 + Math.sin(j * 2.1) * 1.33,
          1.85,
          0.92,
          1.62,
        )
        a.rod(
          'leaf',
          '#687b52',
          [k * (j + 0.2), 7.84, -0.57],
          [k * (j + 0.3), 4.4 + Math.cos(j * 1.89), -0.17],
          0.047,
        )
      }
      for (let j = 0; j < 4; j++) {
        a.ell(
          'leaf',
          j % 2 ? '#b8b48a' : '#9caa96',
          -0.35 + k * 0.17 * Math.cos(j),
          0.6 + j * 0.48,
          0.12 + Math.sin(j) * 0.24,
          0.34,
          0.105,
          0.26,
        )
      }
    }
  } else {
    b.box('masonry', c.stone, 0, 0.29, 0, 1.5, 0.56, 1.49, true)
    b.cyl('metal', c.shade, 0, 0.79, 0, 0.55, 0.48, 0.55, 1, 0.54, 10)
    for (let i = 0; i < 7; i++) {
      const x = Math.sin(i * 1.89) * 0.3,
        z = Math.cos(i * 2.72) * 0.3
      b.ell('metal', i % 2 ? '#6d5142' : '#746054', x, 1.01, z, 0.1, 0.112, 0.14)
      if (i % 2) b.cyl('lamp', '#ea9052', x, 1.09, z, 0.071, 0.18, 0.08, 0.08, 0.86, 6)
    }
  }
}
export function district(ctx, layout) {
  if (ctx.id === 'salt' || ctx.id === 'gorge') fortifiedWall(ctx)
  if (ctx.id === 'rain') waterworks(ctx)
  if (ctx.id === 'root') grove(ctx)
  overhead(ctx)
  foreground(ctx)
  // Soft contact darkening remains readable on integrated GPUs without shadow maps.
  const n = 32,
    data = new Uint8Array(n * n * 4)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4,
        v = Math.max(0, 1 - ((x - 15.5) / 15.5) ** 2 - ((y - 15.5) / 15.5) ** 2)
      data[i] = 18
      data[i + 1] = 19
      data[i + 2] = 18
      data[i + 3] = Math.round(v * 103)
    }
  const map = new THREE.DataTexture(data, n, n)
  map.needsUpdate = true
  map.magFilter = THREE.LinearFilter
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  const vertices = [],
    uvs = [],
    indices = []
  const r = biomes[ctx.id].radius,
    cell = (2 * r) / gridDivisions
  for (const [x, z, yaw, w, d] of layout) {
    const spread = Math.hypot(w * 0.94, d * 0.92)
    const imin = Math.floor((x - spread + r) / cell),
      imax = Math.ceil((x + spread + r) / cell)
    const jmin = Math.floor((z - spread + r) / cell),
      jmax = Math.ceil((z + spread + r) / cell)
    const row = imax - imin + 1,
      start = vertices.length / 3
    for (let j = jmin; j <= jmax; j++)
      for (let i = imin; i <= imax; i++) {
        const wx = i * cell - r,
          wz = j * cell - r
        vertices.push(wx, heightAt(ctx.id, wx, wz) + 0.028, wz)
        const dx = wx - x,
          dz = wz - z
        uvs.push(
          0.5 + (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / (w * 1.88),
          0.5 + (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / (d * 1.84),
        )
        if (i < imax && j < jmax) {
          const v = start + (j - jmin) * row + i - imin
          indices.push(v, v + row, v + 1, v + 1, v + row, v + row + 1)
        }
      }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  const ground = new THREE.Mesh(geo, material)
  ground.renderOrder = 1
  ctx.group.add(ground)
  return () => {
    map.dispose()
    material.dispose()
    geo.dispose()
  }
}
