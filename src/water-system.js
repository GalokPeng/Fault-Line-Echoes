import { stage, riverX, flowAt } from './water-profile.js'

// Clip each *collision triangle* against its own sloping water plane. This
// gives graphics, swimming and shore interactions exactly the same wet area.
export function createWaterSystem(worlds, n, gridData, heightAt) {
  const cache = new Map(),
    row = n + 1
  function get(id) {
    if (cache.has(id)) return cache.get(id)
    const b = worlds[id],
      r = b.radius,
      spacing = (2 * r) / n,
      heights = gridData(id)
    const levels = Float64Array.from({ length: row }, (_, j) => stage(b, -r + j * spacing))
    const gap = new Float64Array(row * row)
    for (let j = 0; j < row; j++)
      for (let i = 0; i < row; i++) gap[j * row + i] = levels[j] - heights[j * row + i]
    // A low basement or a hollow behind a ridge can have a negative elevation
    // without being connected to the river. Flood from its actual channel only.
    const middleZ = id === 'salt' ? -164 : 0,
      j = Math.round((middleZ + r) / spacing),
      middleX = riverX(id, -r + j * spacing)
    const middle = j * row + Math.round((middleX + r) / spacing)
    let seed = middle
    for (let i = middle - 3; i <= middle + 3; i++) if (gap[i] > gap[seed]) seed = i
    const wetVerts = new Uint8Array(row * row),
      queue = new Int32Array(row * row)
    let first = 0,
      last = 0
    if (gap[seed] > 0) {
      queue[last++] = seed
      wetVerts[seed] = 1
    }
    while (first < last) {
      const k = queue[first++],
        i = k % row,
        j = (k - i) / row
      const visit = (q) => {
        if (!wetVerts[q] && gap[q] > 0) {
          wetVerts[q] = 1
          queue[last++] = q
        }
      }
      if (i > 0) visit(k - 1)
      if (i < n) visit(k + 1)
      if (j > 0) {
        visit(k - row)
        if (i < n) visit(k - row + 1)
      }
      if (j < n) {
        visit(k + row)
        if (i > 0) visit(k + row - 1)
      }
    }
    const wetTriangles = new Uint8Array(n * n * 2),
      shoreCells = new Map(),
      tileMask = new Uint8Array(16 * 16)
    const positions = [],
      attributes = [],
      shorelines = []
    function vertex(k) {
      const i = k % row,
        j = (k - i) / row
      return { x: -r + i * spacing, y: levels[j], z: -r + j * spacing, d: gap[k] }
    }
    const edge = (a, b) => {
      const t = a.d / (a.d - b.d)
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, d: 0 }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * row + i,
          c = j * n + i
        if (!(wetVerts[k] || wetVerts[k + 1] || wetVerts[k + row] || wetVerts[k + row + 1])) continue
        const tris = [
          [k, k + row, k + 1],
          [k + 1, k + row, k + row + 1],
        ]
        for (let type = 0; type < 2; type++) {
          const indices = tris[type]
          if (!indices.some((v) => wetVerts[v])) continue
          wetTriangles[c * 2 + type] = 1
          for (const dj of [-2, 2])
            for (const di of [-2, 2]) {
              const tileZ = Math.floor(Math.max(0, Math.min(n - 1, j + dj)) / (n / 16))
              const tileX = Math.floor(Math.max(0, Math.min(n - 1, i + di)) / (n / 16))
              tileMask[tileZ * 16 + tileX] = 1
            }
          const corners = indices.map(vertex),
            polygon = [],
            waterline = []
          for (let a = 0; a < 3; a++) {
            const p = corners[a],
              q = corners[(a + 1) % 3]
            if (p.d > 0) polygon.push(p)
            if (p.d > 0 !== q.d > 0) {
              const e = edge(p, q)
              polygon.push(e)
              waterline.push(e)
            }
          }
          if (waterline.length === 2) {
            if (!shoreCells.has(c)) shoreCells.set(c, [])
            shoreCells.get(c).push(waterline)
            shorelines.push(waterline)
          }
          for (let t = 2; t < polygon.length; t++)
            for (const p of [polygon[0], polygon[t - 1], polygon[t]]) {
              positions.push(p.x, p.y, p.z)
              // Evaluate a tiny wet depth at the contact to keep flow continuous
              // right up to the bank. The stored physical depth remains exactly 0.
              const grade = (stage(b, p.z - spacing / 2) - stage(b, p.z + spacing / 2)) / spacing
              const motion = flowAt(b, p.x, p.z, Math.max(0.001, p.d), grade, n)
              attributes.push(p.d, motion.flowX * motion.speed, motion.flowZ * motion.speed, motion.foam)
            }
        }
      }
    }
    const field = {
      levels,
      wetTriangles,
      shoreCells,
      shorelines,
      tileMask,
      spacing,
      positions: new Float32Array(positions),
      attributes: new Float32Array(attributes),
    }
    cache.set(id, field)
    return field
  }

  function waterAt(id, x, z) {
    const b = worlds[id],
      r = b.radius,
      bed = heightAt(id, x, z),
      f = get(id)
    const u = Math.min(n - 1e-8, Math.max(0, (x + r) / f.spacing)),
      v = Math.min(n - 1e-8, Math.max(0, (z + r) / f.spacing))
    const i = Math.floor(u),
      j = Math.floor(v),
      cell = j * n + i
    const level = f.levels[j] + (f.levels[j + 1] - f.levels[j]) * (v - j)
    const inWorld = Math.abs(x) <= r && Math.abs(z) <= r
    const inside = inWorld && f.wetTriangles[cell * 2 + Number(u - i + v - j > 1)]
    const depth = inside ? Math.max(0, level - bed) : 0,
      wet = depth > 1e-5
    let canCollect = wet
    // Within arm's reach of the actual waterline, on a bank low enough to dip a vessel.
    if (!canCollect && inWorld && Math.abs(level - bed) < 1.05) {
      for (let jj = Math.max(0, j - 1); jj <= Math.min(n - 1, j + 1) && !canCollect; jj++)
        for (let ii = Math.max(0, i - 1); ii <= Math.min(n - 1, i + 1) && !canCollect; ii++) {
          for (const [a, c] of f.shoreCells.get(jj * n + ii) || []) {
            const dx = c.x - a.x,
              dz = c.z - a.z,
              len = dx * dx + dz * dz
            const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len)) : 0
            if ((x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2 <= 1.75 ** 2) {
              canCollect = true
              break
            }
          }
        }
    }
    const grade = (stage(b, z - f.spacing / 2) - stage(b, z + f.spacing / 2)) / f.spacing
    return {
      kind: canCollect ? (id === 'salt' ? 'brine' : 'river') : 'dry',
      wet,
      canCollect,
      level,
      bed,
      depth,
      ...flowAt(b, x, z, depth, grade, n),
    }
  }
  return { waterAt, waterSurfaceData: get }
}
