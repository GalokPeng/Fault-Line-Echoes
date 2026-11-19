import { biomes, heightAt, waterAt } from './biomes.js'

const links = [
  [
    ['capital', '西门', -216, 0],
    ['rain', '白石驿界碑', 12, 590],
  ],
  [
    ['capital', '东门', 216, 0],
    ['salt', '盐商古道', 18, 590],
  ],
  [
    ['capital', '北门', 0, -216],
    ['root', '北林石关', -20, 590],
  ],
  [
    ['capital', '南门', 0, 216],
    ['gorge', '关南驿口', 35, 590],
  ],
  [
    ['rain', '古根山口', -25, -590],
    ['root', '雨林古径', -30, -590],
  ],
  [
    ['salt', '断潮山口', 70, -590],
    ['gorge', '盐路边关', 43, -590],
  ],
]
export function gates(id) {
  return links.flatMap((pair) =>
    pair
      .filter((a) => a[0] === id)
      .map((a) => {
        const other = pair.find((b) => b !== a)
        return {
          kind: 'border',
          id: id + '-' + other[0],
          name: a[1],
          to: other[0],
          x: a[2],
          z: a[3],
          y: heightAt(id, a[2], a[3]),
        }
      }),
  )
}
export function entryAt(id, from) {
  const g = gates(id).find((g) => g.to === from)
  if (!g) return null
  const d = Math.hypot(g.x, g.z),
    x = g.x - (7 * g.x) / d,
    z = g.z - (7 * g.z) / d
  return { x, z, y: heightAt(id, x, z), yaw: Math.atan2(g.x, g.z) }
}
export function nextGate(id, target) {
  const first = gates(id)
  return (
    first.find((g) => g.to === target) ||
    first.find((g) => gates(g.to).some((h) => h.to === target)) ||
    first.find((g) => g.to === 'capital')
  )
}

// Cut a continuous pass over the elevation samples. Neighbour costs prefer gentle dry ground.
const routes = new Map()
function pass(id, gate) {
  const cell = 12,
    N = 101,
    half = 600,
    toWorld = (i) => [(i % N) * cell - half, Math.floor(i / N) * cell - half]
  const index = (x, z) => Math.round((x + half) / cell) + N * Math.round((z + half) / cell)
  const b = biomes[id],
    start = gate.z > 0 ? [0, 40] : b.landmark,
    begin = index(...start),
    end = index(gate.x, gate.z)
  const best = new Float64Array(N * N).fill(Infinity),
    prev = new Int32Array(N * N).fill(-1)
  const heights = new Float32Array(N * N).fill(NaN),
    wet = new Uint8Array(N * N),
    left = new Map([[begin, 0]])
  best[begin] = 0
  const elevation = (i) => {
    if (Number.isNaN(heights[i])) {
      const w = waterAt(id, ...toWorld(i))
      heights[i] = w.bed
      wet[i] = w.wet ? 1 : 0
    }
    return heights[i]
  }
  let reached = false
  while (left.size) {
    let v = -1,
      low = Infinity
    for (const [i, c] of left)
      if (c < low) {
        v = i
        low = c
      }
    if (v === end) {
      reached = true
      break
    }
    left.delete(v)
    const [x, z] = toWorld(v)
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const xx = x + dx * cell,
        zz = z + dz * cell
      if (Math.abs(xx) > half || Math.abs(zz) > half) continue
      const i = index(xx, zz),
        dist = cell * Math.hypot(dx, dz),
        slope = Math.abs(elevation(i) - elevation(v)) / dist
      const score = best[v] + dist * (1 + slope * slope * 11 + (wet[i] ? 7 : 0))
      if (score >= best[i]) continue
      best[i] = score
      prev[i] = v
      left.set(i, score + Math.hypot(xx - gate.x, zz - gate.z))
    }
  }
  const pts = []
  if (reached) for (let cursor = end; cursor !== -1; cursor = prev[cursor]) pts.push(toWorld(cursor))
  return [start, ...pts.reverse(), [gate.x, gate.z]].filter(
    (p, i, arr) => !i || Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1]) > 1,
  )
}
export function borderRoads(id) {
  if (!routes.has(id))
    routes.set(id, id === 'capital' ? [] : gates(id).map((g) => ({ gate: g, points: pass(id, g) })))
  return routes.get(id)
}
const roadCells = new Map()
export function onBorderRoad(id, x, z) {
  if (!roadCells.has(id)) {
    const cells = new Map()
    for (const { points } of borderRoads(id))
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i]
        for (
          let u = Math.floor((Math.min(a[0], b[0]) - 5) / 24);
          u <= Math.floor((Math.max(a[0], b[0]) + 5) / 24);
          u++
        )
          for (
            let v = Math.floor((Math.min(a[1], b[1]) - 5) / 24);
            v <= Math.floor((Math.max(a[1], b[1]) + 5) / 24);
            v++
          ) {
            const k = u + ',' + v
            if (!cells.has(k)) cells.set(k, [])
            cells.get(k).push([a, b])
          }
      }
    roadCells.set(id, cells)
  }
  return (roadCells.get(id).get(Math.floor(x / 24) + ',' + Math.floor(z / 24)) || []).some(([a, b]) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
    return (x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2 < 25
  })
}
