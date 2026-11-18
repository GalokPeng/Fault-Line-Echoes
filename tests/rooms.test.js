import test from 'node:test'
import assert from 'node:assert/strict'
import { localCache, signaling } from '../server/signaling.js'

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
