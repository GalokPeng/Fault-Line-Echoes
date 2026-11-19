import { heading, hurt } from './combat.js'
import { raised, flatDistance } from './perception.js'
import { launchVolley, advanceFlight, flightDisplay } from './perception-flight.js'
import { markAttack, movingRing } from './perception-marks.js'

export function encounters(view, physics, hero, events, height, all, impact) {
  const missiles = [],
    rings = [],
    display = flightDisplay(view.scene)
  function launch(owner, from, dir, spec) {
    for (const p of launchVolley(from, dir, spec)) {
      p.owner = owner
      p.spec = spec
      display.add(p, owner !== hero)
      missiles.push(p)
    }
  }
  function deal(a, amount, origin) {
    if (hero.f.hp <= 0) return
    const facing = heading(hero.yaw),
      dx = origin.x - hero.pos.x,
      dz = origin.z - hero.pos.z
    events.injury(hurt(hero.f, amount, dx * facing.x + dz * facing.z > 0), a)
  }
  function begin(a, m) {
    const target = { ...a.lastKnown },
      yaw = Math.atan2(target.x - a.pos.x, target.z - a.pos.z)
    const center = m.type === 'eruption' ? target : { ...a.pos }
    a.yaw = yaw
    a.walking = false
    const plan = { move: m, target, center, yaw, charge: 0, elapsed: 0, released: false, hit: false }
    a.plan = plan
    a.moveName = m.name
    if (a.boss || ['charge', 'eruption', 'ring'].includes(m.type))
      plan.mark = markAttack(view.scene, plan, height)
    if (a.boss || a.kind === 'duelist') events.warning?.(m.name, a)
  }
  function cancel(a) {
    a.plan?.mark?.dispose()
    a.plan = null
    a.moveName = ''
  }
  function finish(a) {
    a.cooldown = a.plan.move.rest
    cancel(a)
  }
  function step(a, dt) {
    const p = a.plan,
      m = p.move
    p.elapsed += dt
    a.walking = false
    const progress = Math.min(1, p.elapsed / m.windup)
    p.mark?.update(progress)
    if (progress < 1) return
    if (!p.released) {
      p.released = true
      a.swing = 0.28
      p.mark?.dispose()
      p.mark = null
      const reach = flatDistance(a.pos, hero.pos)
      const source = raised(a.pos, a.eye * 0.83)
      if (m.type === 'bolt') {
        const to = raised(p.target, hero.crouch ? 0.71 : 1.02),
          dx = to.x - source.x,
          dy = to.y - source.y,
          dz = to.z - source.z
        const d = Math.hypot(dx, dy, dz) || 1
        launch(
          a,
          source,
          { x: dx / d, y: dy / d, z: dz / d },
          { shot: m.reach + 4, flight: m.speed, spread: m.spread, dmg: m.damage },
        )
      } else if (m.type === 'ring') {
        const ring = {
          a,
          m,
          center: p.center,
          radius: 0.35,
          hit: false,
          mark: movingRing(view.scene, p.center, height),
        }
        ring.mark?.update(ring.radius)
        rings.push(ring)
      } else if (m.type !== 'charge') {
        const to = raised(hero.pos, hero.crouch ? 0.7 : 1.12),
          seen = physics.clear(source, to)
        const dx = hero.pos.x - a.pos.x,
          dz = hero.pos.z - a.pos.z
        const inFront = dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw)
        const arc = inFront >= reach * Math.cos(m.type === 'sweep' ? 1.37 : 0.78)
        const hit =
          m.type === 'eruption'
            ? flatDistance(p.center, hero.pos) <= m.radius && Math.abs(p.center.y - hero.pos.y) < 2.7
            : reach <= m.reach + 0.28 && Math.abs(a.pos.y - hero.pos.y) < 2.5 && arc
        if (hit && seen) deal(a, m.damage, m.type === 'eruption' ? p.center : a.pos)
      }
      if (m.type !== 'charge') {
        finish(a)
        return
      }
    }
    // Charge along the committed line, even if the player steps aside.
    const step = Math.min(m.distance - p.charge, dt * m.speed),
      dx = Math.sin(p.yaw),
      dz = Math.cos(p.yaw)
    const x = a.pos.x + step * dx,
      z = a.pos.z + step * dz,
      y = height(x, z),
      next = { x, y, z }
    if (
      Math.abs(y - a.pos.y) > 0.56 + step * 0.85 ||
      !physics.clear(raised(a.pos, 0.72), { x: x + dx * 0.44, y: y + 0.72, z: z + dz * 0.44 })
    ) {
      finish(a)
      return
    }
    p.charge += step
    a.walking = true
    Object.assign(a.pos, next)
    if (
      !p.hit &&
      flatDistance(a.pos, hero.pos) < m.width + 0.42 &&
      Math.abs(a.pos.y - hero.pos.y) < 2.3 &&
      physics.clear(raised(a.pos, 0.85), raised(hero.pos, 0.85))
    ) {
      p.hit = true
      deal(a, m.damage, a.pos)
    }
    if (p.charge >= m.distance - 0.005) finish(a)
  }
  function update(dt) {
    const bodies = missiles.some((p) => p.owner === hero)
      ? all
          .filter((a) => a.f.hp > 0)
          .map((a) => ({
            actor: a,
            center: raised(a.pos, a.bodyHeight),
            radius: a.hitRadius,
          }))
      : []
    const player = [
      {
        actor: hero,
        center: raised(hero.pos, hero.crouch ? 0.72 : 1.06),
        radius: hero.crouch ? 0.57 : 0.66,
      },
    ]
    for (let i = missiles.length - 1; i >= 0; i--) {
      const p = missiles[i],
        ally = p.owner === hero
      const hit = advanceFlight(
        p,
        dt,
        physics.clear,
        ally ? bodies.filter((b) => b.actor.f.hp > 0) : player,
      )
      if (hit) {
        if (ally) impact(hit, p.spec, p.traveled)
        else deal(p.owner, p.spec.dmg, p.origin)
      }
      display.sync(p)
      if (p.done) missiles.splice(i, 1)
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i],
        previous = r.radius
      r.radius += r.m.speed * dt
      r.mark?.update(r.radius)
      const dist = flatDistance(r.center, hero.pos),
        air = hero.pos.y - height(hero.pos.x, hero.pos.z)
      if (
        !r.hit &&
        dist >= previous - 0.48 &&
        dist <= r.radius + 0.61 &&
        air < 0.72 &&
        physics.clear(raised(r.center, 0.92), raised(hero.pos, 0.6))
      ) {
        r.hit = true
        deal(r.a, r.m.damage, r.center)
      }
      if (r.radius >= r.m.radius) {
        r.mark?.dispose()
        rings.splice(i, 1)
      }
    }
  }
  function clear() {
    missiles.length = 0
    display.clear()
    for (const r of rings) r.mark?.dispose()
    rings.length = 0
  }
  function discard(owner) {
    for (let i = missiles.length - 1; i >= 0; i--) {
      if (missiles[i].owner !== owner) continue
      missiles[i].done = true
      display.sync(missiles[i])
      missiles.splice(i, 1)
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      if (rings[i].a !== owner) continue
      rings[i].mark?.dispose()
      rings.splice(i, 1)
    }
  }
  return {
    launch,
    begin,
    cancel,
    step,
    update,
    clear,
    discard,
    dispose() {
      clear()
      display.dispose()
    },
  }
}
