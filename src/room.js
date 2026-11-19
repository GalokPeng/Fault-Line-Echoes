import { fighter, recover, cast, hurt, rewardHit, heading, sight, roles, attackStyle } from './combat.js'
import { avatarLook, actionKeys } from './avatar.js'
import { launchVolley, advanceFlight, flightDisplay } from './perception-flight.js'
import { numberedRoom } from './room-transport.js'
export function connectRoom(invite, onStatus, onOpen, onClose) {
  return numberedRoom(invite, onStatus, onOpen, onClose, manualRoom)
}
const ice = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
export function manualRoom(host, onOpen, onClose) {
  const pc = new RTCPeerConnection(ice)
  let ended = false
  function close(msg = '已关闭直连') {
    if (ended) return
    ended = true
    pc.close()
    onClose(msg)
  }
  const attach = (ch) => {
    ch.onopen = () =>
      onOpen({
        host,
        send: (v) => {
          if (ch.readyState === 'open') ch.send(JSON.stringify(v))
        },
        listen: (fn) =>
          (ch.onmessage = (e) => {
            try {
              fn(JSON.parse(e.data))
            } catch {}
          }),
        close,
      })
    ch.onclose = () => close('直连已结束')
  }
  if (host) attach(pc.createDataChannel('faultline'))
  else pc.ondatachannel = (e) => attach(e.channel)
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed')
      close('手动直连未接通。双方打开正式网页版，使用六位房号即可通过服务器联机。')
  }
  async function makeLocal() {
    await pc.setLocalDescription(host ? await pc.createOffer() : await pc.createAnswer())
    if (pc.iceGatheringState !== 'complete')
      await new Promise((resolve) => {
        const timer = setTimeout(done, 4500)
        function done() {
          clearTimeout(timer)
          pc.removeEventListener('icegatheringstatechange', check)
          resolve()
        }
        function check() {
          if (pc.iceGatheringState === 'complete') done()
        }
        pc.addEventListener('icegatheringstatechange', check)
      })
    return btoa(JSON.stringify(pc.localDescription.toJSON()))
  }
  return {
    close,
    makeLocal,
    async take(text) {
      const s = JSON.parse(atob(text.trim()))
      if (s.type !== (host ? 'answer' : 'offer') || typeof s.sdp !== 'string')
        throw Error('连接码类型不匹配')
      await pc.setRemoteDescription(s)
    },
  }
}

