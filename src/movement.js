// Reach is measured from the current foothold to the first usable handhold in metres.
export function gripInReach(p, yaw, objects, extra = 0) {
  const dx = -Math.sin(yaw),
    dz = -Math.cos(yaw)
  let best = null,
    near = Infinity
  for (const s of objects) {
    const x = s.x - p.x,
      z = s.z - p.z,
      d = Math.hypot(x, z),
      gap = d - s.r
    if (gap < -0.15 || gap > 0.85 + extra || gap >= near || (x * dx + z * dz) / Math.max(0.01, d) < 0.45)
      continue
    const top = s.y + s.h,
      tree = s.kind === 'tree',
      first = tree ? s.y + s.grip : s.kind === 'ladder' ? Math.max(s.y + 0.32, p.y + 0.32) : top
    if (first - p.y > 2.12 + extra || (!tree && top - p.y < 0.53) || p.y < s.y - 0.7 || p.y > top - 0.48)
      continue
    // Smooth upper trunks have no purchase above the first branch cluster.
    if (tree && p.y > first + 0.65) continue
    best = {
      solid: s,
      x: x / Math.max(d, 0.01),
      z: z / Math.max(d, 0.01),
      limit: tree ? Math.min(top, s.y + s.grip + 3.15) : top,
      tree,
    }
    near = gap
  }
  return best
}
export function climbMotion(hero, held, press, objects, extra, dt) {
  if (!held || hero.f.stamina < 3) {
    hero.grip = null
    return null
  }
  if (!hero.grip && press) {
    hero.grip = gripInReach(hero.pos, hero.yaw, objects, extra)
    if (hero.grip) hero.grip.phase = 0
  }
  const g = hero.grip
  if (!g) return null
  if (Math.hypot(hero.pos.x - g.solid.x, hero.pos.z - g.solid.z) > g.solid.r + 1.25) {
    hero.grip = null
    return null
  }
  g.phase += dt
  if (!g.tree && hero.pos.y >= g.limit + 0.025) {
    g.over = (g.over || 0) + dt
    if (g.over > 0.48) {
      hero.grip = null
      return null
    }
    return { dx: g.x * 1.65, dz: g.z * 1.65, vy: 0.08 }
  }
  const rhythm = 0.83 + 0.27 * Math.cos(g.phase * 8)
  return {
    dx: g.x * (g.solid.kind === 'ladder' ? 0 : 0.32),
    dz: g.z * (g.solid.kind === 'ladder' ? 0 : 0.32),
    vy: Math.max(0, Math.min(1.75 * rhythm, (g.limit + 0.03 - hero.pos.y) / dt)),
  }
}
export function footfall(hero, travel, surface, grounded) {
  hero.noise = 0
  if (!grounded || hero.grip || hero.quiet) {
    hero.stride = 0
    return null
  }
  hero.stride = (hero.stride || 0) + travel
  const stride = hero.sprint ? 1.9 : hero.crouch ? 1.12 : 1.55
  if (hero.stride < stride) return null
  hero.stride %= stride
  const hardness = { stone: 1.06, wood: 1.25, water: 1.35, sand: 0.62, leaves: 0.87 }[surface] || 1
  hero.noise = (hero.sprint ? 22 : hero.crouch ? 5 : 12) * hardness
  return { surface, volume: (hero.sprint ? 0.25 : hero.crouch ? 0.07 : 0.15) * hardness }
}
