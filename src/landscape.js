import * as THREE from 'three'
import { onBorderRoad } from './borders.js'
import { createCapitalLandscape } from './capital-landscape.js'
import {
  biomes,
  gridDivisions,
  gridData,
  heightAt,
  noise,
  clamp,
  mix,
  riverWidth,
  riverX,
  trailDistance,
} from './biomes.js'
import {
  Shape,
  random,
  photoSet,
  photographedRock,
  plantMaterials,
  treeKit,
  grassKit,
  broadHerb,
  rockKit,
  distantTree,
} from './landscape-assets.js'

const colors = {
  rain: [0x839960, 0x597640, 0x94967a, 0x797e6d, 0xa89b78],
  salt: [0xdfbd88, 0xdbad71, 0xf4e9c7, 0xb68c62, 0xc39864],
  root: [0x849565, 0x56733f, 0x8d9076, 0x686f5e, 0x9b8763],
  gorge: [0xc79068, 0xb87e59, 0xd6b38a, 0x9d6247, 0xcda27b],
}
function terrain(id) {
  const b = biomes[id],
    n = gridDivisions,
    r = b.radius,
    H = gridData(id),
    size = (n + 1) ** 2
  const pos = new Float32Array(size * 3),
    uv = new Float32Array(size * 2),
    col = new Float32Array(size * 3),
    ix = new Uint32Array(n * n * 6)
  const palette = colors[id].map((c) => new THREE.Color(c)),
    sample = new THREE.Color()
  let wi = 0
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const k = j * (n + 1) + i,
        x = -r + (2 * r * i) / n,
        z = -r + (2 * r * j) / n,
        y = H[k]
      const tile = id === 'salt' ? 4.2 : id === 'gorge' ? 4.0 : 3.1
      pos.set([x, y, z], k * 3)
      uv.set([x / tile, z / tile], k * 2)
      const broad = noise(x / 29, z / 29, b.seed + 11),
        fine = noise(x / 6, z / 6, b.seed + 7)
      const grade =
        Math.hypot(
          H[j * (n + 1) + Math.min(n, i + 1)] - H[k],
          H[Math.min(n, j + 1) * (n + 1) + i] - H[k],
        ) /
        ((2 * r) / n)
      sample.copy(palette[0]).lerp(palette[1], broad)
      const riverDist = Math.abs(x - riverX(id, z)),
        bankDist = riverDist - riverWidth(id, z)
      if (id === 'salt') {
        const salt = Math.hypot((x - riverX(id, z)) / 53, (z + 164) / 123)
        sample.lerp(palette[2], clamp((1.56 - salt) * 2.1))
      } else if (id === 'gorge') {
        const band = 0.5 + 0.5 * Math.sin(y * 0.77 + Math.sin(x * 0.024) + 0.7 * Math.sin(z * 0.011))
        sample.lerp(palette[3], clamp(grade * 1.5 + 0.2) * band * 0.9)
        sample.lerp(palette[2], clamp((1.6 - bankDist) / 8))
      } else sample.lerp(palette[2], clamp((5 - bankDist) / 8) * 0.65)
      if (id !== 'gorge') sample.lerp(palette[3], clamp((grade - 0.24) * 1.65))
      const trail = trailDistance(id, x, z)
      sample.lerp(palette[4], clamp((6.7 - trail) / 4.5) * 0.86)
      const light = 0.9 + 0.09 * broad + 0.08 * fine
      col.set([sample.r * light, sample.g * light, sample.b * light], k * 3)
      if (i < n && j < n) {
        const a = k + n + 1
        ix.set([k, a, k + 1, k + 1, a, a + 1], wi)
        wi += 6
      }
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(new THREE.BufferAttribute(ix, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      ...photoSet(id),
      normalScale: new THREE.Vector2(0.61, 0.61),
      vertexColors: true,
      roughness: 0.96,
    }),
  )
  mesh.receiveShadow = true
  mesh.name = 'continuous-terrain'
  return mesh
}

