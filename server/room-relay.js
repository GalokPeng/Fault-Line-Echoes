import { createHash, randomBytes } from 'node:crypto'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const lobbyTTL = 180,
  sessionTTL = 6 * 3600
const token = () => randomBytes(20).toString('hex')
const digest = (value) => createHash('sha256').update(value).digest('hex')
const valid = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const bad = (code, error) => [code, { error }]
const ok = (data) => [200, data]
const snapshots = new Set(['loc', 'move', 'state'])
function validFrame(f) {
  if (!f || !Number.isSafeInteger(f.seq) || f.seq < 1 || !Number.isSafeInteger(f.ack) || f.ack < 0)
    return false
  if (!Array.isArray(f.events) || f.events.length > 40 || !Array.isArray(f.snaps) || f.snaps.length > 3)
    return false
  const entry = (e) =>
    Array.isArray(e) &&
    e.length === 2 &&
    Number.isSafeInteger(e[0]) &&
    e[0] > 0 &&
    e[1] &&
    typeof e[1] === 'object' &&
    !Array.isArray(e[1])
  return (
    f.events.every(entry) &&
    f.snaps.every((e) => entry(e) && snapshots.has(e[1].type)) &&
    JSON.stringify(f).length <= 24000
  )
}

export async function relayRoom(cache, i, validDescription) {
  const { op, room, key, session } = i
  if (op === 'reserve') {
    for (let tries = 0; tries < 4; tries++) {
      const code = Array.from(randomBytes(6), (b) => alphabet[b % 32]).join('')
      if (await cache.get('invite-' + code)) continue
      const host = token(),
        session = token()
      await cache.set('invite-' + code, { version: 2, session, host: digest(host) }, { ttl: lobbyTTL })
      return ok({ room: code, key: host, session })
    }
    return bad(503, '暂时无法分配房号，请重试')
  }
  if (!valid(key)) return bad(403, '房间凭证无效')
  if (['knock', 'seat', 'cancel'].includes(op)) {
    if (typeof room !== 'string' || !new RegExp('^[' + alphabet + ']{6}$').test(room))
      return bad(400, '请输入六位房号')
    const lobby = await cache.get('invite-' + room)
    if (!lobby) return bad(404, '房号不存在或邀请已过期，请核对房号')
    if (lobby.version !== 2) return bad(409, '房主使用旧版游戏，请双方刷新后重新建房')
    const actor = digest(key),
      host = actor === lobby.host,
      id = lobby.session
    const [paired, cancelled] = await Promise.all([cache.get('pair-' + id), cache.get('cancel-' + id)])
    if (cancelled) return bad(410, '房主已取消邀请')
    if (op === 'cancel') {
      if (!host) return bad(403, '房间凭证无效')
      await cache.set('cancel-' + id, true, { ttl: lobbyTTL })
      return ok({})
    }
    if (paired) {
      if (!host && actor !== paired.guest) return bad(409, '房间已有两名玩家')
      return ok({ session: id, ready: true })
    }
    if (op === 'knock') {
      await cache.set('arrival-' + id, actor, { ttl: lobbyTTL })
    } else if (host) {
      const guest = await cache.get('arrival-' + id)
      if (guest) {
        await cache.set('pair-' + id, { host: lobby.host, guest }, { ttl: sessionTTL })
        return ok({ session: id, ready: true })
      }
    }
    return ok({ session: id, ready: false })
  }
  if (!valid(session)) return bad(400, '无效的连接')
  const pair = await cache.get('pair-' + session)
  if (!pair) return bad(404, '会话已失效，请重新创建房间')
  const actor = digest(key),
    side = actor === pair.host ? 'h' : actor === pair.guest ? 'g' : null
  if (!side) return bad(403, '房间凭证无效')
  const peer = side === 'h' ? 'g' : 'h'
  const mailbox = (kind, who) => kind + '-' + session + '-' + who
  if (op === 'leave') {
    await cache.set(mailbox('left', side), true, { ttl: 180 })
    return ok({})
  }
  if (op === 'ice') {
    if (!validDescription(i.description, side === 'h' ? 'offer' : 'answer'))
      return bad(400, '连接描述无效')
    await cache.set(mailbox('ice', side), i.description, { ttl: 90 })
    return ok({})
  }
  if (op !== 'exchange' || !validFrame(i.frame)) return bad(400, '无效的同步消息')
  // One writer per mailbox. Each publication includes all unacknowledged
  // commands, so overwriting or evicting a transient copy does not lose them.
  const [, frame, closed, description] = await Promise.all([
    cache.set(mailbox('stream', side), i.frame, { ttl: 90 }),
    cache.get(mailbox('stream', peer)),
    cache.get(mailbox('left', peer)),
    i.wantIce ? cache.get(mailbox('ice', peer)) : null,
  ])
  return ok({ frame: frame || null, closed: !!closed, description: description || null })
}
