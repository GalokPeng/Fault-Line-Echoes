import { biomes, heightAt, waterAt } from './biomes.js'
import { fighter, hurt, recover, rewardHit, length, sight, heading, practiceMoves } from './combat.js'
import { raised, flatDistance, sees, hears, swivel } from './perception.js'
import { wildlife, emptyHand, guardPalm } from './perception-species.js'
import { encounters } from './perception-encounters.js'
import { borderRoads } from './borders.js'
import { harvestBySpecies } from './expedition-harvest.js'
import { cityWalker, streetRoutine } from './city-life.js'

const voices = {
  capital: ['北门的四盏行灯，分别照向四条去处。', '夜市打烊后，守夜的人会继续巡街。'],
  rain: ['涨水前，城门上的铜钟会先响。', '出了北门就听得见三叠瀑，留意河畔伏低的鸣皇。'],
  salt: ['井绳还是湿的。城里这些人，一直都在。', '盐母抬尾时，别停在脚下冒白光的沙地。'],
  root: ['走进根窟时请轻些，纸页比这里的人还老。', '守望者抬起前蹄时看地面，等那圈青光靠近再跳。'],
  gorge: ['这座桥上走过四十七个人，我数过。', '赤翎压低冠羽时会直冲，沿岩脊横移能让开它。'],
}
const sightOf = (a, night, crouch = false) => ({
  range:
    (a.species?.sight ?? 25) * (night ? (a.species?.nocturnal ? 1.22 : 0.74) : 1) * (crouch ? 0.81 : 1),
  cone: a.kind === 'guard' ? 122 : a.species?.form === 'bird' ? 133 : 106,
  elevation: 58,
  targetEye: crouch ? 0.71 : 1.19,
})
export function makePeople(view, id, physics, hero, events, ecology = {}) {
  const b = biomes[id],
    all = []
  let training = null,
    seq = 0,
    time = 0,
    night = false
  const h = (x, z) => heightAt(id, x, z)
  const isWild = id !== 'capital' && wildlife[id]
  const routes = id === 'capital' ? cityWalker(view.town.colliders, view.land.solids) : null
  let report = null,
    activeBoss = null,
    manualSeason = 0,
    phaseKey = null,
    seasonElapsed = 0
  const saved = ecology.field || {},
    dens = new Map()
  if (
    isWild &&
    (!saved.bossSeasons || typeof saved.bossSeasons !== 'object' || Array.isArray(saved.bossSeasons))
  )
    saved.bossSeasons = {}
  const defeats = isWild ? saved.bossSeasons : {}
  let checkedLegacy = false

  const combat = encounters(view, physics, hero, events, h, all, impact)
  function hammerImpact(p) {
    view.town.workImpact?.(p)
    events.hammer?.(p)
  }
  function materialize(a) {
    if (!a.model)
      a.model = view.actor(
        a.kind,
        id,
        a.kind === 'duelist' ? { role: a.f.role, skin: '巡线原色' } : a.species || undefined,
      )
    const g = a.model.group
    g.position.set(a.pos.x, a.pos.y, a.pos.z)
    g.rotation.y = a.yaw
    return a.model
  }
  function add(kind, name, x, z, role = 'stone', extra = {}) {
    const species = extra.species,
      pos = { x, z, y: extra.y ?? h(x, z) },
      f = fighter(role)
    if (species) f.maxHp = f.hp = species.hp
    else if (kind === 'resident') f.maxHp = f.hp = 68
    const a = {
      ...extra,
      id: extra.id || id + '-' + seq,
      index: seq++,
      name,
      kind,
      role,
      pos,
      home: { ...pos },
      f,
      state: 'idle',
      angry: false,
      boss: !!species?.boss,
      yaw: extra.yaw ?? 0,
      eye: species?.eye ?? 1.5,
      bodyHeight: species ? Math.max(0.5, species.eye * 0.84) : 1.1,
      hitRadius: species?.boss ? 1.06 : species?.form === 'scorpion' ? 0.65 : 0.74,
      hearing: species?.hearing ?? 1,
      leash: species?.leash ?? (kind === 'duelist' ? 37 : kind === 'guard' ? 38 : 26),
      model: null,
      cooldown: 1.1,
      searchTime: 0,
      returnTime: 0,
      lastKnown: null,
      lastSeen: null,
      visionIn: 0,
      canSee: false,
      moveName: '',
      moveIndex: 0,
      plan: null,
      swing: 0,
      walking: false,
      dead: 0,
      corpse: 0,
      trace: [],
      stuckTime: 0,
    }
    if (!species || flatDistance(pos, hero.pos) < 90) materialize(a)
    all.push(a)
    return a
  }
  for (const p of view.town.npcSpawns) {
    const a = add(p.guard ? 'guard' : 'resident', p.name, p.x, p.z, p.guard ? 'stone' : 'leaf', p)
    // Facing the active street makes a stationary vendor a real witness.
    a.goods = view.town.features?.find((f) => f.kind === 'owned' && f.owner === p.id)
    if (p.yaw == null)
      a.yaw = a.goods ? Math.atan2(a.goods.x - p.x, a.goods.z - p.z) : Math.atan2(-p.x, -p.z)
  }
  function safeNest(x, z, boss = false) {
    for (let k = 0; k < (boss ? 300 : 35); k++) {
      const r = k ? (boss ? 2.33 : 1.35) * Math.sqrt(k) : 0,
        a = k * 2.399,
        xx = x + Math.cos(a) * r,
        zz = z + Math.sin(a) * r,
        y = h(xx, zz)
      if (waterAt(id, xx, zz).canCollect) continue
      if (
        boss &&
        (Math.hypot(xx, zz) < 82 ||
          [
            [4, 0],
            [-4, 0],
            [0, 4],
            [0, -4],
          ].some(([dx, dz]) => waterAt(id, xx + dx, zz + dz).wet))
      )
        continue
      if (
        boss &&
        view.town.colliders?.some((c) => {
          if (y + 3 < c.y - c.h / 2 || y > c.y + c.h / 2) return false
          const dx = xx - c.x,
            dz = zz - c.z,
            co = Math.cos(c.yaw || 0),
            si = Math.sin(c.yaw || 0)
          return Math.abs(dx * co - dz * si) < c.w / 2 + 4 && Math.abs(dx * si + dz * co) < c.d / 2 + 4
        })
      )
        continue
      const slope = Math.hypot(h(xx + 1, zz) - y, h(xx, zz + 1) - y)
      if (slope > (boss ? 0.46 : 0.72)) continue
      if (
        view.land?.solids?.some(
          (s) =>
            y + (boss ? 2.4 : 0.9) >= s.y &&
            y < s.y + s.h &&
            Math.hypot(xx - s.x, zz - s.z) <
              s.r + (boss ? 4.3 : 1.05) + (s.r > 1.2 && s.h > 24 ? 2.8 : 0),
        )
      )
        continue
      return [xx, zz]
    }
    return null
  }
  if (isWild) {
    const roster = wildlife[id],
      species = roster.filter((s) => !s.boss && !s.habitat),
      dayBoss = roster.find((s) => s.phase === 'day'),
      nightBoss = roster.find((s) => s.phase === 'night')
    const place = (s, x, z) => {
      const p = safeNest(x, z, s.boss)
      return p ? add('beast', s.name, ...p, 'stone', { species: s, yaw: seq * 2.399 }) : null
    }
    for (let i = 2; i < b.trail.length; i++) {
      const [x, z] = b.trail[i],
        side = i % 2 ? 1 : -1
      place(species[(i - 2) % species.length], x + side * (7 + i * 0.9), z + ((i % 3) - 1) * 3.2)
      if (i % 2) place(species[(i + 1) % species.length], x - side * (18 + i), z + 3)
    }
    for (let k = 0; k < 22; k++) {
      const angle = k * 2.399 + 0.3,
        range = 129 + (k % 7) * 63
      place(species[k % species.length], Math.cos(angle) * range, Math.sin(angle) * range)
    }
    // The overland passages remain inhabited all the way to their border stones.
    for (const route of borderRoads(id)) {
      let walked = 0,
        groupIndex = 0
      for (let i = 1; i < route.points.length; i++) {
        const [ax, az] = route.points[i - 1],
          [x, z] = route.points[i],
          dx = x - ax,
          dz = z - az,
          len = Math.hypot(dx, dz)
        walked += len
        if (
          walked < 66 ||
          len < 0.1 ||
          Math.hypot(x, z) < 83 ||
          Math.hypot(x - route.gate.x, z - route.gate.z) < 25
        )
          continue
        walked = 0
        const offset = (groupIndex % 2 ? 1 : -1) * (9 + (groupIndex % 4))
        place(species[groupIndex++ % species.length], x + (dz / len) * offset, z - (dx / len) * offset)
      }
    }
    const [x, z] = b.landmark,
      offsets = [
        { rain: [1, -12], salt: [-12, 2], root: [-23, 22], gorge: [17, 10] }[id],
        [9, -7],
        [-7, 5],
        [3, -5],
        [-4, -4],
        [0, 0],
      ]
    // Select dens once from the real terrain and structures; their marker and
    // the actor always share the same location, including after a zone reload.
    for (const [species, anchors] of [
      [dayBoss, offsets.map(([dx, dz]) => [x + dx, z + dz])],
      [nightBoss, [nightBoss.nest]],
    ]) {
      for (const [xx, zz] of anchors) {
        const nest = safeNest(xx, zz, true)
        if (nest) {
          dens.set(species.phase, { species, nest })
          break
        }
      }
    }
    const grazer = roster.find((s) => s.habitat === 'riverMeadow')
    if (grazer)
      for (const [xx, zz] of [
        [23, 550],
        [32, 544],
        [16, 535],
        [24, 456],
        [14, 446],
      ])
        place(grazer, xx, zz)
  }
  function removeActor(a) {
    combat.cancel(a)
    combat.discard(a)
    a.model?.dispose()
    const index = all.indexOf(a)
    if (index >= 0) all.splice(index, 1)
  }
  function syncClock(isNight = night) {
    const clock = ecology.clock?.()
    const scheduled = clock ? clock.hour < 6 || clock.hour >= 18 : !!isNight
    if (!clock && scheduled !== night) manualSeason++
    night = scheduled
    if (!isWild) return
    const phase = night ? 'night' : 'day'
    seasonElapsed = clock?.elapsed ?? time / 36
    // Anchor the night to dusk, so midnight does not spawn another boss.
    const began = (period) => clock.elapsed - ((clock.hour - (period === 'night' ? 18 : 6) + 24) % 24)
    if (!checkedLegacy && clock) {
      checkedLegacy = true
      // Earlier saves stored only a named remains bag. Preserve that harvest
      // and count it against its most recent appearance on the first load.
      for (const lot of saved.drops || []) {
        if (lot.kind !== 'remains' || lot.zone !== id) continue
        const s = wildlife[id].find((s) => s.boss && (s.id === lot.speciesId || s.name === lot.name))
        if (s && !Object.hasOwn(defeats, s.id)) {
          const start = began(s.phase)
          defeats[s.id] = { cycle: Math.round(start * 60), at: Math.min(start, clock.elapsed - 1) }
        }
      }
    }
    const cycle = clock ? Math.round(began(phase) * 60) : manualSeason
    const key = phase + '-' + cycle
    if (key === phaseKey) return
    if (activeBoss) {
      combat.cancel(activeBoss)
      combat.discard(activeBoss)
      if (
        activeBoss.f.hp <= 0 &&
        activeBoss.corpse > 0 &&
        seasonElapsed - activeBoss.deathHour < 24 / 36
      )
        activeBoss.retired = true
      else removeActor(activeBoss)
      activeBoss = null
    }
    phaseKey = key
    const den = dens.get(phase)
    if (!den) return
    const { species, nest } = den,
      record = defeats[species.id]
    const a = add('beast', species.name, ...nest, 'stone', { species, id: species.id, cycle })
    activeBoss = a
    if (record?.cycle === cycle) {
      a.f.hp = 0
      a.dead = Infinity
      a.state = 'dead'
      a.deathHour = record.at
      a.corpse = Math.max(0, 24 - Math.max(0, seasonElapsed - record.at) * 36)
      if (record.pos && ['x', 'y', 'z'].every((k) => Number.isFinite(record.pos[k])))
        Object.assign(a.pos, record.pos)
      if (a.model) a.model.group.visible = a.corpse > 0
    }
  }
  syncClock()
  function bossMarkers() {
    syncClock()
    if (!activeBoss || activeBoss.f.hp <= 0) return []
    const a = activeBoss,
      s = a.species
    return [
      {
        ...a.pos,
        home: { ...a.home },
        actorId: a.id,
        kind: 'boss',
        boss: true,
        name: s.name,
        phase: s.phase,
        lair: s.lair,
        tactic: s.tactic,
      },
    ]
  }
  function sightNow(a, point = hero.pos) {
    return sees(a, point, physics.clear, sightOf(a, night, hero.crouch))
  }
  function remember(a, point, visual) {
    if (id === 'capital' && !a.angry && a.kind !== 'duelist') {
      a.post = { ...a.pos }
      a.routine = null
      a.working = null
      a.model?.setWork?.(null)
    }
    a.lastKnown = { ...point }
    if (visual) a.lastSeen = { ...point }
    a.searchTime = visual ? 7.2 : 5.3
    a.state = visual ? 'chase' : 'search'
    a.angry = true
  }
  function senseIncident(target) {
    const wasCalm = !target.angry
    if (target !== training) {
      if (sightNow(target)) remember(target, hero.pos, true)
      else remember(target, target.pos, false)
      if (target.kind === 'resident' || target.kind === 'guard') {
        for (const w of all) {
          if (w.kind !== 'guard' || w === target || w.f.hp <= 0 || flatDistance(w.pos, target.pos) > 29)
            continue
          if (sightNow(w) && sees(w, target.pos, physics.clear, { range: 29, cone: 126 }))
            remember(w, hero.pos, true)
        }
      }
    }
    return wasCalm
  }
  function assaultBonus(a) {
    return !!(hero.crouch || hero.quiet) && !a.angry && !sightNow(a)
  }
  function impact(a, spec, distance) {
    if (a.f.hp <= 0) return
    const blocked = (a.f.guard || a.f.parry > 0) && a.f.stamina >= 8
    const damage = hurt(a.f, spec.dmg * (assaultBonus(a) ? 1.5 : 1))
    a.f.hp = Math.max(0, a.f.hp - damage)
    view.impactEffect?.(spec, raised(a.pos, a.bodyHeight), blocked)
    const wasCalm = senseIncident(a)
    a.f.stun = a.boss ? (a.plan ? 0 : 0.09) : hero.f.role === 'beam' && hero.f.chain > 0 ? 0.55 : 0.26
    rewardHit(hero.f, spec, distance)
    events.hit(a.name, damage, wasCalm && a.kind !== 'beast' && a !== training)
    if (a.f.hp > 0) return
    combat.cancel(a)
    a.angry = false
    a.state = 'dead'
    if (a.boss) {
      combat.discard(a)
      a.deathHour = seasonElapsed
    }
    a.dead = a.boss ? Infinity : 65
    a.corpse = a.species ? 24 : 0
    if (a.model) {
      a.model.group.visible = !!a.corpse
      if (a.corpse) a.model.fall?.(0)
    }
    if (a === training) {
      endDuel()
      events.duel(true)
      return
    }
    if (a.species) {
      const location = { ...a.pos }
      if (a.boss) defeats[a.species.id] = { cycle: a.cycle, at: seasonElapsed, pos: location }
      const parts = harvestBySpecies[a.species.id]
      if (events.harvest) events.harvest(parts, a.name, location, a.species.id)
      else
        for (const { id: item, qty } of parts) events.loot?.(item, qty, a.name, location, a.species.id)
    }
  }
  function strike(spec) {
    const from = view.aimOrigin?.() || raised(hero.pos, hero.crouch ? 1.08 : 1.64),
      dir = heading(hero.yaw, hero.pitch)
    view.castEffect?.(spec, from, dir, hero.pos.y)
    if (spec.flight) {
      combat.launch(hero, from, dir, spec)
      return 0
    }
    const max = spec.shot || spec.dist
    const dirs = spec.spread
      ? [-spec.spread, 0, spec.spread].map((a) => heading(hero.yaw + a, hero.pitch))
      : [dir]
    const touched = new Set()
    for (const vector of dirs) {
      let target = null,
        nearest = Infinity
      for (const a of all) {
        if (a.f.hp <= 0) continue
        const at = raised(a.pos, a.bodyHeight)
        const distance = sight(
          from,
          vector,
          at,
          max,
          spec.shot ? a.hitRadius : Math.max(1.22, a.hitRadius),
        )
        if (distance < nearest && physics.clear(from, at)) {
          target = a
          nearest = distance
        }
      }
      if (target && !touched.has(target)) {
        touched.add(target)
        impact(target, { ...spec, dmg: spec.dmg * (spec.burst || 1) }, nearest)
      }
      if (spec.shot) {
        const end = (d) => ({
          x: from.x + vector.x * d,
          y: from.y + vector.y * d,
          z: from.z + vector.z * d,
        })
        let d = target ? nearest : max
        if (!physics.clear(from, end(d))) {
          let lo = 0,
            hi = d
          for (let k = 0; k < 7; k++) {
            const mid = (lo + hi) * 0.5
            if (physics.clear(from, end(mid))) lo = mid
            else hi = mid
          }
          d = lo
        }
        view.effect(from, end(d))
      }
    }
    return touched.size
  }
  function walk(a, target, speed, dt, record = true) {
    const p = a.pos,
      dx = target.x - p.x,
      dz = target.z - p.z,
      dist = Math.hypot(dx, dz)
    a.walking = false
    if (dist < (id === 'capital' && a.state === 'idle' ? 0.06 : 0.38)) return
    const step = Math.min(dist, dt * speed),
      angle = Math.atan2(dx, dz),
      side = a.index % 2 ? 1 : -1
    for (const steer of [
      0,
      0.58 * side,
      -0.58 * side,
      1.08 * side,
      -1.08 * side,
      1.49 * side,
      -1.49 * side,
    ]) {
      const yaw = angle + steer,
        sn = Math.sin(yaw),
        cs = Math.cos(yaw),
        x = p.x + sn * step,
        z = p.z + cs * step,
        y = h(x, z)
      const floor =
        a.service &&
        Math.abs(a.home.y - h(a.home.x, a.home.z)) > 0.55 &&
        flatDistance(a.home, { x, z }) < 2.3
          ? a.home.y
          : y
      if (
        Math.abs(floor - p.y) > 0.57 + step * 0.9 ||
        (a.species && a.species.form !== 'drake' && waterAt(id, x, z).depth > 0.62) ||
        !physics.clear(raised(p, 0.83), { x: x + sn * 0.43, y: floor + 0.83, z: z + cs * 0.43 })
      )
        continue
      p.x = x
      p.y = floor
      p.z = z
      if (routes && flatDistance(p, hero.pos) < 12) {
        a.stride = (a.stride || 0) + step
        if (a.stride >= 1.48) {
          a.stride -= 1.48
          events.foot?.(p)
        }
      }
      a.yaw = swivel(a.yaw, yaw, dt * 6.5)
      a.walking = true
      if (record && a.state !== 'idle') {
        const last = a.trace.at(-1) || a.post || a.home
        if (flatDistance(p, last) > 1.45) a.trace.push({ ...p })
        if (a.trace.length > 100) a.trace.shift()
      }
      return
    }
  }
  function retreat(a) {
    combat.cancel(a)
    a.state = 'return'
    a.angry = false
    a.canSee = false
    a.lastKnown = null
    a.lastSeen = null
    a.searchTime = 0
    a.returnTime = 0
    a.cooldown = 1.15
  }
  function home(a) {
    a.corpse = 0
    Object.assign(a.pos, a.post || a.home)
    a.post = null
    a.state = 'idle'
    a.angry = false
    a.canSee = false
    a.lastKnown = null
    a.lastSeen = null
    a.trace.length = 0
    a.returnTime = 0
    a.walking = false
    a.f.hp = a.f.maxHp
    a.cooldown = 1.15
  }
  function goHome(a, dt, dist) {
    a.returnTime += dt
    const origin = a.post || a.home
    if (
      flatDistance(a.pos, origin) < 0.8 ||
      (dist > 95 && a.returnTime > 2.8) ||
      a.returnTime > 12 + a.leash / 3
    ) {
      if (a === training) {
        endDuel()
        events.duel(false)
      } else home(a)
      return
    }
    let back = a.trace.at(-1)
    while (back && flatDistance(a.pos, back) < 0.85) {
      a.trace.pop()
      back = a.trace.at(-1)
    }
    walk(a, back || origin, 4.3, dt, false)
  }
  function patrol(a, dt) {
    if (routes && a.kind !== 'duelist') {
      streetRoutine(a, dt, night, routes, walk, a.goods)
      return
    }
    if (a.service && a.kind !== 'guard') {
      a.walking = false
      if (flatDistance(a.pos, a.home) > 0.85) walk(a, a.home, 1.25, dt, false)
      return
    }
    const radius = a.species ? 3.7 : a.kind === 'guard' ? 1.6 : 0.82
    const angle = time * 0.13 + a.index * 2.4
    walk(
      a,
      { x: a.home.x + Math.cos(angle) * radius, z: a.home.z + Math.sin(angle) * radius },
      a.species ? 1.05 : 0.64,
      dt,
      false,
    )
  }
  function moves(a) {
    return (
      a.species?.moves ||
      (a === training ? practiceMoves(a.f.role) : [a.kind === 'guard' ? guardPalm : emptyHand])
    )
  }
  function chase(a, dt) {
    const target = a.lastKnown,
      dist = length(a.pos, target),
      kit = moves(a)
    let move = null
    for (let i = 0; i < kit.length; i++) {
      const candidate = kit[(a.moveIndex + i) % kit.length]
      if (dist <= candidate.reach) {
        move = candidate
        break
      }
    }
    if (move && a.cooldown <= 0) {
      a.moveIndex = (kit.indexOf(move) + 1) % kit.length
      combat.begin(a, move)
      return
    }
    if (dist > Math.min(...kit.map((m) => m.reach)) - 0.18) {
      walk(a, target, a.species?.speed ?? (a === training ? 4.6 : 4.0), dt)
    } else {
      a.walking = false
      a.yaw = swivel(a.yaw, Math.atan2(target.x - a.pos.x, target.z - a.pos.z), dt * 6)
    }
  }
  function update(dt, isNight) {
    time += dt
    syncClock(isNight)
    for (const a of [...all]) {
      if (a.f.hp <= 0) {
        if (a.corpse > 0) {
          a.corpse = Math.max(
            0,
            Math.min(a.corpse - dt, a.boss ? 24 - (seasonElapsed - a.deathHour) * 36 : Infinity),
          )
          if (a.corpse > 0 && length(a.pos, hero.pos) < 125) {
            const m = materialize(a)
            m.group.visible = true
            m.fall?.(24 - a.corpse, a.index % 2 ? 1 : -1)
          } else if (a.model) a.model.group.visible = false
        }
        if (a.retired && !a.corpse) removeActor(a)
        else if (a.dead > 0 && (a.dead -= dt) <= 0) home(a)
        continue
      }
      const dist = length(a.pos, hero.pos),
        active = dist < 125
      if (a.model) a.model.group.visible = active
      if (!active && a.state === 'idle') {
        if (routes) {
          a.awayTime = (a.awayTime || 0) + dt
          if (a.awayTime > 0.32) {
            patrol(a, a.awayTime)
            a.awayTime = 0
          }
        }
        continue
      }
      if (active) {
        materialize(a)
        a.model.group.visible = true
      }
      recover(a.f, dt)
      a.cooldown = Math.max(0, a.cooldown - dt)
      a.swing = Math.max(0, a.swing - dt)
      const sanctuary = a.species && Math.hypot(hero.pos.x, hero.pos.z) < 43
      const origin = a.post || a.home
      if (
        a.angry &&
        (hero.f.hp <= 0 ||
          sanctuary ||
          flatDistance(hero.pos, origin) > a.leash ||
          flatDistance(a.pos, origin) > a.leash + 1)
      )
        retreat(a)
      if (a.state === 'return') goHome(a, dt, dist)
      else {
        // Cache geometric sight briefly; footstep impulses are sampled on their actual frame.
        a.visionIn -= dt
        const canEngage =
          !sanctuary &&
          (a.angry || a.kind === 'beast') &&
          flatDistance(hero.pos, origin) <= a.leash &&
          hero.f.hp > 0
        if (canEngage && a.visionIn <= 0) {
          a.visionIn = 0.095 + 0.009 * (a.index % 4)
          a.canSee = sightNow(a)
          if (a.canSee) remember(a, hero.pos, true)
          else if (a.state === 'chase') a.state = 'search'
        }
        if (canEngage && !a.canSee && hears(a, hero, physics.clear)) remember(a, hero.pos, false)
        if (a.f.stun > 0) {
          a.walking = false
          if (a.plan && !a.boss && !a.plan.released) {
            combat.cancel(a)
            a.cooldown = 0.6
          }
        } else if (a.plan) combat.step(a, dt)
        else if (a.state === 'chase') chase(a, dt)
        else if (a.state === 'search') {
          a.searchTime -= dt
          if (a.searchTime <= 0) retreat(a)
          else if (a.lastKnown && flatDistance(a.pos, a.lastKnown) > 0.56)
            walk(a, a.lastKnown, (a.species?.speed || 4) * 0.84, dt)
          else {
            a.walking = false
            a.yaw += dt * 1.27
          }
        } else patrol(a, dt)
      }
      if (a.model && a.f.hp > 0) {
        const g = a.model.group
        g.position.set(a.pos.x, a.pos.y, a.pos.z)
        g.rotation.y = a.yaw
        a.model.setWork?.(a.state === 'idle' && !a.walking ? a.working : null, hammerImpact)
        a.model.update(
          dt,
          a.walking,
          a.swing > 0.23,
          time,
          a.plan && !a.plan.released
            ? { progress: a.plan.elapsed / a.plan.move.windup, type: a.plan.move.type }
            : null,
        )
      }
    }
    combat.update(dt)
  }
  function endDuel() {
    if (!training) return
    combat.cancel(training)
    combat.discard(training)
    training.model?.dispose()
    all.splice(all.indexOf(training), 1)
    training = null
  }
  return {
    all,
    update,
    syncClock,
    bossMarkers,
    strike,
    get training() {
      return training
    },
    get report() {
      return report && time - report.at < 9 ? report : null
    },
    nearby() {
      return all
        .filter(
          (a) =>
            a.kind !== 'beast' &&
            a.kind !== 'duelist' &&
            a.f.hp > 0 &&
            !a.angry &&
            length(a.pos, hero.pos) < 5 &&
            physics.clear(raised(a.pos, 1.12), raised(hero.pos, 1.12)),
        )
        .sort((a, b) => length(a.pos, hero.pos) - length(b.pos, hero.pos))[0]
    },
    speak(a) {
      const lines = voices[id] || voices.capital
      return a.dialogue || lines[a.index % lines.length]
    },
    witnessTheft(pos) {
      const witnesses = all.filter(
        (a) =>
          ['resident', 'guard'].includes(a.kind) &&
          a.f.hp > 0 &&
          sightNow(a) &&
          sees(a, pos, physics.clear, { ...sightOf(a, night), targetEye: pos.displayHeight ?? 1.22 }),
      )
      if (!witnesses.length) return false
      const owner = witnesses.find((a) => a.id === pos.owner),
        caller = owner || witnesses[0]
      if (owner) remember(owner, hero.pos, true)
      const guards = all
        .filter(
          (g) =>
            g.kind === 'guard' &&
            g.f.hp > 0 &&
            (witnesses.includes(g) ||
              witnesses.some((w) => {
                const d = flatDistance(g.pos, w.pos)
                return d < 52 && (d < 16 || physics.clear(raised(g.pos, 1.52), raised(w.pos, 1.52)))
              })),
        )
        .sort((a, b) => flatDistance(a.pos, pos) - flatDistance(b.pos, pos))
        .slice(0, 3)
      for (const guard of guards) remember(guard, pos, witnesses.includes(guard) || sightNow(guard))
      if (!owner && !pos.owner && caller.kind !== 'guard') remember(caller, hero.pos, true)
      report = { witness: caller.name, guard: guards[0]?.name, at: time }
      events.alarm?.(report)
      return true
    },
    startDuel(role, name) {
      endDuel()
      const p = hero.pos,
        front = heading(hero.yaw)
      let x = p.x + front.x * 7,
        z = p.z + front.z * 7
      if (!physics.clear(raised(p, 1), { x, y: p.y + 1, z })) {
        x = p.x + 2
        z = p.z + 1
      }
      training = add('duelist', name || '巡线陪练', x, z, role, { job: '陪练' })
      training.yaw = Math.atan2(p.x - x, p.z - z)
      training.cooldown = 1.4
      // A challenge is addressed to a known opponent at the starting position.
      remember(training, p, sightNow(training))
      return training
    },
    endDuel,
    peace() {
      combat.clear()
      endDuel()
      for (const a of all) {
        combat.cancel(a)
        if (a.f.hp > 0) home(a)
      }
    },
    dispose() {
      combat.dispose()
      for (const a of all) {
        combat.cancel(a)
        a.model?.dispose()
      }
      all.length = 0
      training = null
    },
  }
}