function horizon(id, group) {
  const b = biomes[id],
    rng = random(b.seed + 31),
    arid = id === 'gorge' || id === 'salt'
  const apron = new Shape(),
    edge = [],
    landTint = new THREE.Color(colors[id][0]).multiplyScalar(0.78)
  for (let k = 0; k < 4; k++)
    for (let j = 0; j < 128; j++) {
      const u = mix(-b.radius, b.radius, j / 128)
      const [x, z] = [
          [-b.radius, u],
          [u, b.radius],
          [b.radius, -u],
          [-u, -b.radius],
        ][k],
        y = heightAt(id, x, z)
      const bank = []
      for (let l = 0; l < 4; l++) {
        const xx = x * (1 + l * 0.12),
          zz = z * (1 + l * 0.12),
          t = l / 3
        const yy = mix(y, 18 + 45 * noise(xx / 101, zz / 101, b.seed) - 9, t)
        bank.push(apron.vert(new THREE.Vector3(xx, yy, zz), landTint))
      }
      edge.push(bank)
    }
  for (let k = 0; k < edge.length; k++)
    for (let l = 0; l < 3; l++) {
      const a = edge[k],
        c = edge[(k + 1) % edge.length]
      apron.join(a[l], a[l + 1], c[l + 1], c[l])
    }
  group.add(
    new THREE.Mesh(
      apron.geometry(),
      new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    ),
  )
  for (let layer = 0; layer < 2; layer++) {
    const shape = new Shape(),
      count = 230,
      R = 770 + layer * 330
    const peaks = Array.from({ length: 20 }, (_, i) => [
      (i * 2 * Math.PI) / 20 + 0.22 * (rng() - 0.5),
      0.04 + rng() * 0.15,
      50 + rng() * 143,
    ])
    const shade = new THREE.Color(layer ? (arid ? 0xab9a94 : 0x829792) : arid ? 0x947d70 : 0x698276)
    const base = shade.clone().multiplyScalar(0.75)
    const ring = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 2 * Math.PI
      let h = 38 + layer * 30 + 12 * Math.sin(10 * a) + 7 * Math.sin(21 * a)
      for (const [pa, w, m] of peaks) {
        const d = Math.abs(Math.atan2(Math.sin(a - pa), Math.cos(a - pa)))
        h += m * Math.exp(-(d * d) / (2 * w * w))
      }
      const dx = Math.cos(a),
        dz = Math.sin(a),
        rr = R + 11 * Math.cos(7 * a),
        grain = 12 * noise(dx * 21, dz * 21, b.seed)
      h += 32 * (noise(dx * 25, dz * 25, b.seed + 79) - 0.5) + 13 * Math.sin(49 * a)
      ring.push([
        shape.vert(new THREE.Vector3(dx * (rr - 113), -54, dz * (rr - 113)), base),
        shape.vert(
          new THREE.Vector3(dx * (rr - 57), h * 0.48 + grain, dz * (rr - 57)),
          shade.clone().multiplyScalar(0.83 + 0.06 * rng()),
        ),
        shape.vert(new THREE.Vector3(dx * rr, h + grain, dz * rr), shade),
      ])
    }
    for (let i = 0; i < count; i++) {
      const l = (i + 1) % count
      for (let j = 1; j <= 2; j++) shape.join(ring[i][j - 1], ring[l][j - 1], ring[l][j], ring[i][j])
    }
    group.add(
      new THREE.Mesh(
        shape.geometry(),
        new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
      ),
    )
  }
}
function road(id, group) {
  const b = biomes[id],
    points = b.trail.map(([x, z]) => new THREE.Vector3(x, 0, z))
  const curve = new THREE.CatmullRomCurve3(points),
    width = id === 'gorge' ? 2.2 : id === 'root' ? 1.62 : 2.55
  const p = [],
    uv = [],
    colorsOut = [],
    idx = [],
    c = new THREE.Color(colors[id][4])
  const count = 200
  for (let k = 0; k <= count; k++) {
    const loc = curve.getPoint(k / count),
      dir = curve.getTangent(k / count),
      px = dir.z,
      pz = -dir.x
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) / 2,
        w = width * (1.05 + 0.15 * Math.sin(k * 0.16) + 0.08 * Math.sin(k * 0.61 + i))
      const x = loc.x + px * w * a,
        z = loc.z + pz * w * a
      p.push(x, heightAt(id, x, z) + 0.072, z)
      uv.push(x / 2.6, z / 2.6)
      const f = i === 2 ? 0.94 : 0.88
      colorsOut.push(c.r * f, c.g * f, c.b * f, i === 0 || i === 4 ? 0 : i === 2 ? 0.81 : 0.66)
    }
    if (k)
      for (let i = 0; i < 4; i++) {
        const a = (k - 1) * 5 + i
        idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6)
      }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colorsOut, 4))
  g.setIndex(idx)
  g.computeVertexNormals()
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      ...photoSet('path'),
      normalScale: new THREE.Vector2(0.45, 0.45),
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  )
  group.add(mesh)
  return mesh
}
const waterVertex = `
varying vec3 wPos;
#include <fog_pars_vertex>
void main(){wPos=(modelMatrix*vec4(position,1.)).xyz;
 vec4 mvPosition=viewMatrix*vec4(wPos,1.); gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`
