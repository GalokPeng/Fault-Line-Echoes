import { heightAt } from './biomes.js'

// Homes and shops face real streets. Waypoints are destinations on those streets.
const rounds = {
  courier: [
    [-30, 95],
    [-53, 53],
    [-53, 0],
    [-12, 0],
    [4, 12],
    [0, 53],
  ],
  novice: [
    [-5.6, 9.8],
    [-7, 17],
    [-12, 23],
    [-18, 18],
    [-12, 5],
  ],
  potter: [
    [19, 11],
    [17, 21],
    [7, 22],
    [3, 15],
    [12, 11],
  ],
  reader: [
    [-10, -11],
    [-6, -5],
    [-5, 9],
    [0, 16],
    [6, 10],
  ],
  tea: [
    [87, -19],
    [87, -5],
    [70, 0],
    [55, 2],
    [54, -17],
  ],
  scribe: [
    [43, -109],
    [48, -104],
    [53, -95],
    [53, -69],
    [50, -56],
  ],
  glass: [
    [-112, -137],
    [-108, -130],
    [-106, -108],
    [-106, -93],
  ],
  clerk: [
    [-54, -57],
    [-48, -54],
    [-38, -54],
    [-37, -60],
  ],
  mason: [
    [24, 173],
    [15, 166],
    [2, 165],
    [2, 179],
  ],
  stable: [
    [-171, -24],
    [-166, -19],
    [-166, -4],
    [-153, 0],
  ],
  farmer: [
    [68, 163],
    [65, 165],
    [53, 165],
    [53, 153],
  ],
  beggar: [
    [5, 27],
    [2, 21],
    [-4, 17],
    [-8, 23],
    [0, 29],
  ],
  water: [
    [14, 3],
    [17, 4],
    [16, 8],
    [13, 8],
  ],
  armiger: [
    [5.2, -29],
    [4, -40],
    [-4, -40],
    [-4, -28],
  ],
  'guard-plaza': [
    [-7, 25],
    [-14, 23],
    [-18, 17],
    [-18, 7],
    [-8, 4],
    [3, 9],
    [6, 23],
  ],
  'guard-watch': [
    [23, -3],
    [21, -14],
    [12, -18],
    [1, -15],
    [1, -3],
    [18, -2],
  ],
  'guard-west': [
    [-201, 6],
    [-190, 4],
    [-180, 4],
    [-180, -3],
    [-199, -4],
  ],
  'guard-east': [
    [201, -6],
    [192, -3],
    [180, -3],
    [181, 4],
    [200, 4],
  ],
  'guard-north': [
    [6, -201],
    [4, -189],
    [3, -180],
    [-4, -181],
    [-3, -199],
  ],
  'guard-south': [
    [-6, 201],
    [-3, 194],
    [-3, 183],
    [4, 183],
    [4, 198],
  ],
  'guard-east-market': [
    [101, 56],
    [106, 64],
    [106, 80],
    [106, 54],
    [79, 53],
    [70, 38],
  ],
  'guard-west-market': [
    [-57, 50],
    [-53, 53],
    [-65, 53],
    [-94, 53],
    [-106, 50],
    [-83, 52],
  ],
}
const workers = new Set(['baker', 'butcher', 'merchant', 'smith', 'outfitter', 'inn', 'pharmacy'])
const bucketSize = 12,
  cell = 2.5,
  count = 165,
  middle = (count - 1) / 2
const world = (i, j) => ({ x: (i - middle) * cell, z: (j - middle) * cell })
const index = (p) => Math.round(p.x / cell + middle) + count * Math.round(p.z / cell + middle)
const key = (x, z) => Math.floor(x / bucketSize) + ',' + Math.floor(z / bucketSize)

