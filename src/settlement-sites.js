import { biomes, gridDivisions, heightAt } from './biomes.js'

export const settlementLayouts = {
  rain: [
    [-23, 9, 1.42, 6.2, 7.1, 3.23],
    [-23, -7, 1.72, 6.5, 7.8, 3.11],
    [-14, 24, 2.82, 7.1, 5.8, 3.15],
    [10.8, 25, -2.75, 6.4, 5.4, 3.36],
    [-13, -25, 0.15, 6.1, 6.8, 2.98],
    [14, -25, -0.41, 7.8, 6.0, 3.28],
    [43, 13, -1.63, 7.4, 6.9, 3.44],
    [38, -19, -1.26, 6.2, 6.9, 3.12],
    [-29, 24, 2.45, 7.4, 5.8, 2.96],
  ],
  salt: [
    [-23, -5, 1.57, 8.2, 6.9, 4.06],
    [-25, 13, 1.4, 6.3, 7.5, 3.7],
    [-15, 25, 2.83, 6.8, 6.0, 3.22],
    [10.8, 27, -2.75, 6.9, 5.8, 3.65],
    [-16, -27, 0.06, 7.8, 6.0, 3.68],
    [11, -26, -0.05, 7.1, 7.2, 4.6],
    [44, 0, -1.57, 8.5, 7.0, 4.1],
    [42, 24, -1.83, 8.2, 6.2, 3.84],
    [38, -23, -0.33, 7.25, 6.1, 3.44],
    [-31, -17, 1.1, 7.4, 6.9, 3.1],
  ],
  root: [
    [-26, 5, 1.76, 5.8, 6.4, 3.18],
    [-24, -13, 1.12, 5.4, 6.0, 3.03],
    [-11, 24, 2.56, 6.9, 5.8, 3.13],
    [11, 25, -2.52, 6.5, 5.1, 3.07],
    [-17, -28, 0.39, 5.9, 6.2, 3.44],
    [12, -26, -0.54, 6.2, 6.4, 3.41],
    [44, 14, -1.92, 6.7, 6.2, 3.13],
    [42, -19, -0.84, 6.6, 5.9, 3.23],
  ],
  gorge: [
    [-25, -1, 1.57, 8.2, 6.8, 4.0],
    [-40, -19, 2.6, 5.9, 6.8, 3.4],
    [-14, 14, 1.59, 6.8, 5.9, 4.14],
    [10, 27, -2.96, 6.9, 5.6, 3.6],
    [-14, -25, 0, 7.6, 7.4, 4.31],
    [14, -24, -0.12, 7.8, 6.0, 4.84],
    [45, 7, -1.57, 8.2, 7.4, 4.22],
    [42, -23, -0.41, 6.6, 5.9, 3.89],
    [-28, -16, 1.5, 6.5, 7.0, 4.27],
  ],
}

// An affine terrain triangle has its extrema at its vertices. For a rotated
// house plot also visit every intersection of its perimeter with a grid edge.
function terrainRange(id, x, z, yaw, width, depth) {
  const cs = Math.cos(yaw),
    sn = Math.sin(yaw),
    radius = biomes[id].radius
  const cell = (2 * radius) / gridDivisions
  const point = (u, v) => [x + cs * u + sn * v, z - sn * u + cs * v]
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => point((u * width) / 2, (v * depth) / 2))
  let min = Infinity,
    max = -Infinity
  function sample(wx, wz) {
    const y = heightAt(id, wx, wz)
    min = Math.min(min, y)
    max = Math.max(max, y)
  }
  corners.forEach(([ax, az], i) => {
    const [bx, bz] = corners[(i + 1) % 4]
    sample(ax, az)
    for (const [a, b] of [
      [ax + radius, bx + radius],
      [az + radius, bz + radius],
      [ax + az + 2 * radius, bx + bz + 2 * radius],
    ]) {
      for (let k = Math.floor(Math.min(a, b) / cell) + 1; k * cell < Math.max(a, b); k++) {
        const t = (k * cell - a) / (b - a)
        sample(ax + t * (bx - ax), az + t * (bz - az))
      }
    }
  })
  const extent = Math.hypot(width, depth) / 2
  for (let i = Math.ceil((x - extent + radius) / cell); i * cell <= x + extent + radius; i++)
    for (let j = Math.ceil((z - extent + radius) / cell); j * cell <= z + extent + radius; j++) {
      const wx = i * cell - radius,
        wz = j * cell - radius
      const u = cs * (wx - x) - sn * (wz - z),
        v = sn * (wx - x) + cs * (wz - z)
      if (Math.abs(u) < width / 2 && Math.abs(v) < depth / 2) sample(wx, wz)
    }
  return { min, max }
}
export function houseFoundation(id, x, z, yaw, w, d) {
  const range = terrainRange(id, x, z, yaw, w + 0.76, d + 0.85)
  const dock = id === 'rain' || id === 'root' ? 0.31 : 0.16
  const floor = range.max + dock,
    stairStart = (d + 0.85) / 2,
    tread = 0.56
  const stepSite = (offset) => [x + Math.sin(yaw) * offset, z + Math.cos(yaw) * offset]
  let count = 1,
    toe
  for (; count < 16; count++) {
    toe = heightAt(id, ...stepSite(stairStart + count * tread + 0.15))
    if ((floor - toe) / (count + 1) <= 0.21) break
  }
  const steps = []
  for (let i = 0; i < count; i++) {
    const offset = stairStart + (i + 0.5) * tread
    const [sx, sz] = stepSite(offset)
    const top = floor - ((floor - toe) * (i + 1)) / (count + 1)
    const min = Math.min(top - 0.1, terrainRange(id, sx, sz, yaw, 2.35, tread).min - 0.13)
    steps.push({ offset, top, min })
  }
  return {
    floor,
    base: range.max,
    dock,
    min: range.min - 0.17,
    tread,
    steps,
    approach: stepSite(stairStart + count * tread + 1.1),
  }
}
