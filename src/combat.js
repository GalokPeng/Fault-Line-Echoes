export const roles = {
  leaf: {
    name: '叶岚',
    type: '机动近战',
    color: '#80a991',
    skills: ['穿步', '折返', '余波掌', '断线'],
    passive: '疾行后首击积蓄额外回响',
    speed: 6.1,
  },
  stone: {
    name: '许砾',
    type: '防反近战',
    color: '#cfa06d',
    skills: ['沉肩', '拨流', '震台', '合闸'],
    passive: '成功格挡返还耐力',
    speed: 5.5,
  },
  tide: {
    name: '顾潮',
    type: '远程压制',
    color: '#79abbd',
    skills: ['直脉', '折浪', '退声', '三拍'],
    passive: '远距命中积蓄额外回响',
    speed: 5.6,
  },
  beam: {
    name: '陆衡',
    type: '中距控线',
    color: '#b8a5cc',
    skills: ['扇潮', '回折', '锚步', '槽涌'],
    passive: '技能衔接普通攻击加深硬直',
    speed: 5.8,
  },
}
// Distance in metres, time in seconds. A cast never writes the camera orientation.
const kits = {
  leaf: [
    { dash: 12, dist: 3.5, dmg: 12 },
    { dash: -7, dist: 3.2, dmg: 15 },
    { shot: 21, dmg: 17 },
    { dash: 14, dist: 4.5, dmg: 48 },
  ],
  stone: [
    { dash: 8, dist: 3.9, dmg: 20 },
    { parry: 1.15, dist: 2.8, dmg: 10 },
    { shot: 12, dmg: 23 },
    { dist: 5, dmg: 58 },
  ],
  tide: [
    { shot: 38, dmg: 21 },
    { shot: 30, dmg: 24, spread: 0.055 },
    { dash: -12, shot: 15, dmg: 13 },
    { shot: 42, dmg: 19, burst: 3 },
  ],
  beam: [
    { shot: 18, dmg: 16, spread: 0.16 },
    { shot: 25, dmg: 22 },
    { dash: 9, dist: 3, dmg: 12 },
    { shot: 34, dmg: 33, spread: 0.1 },
  ],
}
export const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
export function fighter(role = 'leaf') {
  return {
    role,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    charge: 0,
    combo: 0,
    chain: 0,
    busy: 0,
    cd: [0, 0, 0, 0],
    guard: false,
    parry: 0,
    dash: 0,
    dashSpeed: 0,
    boost: 0,
    stun: 0,
  }
}
export function recover(f, dt) {
  for (const k of ['chain', 'busy', 'parry', 'dash', 'boost', 'stun']) f[k] = Math.max(0, f[k] - dt)
  f.cd = f.cd.map((v) => Math.max(0, v - dt))
  f.stamina = Math.min(100, Math.max(0, f.stamina + (f.guard ? 1.5 : 14) * dt))
}
export function cast(f, key) {
  if (f.hp <= 0 || f.busy > 0.001 || f.stun > 0) return null
  const ix = ['q', 'e', 'c', 'v'].indexOf(key)
  let spec
  if (ix >= 0) {
    if (f.cd[ix] > 0 || (ix === 3 && f.charge < 99.99) || f.stamina < 6) return null
    spec = { ...kits[f.role][ix], name: roles[f.role].skills[ix], skill: true }
    f.cd[ix] = [3.5, 5, 4.8, 10][ix]
    if (ix === 3) f.charge = 0
    f.parry = spec.parry || 0
    f.stamina -= 6
    f.busy = 0.36
  } else {
    const heavy = key === 'heavy'
    if (f.stamina < (heavy ? 11 : 4)) return null
    f.combo = f.chain > 0 ? (f.combo % 3) + 1 : 1
    f.chain = 0.94
    spec = {
      name: heavy ? '重击' : ['', '起手', '接掌', '三连'][f.combo],
      dist: heavy ? 3.35 : 3,
      dmg: (heavy ? 20 : 11) + (f.combo === 3 ? 7 : 0),
    }
    f.stamina -= heavy ? 11 : 4
    f.busy = heavy ? 0.46 : 0.25
  }
  if (spec.dash) {
    f.dash = 0.27
    f.dashSpeed = spec.dash
    f.boost = 0.75
  }
  f.guard = false
  return spec
}
export function hurt(target, amount, frontal = true) {
  if (frontal && (target.guard || target.parry > 0) && target.stamina >= 8) {
    target.stamina -= target.role === 'stone' ? 4 : 9
    target.charge = Math.min(100, target.charge + 7)
    return target.parry > 0 ? 0 : Math.round(amount * 0.16)
  }
  return Math.round(amount)
}
export function rewardHit(f, spec, distance) {
  const extra = (f.role === 'leaf' && f.boost > 0) || (f.role === 'tide' && distance > 9)
  f.charge = Math.min(100, f.charge + (spec.skill ? 11 : 9) + (extra ? 6 : 0))
}
export function noticeAttack(target, all, canSee) {
  target.angry = true
  target.alert = 22
  if (target.kind === 'resident' || target.kind === 'guard') {
    for (const witness of all)
      if (
        witness.kind === 'guard' &&
        witness.f.hp > 0 &&
        length(witness.pos, target.pos) < 28 &&
        canSee(witness.pos, target.pos)
      ) {
        witness.angry = true
        witness.alert = 26
      }
  }
}
export function heading(yaw, pitch = 0) {
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
}
export function sight(from, dir, point, reach, radius = 0.7) {
  const x = point.x - from.x,
    y = point.y - from.y,
    z = point.z - from.z
  const t = x * dir.x + y * dir.y + z * dir.z
  return t >= 0 && t <= reach && x * x + y * y + z * z - t * t <= radius * radius ? t : Infinity
}
