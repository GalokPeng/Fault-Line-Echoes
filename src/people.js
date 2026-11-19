import { biomes, heightAt } from './biomes.js'
import { fighter, hurt, recover, rewardHit, length, sight, heading } from './combat.js'
import { raised, flatDistance, sees, hears, swivel } from './perception.js'
import { wildlife, emptyHand, guardPalm, practiceWave } from './perception-species.js'
import { encounters } from './perception-encounters.js'
import { borderRoads } from './borders.js'
import { harvestBySpecies } from './expedition-harvest.js'

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
export function makePeople(view, id, physics, hero, events) {
  const b = biomes[id],
    all = []
  let training = null,
    seq = 0,
    time = 0,
    night = false
  const h = (x, z) => heightAt(id, x, z)
  const isWild = id !== 'capital' && wildlife[id]
  const combat = encounters(view, physics, hero, events, h, all, impact)
  function materialize(a) {
    if (!a.model) a.model = view.actor(a.kind, id, a.species || undefined)
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
    if (p.yaw == null) {
      const goods = view.town.features?.find((f) => f.kind === 'owned' && f.owner === p.id)
      a.yaw = goods ? Math.atan2(goods.x - p.x, goods.z - p.z) : Math.atan2(-p.x, -p.z)
    }
  }
  function safeNest(x, z, boss = false) {
    for (let k = 0; k < 35; k++) {
      const r = k ? 1.35 * Math.sqrt(k) : 0,
        a = k * 2.399,
        xx = x + Math.cos(a) * r,
        zz = z + Math.sin(a) * r,
        y = h(xx, zz)
      if (y < b.waterLevel + 0.65) continue
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
      boss = roster.find((s) => s.boss)
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
    if (!offsets.some(([dx, dz]) => place(boss, x + dx, z + dz)))
      add('beast', boss.name, x, z, 'stone', { species: boss })
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
  function sightNow(a, point = hero.pos) {
    return sees(a, point, physics.clear, sightOf(a, night, hero.crouch))
  }
  function remember(a, point, visual) {
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
    const damage = hurt(a.f, spec.dmg * (assaultBonus(a) ? 1.5 : 1))
    a.f.hp = Math.max(0, a.f.hp - damage)
    const wasCalm = senseIncident(a)
    a.f.stun = a.boss ? (a.plan ? 0 : 0.09) : hero.f.role === 'beam' && hero.f.chain > 0 ? 0.55 : 0.26
    rewardHit(hero.f, spec, distance)
    events.hit(a.name, damage, wasCalm && a.kind !== 'beast' && a !== training)
    if (a.f.hp > 0) return
    combat.cancel(a)
    a.angry = false
    a.state = 'dead'
    a.dead = a.boss ? 150 : 65
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
      for (const { id: item, qty } of harvestBySpecies[a.species.id]) {
        events.loot?.(item, qty, a.name, location, a.species.id)
      }
    }
  }
  function strike(spec) {
    const from = raised(hero.pos, hero.crouch ? 1.05 : 1.55),
      dir = heading(hero.yaw, hero.pitch)
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
    if (dist < 0.38) return
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
        !physics.clear(raised(p, 0.83), { x: x + sn * 0.43, y: floor + 0.83, z: z + cs * 0.43 })
      )
        continue
      p.x = x
      p.y = floor
      p.z = z
      a.yaw = swivel(a.yaw, yaw, dt * 6.5)
      a.walking = true
      if (record && a.state !== 'idle') {
        const last = a.trace.at(-1) || a.home
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
    Object.assign(a.pos, a.home)
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
    if (
      flatDistance(a.pos, a.home) < 0.8 ||
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
    walk(a, back || a.home, 4.3, dt, false)
  }
  function patrol(a, dt) {
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
      (a === training && a.role === 'tide'
        ? [practiceWave, emptyHand]
        : [a.kind === 'guard' ? guardPalm : emptyHand])
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
    night = !!isNight
    time += dt
    for (const a of [...all]) {
      if (a.f.hp <= 0) {
        if (a.corpse > 0) {
          a.corpse = Math.max(0, a.corpse - dt)
          if (a.corpse > 0 && length(a.pos, hero.pos) < 125) {
            const m = materialize(a)
            m.group.visible = true
            m.fall?.(24 - a.corpse, a.index % 2 ? 1 : -1)
          } else if (a.model) a.model.group.visible = false
        }
        if (a.dead > 0 && (a.dead -= dt) <= 0) home(a)
        continue
      }
      const dist = length(a.pos, hero.pos),
        active = dist < 125
      if (a.model) a.model.group.visible = active
      if (!active && a.state === 'idle') continue
      if (active) {
        materialize(a)
        a.model.group.visible = true
      }
      recover(a.f, dt)
      a.cooldown = Math.max(0, a.cooldown - dt)
      a.swing = Math.max(0, a.swing - dt)
      const sanctuary = a.species && Math.hypot(hero.pos.x, hero.pos.z) < 43
      if (
        a.angry &&
        (hero.f.hp <= 0 ||
          sanctuary ||
          flatDistance(hero.pos, a.home) > a.leash ||
          flatDistance(a.pos, a.home) > a.leash + 1)
      )
        retreat(a)
      if (a.state === 'return') goHome(a, dt, dist)
      else {
        // Cache geometric sight briefly; footstep impulses are sampled on their actual frame.
        a.visionIn -= dt
        const canEngage =
          !sanctuary &&
          (a.angry || a.kind === 'beast') &&
          flatDistance(hero.pos, a.home) <= a.leash &&
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
    strike,
    get training() {
      return training
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
          sees(a, pos, physics.clear, { ...sightOf(a, night), targetEye: 0.75 }),
      )
      for (const a of witnesses) remember(a, hero.pos, true)
      return witnesses.length > 0
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
