import { carveWaterBed } from './water-profile.js'
import { createWaterSystem } from './water-system.js'
export { riverX, riverWidth } from './water-profile.js'
// All coordinates are metres. Positive Y is up, north is -Z.
const world = (id, name, english, city, wild, description, seed, level, trail, vista, colors) => ({
  id,
  name,
  english,
  city,
  wild,
  description,
  seed,
  level,
  radius: 620,
  spawn: [0, 17],
  town: [0, 0],
  trail,
  vista,
  landmark: trail.at(-1),
  ...colors,
})

export const biomes = {
  capital: {
    id: 'capital',
    name: '白砥城',
    english: 'The Alabaster Crown',
    city: '白砥城',
    wild: '冠岭驿道',
    description: '四条古道汇入雪白的城墙。市泉、染坊与铜顶王庭共用一座山脊，也共用城下的水脉。',
    radius: 768,
    level: 24,
    seed: 72841,
    spawn: [0, 22],
    town: [0, 0],
    landmark: [-54, -80],
    trail: [
      [0, 22],
      [0, 0],
      [0, -52],
      [0, -110],
      [0, -165],
      [0, -216],
      [0, -270],
      [12, -333],
      [31, -418],
    ],
    vista: { from: [47, 55, 80], to: [-43, 45, -98] },
    sky: 0xbacfd5,
    fog: 0xcdc8b5,
    water: 0x457f8b,
    waterLevel: 8,
  },
  rain: world(
    'rain',
    '青雨林',
    'Verdant Basin',
    '汇流镇',
    '听瀑石庭',
    '沿着湿润的驿道走出河港，三叠水声从云雾中的喀斯特山壁传来。',
    8731,
    11,
    [
      [0, 22],
      [0, -46],
      [-10, -71],
      [-34, -97],
      [-46, -137],
      [-24, -172],
      [4, -184],
      [22, -213],
      [32, -252],
    ],
    { from: [44, 26, 64], to: [-25, 18, -53] },
    { sky: 0x9ccccf, fog: 0xaeccbd, water: 0x397a72, waterLevel: -1.8 },
  ),
  salt: world(
    'salt',
    '白盐旱漠',
    'The Salt Expanse',
    '白盐城',
    '望潮天门',
    '盐泽退去后，风把背风坡削成刀脊。跨过白色滩地，古海岸仍立在地平线上。',
    9137,
    8,
    [
      [0, 22],
      [0, -51],
      [14, -82],
      [39, -103],
      [68, -118],
      [83, -150],
      [64, -181],
      [86, -216],
      [112, -249],
    ],
    { from: [-129, 87, 133], to: [87, 24, -196] },
    { sky: 0xe2cba4, fog: 0xe5cba8, water: 0x77adaa, waterLevel: -1.4 },
  ),
  root: world(
    'root',
    '古根丛林',
    'The Elder Weald',
    '古根庭',
    '千年冠廊',
    '苔径在巨杉与榕根间消失。林冠层层相接，古树中空的根拱深处有幽蓝的孢光。',
    4397,
    17,
    [
      [0, 22],
      [0, -49],
      [-24, -73],
      [-49, -89],
      [-69, -111],
      [-66, -145],
      [-91, -174],
      [-118, -199],
      [-127, -234],
    ],
    { from: [0, 22, -42], to: [-38, 28, -89] },
    { sky: 0x9ab5ab, fog: 0xa5bbaa, water: 0x386458, waterLevel: -4 },
  ),
  gorge: world(
    'gorge',
    '断潮峡谷',
    'The Sundering',
    '断潮关',
    '悬潮石林',
    '从高原关城沿红崖向北，风蚀石柱高过城楼，谷底一线急流切开层层砂岩。',
    6649,
    26,
    [
      [0, 22],
      [0, -48],
      [19, -71],
      [43, -84],
      [59, -108],
      [51, -141],
      [40, -168],
      [59, -194],
      [57, -236],
    ],
    { from: [-137, 107, 119], to: [28, 29, -203] },
    { sky: 0xc7cbd0, fog: 0xd3b7a4, water: 0x477271, waterLevel: -39 },
  ),
}

