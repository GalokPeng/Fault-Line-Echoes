import test from 'node:test'
import assert from 'node:assert/strict'
import { localCache, signaling } from '../server/signaling.js'
import { roomStream } from '../src/room-transport.js'

const description = (type) =>
  Buffer.from(
    JSON.stringify({ type, sdp: 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' }),
  ).toString('base64')
test('temporary room exchanges one offer and answer, and limits poll access to its host', async () => {
  const cache = localCache(),
    offer = description('offer'),
    answer = description('answer')
  const [status, { key, room }] = await signaling(cache, { op: 'create', offer })
  assert.equal(status, 200)
  assert.match(room, /^[A-Z2-9]{6}$/)
  assert.deepEqual(await signaling(cache, { op: 'join', room }), [200, { offer }])
  assert.equal((await signaling(cache, { op: 'poll', room, key: 'wrong' }))[0], 403)
  assert.deepEqual(await signaling(cache, { op: 'poll', room, key }), [200, { answer: null }])
  assert.equal((await signaling(cache, { op: 'answer', room, answer }))[0], 200)
  assert.deepEqual(await signaling(cache, { op: 'poll', room, key }), [200, { answer }])
  assert.equal((await signaling(cache, { op: 'join', room }))[0], 409)
  assert.equal((await signaling(cache, { op: 'create', offer: 'oversize'.repeat(20000) }))[0], 400)
})

test('a numbered room pairs two browsers without WebRTC, scopes the relay and reports peer departure', async () => {
  const cache = localCache(),
    call = (op, fields) => signaling(cache, { op, ...fields })
  const [, host] = await call('reserve'),
    guest = { room: host.room, key: 'a'.repeat(40) },
    third = { room: host.room, key: 'b'.repeat(40) }
  const [, knock] = await call('knock', guest)
  assert.equal(knock.ready, false)
  assert.equal((await call('seat', host))[1].ready, true)
  const [, admit] = await call('seat', guest)
  assert.equal(admit.session, host.session)
  assert.equal((await call('knock', third))[0], 409)
  const msg = { seq: 1, ack: 0, events: [[1, { type: 'hello' }]], snaps: [] }
  assert.equal((await call('exchange', { ...third, session: host.session, frame: msg }))[0], 403)
  const side = { ...guest, session: host.session }
  await call('exchange', { ...host, frame: msg })
  assert.deepEqual((await call('exchange', { ...side, frame: { ...msg, events: [] } }))[1].frame, msg)
  assert.equal((await call('ice', { ...side, description: description('offer') }))[0], 400)
  await call('ice', { ...host, description: description('offer') })
  assert.equal(
    (await call('exchange', { ...side, frame: msg, wantIce: true }))[1].description,
    description('offer'),
  )
  assert.equal(
    (await call('exchange', { ...side, frame: { ...msg, events: Array(41).fill(msg.events[0]) } }))[0],
    400,
  )
  await call('leave', side)
  assert.equal((await call('exchange', { ...host, frame: msg }))[1].closed, true)
  const [, another] = await call('reserve')
  await call('cancel', another)
  assert.equal((await call('knock', { ...guest, room: another.room }))[0], 410)
})
test('retries and switching paths deliver actions exactly once and keep the newest position', () => {
  const left = roomStream(() => {}),
    seen = [],
    right = roomStream((v) => seen.push(v))
  left.send({ type: 'act', key: 'q' })
  left.send({ type: 'move', x: 1 })
  const old = left.packet()
  left.send({ type: 'act', key: 'e' })
  left.send({ type: 'move', x: 5 })
  const last = left.packet()
  right.receive(last)
  right.receive(old)
  right.receive(last)
  assert.deepEqual(seen, [
    { type: 'act', key: 'q' },
    { type: 'act', key: 'e' },
    { type: 'move', x: 5 },
  ])
  left.receive(right.packet())
  assert.equal(left.packet().events.length, 0)
})