export function match(link, hero, view, physics, onEvent) {
  let foe,
    remoteModel,
    acc = 0,
    recvTime = performance.now(),
    remoteYaw = 0,
    remotePitch = 0,
    movingFor = 0,
    phase = 'ready',
    delay = 0,
    round = 1,
    score = [0, 0],
    time = 90
  const spawn = (i) => ({ x: i ? -3 : 3, y: hero.origin.y, z: 11 })
  const localIndex = link.host ? 0 : 1,
    otherIndex = 1 - localIndex
  const waves = [],
    display = flightDisplay(view.scene)
  let volleyId = 0
  function clearWaves() {
    waves.length = 0
    display.clear()
  }
  function emitWave(id, i, from, dir, spec) {
    for (const p of launchVolley(from, dir, spec)) {
      p.id = id
      p.i = i
      p.spec = spec
      display.add(p, i !== localIndex)
      waves.push(p)
    }
  }
  function tickWaves(dt) {
    for (let j = waves.length - 1; j >= 0; j--) {
      const p = waves[j],
        own = p.i === localIndex,
        attacker = own ? hero : foe,
        defender = own ? foe : hero
      const center = { ...defender.pos, y: defender.pos.y + (defender.crouch ? 0.74 : 1.12) }
      const bodies = link.host ? [{ actor: defender, center, radius: 0.68 }] : []
      const target = advanceFlight(p, dt, physics.clear, bodies)
      if (target) {
        const front = heading(own ? remoteYaw : hero.yaw),
          v = defender.pos
        const dmg = hurt(
          defender.f,
          p.spec.dmg,
          front.x * (p.origin.x - v.x) + front.z * (p.origin.z - v.z) > 0,
        )
        defender.f.hp = Math.max(0, defender.f.hp - dmg)
        rewardHit(attacker.f, p.spec, p.traveled)
      }
      display.sync(p)
      if (p.done) {
        waves.splice(j, 1)
        if (link.host) link.send({ type: 'wave-stop', id: p.id, band: p.bandId })
      }
      if (target && !defender.f.hp) {
        finish(p.i)
        return
      }
    }
  }
  function reset() {
    clearWaves()
    hero.f = fighter(hero.f.role)
    if (foe) foe.f = fighter(foe.f.role)
    const p = spawn(localIndex)
    physics.teleport(p.x, p.y, p.z)
    hero.pos = physics.feet()
    if (foe) foe.pos = spawn(otherIndex)
    phase = 'fight'
    time = 90
    onEvent('第 ' + round + ' 局 · 对战开始')
  }
  function finish(winner) {
    if (phase !== 'fight' || !link.host) return
    clearWaves()
    if (winner >= 0) score[winner]++
    phase = score.some((v) => v >= 2) ? 'end' : 'interval'
    delay = 2.2
    const message =
      (winner < 0 ? '平局' : winner === localIndex ? '你赢下此局' : '对手赢下此局') +
      ' · ' +
      score.join(' / ')
    onEvent(message)
    link.send({ type: 'result', phase, score, winner })
  }
  function attack(i, key) {
    if (!link.host || !foe || phase !== 'fight') return
    const own = i === localIndex,
      attacker = own ? hero : foe,
      defender = own ? foe : hero
    const spec = cast(attacker.f, key)
    if (!spec) return
    if (own) view.punch(spec)
    else remoteModel.perform?.(key)
    const dir = heading(own ? hero.yaw : remoteYaw, own ? hero.pitch : remotePitch),
      from = (own && view.aimOrigin?.()) || {
        ...attacker.pos,
        y: attacker.pos.y + (attacker.crouch ? 1.08 : 1.64),
      },
      to = { ...defender.pos, y: defender.pos.y + (defender.crouch ? 0.74 : 1.12) }
    if (spec.flight) {
      const id = ++volleyId
      emitWave(id, i, from, dir, spec)
      link.send({ type: 'wave', id, i, key, from, dir })
      return
    }
    link.send({ type: 'stroke', i, key })
    const range = spec.shot || spec.dist,
      hit = sight(from, dir, to, range, spec.shot ? 0.87 : 1.15)
    if (spec.shot)
      view.effect(
        from,
        Number.isFinite(hit)
          ? to
          : { x: from.x + dir.x * range, y: from.y + dir.y * range, z: from.z + dir.z * range },
      )
    if (Number.isFinite(hit) && physics.clear(from, to)) {
      const front = heading(own ? remoteYaw : hero.yaw),
        v = defender.pos
      const damage = hurt(
        defender.f,
        spec.dmg * (spec.burst || 1),
        front.x * (attacker.pos.x - v.x) + front.z * (attacker.pos.z - v.z) > 0,
      )
      defender.f.hp = Math.max(0, defender.f.hp - damage)
      rewardHit(attacker.f, spec, hit)
      if (!defender.f.hp) finish(i)
    }
  }
  function hello() {
    link.send({ type: 'hello', role: hero.f.role, skin: hero.skin, color: hero.color })
  }
  link.listen((m) => {
    if (!m || typeof m !== 'object') return
    if (m.type === 'hello' && !foe) {
      const role = Object.hasOwn(roles, m.role) ? m.role : 'leaf'
      foe = { pos: spawn(otherIndex), f: fighter(role) }
      remoteModel = view.actor('player', hero.world, avatarLook(role, m.skin || m.color))
      hello()
      reset()
      return
    }
    if (!foe) return
    if (
      !link.host &&
      phase === 'fight' &&
      m.type === 'wave' &&
      Number.isSafeInteger(m.id) &&
      [0, 1].includes(m.i) &&
      [m.from, m.dir].every((v) => v && [v.x, v.y, v.z].every(Number.isFinite)) &&
      waves.length < 30
    ) {
      const own = m.i === localIndex
      const spec = attackStyle(own ? hero.f.role : foe.f.role, m.key || 'e')
      if (!spec?.flight) return
      if (own) view.punch(spec)
      else remoteModel.perform?.(spec.key)
      emitWave(m.id, m.i, m.from, m.dir, spec)
    }
    if (
      !link.host &&
      phase === 'fight' &&
      m.type === 'stroke' &&
      [0, 1].includes(m.i) &&
      actionKeys.includes(m.key)
    ) {
      if (m.i === localIndex) view.punch(attackStyle(hero.f.role, m.key))
      else remoteModel.perform?.(m.key)
    }
    if (!link.host && m.type === 'wave-stop') {
      const index = waves.findIndex((p) => p.id === m.id && p.bandId === m.band)
      if (index >= 0) {
        const [p] = waves.splice(index, 1)
        p.done = true
        display.sync(p)
      }
    }
    if (m.type === 'move' && Array.isArray(m.p) && m.p.length === 5 && m.p.every(Number.isFinite)) {
      const now = performance.now(),
        dt = Math.min(link.transport === 'server' ? 2 : 0.35, Math.max(0.015, (now - recvTime) / 1000))
      recvTime = now
      const [x, y, z, yaw, pitch] = m.p,
        d = Math.hypot(x - foe.pos.x, z - foe.pos.z),
        limit = 12 * dt + 0.34
      if (
        !link.host ||
        (d <= limit &&
          Math.abs(y - foe.pos.y) <= Math.max(1.1, 18 * dt) &&
          physics.clear({ ...foe.pos, y: foe.pos.y + 0.87 }, { x, y: y + 0.87, z }))
      ) {
        if (d > 0.015) movingFor = 0.17
        foe.pos = { x, y, z }
      }
      remoteYaw = yaw
      remotePitch = pitch
      foe.f.guard = Boolean(m.guard)
      foe.crouch = !!m.crouch
    }
    if (link.host && m.type === 'act' && actionKeys.includes(m.key)) {
      if (Number.isFinite(m.yaw) && Number.isFinite(m.pitch)) {
        remoteYaw = m.yaw
        remotePitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, m.pitch))
      }
      attack(otherIndex, m.key)
    }
    if (!link.host && m.type === 'state' && Array.isArray(m.players)) {
      Object.assign(hero.f, m.players[1])
      Object.assign(foe.f, m.players[0])
      time = m.time
    }
    if (!link.host && m.type === 'result') {
      clearWaves()
      phase = m.phase
      score = m.score
      onEvent(
        (m.winner === 1 ? '你赢下此局' : m.winner === 0 ? '对手赢下此局' : '平局') +
          ' · ' +
          score.join(' / '),
      )
    }
    if (!link.host && m.type === 'reset') {
      round = m.round
      reset()
    }
  })
  hello()
  return {
    get phase() {
      return phase
    },
    get score() {
      return score
    },
    get time() {
      return time
    },
    get round() {
      return round
    },
    cast(key) {
      if (phase !== 'fight') return
      if (link.host) attack(localIndex, key)
      else link.send({ type: 'act', key, yaw: hero.yaw, pitch: hero.pitch })
    },
    update(dt) {
      if (!foe) {
        acc += dt
        if (acc > 0.6) {
          acc = 0
          hello()
        }
        return
      }
      if (link.host) {
        recover(hero.f, dt)
        recover(foe.f, dt)
        if (phase === 'fight' && (time -= dt) <= 0)
          finish(hero.f.hp === foe.f.hp ? -1 : hero.f.hp > foe.f.hp ? 0 : 1)
        if (phase === 'interval' && (delay -= dt) <= 0) {
          round++
          reset()
          link.send({ type: 'reset', round })
        }
      }
      if (phase === 'fight' && waves.length) tickWaves(dt)
      remoteModel.group.position.set(foe.pos.x, foe.pos.y, foe.pos.z)
      remoteModel.group.rotation.y = remoteYaw + Math.PI
      movingFor = Math.max(0, movingFor - dt)
      remoteModel.update(
        dt,
        movingFor > 0,
        false,
        undefined,
        foe.f.guard ? { type: 'guard', progress: 0.5 } : undefined,
      )
      acc += dt
      if (acc < 0.055) return
      acc = 0
      link.send({
        type: 'move',
        p: [hero.pos.x, hero.pos.y, hero.pos.z, hero.yaw, hero.pitch],
        guard: hero.f.guard,
        crouch: hero.crouch,
      })
      if (link.host)
        link.send({
          type: 'state',
          players: [hero.f, foe.f].map(({ hp, stamina, charge, cd, busy }) => ({
            hp,
            stamina,
            charge,
            cd,
            busy,
          })),
          time,
        })
    },
    close() {
      clearWaves()
      display.dispose()
      remoteModel?.dispose()
      link.close()
    },
  }
}
