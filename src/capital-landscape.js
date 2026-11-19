import * as T from 'three'
import {
  biomes,
  gridData,
  gridDivisions,
  heightAt,
  riverX,
  riverWidth,
  waterAt,
  hash,
  noise,
} from './biomes.js'
import { createWater } from './water-render.js'
import { civicLevel } from './capital-data.js'
import { plantMaterials, treeKit } from './landscape-assets.js'

const id = 'capital'
export function civicTexture(kind) {
  const n = 128,
    data = new Uint8Array(n * n * 4)
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const i = 4 * (x + z * n),
        rnd = hash(x, z, 977)
      const sx = Math.sin((x / n) * Math.PI * 2),
        sz = Math.sin((z / n) * Math.PI * 2)
      const cloud = sx * Math.cos((z / n) * Math.PI * 4) + sz * Math.sin((x / n) * Math.PI * 6)
      let value = 223 + rnd * 13 + cloud * 3
      if (kind === 'stone' || kind === 'marble') {
        const row = Math.floor(z / 32),
          xm = (x + (row % 2) * 32) % 64,
          zm = z % 32
        const joint = Math.min(xm, 64 - xm, zm, 32 - zm)
        const vein = Math.abs(Math.sin((x / n) * 4 * Math.PI + sz * 2.4 + sx * 0.9 + cloud * 0.33))
        value += hash((x + (row % 2) * 32) >> 6, row, 914) * 10
        value -= joint < 1 ? 49 : joint < 2 ? 18 : 0
        if (kind === 'marble') value -= Math.max(0, 1 - vein / 0.15) * 21
      } else if (kind === 'roof') {
        value -= z % 18 < 2 ? 36 : 0
        value -= (x + (Math.floor(z / 18) % 2) * 12) % 24 < 1 ? 18 : 0
      } else value = 205 + 35 * rnd
      data[i] = value
      data[i + 1] = value * 0.995
      data[i + 2] = value * 0.983
      data[i + 3] = 255
    }
  const tex = new T.DataTexture(data, n, n)
  tex.wrapS = tex.wrapT = T.RepeatWrapping
  tex.minFilter = T.LinearMipmapLinearFilter
  tex.magFilter = T.LinearFilter
  tex.colorSpace = T.SRGBColorSpace
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}
function floorMesh() {
  const def = biomes.capital,
    n = gridDivisions,
    r = def.radius,
    data = gridData(id)
  const pos = [],
    color = [],
    uv = [],
    index = []
  const base = new T.Color(),
    a = new T.Color('#828b61'),
    b = new T.Color('#b0a681'),
    cityGround = new T.Color('#a59f88')
  const shale = new T.Color('#7b8385'),
    strata = new T.Color('#a9a89c')
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const x = (i * 2 * r) / n - r,
        z = (j * 2 * r) / n - r,
        k = j * (n + 1) + i,
        h = data[k]
      pos.push(x, h, z)
      uv.push(x * 0.22, z * 0.22)
      base
        .copy(a)
        .lerp(b, noise(x / 21, z / 23, 903))
        .multiplyScalar(0.95 + 0.11 * noise(x / 12, z / 12, 94))
      if (Math.max(Math.abs(x), Math.abs(z)) < 221) base.lerp(cityGround, 0.57)
      if (Math.abs(x - riverX(id, z)) < riverWidth(id, z) + 13) base.lerp(b, 0.55)
      if (h > 53) {
        const slope =
          (Math.abs(data[j * (n + 1) + Math.min(n, i + 1)] - h) +
            Math.abs(data[Math.min(n, j + 1) * (n + 1) + i] - h)) /
          6
        const band = 0.5 + 0.5 * Math.sin(0.19 * h + x * 0.012 + Math.sin(z * 0.058) * 1.8),
          exposure = Math.min(0.99, (h - 53) / 44 + slope * 0.27)
        base
          .lerp(shale, exposure)
          .lerp(strata, exposure * (band * 0.42 + noise(x / 23, z / 24, 94) * 0.32))
      }
      color.push(base.r, base.g, base.b)
      if (i < n && j < n) {
        const q = k + n + 1
        index.push(k, q, k + 1, k + 1, q, q + 1)
      }
    }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new T.Float32BufferAttribute(color, 3))
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  g.computeVertexNormals()
  const m = new T.Mesh(
    g,
    new T.MeshStandardMaterial({ map: civicTexture('earth'), roughness: 0.98, vertexColors: true }),
  )
  m.receiveShadow = true
  return m
}
function boulevard(group) {
  const coords = [],
    uv = [],
    colors = [],
    indices = []
  function rect(x, z, w, d, y, color) {
    const i = coords.length / 3,
      col = new T.Color(color)
    for (const [a, b] of [
      [x - w / 2, z - d / 2],
      [x - w / 2, z + d / 2],
      [x + w / 2, z - d / 2],
      [x + w / 2, z + d / 2],
    ]) {
      coords.push(a, y, b)
      uv.push(a / 2.3, b / 2.3)
      colors.push(col.r, col.g, col.b)
    }
    indices.push(i, i + 1, i + 2, i + 2, i + 1, i + 3)
  }
  for (const alongX of [false, true]) {
    for (const lane of [-165, -107, -53, 0, 53, 107, 165]) {
      const major = lane === 0,
        w = major ? 12 : 6.2,
        len = major ? 466 : 410,
        y = civicLevel + (alongX ? 0.029 : 0.023)
      rect(
        alongX ? 0 : lane,
        alongX ? lane : 0,
        alongX ? len : w,
        alongX ? w : len,
        y,
        major ? '#aea998' : '#aaa48c',
      )
      for (const s of [-1, 1])
        rect(
          alongX ? 0 : lane + s * (w / 2 + 0.3),
          alongX ? lane + s * (w / 2 + 0.3) : 0,
          alongX ? len : 0.6,
          alongX ? 0.6 : len,
          y,
          '#d4cbb6',
        )
    }
  }
  rect(0, 0, 49, 56, civicLevel + 0.045, '#c8c4b3')
  rect(-52, -62, 71, 34, civicLevel + 0.049, '#b5b6ad')
  for (const offset of [-1, 1]) {
    rect(offset * 22, 0, 0.5, 52, civicLevel + 0.058, '#777e77')
    rect(0, offset * 25, 44, 0.46, civicLevel + 0.058, '#777e77')
  }
  for (const [x, z, w, d] of [
    [-108, 45, 24, 26],
    [70, 30, 24, 24],
    [108, 76, 27, 37],
    [-49, 61, 24, 21],
    [74, 163, 34, 21],
    [-171, -24, 29, 23],
    [40, -105, 35, 24],
  ])
    rect(x, z, w, d, civicLevel + 0.043, '#b7ad96')
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(coords, 3))
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  const road = new T.Mesh(
    g,
    new T.MeshStandardMaterial({ map: civicTexture('stone'), vertexColors: true, roughness: 0.83 }),
  )
  road.receiveShadow = true
  group.add(road)
  for (const size of [5.7, 6.04, 7.85]) {
    const ring = new T.Mesh(
      new T.RingGeometry(size, size + 0.13, 64),
      new T.MeshStandardMaterial({ color: size === 6.04 ? '#838c8c' : '#a0885f', roughness: 0.64 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, civicLevel + 0.063, 0)
    group.add(ring)
  }
  const stars = []
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      next = ((i + 1) * Math.PI) / 8,
      ray = i % 2 ? 1.65 : i % 4 ? 3.9 : 5.52,
      nextr = i % 2 ? (i % 4 === 3 ? 5.52 : 3.9) : 1.65
    stars.push(
      0,
      0.068,
      0,
      Math.sin(a) * ray,
      0.068,
      Math.cos(a) * ray,
      Math.sin(next) * nextr,
      0.068,
      Math.cos(next) * nextr,
    )
  }
  const sg = new T.BufferGeometry()
  sg.setAttribute('position', new T.Float32BufferAttribute(stars, 3))
  sg.computeVertexNormals()
  const star = new T.Mesh(sg, new T.MeshStandardMaterial({ color: '#8c866f', side: T.DoubleSide }))
  star.position.y = civicLevel
  group.add(star)
}
function outskirts(group, solids) {
  const trees = [],
    caps = []
  for (let i = 0; i < 850; i++) {
    const x = (hash(i, 1, 243) - 0.5) * 1440,
      z = (hash(i, 2, 243) - 0.5) * 1440
    if (
      Math.max(Math.abs(x), Math.abs(z)) < 246 ||
      Math.abs(x) < 7 ||
      Math.abs(z) < 7 ||
      waterAt(id, x, z).canCollect
    )
      continue
    const h = 4 + hash(i, 3, 61) * 10,
      y = heightAt(id, x, z)
    if (y > 68 && hash(i, 1, 762) < Math.min(0.96, (y - 68) / 70)) continue
    trees.push([x, y, z, h])
    solids.push({ x, y, z, r: 0.31, h: h * 0.66 })
    for (let k = 0; k < 3; k++)
      caps.push([
        x + Math.sin(i + k * 2.1) * h * 0.12,
        y + h * 0.68 + k * 0.53,
        z + Math.cos(i * 0.54 + k * 2.1) * h * 0.13,
        h * (0.25 + 0.08 * hash(i, k, 4)),
        h * 0.29,
      ])
  }
  const torso = new T.InstancedMesh(
    new T.CylinderGeometry(0.18, 0.41, 1, 6),
    new T.MeshStandardMaterial({ color: '#615848', roughness: 0.98 }),
    trees.length,
  )
  const leaves = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    new T.MeshStandardMaterial({ roughness: 0.98 }),
    caps.length,
  )
  const temp = new T.Object3D(),
    green = new T.Color()
  trees.forEach(([x, y, z, h], i) => {
    temp.position.set(x, y + h * 0.29, z)
    temp.scale.set(1, h * 0.58, 1)
    temp.updateMatrix()
    torso.setMatrixAt(i, temp.matrix)
  })
  caps.forEach(([x, y, z, r, h], i) => {
    temp.position.set(x, y, z)
    temp.scale.set(r, h, r)
    temp.rotation.y = i * 2.41
    temp.updateMatrix()
    leaves.setMatrixAt(i, temp.matrix)
    green.setHSL(0.205 + hash(i, 4, 31) * 0.05, 0.2, 0.32 + hash(i, 5, 73) * 0.14)
    leaves.setColorAt(i, green)
  })
  group.add(torso, leaves)
}
function cityGardens(group, solids) {
  const positions = [
    [-13, 19, 0.61],
    [23, 17, 0.62],
    [33, 34, 0.67],
    [39, 39, 0.78],
    [29, 43, 0.76],
    [20, 39, 0.62],
    [-31, 38, 0.78],
    [-42, 33, 0.7],
    [29, -23, 0.62],
    [-26, -35, 0.68],
    [38, -64, 0.8],
    [-73, -46, 0.64],
  ]
  for (const dir of [-1, 1])
    for (const side of [-1, 1])
      for (const dist of [71, 91, 130, 153, 183]) {
        positions.push(
          [dir * dist, side * 8.1, 0.53 + 0.14 * hash(dist, dir, 77)],
          [side * 8.53, dir * dist, 0.54 + 0.18 * hash(dir, dist, 32)],
        )
      }
  const mats =
    typeof document === 'undefined'
      ? {
          wood: new T.MeshLambertMaterial({ vertexColors: true }),
          leaves: new T.MeshLambertMaterial({ vertexColors: true }),
        }
      : plantMaterials()
  for (const unused of ['fronds', 'stone', 'grass']) {
    mats[unused]?.map?.dispose()
    mats[unused]?.dispose()
  }
  const temp = new T.Object3D()
  for (let type = 0; type < 2; type++) {
    const trees = positions.filter((_, i) => i % 2 === type),
      kit = treeKit(type ? 'acacia' : 'broad', 9421 + type)
    const trunk = new T.InstancedMesh(kit.wood, mats.wood, trees.length),
      leaves = new T.InstancedMesh(kit.crown, mats.leaves, trees.length)
    trees.forEach(([x, z, k], i) => {
      temp.position.set(x, civicLevel - 0.08, z)
      temp.scale.setScalar(k)
      temp.rotation.y = i * 2.399
      temp.updateMatrix()
      trunk.setMatrixAt(i, temp.matrix)
      leaves.setMatrixAt(i, temp.matrix)
      solids.push({ x, z, y: civicLevel - 0.1, h: k * kit.h, r: k * kit.r * 0.85 })
    })
    trunk.castShadow = true
    leaves.castShadow = true
    group.add(trunk, leaves)
  }
}
function horizon(group) {
  const pos = [],
    colors = [],
    idx = [],
    n = 192
  for (let i = 0; i <= n; i++) {
    const a = ((i % n) * Math.PI * 2) / n,
      dx = Math.cos(a),
      dz = Math.sin(a)
    const h = 83 + noise(dx * 4, dz * 4, 751) * 140 + noise(dx * 19, dz * 19, 783) * 97
    for (const [r, y, col] of [
      [940, -29, '#899294'],
      [1020, h * 0.52, '#858e92'],
      [1102, h, '#a4abac'],
    ]) {
      pos.push(dx * r, y, dz * r)
      const c = new T.Color(col)
      colors.push(c.r, c.g, c.b)
    }
    if (i)
      for (let j = 0; j < 2; j++) {
        const p = (i - 1) * 3 + j
        idx.push(p, p + 1, p + 3, p + 3, p + 1, p + 4)
      }
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  group.add(new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })))
}
export function createCapitalLandscape(scene) {
  const group = new T.Group(),
    ground = floorMesh(),
    solids = []
  group.name = 'capital-landscape'
  group.add(ground)
  scene.add(group)
  const water = createWater(group, id, ground, solids)
  boulevard(group)
  outskirts(group, solids)
  cityGardens(group, solids)
  horizon(group)
  return {
    ground,
    solids,
    setWaterActor: water.setActor,
    update(dt, time, day, cam) {
      water.update(time, day)
      scene.userData.capitalCamera = cam.position || cam
    },
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          o.material.normalMap?.dispose()
          o.material.map?.dispose()
          o.material.dispose()
        }
        if (o.isInstancedMesh) o.dispose()
      })
      group.removeFromParent()
      delete scene.userData.capitalCamera
    },
  }
}