const waterFragment = `
uniform float t;uniform float day;uniform vec3 waterTint;varying vec3 wPos;
#include <fog_pars_fragment>
float h(vec2 p){return fract(sin(dot(p,vec2(93.17,53.83)))*4327.643);}
float n(vec2 p){vec2 f=fract(p),i=floor(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){
 vec2 p=wPos.xz;
 float crinkle=n(vec2(p.x*.74,p.y*1.82+t*.43))+n(vec2(p.x*.43+t*.17,p.y*.81-t*.15))*.5;
 float ripple=sin(p.y*2.2+p.x*.64+3.4*crinkle+t*1.5);
 vec3 viewDir=normalize(cameraPosition-wPos);
 float fres=pow(1.-abs(viewDir.y),3.);
 float glitter=pow(max(0.,ripple)*smoothstep(.56,1.08,crinkle),6.);
 vec3 c=mix(waterTint*(.66+.23*crinkle),vec3(.40,.59,.60),fres*.65)+glitter*.22;
 gl_FragColor=vec4(c*mix(.135,1.,day),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`
function watercourse(id, group) {
  const b = biomes[id],
    p = [],
    idx = [],
    salt = id === 'salt',
    start = salt ? -274 : -b.radius,
    end = salt ? -54 : b.radius,
    steps = salt ? 100 : 310
  for (let i = 0; i <= steps; i++) {
    const z = mix(start, end, i / steps),
      cx = riverX(id, z),
      w = riverWidth(id, z) * (salt ? 1.035 : 1.2)
    p.push(cx - w, b.waterLevel, z, cx + w, b.waterLevel, z)
    if (i) {
      const a = (i - 1) * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  g.setIndex(idx)
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    day: { value: 1 },
    t: { value: 0 },
    waterTint: { value: new THREE.Color(b.water) },
  }
  group.add(
    new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        fog: true,
        side: THREE.DoubleSide,
      }),
    ),
  )
  return uniforms
}
function instances(group, geometry, material, list) {
  if (!list.length) return null
  const mesh = new THREE.InstancedMesh(geometry, material, list.length),
    o = new THREE.Object3D()
  for (let i = 0; i < list.length; i++) {
    const [x, y, z, sx, sy, sz, ry, rz = 0, rx = 0] = list[i]
    o.position.set(x, y, z)
    o.rotation.set(rx, ry, rz, 'YXZ')
    o.scale.set(sx, sy, sz)
    o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
  }
  mesh.computeBoundingSphere()
  group.add(mesh)
  return mesh
}
function adornments(id, group, solids) {
  const b = biomes[id],
    forest = id === 'rain' || id === 'root',
    rng = random(b.seed),
    mats = plantMaterials()
  mats.wood.dispose()
  mats.wood = new THREE.MeshStandardMaterial({
    ...photoSet('bark'),
    normalScale: new THREE.Vector2(0.77, 0.77),
    vertexColors: true,
    roughness: 0.97,
    side: THREE.DoubleSide,
  })
  photographedRock(mats.stone, forest)
  const wind = { value: 0 }
  for (const [m, amplitude] of [
    [mats.leaves, 0.0045],
    [mats.fronds, 0.008],
    [mats.grass, 0.045],
  ]) {
    m.onBeforeCompile = (s) => {
      s.uniforms.breezeTime = wind
      s.vertexShader =
        'uniform float breezeTime;\n' +
        s.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
        #ifdef USE_INSTANCING
        vec2 root=instanceMatrix[3].xz;
        float gust=sin(root.x*.13+root.y*.11+breezeTime*1.3)+.5*sin(root.x*.19-root.y*.13+breezeTime*2.15);
        transformed.x += gust*max(0.,position.y)*${amplitude.toFixed(4)};
        #endif`,
        )
    }
    m.customProgramCacheKey = () => String(amplitude)
  }
  const kits = forest
    ? [id === 'root' ? 'old' : 'broad', 'broad', id === 'rain' ? 'palm' : 'old', 'fern']
    : id === 'salt'
      ? ['acacia', 'palm']
      : ['acacia', 'broad']
  const buckets = new Map(),
    rocks = [[], [], []],
    grass = [[], []],
    spires = [[], []]
  const shadows = [],
    understory = [],
    herbs = [],
    snags = []
  const [wildX, wildZ] = b.landmark
  const terrainY = (x, z) => heightAt(id, x, z)
  const open = (x, z) =>
    Math.hypot(x, z) > 58 &&
    trailDistance(id, x, z) > 4.8 &&
    Math.hypot(x - wildX, z - wildZ) > 9 &&
    !onBorderRoad(id, x, z)
  function tree(x, z, index, s, a = rng() * 6.28) {
    if (s <= 0) return
    const key = index + '|' + Math.floor(x / 150) + '|' + Math.floor(z / 150)
    if (!buckets.has(key))
      buckets.set(key, {
        index,
        list: [],
        x: Math.floor(x / 150) * 150 + 75,
        z: Math.floor(z / 150) * 150 + 75,
      })
    const y = terrainY(x, z)
    buckets.get(key).list.push([x, y - 0.08, z, s, s * (0.9 + 0.17 * rng()), s, a])
    const type = kits[index],
      rad =
        type === 'old'
          ? 1.72
          : type === 'palm'
            ? 0.39
            : type === 'fern'
              ? 0.11
              : type === 'acacia'
                ? 0.48
                : 0.75
    if (type !== 'fern') {
      solids.push({
        kind: 'tree',
        grip: type === 'palm' ? 3.7 : type === 'old' ? 1.35 : 1.6,
        x,
        z,
        y: y - 0.08,
        h: s * (type === 'old' ? 24 : type === 'acacia' ? 6.3 : 12),
        r: rad * s * 0.95,
      })
      shadows.push([x, z, (type === 'old' ? 13 : type === 'palm' ? 5.1 : 8.2) * s, forest ? 0.56 : 0.33])
    }
  }
  const n = forest ? (id === 'rain' ? 3820 : 2850) : 320
  for (let i = 0; i < n; i++) {
    let x, z
    if (i < n * 0.37) {
      const angle = rng() * 6.28,
        rad = 52 + Math.sqrt(rng()) * 265
      x = Math.cos(angle) * rad
      z = -80 + Math.sin(angle) * rad
    } else {
      x = (rng() - 0.5) * 1212
      z = (rng() - 0.5) * 1212
    }
    if (!open(x, z)) continue
    const y = terrainY(x, z),
      watered = Math.abs(x - riverX(id, z)) < riverWidth(id, z) + 18
    if (y < b.waterLevel + 1) continue
    const grow = noise(x / 42, z / 42, b.seed + 21)
    if (forest && grow < 0.24 && rng() < 0.74) continue
    if ((id === 'gorge' && (y < 1 || grow < 0.47)) || (id === 'salt' && grow < 0.43 && !watered))
      continue
    const r = rng(),
      type = forest
        ? r < 0.41
          ? 0
          : r < 0.7
            ? 1
            : r < 0.89
              ? 2
              : 3
        : id === 'salt'
          ? (watered ? 0.8 : 0) > rng()
            ? 1
            : 0
          : r < 0.72
            ? 0
            : 1
    tree(x, z, type, (0.68 + rng() * 0.78) * (id === 'gorge' ? 0.67 : 1))
    if (forest && i % 3 === 0 && grow > 0.45) {
      const rx = x + 6.5 + (rng() - 0.5) * 5,
        rz = z + 8 * (rng() - 0.5)
      if (open(rx, rz) && terrainY(rx, rz) > b.waterLevel + 1)
        tree(rx, rz, rng() < 0.48 ? 0 : 1, 0.61 + rng() * 0.45)
    }
  }
  // Deliberately frame the route with ancient forms, leaving the actual route open.
  if (forest) {
    for (let i = 1; i < b.trail.length; i++) {
      const [x, z] = b.trail[i]
      for (const side of [-1, 1]) {
        const xx = x + side * (12 + rng() * 14),
          zz = z + (rng() - 0.5) * 9
        if (open(xx, zz)) tree(xx, zz, side < 0 ? 0 : 2, 0.92 + rng() * 0.39)
      }
    }
    if (id === 'root') {
      for (const [dx, dz, s] of [
        [-15, -5, 1.6],
        [14, -11, 1.8],
        [-4, -31, 2.0],
        [-26, -28, 1.6],
        [21, -32, 1.5],
      ]) {
        tree(wildX + dx, wildZ + dz, 0, s, 0)
      }
    }
    // The first bends of both forest roads are enveloped by a real canopy.
    // Trunks stand off the tread while fronds and boughs meet overhead.
    const path = new THREE.CatmullRomCurve3(b.trail.map(([x, z]) => new THREE.Vector3(x, 0, z)))
    const length = path.getLength(),
      threshold = id === 'rain' ? 44 : 43
    for (let distance = threshold; distance < length - 7; distance += 5.9 + rng() * 2.3) {
      const t = distance / length,
        c = path.getPointAt(t),
        dir = path.getTangentAt(t),
        nx = dir.z,
        nz = -dir.x
      if (c.z > -40) continue
      for (const side of [-1, 1]) {
        const farther = 7 + rng() * 5.7,
          xf = c.x + side * nx * farther,
          zf = c.z + side * nz * farther
        if (rng() < 0.73 && trailDistance(id, xf, zf) > 5.5) {
          const type = id === 'root' ? (rng() < 0.74 ? 0 : 1) : rng() < 0.66 ? 1 : 2
          tree(xf, zf, type, id === 'rain' ? 1.12 + rng() * 0.54 : 0.88 + rng() * 0.5)
        }
        const mid = 4.5 + rng() * 3.5,
          mx = c.x + side * nx * mid,
          mz = c.z + side * nz * mid
        if (trailDistance(id, mx, mz) > 3.2) {
          const s = 0.7 + rng() * 0.66
          tree(mx, mz, 3, s * 0.9, rng() * 6.28)
          herbs.push([mx + nx * 0.4, terrainY(mx, mz) - 0.06, mz + nz * 0.4, s, s, s, rng() * 6.28])
        }
        for (let j = 0; j < 3; j++) {
          const dist = 3.4 + rng() * 11.3,
            xx = c.x + side * nx * dist + (rng() - 0.5) * 5,
            zz = c.z + side * nz * dist + (rng() - 0.5) * 5
          if (trailDistance(id, xx, zz) < 2.9) continue
          const s = 0.59 + rng() * 1.28
          understory.push([xx, terrainY(xx, zz) - 0.04, zz, s, s, s, rng() * 6.28])
        }
      }
      if (rng() < 0.19) {
        const side = rng() < 0.5 ? -1 : 1,
          d = 5.3 + rng() * 4,
          xx = c.x + side * nx * d,
          zz = c.z + side * nz * d
        snags.push([xx, terrainY(xx, zz) - 0.02, zz, 1, 1, 1, Math.atan2(dir.x, dir.z)])
      }
    }
    // Shrub colonies grow around gaps, in irregular drifts at walking height.
    for (let k = 0; k < 650; k++) {
      const x = (rng() - 0.5) * (k < 390 ? 470 : 1160),
        z = (k < 390 ? -104 : 0) + (rng() - 0.5) * (k < 390 ? 440 : 1170)
      if (!open(x, z) || terrainY(x, z) < b.waterLevel + 0.6) continue
      for (let j = 0; j < 4; j++) {
        const xx = x + (rng() - 0.5) * 7,
          zz = z + (rng() - 0.5) * 7
        if (trailDistance(id, xx, zz) < 2.6) continue
        const s = 0.62 + rng() * 1.29
        understory.push([xx, terrainY(xx, zz) - 0.025, zz, s, s, s, rng() * 6.28])
      }
    }
  }
  function stone(x, z, rx, h, rz, which, spire = false, solid = true, rotation = rng() * 6.28) {
    const center = terrainY(x, z)
    let y = center
    for (let j = 0; j < 6; j++) {
      const a = j * 1.0472
      y = Math.min(y, terrainY(x + 0.88 * rx * Math.cos(a), z + 0.88 * rz * Math.sin(a)))
    }
    h += Math.min(h * 0.5, center - y)
    const group = spire ? spires : rocks
    group[which % group.length].push([x, y - 0.12, z, rx, h, rz, rotation])
    if (solid) {
      solids.push({ x, z, y: y - 0.2, h: h * 0.93, r: Math.min(rx, rz) * (spire ? 0.85 : 0.72) })
      shadows.push([x, z, (rx + rz) * 0.74, 0.43])
    }
  }
  for (let i = 0; i < (forest ? 650 : 1250); i++) {
    const x = (rng() - 0.5) * 1198,
      z = (rng() - 0.5) * 1198
    if (!open(x, z) || terrainY(x, z) < b.waterLevel - 1) continue
    const s = 0.45 + Math.pow(rng(), 3.9) * (forest ? 5.4 : 5.9)
    stone(
      x,
      z,
      s * (0.72 + rng() * 0.58),
      s * (0.53 + rng() * 0.61),
      s,
      (rng() * 3) | 0,
      false,
      s > 1.05,
    )
  }
  // Eroded fins and an irregular gateway are metres away from the arrival marker.
  if (id === 'salt' || id === 'gorge' || id === 'rain') {
    const fins =
      id === 'gorge'
        ? [
            [20, -25, 8, 45, 8],
            [-16, -37, 6, 28, 9],
            [32, -54, 13, 56, 10],
            [46, -74, 9, 52, 11],
            [-41, -78, 12, 34, 12],
            [-61, -90, 12, 47, 11],
          ]
        : id === 'salt'
          ? [
              [21, -19, 6, 24, 8],
              [-3, -24, 6, 25, 8],
              [41, -51, 10, 37, 12],
              [-42, -73, 8, 27, 11],
              [-62, -63, 5, 21, 10],
            ]
          : [
              [25, -46, 12, 35, 11],
              [70, -52, 12, 46, 13],
              [88, -53, 17, 59, 19],
              [-45, -59, 10, 45, 14],
            ]
    for (let k = 0; k < fins.length; k++) {
      const [dx, dz, rx, h, rz] = fins[k]
      stone(wildX + dx, wildZ + dz, rx, h, rz, k, true)
    }
    if (id === 'salt') {
      const ax = wildX + 9,
        az = wildZ - 22,
        base = Math.max(terrainY(wildX - 3, wildZ - 24), terrainY(wildX + 21, wildZ - 19))
      spires[0].push([ax, base + 19, az, 16, 6.2, 5, 0.12, 0.13, -0.05])
      solids.push({ x: ax, z: az, y: base + 19, h: 6, r: 4.5 })
    }
  }
  for (let i = 0; i < (forest ? 6850 : 3500); i++) {
    let x, z
    if (i < 1200) {
      const j = 1 + Math.floor(rng() * (b.trail.length - 1)),
        [a, c] = b.trail[j - 1],
        [d, e] = b.trail[j],
        t = rng()
      x = mix(a, d, t) + (rng() - 0.5) * 33
      z = mix(c, e, t) + (rng() - 0.5) * 33
    } else if (i < 2600) {
      x = (rng() - 0.5) * 465
      z = -80 + (rng() - 0.5) * 465
    } else {
      x = (rng() - 0.5) * 1200
      z = (rng() - 0.5) * 1200
    }
    if (Math.hypot(x, z) < 51 || trailDistance(id, x, z) < 2.7 || terrainY(x, z) < b.waterLevel + 0.4)
      continue
    const s = 0.46 + rng() * (forest ? 1.15 : 1.07)
    grass[i % 2].push([x, terrainY(x, z) - 0.03, z, s, s, s, rng() * 6.28])
  }
  for (let i = 0; i < 3; i++) instances(group, rockKit(id, b.seed + i), mats.stone, rocks[i])
  for (let i = 0; i < 2; i++)
    if (spires[i].length) instances(group, rockKit(id, b.seed + i + 4, true), mats.stone, spires[i])
  const lowLod = []
  function groundPlants(geometry, material, list, range) {
    const chunks = new Map()
    for (const item of list) {
      const ix = Math.floor(item[0] / 105),
        iz = Math.floor(item[2] / 105),
        key = ix + '|' + iz
      if (!chunks.has(key)) chunks.set(key, { x: ix * 105 + 52, z: iz * 105 + 52, list: [] })
      chunks.get(key).list.push(item)
    }
    for (const [_, c] of chunks)
      lowLod.push({ x: c.x, z: c.z, main: instances(group, geometry, material, c.list), range })
  }
  for (let i = 0; i < 2; i++) groundPlants(grassKit(!forest, b.seed + i), mats.grass, grass[i], 163)
  if (forest) {
    const shrub = new Shape(),
      col = new THREE.Color(id === 'root' ? 0x9caa67 : 0x96bc60)
    for (let a = 0; a < 7; a++) {
      const angle = a * 2.4,
        w = 0.84 + rng() * 0.65
      shrub.leafCard(
        new THREE.Vector3(Math.cos(angle) * 0.44, 0.56 + rng() * 0.36, Math.sin(angle) * 0.44),
        angle,
        w,
        w * 1.14,
        0.69 + rng() * 0.49,
        col.clone().multiplyScalar(0.77 + rng() * 0.33),
        rng() * 0.5,
      )
    }
    groundPlants(shrub.geometry(), mats.leaves, understory, 169)
    groundPlants(broadHerb(b.seed), mats.grass, herbs, 113)
    if (snags.length) {
      const log = new Shape(),
        c = new THREE.Color('#746f4b')
      log.tube(
        [
          [-0.16, 0.22, -2.4, 0.26],
          [-0.14, 0.38, -1, 0.37],
          [0, 0.42, 0.7, 0.39],
          [0.12, 0.34, 2.5, 0.29],
        ],
        c,
        9,
        0.23,
        0.13,
      )
      log.tube(
        [
          [0, 0.42, 0.7, 0.15],
          [-0.42, 0.7, 1, 0.12],
          [-0.71, 1, 1.1, 0.04],
        ],
        c,
        6,
      )
      instances(group, log.geometry(), mats.wood, snags)
    }
  }
  const meshes = kits.map((type, i) => {
    const kit = treeKit(type, b.seed + i * 7)
    return { ...kit, distant: type === 'fern' ? null : distantTree(type, b.seed + i, kit.h) }
  })
  const lod = []
  for (const chunk of buckets.values()) {
    const kit = meshes[chunk.index]
    const main = [
      instances(group, kit.wood, mats.wood, chunk.list),
      instances(group, kit.crown, kit.frond ? mats.fronds : mats.leaves, chunk.list),
    ]
    const far = kit.distant && instances(group, kit.distant.geometry, kit.distant.material, chunk.list)
    lod.push({ ...chunk, main, far })
  }
  return {
    shadows,
    wind,
    update: (cam) => {
      for (const c of lod) {
        const near = Math.hypot(cam.x - c.x, cam.z - c.z) < (kits[c.index] === 'fern' ? 200 : 201)
        for (const mesh of c.main) mesh.visible = near
        if (c.far) c.far.visible = !near
      }
      for (const c of lowLod) c.main.visible = Math.hypot(cam.x - c.x, cam.z - c.z) < c.range
    },
  }
}

