const replaceable = new Set(['move', 'state', 'loc'])
export function roomStream(deliver) {
  let nextEvent = 0,
    nextSnap = 0,
    received = 0,
    seq = 0,
    acknowledged = 0
  const pending = [],
    snaps = new Map(),
    seen = new Map()
  return {
    send(m) {
      if (replaceable.has(m.type)) snaps.set(m.type, [++nextSnap, m])
      else {
        if (pending.length >= 240) throw Error('对方长时间没有收到消息，请两人重新进入房间')
        pending.push([++nextEvent, m])
      }
    },
    packet() {
      return { seq: ++seq, ack: received, events: pending.slice(0, 40), snaps: [...snaps.values()] }
    },
    receive(f) {
      if (!f || !Array.isArray(f.events) || !Array.isArray(f.snaps)) return
      if (Number.isSafeInteger(f.ack) && f.ack > acknowledged && f.ack <= nextEvent) {
        acknowledged = f.ack
        while (pending.length && pending[0][0] <= acknowledged) pending.shift()
      }
      for (const [id, m] of f.events)
        if (id === received + 1) {
          received = id
          deliver(m)
        }
      for (const [id, m] of f.snaps)
        if (replaceable.has(m.type) && id > (seen.get(m.type) || 0)) {
          seen.set(m.type, id)
          deliver(m)
        }
    },
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function guestKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}
async function api(data, signal) {
  const abort = new AbortController()
  const cancel = () => abort.abort()
  if (signal?.aborted) cancel()
  signal?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(cancel, 9000)
  try {
    const r = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
      signal: abort.signal,
    })
    if (!r.headers.get('content-type')?.includes('json'))
      throw Error('房间服务未响应，请打开游戏的正式网页版')
    const result = await r.json()
    if (!r.ok) throw Object.assign(Error(result.error || '房间服务暂时不可用'), { status: r.status })
    return result
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}

