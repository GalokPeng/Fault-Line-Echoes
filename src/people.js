import { biomes, heightAt } from './biomes.js'
import { fighter, hurt, noticeAttack, recover, rewardHit, length, sight, heading } from './combat.js'
const creatureNames = { rain: '雾泽山猊', salt: '盐壳沙螯', root: '苔冠原鹿', gorge: '赤岩裂爪' }
const voices = {
  rain: ['涨水前，城门上的铜钟会先响。', '出了北门就听得见三叠瀑，石头湿，慢慢走。'],
  salt: ['井绳还是湿的。城里这些人，一直都在。', '日落以后，白盐滩会把月光照回来。'],
  root: ['走进根窟时请轻些，纸页比这里的人还老。', '听到木头敲三下，就沿着苔路回庭。'],
  gorge: ['这座桥上走过四十七个人，我数过。', '谷底的水位涨了一指，塔头的风也变了。'],
}
const chest = (p, h = 1.05) => ({ x: p.x, y: p.y + h, z: p.z })
export function makePeople(view, id, physics, hero, events) {
  const all = [],
    b = biomes[id]
  let seq = 0,
    training = null,
    t = 0
  function add(kind, name, x, z, role = 'stone', job = '') {
    const model = view.actor(kind, id),
      pos = { x, z, y: heightAt(id, x, z) },
      beast = kind === 'beast'
    const a = {
      kind,
      name,
      job,
      role,
      pos,
      home: { ...pos },
      model,
      f: fighter(role),
      index: seq++,
      angry: false,
      alert: 0,
      think: 0,
      swing: 0,
      dead: 0,
      walking: false,
      stuck: 0,
      yaw: 0,
    }
    if (beast) {
      a.f.hp = a.f.maxHp = 52 + 8 * (a.index % 3)
    }
    if (kind === 'resident') {
      a.f.maxHp = a.f.hp = 68
    }
    a.model.group.position.set(x, pos.y, z)
    all.push(a)
    return a
  }
  for (const p of view.town.npcSpawns)
    add(p.guard ? 'guard' : 'resident', p.name, p.x, p.z, p.guard ? 'stone' : 'leaf', p.job)
  for (let i = 2; i < b.trail.length; i++) {
    const [x, z] = b.trail[i],
      s = i % 2 ? 1 : -1
    add('beast', creatureNames[id], x + s * (i === 2 ? 7 : 12 + i * 1.5), z + ((i % 3) - 1) * 5)
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.399,
      beyond = 158 + (i % 4) * 56
    add('beast', creatureNames[id], Math.cos(angle) * beyond, Math.sin(angle) * beyond)
  }
  function visible(a, c) {
    return physics.clear(chest(a), chest(c))
  }
  const impact = (a, spec, distance) => {
    const before = a.f.hp,
      wasCalm = !a.angry
    const amt = hurt(a.f, spec.dmg * (hero.crouch && wasCalm ? 1.5 : 1))
    a.f.hp = Math.max(0, before - amt)
    a.f.stun = hero.f.role === 'beam' && hero.f.chain > 0 ? 0.55 : 0.26
    if (a !== training) noticeAttack(a, all, visible)
    rewardHit(hero.f, spec, distance)
    events.hit(a.name, amt, wasCalm && a.kind !== 'beast' && a !== training)
    if (a.f.hp === 0) {
      a.dead = 65
      a.angry = false
      if (a === training) {
        training = null
        events.duel(true)
      }
    }
  }
  function strike(spec) {
    const from = chest(hero.pos, hero.crouch ? 1.05 : 1.55),
      max = spec.shot || spec.dist,
      dir = heading(hero.yaw, hero.pitch)
    const dirs = spec.spread
      ? [-spec.spread, 0, spec.spread].map((a) => heading(hero.yaw + a, hero.pitch))
      : [dir]
    const touched = new Set()
    for (const vector of dirs) {
      let first = null,
        nearest = Infinity
      for (const a of all) {
        if (a.f.hp <= 0) continue
        const at = chest(a.pos, a.kind === 'beast' ? 0.85 : 1.12)
        const distance = sight(from, vector, at, max, spec.shot ? 0.86 : 1.22)
        if (distance < nearest && physics.clear(from, at)) {
          first = a
          nearest = distance
        }
      }
      if (first && !touched.has(first)) {
        touched.add(first)
        impact(first, { ...spec, dmg: spec.dmg * (spec.burst || 1) }, nearest)
      }
      if (spec.shot) {
        let dist = first ? nearest : max
        const end = (d) => ({
          x: from.x + vector.x * d,
          y: from.y + vector.y * d,
          z: from.z + vector.z * d,
        })
        if (!physics.clear(from, end(dist))) {
          let lo = 0,
            hi = dist
          for (let k = 0; k < 7; k++) {
            const mid = (lo + hi) / 2
            if (physics.clear(from, end(mid))) lo = mid
            else hi = mid
          }
          dist = lo
        }
        view.effect(from, end(dist))
      }
    }
    return touched.size
  }
  function walk(a, tx, tz, speed, dt) {
    const dx = tx - a.pos.x,
      dz = tz - a.pos.z,
      dist = Math.hypot(dx, dz)
    if (dist < 0.55) {
      a.walking = false
      return
    }
    const step = Math.min(dist, dt * speed),
      angle = Math.atan2(dx, dz),
      p = a.pos
    for (const offset of [0, a.index % 2 ? 0.88 : -0.88, a.index % 2 ? -0.88 : 0.88]) {
      const yaw = angle + offset,
        x = p.x + Math.sin(yaw) * step,
        z = p.z + Math.cos(yaw) * step,
        y = heightAt(id, x, z)
      const ahead = {
        x: p.x + Math.sin(yaw) * Math.max(0.65, step),
        y: p.y + 0.85,
        z: p.z + Math.cos(yaw) * Math.max(0.65, step),
      }
      if (Math.abs(y - p.y) < 1 + step * 0.8 && physics.clear(chest(p, 0.85), ahead)) {
        p.x = x
        p.y = y
        p.z = z
        a.yaw = yaw
        a.walking = true
        return
      }
    }
    a.walking = false
  }
  function update(dt, night) {
    t += dt
    for (const a of all) {
      const f = a.f,
        m = a.model.group
      if (f.hp <= 0) {
        m.visible = false
        if (a.dead > 0 && (a.dead -= dt) <= 0 && a.kind !== 'duelist') {
          f.hp = f.maxHp
          Object.assign(a.pos, a.home)
          a.alert = 0
          m.visible = true
        }
        continue
      }
      const dist = length(a.pos, hero.pos)
      m.visible = dist < 185
      if (!m.visible) continue
      recover(f, dt)
      a.think -= dt
      a.swing = Math.max(0, a.swing - dt)
      const beast = a.kind === 'beast',
        duel = a === training
      if (
        beast &&
        !a.angry &&
        dist < (night ? 21 : 15) * (hero.crouch ? 0.55 : 1) &&
        Math.hypot(hero.pos.x, hero.pos.z) > 55 &&
        visible(a.pos, hero.pos)
      ) {
        a.angry = true
        a.alert = 15
      }
      if (a.angry && !duel) {
        a.alert -= dt
        if (dist < 16 && visible(a.pos, hero.pos)) a.alert = Math.max(a.alert, 7)
        if (
          a.alert <= 0 ||
          length(a.pos, a.home) > (beast ? 61 : 43) ||
          (beast && Math.hypot(hero.pos.x, hero.pos.z) < 43)
        )
          a.angry = false
      }
      if (f.stun > 0) {
        a.walking = false
      } else if (a.angry || duel) {
        const range = duel && a.role === 'tide' ? 15 : 2.3
        if (dist > range || !visible(a.pos, hero.pos))
          walk(a, hero.pos.x, hero.pos.z, duel ? 4.7 : beast ? 4.5 : 4, dt)
        else {
          a.walking = false
          a.yaw = Math.atan2(hero.pos.x - a.pos.x, hero.pos.z - a.pos.z)
          if (a.think <= 0 && hero.f.hp > 0) {
            a.think = beast ? 1.62 : duel ? 1.43 : 1.32
            a.swing = 0.35
            if (range > 4) view.effect(chest(a.pos), chest(hero.pos))
            const facing = heading(hero.yaw),
              front = (a.pos.x - hero.pos.x) * facing.x + (a.pos.z - hero.pos.z) * facing.z > 0
            const damage = hurt(hero.f, beast ? 13 : duel ? 15 : a.kind === 'guard' ? 22 : 10, front)
            events.injury(damage, a)
          }
        }
      } else {
        const wander = beast ? 4 : a.kind === 'guard' ? 1.8 : 1.15
        const offset = t * 0.13 + a.index * 2.4
        walk(
          a,
          a.home.x + Math.cos(offset) * wander,
          a.home.z + Math.sin(offset) * wander,
          a.kind === 'beast' ? 1.15 : 0.68,
          dt,
        )
      }
      m.position.set(a.pos.x, a.pos.y, a.pos.z)
      m.rotation.y = a.yaw
      a.model.update(dt, a.walking, a.swing > 0.29, t)
    }
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
            a !== training &&
            a.f.hp > 0 &&
            !a.angry &&
            length(a.pos, hero.pos) < 5 &&
            visible(a.pos, hero.pos),
        )
        .sort((a, b) => length(a.pos, hero.pos) - length(b.pos, hero.pos))[0]
    },
    speak(a) {
      return voices[id][a.index % 2]
    },
    startDuel(role, name) {
      if (training) this.endDuel()
      const p = hero.pos,
        front = heading(hero.yaw)
      let x = p.x + front.x * 7,
        z = p.z + front.z * 7
      if (!physics.clear(chest(p), { x, y: p.y + 1, z })) {
        x = p.x + 2
        z = p.z + 1
      }
      training = add('duelist', name || '巡线陪练', x, z, role, '陪练')
      training.angry = true
      training.think = 1.5
      return training
    },
    endDuel() {
      if (training) {
        training.model.dispose()
        all.splice(all.indexOf(training), 1)
        training = null
      }
    },
    peace() {
      for (const a of all) {
        a.angry = false
        a.alert = 0
        Object.assign(a.pos, a.home)
      }
      this.endDuel()
    },
    dispose() {
      for (const a of all) a.model.dispose()
      all.length = 0
    },
  }
}
