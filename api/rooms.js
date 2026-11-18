import { getCache } from '@vercel/functions'
import { handleRooms } from '../server/signaling.js'

export default function rooms(req, res) {
  return handleRooms(getCache({ namespace: 'four-regions-signal-v1' }))(req, res)
}
