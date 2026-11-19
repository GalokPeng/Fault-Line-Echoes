// The four rivers share a downstream coordinate (+Z). Metres and metres/second.
// Discharge, bed sections and the rating curve are authored for play scale.
const profile = {
  capital: {
    x: 380,
    a: 32,
    b: 12,
    w1: 136,
    w2: 55,
    width: 14,
    variation: 3,
    period: 125,
    depth: 2.7,
    slope: 0.008,
    flow: 0.82,
    valley: 27,
    falls: [
      [-390, -357, 2.9],
      [254, 286, 1.8],
    ],
  },
  rain: {
    x: 92,
    a: 31,
    b: 13,
    w1: 96,
    w2: 41,
    width: 12,
    variation: 3,
    period: 73,
    depth: 2.9,
    slope: 0.0085,
    flow: 1.22,
    valley: 27,
    falls: [
      [-310, -295, 4.1],
      [-289, -275, 4.5],
      [-269, -255, 4.0],
    ],
  },
  root: {
    x: -177,
    a: 38,
    b: 17,
    w1: 121,
    w2: 53,
    width: 8.8,
    variation: 1.9,
    period: 63,
    depth: 1.85,
    slope: 0.006,
    flow: 0.65,
    valley: 35,
    falls: [
      [-382, -357, 2.2],
      [41, 71, 1.6],
    ],
  },
  gorge: {
    x: -111,
    a: 49,
    b: 21,
    w1: 118,
    w2: 59,
    width: 13.7,
    variation: 3.1,
    period: 81,
    depth: 3.9,
    slope: 0.018,
    flow: 1.71,
    valley: 67,
    falls: [
      [-349, -321, 4.2],
      [-95, -66, 2.8],
      [160, 190, 2.4],
    ],
  },
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const mix = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export function riverX(id, z) {
  if (id === 'salt') return -87 + 16 * Math.sin(z / 68)
  const p = profile[id]
  return p.x + p.a * Math.sin(z / p.w1) + p.b * Math.sin(z / p.w2)
}
export function riverWidth(id, z) {
  if (id === 'salt') return 38 * Math.sqrt(Math.max(0, 1 - ((z + 164) / 105) ** 2))
  const p = profile[id]
  return p.width + p.variation * Math.sin(z / p.period) + 1.1 * Math.cos(z / 39)
}
export function stage(world, z) {
  if (world.id === 'salt') return world.waterLevel
  const p = profile[world.id]
  let y = world.waterLevel - z * p.slope
  for (const [top, bottom, fall] of p.falls) y += fall * (1 - smooth(top, bottom, z))
  return y
}
const bedrock = new Map()
// Snap the summit of each outcrop to a terrain vertex. Even the crests in the
// narrow forest stream are therefore part of the collision heightfield.
export function outcrops(world, divisions) {
  if (bedrock.has(world.id)) return bedrock.get(world.id)
  const result = []
  if (world.id !== 'salt') {
    const step = (world.radius * 2) / divisions
    const snap = (v) => Math.round((v + world.radius) / step) * step - world.radius
    const stations = [-465, -332, -249, -147, -37, 72, 153, 259, 361, 477]
    stations.forEach((loc, i) => {
      const z = snap(loc + (world.id === 'gorge' ? 9 : world.id === 'root' ? -16 : 0))
      const sign = i % 2 ? 1 : -1
      const x = snap(riverX(world.id, z) + sign * riverWidth(world.id, z) * (0.34 + 0.12 * (i % 3)))
      result.push({
        x,
        z,
        rx: Math.min(riverWidth(world.id, z) * 0.51, 4.7 + 1.05 * (i % 3)),
        rz: 6.4 + (i % 4) * 0.95,
        height: 0.75 + 0.33 * (i % 3),
        side: sign,
      })
    })
  }
  bedrock.set(world.id, result)
  return result
}
function saltBed(world, x, z, land, grain) {
  // A closed evaporite basin. The crust extends well beyond the perennial pool.
  const cx = riverX('salt', z),
    long = (z + 164) / 112
  const radial = Math.hypot((x - cx) / 44, long)
  if (radial > 1.79) return land
  const irregular = 0.055 * Math.sin((z + 164) / 19) + 0.026 * Math.sin(x / 9)
  const r = radial + irregular
  const pool = world.waterLevel - 1.66 + 2.35 * r ** 1.65 + 0.16 * grain
  const saltPan = world.waterLevel + 0.32 + 1.0 * smooth(0.88, 1.46, r) + 0.16 * grain
  return mix(mix(pool, saltPan, smooth(0.86, 1.06, r)), land, smooth(1.19, 1.76, r))
}
export function carveWaterBed(world, x, z, land, divisions, grain = 0) {
  if (world.id === 'salt') return saltBed(world, x, z, land, grain)
  const p = profile[world.id],
    cx = riverX(world.id, z),
    w = riverWidth(world.id, z)
  const d = Math.abs(x - cx)
  if (d > w + p.valley + 14) return land
  // All four courses open from a spring and close at a floodplain/sink before
  // the playable edge. The last wet triangle ends on the ground.
  const end = Math.min(
    smooth(-world.radius + 13, -world.radius + 57, z),
    1 - smooth(world.radius - 66, world.radius - 16, z),
  )
  const y = stage(world, z)
  const curvature = (-p.a * Math.sin(z / p.w1)) / p.w1 ** 2 - (p.b * Math.sin(z / p.w2)) / p.w2 ** 2
  const thalweg = -clamp(curvature * 490, -0.53, 0.53) * w
  const width = w * (0.77 + 0.23 * end),
    across = x - cx
  const relative = Math.abs(across - thalweg) / (width - (across >= thalweg ? thalweg : -thalweg))
  const pools = 0.85 + 0.14 * Math.sin(z / 31) + 0.1 * Math.cos(z / 59)
  // Inside bends accumulate gravel; most discharge follows the outside pool.
  const bowl = 1 - clamp(relative) ** 1.63
  let bed = y + 0.85 * (1 - end) - end * (p.depth * pools * bowl) + 0.18 * grain * end
  const over = Math.max(0, d - width)
  if (over > 0) bed += Math.min(over * 0.36, 1.35 + over * 0.09)
  for (const s of outcrops(world, divisions)) {
    if (Math.abs(s.z - z) > s.rz) continue
    const q = ((x - s.x) / s.rx) ** 2 + ((z - s.z) / s.rz) ** 2
    if (q < 1) bed = mix(bed, y + s.height, 1 - smooth(0, 1, q))
  }
  const bank = Math.max(land, y + 1.5 + Math.min(8, over * 0.15))
  bed = mix(bed, bank, smooth(3, p.valley + 2, over))
  return mix(bed, land, smooth(p.valley + 2, p.valley + 13, over))
}
export function flowAt(world, x, z, depth, grade, divisions) {
  if (world.id === 'salt' || depth <= 0) return { speed: 0, flowX: 0, flowZ: 0, foam: 0, wake: 0 }
  const id = world.id,
    p = profile[id],
    w = riverWidth(id, z),
    cx = riverX(id, z)
  const derivative = (p.a * Math.cos(z / p.w1)) / p.w1 + (p.b * Math.cos(z / p.w2)) / p.w2
  const curvature = (-p.a * Math.sin(z / p.w1)) / p.w1 ** 2 - (p.b * Math.sin(z / p.w2)) / p.w2 ** 2
  let direction = derivative
  const outer = -clamp(curvature * 460, -0.46, 0.46)
  const section = clamp(1 - Math.abs((x - cx) / w - outer) * 0.49, 0.26, 1)
  const rapid = clamp((grade - p.slope) * 4.9)
  let speed =
    p.flow *
      section *
      (p.width / w) ** 0.64 *
      (0.57 + 0.46 * Math.sqrt(clamp(depth / p.depth, 0, 1.7))) +
    rapid * 1.6
  let wake = 0
  for (const rock of outcrops(world, divisions)) {
    const dz = z - rock.z
    if (dz < -rock.rz * 2.7 || dz > rock.rz * 4.8) continue
    const dx = x - rock.x - derivative * dz
    const distance = Math.abs(dx),
      sign = Math.sign(dx) || -rock.side
    const upstream = Math.exp((-(dz * dz) / rock.rz ** 2) * 0.5)
    const flank = Math.exp((-((distance - rock.rx * 0.79) ** 2) / rock.rx ** 2) * 1.1)
    direction += sign * upstream * flank * (dz < 0 ? 0.72 : -0.37)
    speed += upstream * flank * 0.53
    const lee =
      dz > 0 ? Math.exp(-dz / (rock.rz * 2.0)) * Math.exp(-((dx / (rock.rx + 0.12 * dz)) ** 2)) : 0
    speed *= 1 - 0.52 * lee
    wake = Math.max(wake, lee, upstream * flank * 0.71)
  }
  const norm = Math.hypot(direction, 1)
  return {
    speed,
    flowX: direction / norm,
    flowZ: 1 / norm,
    wake,
    foam: clamp(0.78 * rapid + 0.7 * wake + clamp(0.6 - depth) * section * 0.21),
  }
}
