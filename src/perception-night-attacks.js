import { flatDistance, raised } from './perception.js'
import { movingRing } from './perception-marks.js'

export function lockNightTarget(plan, height) {
  if (plan.move.type !== 'sandTrail') return
  const dx = Math.sin(plan.yaw),
    dz = Math.cos(plan.yaw),
    range = flatDistance(plan.center, plan.target)
  plan.sites = [-0.7, 0, 0.7].map((side, i) => {
    const at = Math.max(1.4, range + (i - 1) * 2.8)
    const x = plan.center.x + dx * at + dz * side,
      z = plan.center.z + dz * at - dx * side
    return { x, z, y: height(x, z) }
  })
}

export function nightAttacks(view, physics, hero, height, launch, deal) {
  const effects = []
  function release(a, plan) {
    const m = plan.move
    if (!['echoPair', 'sandTrail', 'scaleFan', 'echoCone'].includes(m.type)) return false
    if (m.type === 'scaleFan') {
      // Aim stays fixed while the two wings take turns. A tree can intercept
      // either flight, and the player can escape the previously locked lanes.
      const from = raised(a.pos, a.eye * 0.83),
        to = raised(plan.target, 1.04)
      const dx = to.x - from.x,
        dy = to.y - from.y,
        dz = to.z - from.z,
        len = Math.hypot(dx, dy, dz) || 1
      for (let i = 0; i < 2; i++) {
        const offset = (i - 0.5) * m.spread * 0.97,
          c = Math.cos(offset),
          s = Math.sin(offset)
        effects.push({
          a,
          type: 'fan',
          age: -i * m.delay,
          from,
          dir: { x: (dx * c + dz * s) / len, y: dy / len, z: (dz * c - dx * s) / len },
          spec: { shot: m.reach + 3, flight: m.speed, spread: m.spread, dmg: m.damage, visual: 'spore' },
        })
      }
    } else if (m.type === 'sandTrail') {
      plan.sites.forEach((center, i) =>
        effects.push({
          a,
          m,
          type: 'sand',
          age: -i * m.gap,
          center,
          source: raised(a.pos, a.eye * 0.83),
          hit: false,
        }),
      )
    } else {
      const pair = m.type === 'echoPair',
        count = pair ? 2 : 1
      for (let i = 0; i < count; i++)
        effects.push({
          a,
          m,
          type: 'sound',
          age: -i * (m.delay || 0),
          center: { ...plan.center },
          yaw: plan.yaw,
          angle: pair ? Math.PI * 2 : m.angle,
          radius: 0.2,
          hit: false,
          color: pair ? 0x93dcc2 : 0xc2a8de,
        })
    }
    return true
  }
  function tick(e, dt) {
    const previousAge = e.age
    e.age += dt
    if (e.age < 0) return false
    if (e.type === 'fan') {
      launch(e.a, e.from, e.dir, e.spec)
      return true
    }
    const target = hero.pos,
      m = e.m,
      dist = flatDistance(e.center, target)
    if (e.type === 'sand') {
      e.mark ??= movingRing(view.scene, e.center, height, { color: 0xf6ce96 })
      e.mark?.update(Math.min(m.radius, 0.2 + e.age * m.radius * 5))
      if (
        !e.hit &&
        e.age < 0.25 + dt &&
        dist <= m.radius &&
        Math.abs(target.y - e.center.y) < 1.6 &&
        physics.clear(e.source, raised(target, 0.74))
      ) {
        e.hit = true
        deal(e.a, m.damage, e.center)
      }
      return e.age >= 0.35
    }
    e.mark ??= movingRing(view.scene, e.center, height, { yaw: e.yaw, angle: e.angle, color: e.color })
    const before = e.radius
    e.radius = Math.min(m.radius, 0.2 + Math.max(0, e.age) * m.speed)
    e.mark?.update(e.radius)
    if (!e.hit && dist >= before - 0.39 && dist <= e.radius + 0.45) {
      const dx = target.x - e.center.x,
        dz = target.z - e.center.z
      const forward = dx * Math.sin(e.yaw) + dz * Math.cos(e.yaw)
      const inArc = e.angle >= Math.PI * 2 || forward >= dist * Math.cos(e.angle / 2)
      const inHeight =
        m.type === 'echoPair'
          ? target.y - height(target.x, target.z) < 0.72
          : Math.abs(target.y - e.center.y) < 3.15
      if (inArc && inHeight && physics.clear(raised(e.center, 1), raised(target, 0.72))) {
        e.hit = true
        deal(e.a, m.damage, e.center)
      }
    }
    return e.radius >= m.radius && previousAge >= 0
  }
  function remove(index) {
    effects[index].mark?.dispose()
    effects.splice(index, 1)
  }
  return {
    release,
    update(dt) {
      for (let i = effects.length - 1; i >= 0; i--) if (tick(effects[i], dt)) remove(i)
    },
    discard(owner) {
      for (let i = effects.length - 1; i >= 0; i--) if (!owner || effects[i].a === owner) remove(i)
    },
  }
}