// Build a clearance map from the same rotated walls, furniture and trunks as Rapier.
export function cityWalker(boxes = [], cylinders = []) {
  const bins = new Map(),
    mask = new Uint8Array(count * count)
  function include(x, z, r, shape) {
    for (let i = Math.floor((x - r) / bucketSize); i <= Math.floor((x + r) / bucketSize); i++)
      for (let j = Math.floor((z - r) / bucketSize); j <= Math.floor((z + r) / bucketSize); j++) {
        const k = i + ',' + j
        if (!bins.has(k)) bins.set(k, [])
        bins.get(k).push(shape)
      }
  }
  for (const b of boxes) {
    if (b.y + b.h / 2 < 24.42 || b.y - b.h / 2 > 25.65) continue
    const c = Math.cos(b.yaw || 0),
      s = Math.sin(b.yaw || 0)
    include(
      b.x,
      b.z,
      Math.hypot(b.w, b.d) / 2 + 0.52,
      (x, z) =>
        Math.abs((x - b.x) * c - (z - b.z) * s) < b.w / 2 + 0.4 &&
        Math.abs((x - b.x) * s + (z - b.z) * c) < b.d / 2 + 0.4,
    )
  }
  for (const c of cylinders)
    if (c.y < 25.65 && c.y + c.h > 24.42)
      include(c.x, c.z, c.r + 0.5, (x, z) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.4) ** 2)
  const free = (x, z) =>
    Math.abs(x) < 206 &&
    Math.abs(z) < 206 &&
    Math.abs(heightAt('capital', x, z) - 24) < 0.9 &&
    !(bins.get(key(x, z)) || []).some((hit) => hit(x, z))
  function line(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.7)
    for (let i = 1; i <= n; i++)
      if (!free(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n)) return false
    return true
  }
  function available(n) {
    if (!mask[n]) {
      const p = world(n % count, Math.floor(n / count))
      mask[n] = free(p.x, p.z) ? 1 : 2
    }
    return mask[n] === 1
  }
  function nearest(p) {
    const n = index(p)
    let best = -1,
      bestD = Infinity
    for (let di = -2; di <= 2; di++)
      for (let dj = -2; dj <= 2; dj++) {
        const i = (n % count) + di,
          j = Math.floor(n / count) + dj,
          k = i + j * count
        if (i < 0 || i >= count || j < 0 || j >= count || !available(k)) continue
        const q = world(i, j),
          d = Math.hypot(p.x - q.x, p.z - q.z)
        if (d < bestD && line(p, q)) {
          best = k
          bestD = d
        }
      }
    return best
  }
  return (a, b) => {
    if (line(a, b)) return [b]
    const start = nearest(a),
      end = nearest(b)
    if (start < 0 || end < 0) return []
    const closed = new Set(),
      prev = new Map(),
      cost = new Map([[start, 0]]),
      open = new Map([[start, 0]])
    const endX = end % count,
      endZ = Math.floor(end / count)
    while (open.size && closed.size < 2600) {
      let n = -1,
        f = Infinity
      for (const [i, v] of open)
        if (v < f) {
          n = i
          f = v
        }
      if (n === end) {
        const pts = [b]
        for (let k = n; k !== undefined; k = prev.get(k))
          pts.push(world(k % count, Math.floor(k / count)))
        return pts.reverse()
      }
      open.delete(n)
      closed.add(n)
      const x = n % count,
        z = Math.floor(n / count)
      for (const [dx, dz] of [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
      ]) {
        const xx = x + dx,
          zz = z + dz,
          k = xx + zz * count,
          g = cost.get(n) + 1
        if (
          xx < 0 ||
          zz < 0 ||
          xx >= count ||
          zz >= count ||
          closed.has(k) ||
          !available(k) ||
          g >= (cost.get(k) ?? Infinity)
        )
          continue
        if (!line(world(x, z), world(xx, zz))) continue
        cost.set(k, g)
        prev.set(k, n)
        open.set(k, g + Math.hypot(xx - endX, zz - endZ))
      }
    }
    return []
  }
}

function itinerary(a, night) {
  const h = a.home,
    w = a.workstation,
    shop = workers.has(a.service)
  if (shop) {
    const sign = a.index % 2 ? 1 : -1
    const start = w ? [w.x, w.z] : [h.x, h.z]
    const nearStreet = Math.abs(h.x) > Math.abs(h.z) ? [-Math.sign(h.x), 0] : [0, -Math.sign(h.z)]
    const offset = (d, k) => ({
      x: h.x + d * nearStreet[0] + k * nearStreet[1],
      z: h.z + d * nearStreet[1] - k * nearStreet[0],
    })
    return [
      { x: start[0], z: start[1], wait: night ? 5 : 10 + (a.index % 4), work: w?.action, yaw: w?.yaw },
      { ...offset(2.1, 2.4 * sign), wait: 2.5 },
      { ...offset(night ? 4.8 : 2.4, -2.3 * sign), wait: night ? 5 : 1.5 },
    ]
  }
  const route = rounds[a.id] || [
    [h.x, h.z],
    [h.x + 2, h.z + 2],
    [h.x + 1, h.z - 2],
  ]
  return (night && a.kind !== 'guard' ? route.slice(0, 3).reverse() : route).map(([x, z], i) => ({
    x,
    z,
    wait: a.kind === 'guard' ? 0.45 : (night ? 3.8 : 1.2) + ((a.index + i) % 3),
  }))
}

export function streetRoutine(a, dt, night, route, walk, lookAt) {
  let r = a.routine
  if (!r || r.night !== night) {
    const stops = itinerary(a, night)
    r = a.routine = { night, stops, i: workers.has(a.service) ? 0 : 1, path: null, wait: 0, stuck: 0 }
  }
  const dest = r.stops[r.i]
  const next = () => {
    r.i = (r.i + 1) % r.stops.length
    r.path = null
    r.wait = 0
    r.stuck = 0
  }
  a.working = null
  a.walking = false
  if (Math.hypot(a.pos.x - dest.x, a.pos.z - dest.z) < (dest.work ? 0.09 : 0.43)) {
    a.working = dest.work
    if (a.working) {
      a.pos.x = dest.x
      a.pos.z = dest.z
    }
    if (Number.isFinite(dest.yaw)) a.yaw = dest.yaw
    else if (lookAt && workers.has(a.service)) a.yaw = Math.atan2(lookAt.x - a.pos.x, lookAt.z - a.pos.z)
    r.wait += dt
    if (r.wait >= dest.wait) next()
    return
  }
  if (!r.path) r.path = route(a.pos, dest)
  while (r.path.length > 1 && Math.hypot(a.pos.x - r.path[0].x, a.pos.z - r.path[0].z) < 0.43)
    r.path.shift()
  if (!r.path.length) {
    next()
    return
  }
  const priorX = a.pos.x,
    priorZ = a.pos.z,
    speed = a.kind === 'guard' ? 1.45 : a.id === 'courier' ? 1.82 : 1.14
  walk(a, r.path[0], speed, dt, false)
  if (Math.hypot(priorX - a.pos.x, priorZ - a.pos.z) < 0.03 * dt) r.stuck += dt
  else r.stuck = 0
  if (r.stuck > 1.5) next()
}