function flight(id, group) {
  const b = biomes[id],
    rng = random(b.seed + 125),
    flock = []
  const verts = new Float32Array(18 * 3 * 3),
    g = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(verts, 3).setUsage(THREE.DynamicDrawUsage)
  g.setAttribute('position', pos)
  const mat = new THREE.MeshBasicMaterial({
    color: id === 'salt' ? 0x665941 : 0x394539,
    side: THREE.DoubleSide,
  })
  const birds = new THREE.Mesh(g, mat)
  birds.frustumCulled = false
  group.add(birds)
  for (let i = 0; i < 9; i++)
    flock.push({ s: 0.54 + rng() * 0.3, a: rng() * 6.29, r: 20 + rng() * 34, phase: rng() * 6.1 })
  return (t, day) => {
    birds.visible = day > 0.15
    for (let i = 0; i < flock.length; i++) {
      const bird = flock[i],
        wild = i > 3,
        [cx, cz] = wild ? b.landmark : [0, 0]
      const angle = bird.a + t * (wild ? 0.054 : 0.04),
        s = bird.s,
        dx = Math.cos(angle),
        dz = Math.sin(angle)
      const x = cx + (wild ? -24 : 19) + dx * bird.r,
        z = cz + (wild ? -9 : -57) + dz * bird.r
      const y =
        heightAt(id, cx, cz) +
        (id === 'root' ? 43 : 24) +
        (wild ? 8 : 1) +
        4 * Math.sin(angle * 0.75 + i)
      const flap = 0.18 * Math.sin(bird.phase + t * (id === 'gorge' ? 2.6 : 6)) + 0.11
      const k = i * 18
      verts.set(
        [
          x - dz * s * 0.52,
          y,
          z + dx * s * 0.52,
          x - dx * s,
          y + flap,
          z - dz * s,
          x + dz * s * 0.35,
          y - 0.07,
          z - dx * s * 0.35,
          x - dz * s * 0.52,
          y,
          z + dx * s * 0.52,
          x + dx * s,
          y + flap,
          z + dz * s,
          x + dz * s * 0.35,
          y - 0.07,
          z - dx * s * 0.35,
        ],
        k,
      )
    }
    pos.needsUpdate = true
  }
}

