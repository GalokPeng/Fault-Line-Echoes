import * as THREE from 'three'

const along = (a, d, t) => ({ x: a.x + d.x * t, y: a.y + d.y * t, z: a.z + d.z * t })
export function launchVolley(origin, dir, { shot, flight, spread = 0 }, shared = new Set()) {
  const bands = spread ? [-1, 0, 1] : [0]
  return bands.map((band) => {
    const a = band * spread,
      c = Math.cos(a),
      s = Math.sin(a)
    return {
      origin: { ...origin },
      pos: { ...origin },
      dir: { x: dir.x * c + dir.z * s, y: dir.y, z: dir.z * c - dir.x * s },
      band,
      speed: flight,
      max: shot,
      traveled: 0,
      shared,
      done: false,
    }
  })
}
function positionAt(p, distance) {
  const point = along(p.origin, p.dir, distance)
  const curl = p.band * 0.31 * Math.sin((distance * Math.PI) / p.max)
  point.x += p.dir.z * curl
  point.z -= p.dir.x * curl
  return point
}
// Targets provide their current centre every simulation step. Collision checks
// sweep the travelled segment and stop at the first body or piece of scenery.
export function advanceFlight(p, dt, clear, bodies) {
  if (p.done) return null
  const end = Math.min(p.max, p.traveled + Math.max(0, dt) * p.speed)
  while (p.traveled < end - 1e-6) {
    const d = Math.min(end, p.traveled + 0.55),
      to = positionAt(p, d),
      from = p.pos
    const dx = to.x - from.x,
      dy = to.y - from.y,
      dz = to.z - from.z,
      len = Math.hypot(dx, dy, dz)
    const dir = { x: dx / len, y: dy / len, z: dz / len }
    let hit = null,
      closest = len
    for (const b of bodies) {
      const vx = b.center.x - from.x,
        vy = b.center.y - from.y,
        vz = b.center.z - from.z
      const u = vx * dir.x + vy * dir.y + vz * dir.z
      const miss2 = vx * vx + vy * vy + vz * vz - u * u,
        r2 = b.radius * b.radius
      if (miss2 > r2) continue
      const half = Math.sqrt(Math.max(0, r2 - miss2)),
        entry = Math.max(0, u - half)
      if (u + half >= 0 && entry <= closest) {
        hit = b
        closest = entry
      }
    }
    const dest = hit ? along(from, dir, closest) : to
    if (!clear(from, dest)) {
      // Place the last spark on the visible side of the obstruction.
      let lo = 0,
        hi = closest
      for (let i = 0; i < 5; i++) {
        const mid = (lo + hi) * 0.5
        if (clear(from, along(from, dir, mid))) lo = mid
        else hi = mid
      }
      p.pos = along(from, dir, lo)
      p.traveled += lo
      p.done = true
      return null
    }
    p.pos = dest
    p.traveled = d
    if (hit) {
      p.done = true
      if (p.shared.has(hit.actor)) return null
      p.shared.add(hit.actor)
      return hit.actor
    }
  }
  if (p.traveled >= p.max - 1e-6) p.done = true
  return null
}

// Geometry is shared by live bolts and disposed with the encounter.
export function flightDisplay(scene) {
  const geo = new THREE.OctahedronGeometry(1, 0)
  const ally = new THREE.MeshBasicMaterial({ color: 0xa2f2ee })
  const foe = new THREE.MeshBasicMaterial({ color: 0xffc66a })
  const active = new Set()
  return {
    add(p, hostile = false) {
      if (!scene?.isScene) return
      const mesh = new THREE.Mesh(geo, hostile ? foe : ally)
      mesh.scale.set(0.095, 0.14, 0.62)
      mesh.position.set(p.pos.x, p.pos.y, p.pos.z)
      mesh.lookAt(p.pos.x + p.dir.x, p.pos.y + p.dir.y, p.pos.z + p.dir.z)
      p.mesh = mesh
      scene.add(mesh)
      active.add(mesh)
    },
    sync(p) {
      if (!p.mesh) return
      if (p.done) {
        p.mesh.removeFromParent()
        active.delete(p.mesh)
        p.mesh = null
      } else p.mesh.position.set(p.pos.x, p.pos.y, p.pos.z)
    },
    clear() {
      for (const m of active) m.removeFromParent()
      active.clear()
    },
    dispose() {
      this.clear()
      geo.dispose()
      ally.dispose()
      foe.dispose()
    },
  }
}