export const gridDivisions = 256
export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n))
export const mix = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)
const fade = (a, b, x) => smooth(clamp((x - a) / (b - a)))
export function hash(x, z, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 69069)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
export function noise(x, z, s = 0) {
  const i = Math.floor(x),
    j = Math.floor(z),
    u = smooth(x - i),
    v = smooth(z - j)
  return mix(
    mix(hash(i, j, s), hash(i + 1, j, s), u),
    mix(hash(i, j + 1, s), hash(i + 1, j + 1, s), u),
    v,
  )
}
export function trailDistance(id, x, z) {
  const path = biomes[id].trail
  let distance = Infinity
  for (let i = 1; i < path.length; i++) {
    const [a, b] = path[i - 1],
      [c, d] = path[i],
      dx = c - a,
      dz = d - b
    const t = clamp(((x - a) * dx + (z - b) * dz) / (dx * dx + dz * dz))
    distance = Math.min(distance, (x - a - t * dx) ** 2 + (z - b - t * dz) ** 2)
  }
  return Math.sqrt(distance)
}
// Prominent landforms are composed by hand so the navigable valleys have a clear silhouette.
const ridges = {
  rain: [
    [-168, -226, 94, 53, 74],
    [-218, -299, 151, 58, 65],
    [-330, -220, 88, 73, 83],
    [114, -296, 106, 49, 57],
    [176, -347, 143, 52, 66],
    [265, -262, 84, 71, 77],
    [-110, 215, 62, 62, 84],
    [375, 105, 93, 87, 123],
  ],
  salt: [
    [-288, -183, 44, 142, 63],
    [-330, -310, 84, 101, 47],
    [198, -281, 80, 64, 58],
    [306, -270, 66, 59, 52],
    [379, -238, 76, 123, 46],
    [-190, 245, 49, 131, 64],
  ],
  root: [
    [-307, -248, 87, 105, 76],
    [-247, -380, 113, 99, 81],
    [38, -340, 82, 89, 74],
    [180, -232, 79, 73, 101],
    [-320, 109, 57, 83, 109],
    [178, 183, 65, 114, 86],
  ],
  gorge: [
    [155, -240, 75, 80, 58],
    [238, -302, 131, 85, 61],
    [334, -300, 99, 105, 66],
    [-186, -308, 83, 56, 93],
    [-282, -262, 103, 77, 94],
    [-312, 145, 78, 99, 76],
    [279, 146, 91, 104, 82],
  ],
}
function summit(id, x, z) {
  let h = 0
  const seed = biomes[id].seed
  const warp = id === 'salt' ? 12 : id === 'gorge' ? 29 : 20
  const wx0 = x + warp * (noise(x / 57, z / 62, seed + 64) - 0.5),
    wz0 = z + warp * (noise(x / 58, z / 53, seed + 32) - 0.5)
  for (const [a, b, height, wx, wz] of ridges[id]) {
    const r = ((a - wx0) / wx) ** 2 + ((b - wz0) / wz) ** 2
    if (r > 5) continue
    if (id === 'rain') h += height * (1 - fade(0.035, 2.05, r)) * (1 - 0.22 * fade(0.04, 0.59, r))
    else if (id === 'gorge')
      h +=
        height *
        (1 - 0.48 * fade(0.28, 0.52, r) - 0.24 * fade(0.63, 0.98, r) - 0.28 * fade(1.05, 1.91, r))
    else h += height * Math.exp(-r * 1.55)
  }
  const facet = noise(x / 22, z / 26, seed + 93) - 0.5,
    cut = Math.abs(2 * noise(x / 47, z / 50, seed + 37) - 1)
  return h + fade(7, 52, h) * (facet * 13 + cut * 17 - 8.5)
}
function rawHeight(id, x, z) {
  const b = biomes[id],
    base = b.level
  if (id === 'capital') {
    const edge = Math.max(Math.abs(x), Math.abs(z))
    if (edge < 240) {
      const vault =
        fade(-103, -95, x) * (1 - fade(-82, -74, x)) * fade(-82, -71, z) * (1 - fade(-57, -32, z))
      return base - 4.8 * vault
    }
    const hill = noise(x / 137, z / 119, b.seed),
      ripple = noise(x / 38, z / 48, b.seed + 8)
    const n = Math.max(0, -z - 315),
      w = Math.max(0, -x - 440)
    const belt = Math.exp(-Math.pow((z + 582 + 60 * Math.sin(x * 0.012)) / 139, 2))
    const scarp = hill * 0.6 + Math.abs(Math.sin(x * 0.015 + 2 * hill)) * 0.4
    const crags = 1 - Math.abs(2 * noise(x / 31, z / 35, b.seed + 34) - 1)
    const mountain =
      n * (0.16 + hill * 0.29) +
      w * (0.11 + 0.22 * ripple) +
      belt * (37 + 100 * scarp) +
      fade(15, 170, n) * ((ripple - 0.5) * 29 + crags * crags * 19)
    const y = base + fade(240, 385, edge) * ((hill - 0.4) * 47 + (ripple - 0.48) * 11 + mountain)
    return carveWaterBed(b, x, z, y, gridDivisions, ripple - 0.5)
  }
  const broad = noise(x / 104, z / 104, b.seed) - 0.5,
    medium = noise(x / 39, z / 39, b.seed + 2) - 0.5
  let h = base + summit(id, x, z)
  if (id === 'rain') {
    h += broad * 49 + medium * 13 + noise(x / 14, z / 14, b.seed) * 2
  } else if (id === 'salt') {
    const dune = Math.sin(0.039 * x + 0.017 * z + 4.3 * noise(x / 130, z / 130, b.seed))
    const dunefield = fade(76, 200, Math.hypot(x * 0.88, z * 0.8))
    h += broad * 17 + medium * 4 + Math.pow(0.5 + 0.5 * dune, 2.2) * 17 * dunefield
  } else if (id === 'root') {
    h += broad * 37 + medium * 10 + 1.5 * Math.sin(z / 15 + Math.sin(x / 26))
  } else {
    h += broad * 20 + medium * 7
  }
  h = mix(base, h, fade(55, 91, Math.hypot(x, z)))
  // Rock cellar entered down its long south-facing embankment.
  const cellar = fade(9, 17, x) * (1 - fade(30, 38, x)) * fade(-18, -9, z) * (1 - fade(8, 25, z))
  return carveWaterBed(b, x, z, h - 4.8 * cellar, gridDivisions, medium)
}
const samples = new Map()
export function gridData(id) {
  if (samples.has(id)) return samples.get(id)
  const n = gridDivisions,
    r = biomes[id].radius,
    g = new Float32Array((n + 1) ** 2)
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++)
      g[j * (n + 1) + i] = rawHeight(id, -r + (2 * r * i) / n, -r + (2 * r * j) / n)
  samples.set(id, g)
  return g
}
// The same two triangles are used by the render mesh, character feet and scenery.
export function heightAt(id, x, z) {
  const r = biomes[id].radius,
    n = gridDivisions,
    g = gridData(id),
    u = clamp(((x + r) * n) / (r * 2), 0, n - 1e-7),
    v = clamp(((z + r) * n) / (r * 2), 0, n - 1e-7)
  const i = Math.floor(u),
    j = Math.floor(v),
    a = i + j * (n + 1),
    fx = u - i,
    fz = v - j
  const h = g[a],
    b = g[a + 1],
    c = g[a + n + 1],
    d = g[a + n + 2]
  return fx + fz <= 1 ? h + (b - h) * fx + (c - h) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz)
}
export const { waterAt, waterSurfaceData } = createWaterSystem(biomes, gridDivisions, gridData, heightAt)