// A canopy-sized ambient occlusion field anchors trees to their surroundings. A
// second, tighter lobe keeps large trunks and loose boulders grounded at noon.
function bakeShade(id, items, meshes) {
  const b = biomes[id],
    size = 1024,
    r = b.radius,
    pixels = new Uint8Array(size * size)
  pixels.fill(255)
  const ratio = size / (2 * r)
  for (const [x, z, radius, opacity] of items) {
    const cx = (x + r) * ratio,
      cz = (z + r) * ratio,
      R = radius * ratio,
      inv = 1 / (R * R)
    for (let j = Math.max(0, Math.floor(cz - R)); j < Math.min(size, cz + R + 1); j++) {
      for (let i = Math.max(0, Math.floor(cx - R)); i < Math.min(size, cx + R + 1); i++) {
        const v = ((i - cx) ** 2 + (j - cz) ** 2) * inv
        if (v >= 1) continue
        const d = 1 - Math.sqrt(v),
          dark = opacity * (0.58 * d + 0.42 * Math.max(0, 1 - Math.sqrt(v) * 3.4))
        const k = j * size + i
        pixels[k] = Math.max(81, pixels[k] * (1 - dark))
      }
    }
  }
  const tex = new THREE.DataTexture(pixels, size, size, THREE.RedFormat)
  tex.minFilter = tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  for (const mesh of meshes)
    mesh.material.onBeforeCompile = (s) => {
      s.uniforms.groundOcclusion = { value: tex }
      s.vertexShader =
        'varying vec2 vGroundUv;\n' +
        s.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
      vGroundUv=position.xz/${r * 2}.0+0.5;`,
        )
      s.fragmentShader =
        'varying vec2 vGroundUv;uniform sampler2D groundOcclusion;\n' +
        s.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
      diffuseColor.rgb*=texture2D(groundOcclusion,vGroundUv).r;`,
        )
    }
  return tex
}

