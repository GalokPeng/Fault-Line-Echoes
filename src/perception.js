const rad = Math.PI / 180
export const raised = (p, height) => ({ x: p.x, y: p.y + height, z: p.z })
export const flatDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

// Character models face +Z. Camera yaw has a different convention and never enters this calculation.
export function sees(
  observer,
  point,
  clear,
  { range = 23, cone = 112, elevation = 57, targetEye = 1.24 } = {},
) {
  const eye = raised(observer.pos, observer.eye ?? 1.5),
    target = raised(point, targetEye)
  const dx = target.x - eye.x,
    dy = target.y - eye.y,
    dz = target.z - eye.z
  const horizontal = Math.hypot(dx, dz)
  if (
    Math.hypot(horizontal, dy) > range ||
    Math.abs(dy) > Math.max(0.72, horizontal * Math.tan(elevation * rad))
  )
    return false
  if (
    horizontal > 0.06 &&
    (Math.sin(observer.yaw) * dx + Math.cos(observer.yaw) * dz) / horizontal < Math.cos(cone * 0.5 * rad)
  )
    return false
  return clear(eye, target)
}
export function hears(observer, hero, clear) {
  if (hero.quiet || !(hero.noise > 0)) return false
  const ear = raised(observer.pos, observer.eye ?? 1.5),
    foot = raised(hero.pos, 0.16)
  const distance = Math.hypot(ear.x - foot.x, ear.y - foot.y, ear.z - foot.z)
  const reach = hero.noise * (observer.hearing ?? 1)
  if (distance > reach) return false
  return clear(ear, foot) || distance < reach * 0.39
}
export function swivel(yaw, target, step) {
  const difference = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw))
  return yaw + Math.sign(difference) * Math.min(Math.abs(difference), step)
}
