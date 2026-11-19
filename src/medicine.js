import { ferrySite } from './ferry-site.js'
export { ferrySite } from './ferry-site.js'
import { riverX, waterAt } from './biomes.js'
import { addItem } from './expedition.js'

export const medicineTitle = '雨后的药箱'
export function medicineState(save, pack) {
  const field = (save.field ??= {})
  const q = (field.medicine ??= { phase: 'offered', route: null, bound: false, recovered: false })
  if (q.phase === 'carried') pack.items.medicineCase = 1
  else delete pack.items.medicineCase
  return q
}
const answer = (ok, message) => ({ ok, message })
export function acceptCase(q, pack) {
  if (q.phase !== 'offered') return answer(false, '这趟委托已记在手记里。')
  const result = addItem(pack, 'medicineCase')
  if (!result.ok) return result
  q.phase = 'carried'
  return answer(true, '已接下药箱。出西门，到青雨林浅汊渡口看水尺。')
}
export function putCaseDown(q, zone, pos) {
  const w = waterAt(zone, pos.x, pos.z)
  const floating = w.wet && pos.y <= w.level + 0.18
  q.phase = floating ? 'floating' : 'ground'
  q.zone = zone
  q.point = { ...pos, y: floating ? w.level : pos.y }
  q.stopZ = Math.min(pos.z + 42, zone === 'capital' ? 744 : 605)
  q.stranded = false
  return floating
    ? '药箱滑入水中！沿岸追那条朱红色系带，靠近按 R 捞回。'
    : '药箱已放在脚边，位置记入手记。'
}
export function pickUpCase(q, pack) {
  if (!['ground', 'floating'].includes(q.phase)) return answer(false, '药箱已经收好。')
  const result = addItem(pack, 'medicineCase')
  if (!result.ok) return result
  if (q.phase === 'floating') {
    q.recovered = true
    q.bound = true
  }
  q.phase = 'carried'
  delete q.point
  delete q.zone
  return answer(
    true,
    q.recovered ? '已捞回药箱，把湿系带绕了两圈。可以继续交给渡工。' : '已重新背起药箱。',
  )
}
// Advect in the same world-space current used by the swimmer. In the last
// metres the tether catches at a shallow bank; the case cannot leave the map.
function drift(q, dt) {
  if (q.stranded) return
  const p = q.point,
    w = waterAt(q.zone, p.x, p.z)
  if (!w.wet || w.speed < 0.02) {
    q.stranded = true
    return
  }
  const remain = q.stopZ - p.z
  const nudge = remain < 16 ? Math.max(0, Math.min(1, (16 - remain) / 13)) : 0
  const x = p.x + (w.flowX * w.speed + 1.15 * nudge) * dt
  const z = p.z + w.flowZ * w.speed * (1 - 0.87 * nudge) * dt
  const next = waterAt(q.zone, x, z)
  if (!next.wet || next.depth < 0.13) {
    q.stranded = true
    return
  }
  Object.assign(p, { x, y: next.level, z })
}
export function stepCase(q, pack, zone, pos, immersed, dt) {
  if (q.phase === 'floating' && q.zone === zone) drift(q, dt)
  if (q.phase !== 'carried' || zone !== 'rain') return ''
  const s = ferrySite()
  if (Math.hypot(pos.x - s.fork.x, pos.z - s.fork.z) < 11) q.sawFork = true
  const inBridge =
    Math.abs(pos.z - s.bridge.z) < 2.25 &&
    pos.y >= s.bridge.y - 0.27 &&
    pos.x >= s.west - 1 &&
    pos.x <= s.east + 1
  if (inBridge && pos.x < s.bridge.x) q.enteredBridge = true
  const atFord = Math.abs(pos.z - s.ford.z) < 34 && Math.abs(pos.x - riverX('rain', pos.z)) < 12
  if (inBridge && Math.abs(pos.x - s.bridge.x) < 8) {
    q.crossing = 'ridge'
    q.sawFork = true
  }
  if (atFord) {
    q.crossing = 'ford'
    q.sawFork = true
  }
  if (!q.route && q.crossing === 'ridge' && inBridge && pos.x >= s.east - 1.7) q.route = 'ridge'
  if (
    !q.route &&
    q.crossing === 'ford' &&
    Math.abs(pos.z - s.ford.z) < 96 &&
    pos.x > riverX('rain', pos.z) + 16
  )
    q.route = 'ford'
  if (immersed && !q.bound && pack.items.medicineCase) {
    delete pack.items.medicineCase
    return putCaseDown(q, zone, pos)
  }
  return ''
}
export function deliverCase(q, pack, save, zone, pos) {
  if (q.phase === 'done') return answer(false, '渡工已经签收了。')
  if (q.phase !== 'carried' || !pack.items.medicineCase) return answer(false, '先把那只油布药箱带回来。')
  const dock = ferrySite().boatman
  if (zone !== 'rain' || !pos || Math.hypot(pos.x - dock.x, pos.y - dock.y, pos.z - dock.z) > 5)
    return answer(false, '任舟在浅汊东岸的渡棚等你。')
  if (!q.route) q.route = q.recovered || q.crossing === 'ford' ? 'ford' : 'bank'
  delete pack.items.medicineCase
  q.phase = 'done'
  pack.currency += 8
  const token = q.recovered ? '回水湾草图' : '渡工的水尺签'
  if (!save.items.includes(token)) save.items.push(token)
  return answer(true, '渡工签收了药箱。获得 8 行券和「' + token + '」。')
}
export function caseObjective(q, zone) {
  if (q.phase === 'done' || q.phase === 'offered') return null
  if (q.phase === 'ground' || q.phase === 'floating')
    return {
      zone: q.zone,
      p: q.point,
      title:
        q.phase === 'ground'
          ? '找回放下的药箱'
          : q.stranded
            ? '到搁浅处捞回药箱'
            : '沿水流追回朱红系带的药箱',
    }
  const s = ferrySite()
  if (q.route || q.recovered) return { zone: 'rain', p: s.boatman, title: '把药箱交给渡工任舟' }
  if (q.sawFork && q.prefer === 'ridge')
    return {
      zone: 'rain',
      p: { ...s.bridge, x: q.enteredBridge ? s.east : s.west },
      title: '沿高岸木桥过河',
    }
  if (q.sawFork)
    return {
      zone: 'rain',
      p: q.crossing ? s.boatman : s.ford,
      title: q.crossing ? '过到对岸找任舟' : '踩浅滩石脊，或绕上游高桥',
    }
  return {
    zone: 'rain',
    p: s.fork,
    title: zone === 'capital' ? '从西门前往青雨林' : '找到渡口的红白水尺',
  }
}