function waterfall(id, group, solids) {
  if (id !== 'rain') return null
  const b = biomes[id],
    z = b.landmark[1] - 23,
    x = riverX(id, z),
    y = b.waterLevel
  const g = new Shape(),
    pale = new THREE.Color('#afd7d4')
  const r = random(201)
  for (const [zz0, zz1, top, bottom, center, width] of [
    [-14, -8, 25, 14, -1, 13],
    [-7, -3, 14, 8, 0.8, 15],
    [-2, 2, 8, 0, -0.4, 15],
  ]) {
    for (let l = 0; l < 24; l++) {
      const offset = (l / 23 - 0.5) * width,
        wide = 0.26 + r() * 0.27
      const line = []
      for (let k = 0; k <= 12; k++) {
        const t = k / 12,
          xx = x + center + offset + 0.3 * Math.sin(t * 4 + l),
          yy = y + mix(top, bottom, t * t),
          zz = z + mix(zz0, zz1, Math.sin(t * Math.PI * 0.5)) + 0.13 * Math.sin(l)
        line.push([
          g.vert(new THREE.Vector3(xx - wide, yy, zz), pale, 0, t),
          g.vert(new THREE.Vector3(xx + wide, yy, zz), pale, 1, t),
        ])
        if (k) g.join(line[k - 1][0], line[k - 1][1], line[k][1], line[k][0])
      }
    }
  }
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    t: { value: 0 },
    day: { value: 1 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: waterVertex
      .replace('varying vec3 wPos;', 'varying vec3 wPos;varying vec2 vUv;')
      .replace('wPos=(modelMatrix', 'vUv=uv;wPos=(modelMatrix'),
    fragmentShader: `varying vec3 wPos;varying vec2 vUv;uniform float t;uniform float day;
    #include <fog_pars_fragment>
    void main(){float s=.5+.5*sin(wPos.y*2.4+t*9.+sin(wPos.x*2.));float edge=sin(vUv.x*3.14159);gl_FragColor=vec4(vec3(.58,.81,.85)*(.84+.16*s)*mix(.18,1.,day),.33+.53*edge);
    #include <colorspace_fragment>
    #include <fog_fragment>
    }`,
  })
  group.add(new THREE.Mesh(g.geometry(), mat))
  // A projecting rock shelf physically connects the curtain to its upper source.
  const geo = rockKit(id, 385, true),
    stone = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  const shelves = [
    [x, y - 0.8, z - 18, 12, 26, 5.5, 0],
    [x + 1, y - 0.8, z - 11.4, 11.2, 15.6, 3.8, -0.05],
    [x, y - 0.8, z - 5.3, 11.4, 9.1, 3.7, 0],
    [x - 11.2, y - 0.8, z - 15, 6.1, 25, 7.4, -0.1],
    [x + 12.4, y - 1, z - 18, 8.5, 24, 7.8, 0.1],
  ]
  instances(group, geo, stone, shelves)
  for (const [cx, cy, cz, rx, h, rz] of shelves)
    solids.push({ x: cx, z: cz, y: cy, h: h * 0.93, r: Math.min(rx, rz) * 0.91 })
  return uniforms
}
function drift(id, group) {
  if (id !== 'root' && id !== 'rain') return null
  const near = biomes[id].landmark,
    rng = random(723),
    positions = new Float32Array(180 * 3)
  for (let i = 0; i < positions.length; i += 3) {
    const x = near[0] + (rng() - 0.5) * 125,
      z = near[1] + (rng() - 0.5) * 110
    positions.set([x, heightAt(id, x, z) + 1 + rng() * 7, z], i)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const m = new THREE.PointsMaterial({
    color: id === 'root' ? 0x8bffcf : 0xfde581,
    size: 0.13,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })
  const pts = new THREE.Points(g, m)
  group.add(pts)
  return pts
}
export function createLandscape(scene, id) {
  if (id === 'capital') return createCapitalLandscape(scene)
  const group = new THREE.Group()
  group.name = id + '-landscape'
  scene.add(group)
  const ground = terrain(id),
    solids = []
  group.add(ground)
  horizon(id, group)
  const path = road(id, group)
  const water = watercourse(id, group),
    trees = adornments(id, group, solids),
    cascade = waterfall(id, group, solids),
    spores = drift(id, group)
  const shade = bakeShade(id, trees.shadows, [ground, path]),
    birds = flight(id, group)
  let lx = Infinity,
    lz = Infinity
  return {
    ground,
    solids,
    update(dt, time, daylight, camera) {
      const pos = camera?.position || camera
      if (pos && Math.abs(pos.x - lx) + Math.abs(pos.z - lz) > 7) {
        trees.update(pos)
        lx = pos.x
        lz = pos.z
      }
      trees.wind.value = time
      birds(time, daylight)
      for (const shader of [water, cascade])
        if (shader) {
          shader.t.value = time
          shader.day.value = daylight
        }
      if (spores) {
        spores.position.set(
          Math.sin(time * 0.09) * 0.8,
          0.2 * Math.sin(time * 0.24),
          Math.cos(time * 0.11) * 0.55,
        )
        spores.material.opacity = 0.19 + 0.7 * (1 - daylight)
      }
    },
    dispose() {
      group.removeFromParent()
      const geos = new Set(),
        mats = new Set(),
        maps = new Set()
      group.traverse((n) => {
        if (n.geometry) geos.add(n.geometry)
        if (n.material)
          for (const m of [].concat(n.material)) {
            mats.add(m)
            if (m.map) maps.add(m.map)
            if (m.normalMap) maps.add(m.normalMap)
          }
        if (n.isInstancedMesh) n.dispose()
      })
      for (const o of [shade, ...maps, ...mats, ...geos]) o.dispose()
    },
  }
}
