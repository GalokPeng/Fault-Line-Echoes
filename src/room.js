import { fighter, recover, cast, hurt, rewardHit, heading, sight, roles } from './combat.js'
export async function connectRoom(invite, onStatus, onOpen, onClose) {
  const host = !invite
  let active = true,
    timer = 0
  const controller = new AbortController()
  const wire = manualRoom(
    host,
    (link) => {
      clearTimeout(timer)
      if (active) onOpen(link)
    },
    (reason) => {
      if (active) {
        active = false
        clearTimeout(timer)
        controller.abort()
        onClose(reason)
      }
    },
  )
  const close = () => {
    if (active) wire.close()
  }
  async function api(op, fields) {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, ...fields }),
      signal: controller.signal,
    })
    if (!response.headers.get('content-type')?.includes('json'))
      throw Error('当前静态站点可使用手动直连')
    const data = await response.json()
    if (!response.ok) throw Error(data.error || '房间服务暂时不可用')
    return data
  }
  async function start() {
    if (host) {
      const offer = await wire.makeLocal()
      if (!active) return
      const { room, key } = await api('create', { offer })
      onStatus(room, '等待另一名行者加入')
      const expires = Date.now() + 160000
      async function poll() {
        if (!active) return
        try {
          if (Date.now() > expires) throw Error('房号已过期，请重新创建')
          const { answer } = await api('poll', { room, key })
          if (answer) {
            onStatus(room, '正在建立点对点连接')
            await wire.take(answer)
            return
          }
          timer = setTimeout(poll, 1850)
        } catch (e) {
          if (active) wire.close(e.message)
        }
      }
      await poll()
    } else {
      const room = invite.trim().toUpperCase(),
        { offer } = await api('join', { room })
      onStatus(room, '正在连接房主')
      await wire.take(offer)
      const answer = await wire.makeLocal()
      if (active) await api('answer', { room, answer })
    }
  }
  start().catch((e) => {
    if (active) wire.close(e.message)
  })
  return { close }
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
    if (pc.connectionState === 'failed') close('直连失败，请检查两端网络')
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
    phase = 'ready',
    delay = 0,
    round = 1,
    score = [0, 0],
    time = 90
  const spawn = (i) => ({ x: i ? -3 : 3, y: hero.origin.y, z: 11 })
  const localIndex = link.host ? 0 : 1,
    otherIndex = 1 - localIndex
  function reset() {
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
    const dir = heading(own ? hero.yaw : remoteYaw, own ? hero.pitch : remotePitch),
      from = { ...attacker.pos, y: attacker.pos.y + 1.54 },
      to = { ...defender.pos, y: defender.pos.y + 1.16 }
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
    link.send({ type: 'hello', role: hero.f.role, color: hero.color })
  }
  link.listen((m) => {
    if (!m || typeof m !== 'object') return
    if (m.type === 'hello' && !foe) {
      const role = Object.hasOwn(roles, m.role) ? m.role : 'leaf',
        color = /^#[a-f\d]{6}$/i.test(m.color) ? m.color : roles[role].color
      foe = { pos: spawn(otherIndex), f: fighter(role) }
      remoteModel = view.actor('player', hero.world, color)
      hello()
      reset()
      return
    }
    if (!foe) return
    if (m.type === 'move' && Array.isArray(m.p) && m.p.length === 5 && m.p.every(Number.isFinite)) {
      const now = performance.now(),
        dt = Math.min(0.35, Math.max(0.015, (now - recvTime) / 1000))
      recvTime = now
      const [x, y, z, yaw, pitch] = m.p,
        d = Math.hypot(x - foe.pos.x, z - foe.pos.z),
        limit = 12 * dt + 0.34
      if (
        !link.host ||
        (d <= limit &&
          Math.abs(y - foe.pos.y) <= Math.max(1.1, 18 * dt) &&
          physics.clear({ ...foe.pos, y: foe.pos.y + 0.87 }, { x, y: y + 0.87, z }))
      )
        foe.pos = { x, y, z }
      remoteYaw = yaw
      remotePitch = pitch
      foe.f.guard = Boolean(m.guard)
    }
    if (link.host && m.type === 'act' && ['light', 'heavy', 'q', 'e', 'c', 'v'].includes(m.key))
      attack(otherIndex, m.key)
    if (!link.host && m.type === 'state' && Array.isArray(m.players)) {
      Object.assign(hero.f, m.players[1])
      Object.assign(foe.f, m.players[0])
      time = m.time
    }
    if (!link.host && m.type === 'result') {
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
      else link.send({ type: 'act', key })
      view.punch()
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
      remoteModel.group.position.set(foe.pos.x, foe.pos.y, foe.pos.z)
      remoteModel.group.rotation.y = remoteYaw + Math.PI
      remoteModel.update(dt, false, false)
      acc += dt
      if (acc < 0.055) return
      acc = 0
      link.send({
        type: 'move',
        p: [hero.pos.x, hero.pos.y, hero.pos.z, hero.yaw, hero.pitch],
        guard: hero.f.guard,
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
      remoteModel?.dispose()
      link.close()
    },
  }
}
