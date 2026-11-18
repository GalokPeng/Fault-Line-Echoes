import { randomBytes, timingSafeEqual } from 'node:crypto'
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ttl = 180
function validDescription(value, type) {
  if (typeof value !== 'string' || value.length > 48000) return false
  try {
    const signal = JSON.parse(Buffer.from(value, 'base64').toString('utf8'))
    return (
      signal.type === type &&
      typeof signal.sdp === 'string' &&
      signal.sdp.startsWith('v=0') &&
      signal.sdp.includes('m=application')
    )
  } catch {
    return false
  }
}
export function localCache() {
  const map = new Map()
  return {
    async get(k) {
      const e = map.get(k)
      if (e && e.expires > Date.now()) return e.value
      map.delete(k)
      return null
    },
    async set(k, value) {
      if (map.size > 1600) {
        for (const [id, v] of map) if (v.expires < Date.now()) map.delete(id)
        if (map.size > 1600) map.delete(map.keys().next().value)
      }
      map.set(k, { value, expires: Date.now() + ttl * 1000 })
    },
  }
}
export async function signaling(cache, input) {
  const { op, room, key, offer, answer } = input || {},
    ok = (v) => [200, v],
    error = (status, message) => [status, { error: message }]
  if (op === 'create') {
    if (!validDescription(offer, 'offer')) return error(400, '邀请码无效')
    let id
    for (let i = 0; i < 4; i++) {
      id = Array.from(randomBytes(6), (b) => alphabet[b % 32]).join('')
      if (!(await cache.get('invite-' + id))) break
      id = null
    }
    if (!id) return error(503, '稍后再试')
    const secret = randomBytes(18).toString('hex')
    await cache.set('invite-' + id, { offer, secret }, { ttl })
    return ok({ room: id, key: secret })
  }
  if (typeof room !== 'string' || !/^[A-HJ-NP-Z2-9]{6}$/.test(room))
    return error(400, '房号为六位字母或数字')
  const record = await cache.get('invite-' + room)
  if (!record) return error(404, '房间不存在或已过期')
  if (op === 'poll') {
    if (
      typeof key !== 'string' ||
      !/^[a-f0-9]{36}$/.test(key) ||
      !timingSafeEqual(Buffer.from(record.secret), Buffer.from(key))
    )
      return error(403, '房主凭证无效')
    return ok({ answer: (await cache.get('answer-' + room)) || null })
  }
  if (await cache.get('answer-' + room)) return error(409, '房间已满')
  if (op === 'join') return ok({ offer: record.offer })
  if (op === 'answer' && validDescription(answer, 'answer')) {
    await cache.set('answer-' + room, answer, { ttl })
    return ok({ joined: true })
  }
  return error(400, '连接请求无效')
}
export function handleRooms(cache) {
  return async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    const reply = (status, body) => {
      res.statusCode = status
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'POST') return reply(405, { error: '需要 POST' })
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host)
          return reply(403, { error: '来源无效' })
      } catch {
        return reply(400, { error: '来源无效' })
      }
    }
    try {
      let body = req.body
      if (body === undefined) {
        const chunks = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 52000) return reply(413, { error: '请求过长' })
          chunks.push(chunk)
        }
        body = Buffer.concat(chunks).toString('utf8')
      }
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch {
          return reply(400, { error: '无效的请求' })
        }
      }
      const [status, result] = await signaling(cache, body)
      reply(status, result)
    } catch {
      return reply(503, { error: '房间服务暂时不可用，可使用手动直连' })
    }
  }
}