// The HTTPS connection owns the game session. A data channel, when available,
// carries the very same numbered stream; either path can resume mid-round.
export function numberedRoom(invite, onStatus, onOpen, onClose, makePeer) {
  const host = !invite,
    controller = new AbortController()
  let room = invite?.trim().toUpperCase(),
    key = host ? null : guestKey(),
    session,
    paired = false,
    active = true
  let receiver = () => {},
    pc,
    channel = null,
    rtcTick = 0,
    pollTimer = 0,
    polling = false
  let gotDirect = 0,
    peerHears = false,
    lastPeer = 0,
    remoteSeq = 0,
    mode = 'server',
    taking = false,
    took = false,
    rtcUntil = 0
  const stream = roomStream((m) => receiver(m)),
    now = () => performance.now()
  const request = (op, extra = {}) => api({ op, room, key, session, ...extra }, controller.signal)
  const leavePage = () => finish('已离开房间')
  window.addEventListener('pagehide', leavePage)
  function finish(reason, announce = true) {
    if (!active) return
    active = false
    window.removeEventListener('pagehide', leavePage)
    clearTimeout(pollTimer)
    clearInterval(rtcTick)
    controller.abort()
    if (announce) {
      try {
        channel?.send({ bye: true })
      } catch {}
      if (key && room && (paired || host)) {
        const body = JSON.stringify({ op: paired ? 'leave' : 'cancel', key, room, session })
        fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      }
    }
    pc?.close()
    onClose(reason)
  }
  function acceptPacket(frame) {
    if (frame?.seq > remoteSeq) {
      remoteSeq = frame.seq
      lastPeer = now()
    }
    stream.receive(frame)
  }
  function isDirect() {
    return channel && peerHears && gotDirect && now() - gotDirect < 2200
  }
  function setMode() {
    const next = isDirect() ? 'direct' : 'server'
    if (next !== mode) {
      mode = next
      if (!active) return
      onStatus(room, mode === 'direct' ? '低延迟直连已接通' : '已切回服务器中转')
      if (mode === 'server' && !polling) {
        clearTimeout(pollTimer)
        pollTimer = setTimeout(exchange, 0)
      }
    }
  }
  function dropDirect() {
    channel = null
    peerHears = false
    gotDirect = 0
    setMode()
  }
  function optionalDirect() {
    if (typeof RTCPeerConnection !== 'function') return
    try {
      pc = makePeer(
        host,
        (link) => {
          if (!active) {
            link.close()
            return
          }
          channel = link
          link.listen((v) => {
            if (v?.bye) {
              finish('对方已离开房间', false)
              return
            }
            if (!v?.packet) return
            gotDirect = now()
            peerHears = v.hears === true
            acceptPacket(v.packet)
            setMode()
          })
        },
        dropDirect,
      )
      rtcUntil = now() + 26000
      if (host)
        pc.makeLocal()
          .then((description) => {
            if (active) return request('ice', { description })
          })
          .catch(() => {})
    } catch {
      pc = null
    }
  }
  async function acceptIce(description) {
    if (!description || !pc || taking || took || !active) return
    taking = true
    try {
      await pc.take(description)
      took = true
      if (!host) {
        const answer = await pc.makeLocal()
        if (active) await request('ice', { description: answer })
      }
    } catch {
      pc?.close()
    } finally {
      taking = false
    }
  }
  async function exchange() {
    if (!active || polling) return
    polling = true
    const start = now()
    try {
      const out = await request('exchange', {
        frame: stream.packet(),
        wantIce: !!pc && !took && !taking && start < rtcUntil,
      })
      if (!active) return
      if (out.closed) {
        finish('对方已离开房间', false)
        return
      }
      if (out.frame) acceptPacket(out.frame)
      if (out.description) void acceptIce(out.description)
    } catch (e) {
      if (!active) return
      if (e.status === 403 || e.status === 400 || (e.status === 404 && now() - lastPeer > 15000)) {
        finish(e.message)
        return
      }
    } finally {
      polling = false
    }
    if (now() - lastPeer > 45000) {
      finish('45 秒未收到好友的数据，请确认对方的网页仍打开，再重新建房')
      return
    }
    // Both players continue to publish while negotiating. Once direct is
    // healthy we only check in occasionally; a lost channel wakes this early.
    pollTimer = setTimeout(exchange, Math.max(20, (isDirect() ? 3200 : 220) - (now() - start)))
  }
  function play() {
    paired = true
    lastPeer = now()
    optionalDirect()
    const link = {
      host,
      get transport() {
        return mode
      },
      send(m) {
        if (active) {
          try {
            stream.send(m)
          } catch (e) {
            finish(e.message)
          }
        }
      },
      listen(fn) {
        receiver = fn
      },
      close: () => finish('已离开房间'),
    }
    onStatus(room, '服务器中转已接通')
    onOpen(link)
    rtcTick = setInterval(() => {
      if (!active || !channel) return
      try {
        channel.send({ packet: stream.packet(), hears: !!gotDirect && now() - gotDirect < 2200 })
      } catch {
        dropDirect()
      }
      setMode()
    }, 55)
    void exchange()
  }
  async function lobby() {
    const began = now()
    if (host) {
      const reserved = await request('reserve')
      room = reserved.room
      key = reserved.key
      session = reserved.session
    }
    if (!active) return
    onStatus(room, host ? '等待好友加入 · 房号 3 分钟内有效' : '正在等待房主确认连接')
    let knocked = host,
      failSince = 0
    while (active) {
      if (now() - began > 180000) throw Error('邀请已过期，请房主重新创建房间')
      try {
        const seat = await request(knocked ? 'seat' : 'knock')
        if (!active) return
        session = seat.session
        knocked = true
        failSince = 0
        if (seat.ready) {
          play()
          return
        }
      } catch (e) {
        if (!active) return
        if (!failSince) failSince = now()
        if ([400, 403, 409, 410].includes(e.status) || now() - failSince > 9000) throw e
      }
      await sleep(850)
    }
  }
  void lobby().catch((e) => {
    if (!active) return
    const unreachable = e.name === 'AbortError' || e instanceof TypeError
    finish(unreachable ? '联系不到游戏房间服务，请确认能打开正式站' : e.message)
  })
  return {
    close: () => finish('已离开房间'),
    get transport() {
      return paired ? mode : null
    },
  }
}
