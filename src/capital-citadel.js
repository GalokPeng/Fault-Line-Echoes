import { capitalGates, civicLevel } from './capital-data.js'
import {
  hue,
  arch,
  cornice,
  column,
  roof,
  sash,
  banner,
  flag,
  stairFlight,
} from './capital-architecture.js'

function turret(b, x, z, r, h, base = 0, steeple = true) {
  b.cyl('marble', hue.ash, x, base + 0.47, z, r * 1.16, 0.95, r * 1.16, 0.9, 1, 12)
  b.cyl('marble', hue.cool, x, base + h / 2, z, r, h, r, 0.91, 1, 12)
  b.hit(x, base + h / 2, z, r * 1.44, h, r * 1.44)
  for (const level of [0.24, 0.68, 0.89])
    b.cyl('marble', hue.ivory, x, base + h * level, z, r * 1.015, 0.28 + r * 0.03, r * 1.015, 1, 1, 12)
  for (const s of [-1, 1]) {
    b.box('metal', hue.ink, x + s * r * 0.91, base + h * 0.65, z, 0.1, h * 0.15, r * 0.14)
    b.box('metal', hue.ink, x, base + h * 0.76, z + s * r * 0.93, r * 0.14, h * 0.15, 0.1)
  }
  b.cyl('marble', hue.ash, x, base + h - 0.67, z, r * 1.13, 0.91, r * 1.13, 1, 0.83, 12)
  b.cyl('marble', hue.ivory, x, base + h, z, r * 1.22, 0.46, r * 1.22, 1, 1, 12)
  if (steeple) {
    b.cyl('roof', hue.slate, x, base + h + r * 1.0, z, r * 1.26, r * 1.93, r * 1.26, 0.3, 1, 12)
    b.cyl('roof', hue.copper, x, base + h + r * 2.52, z, r * 0.46, r * 1.19, r * 0.46, 0.04, 1, 12)
    b.cyl('metal', hue.bronze, x, base + h + r * 3.35, z, r * 0.065, r * 0.95, r * 0.065, 0, 1, 8)
  } else
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6
      b.box(
        'marble',
        hue.ivory,
        x + Math.sin(a) * r,
        base + h + 0.49,
        z + Math.cos(a) * r,
        r * 0.36,
        0.85,
        r * 0.39,
        false,
        0,
        0,
        a,
      )
    }
}
export function curtain(city) {
  for (const [dir, label, x, z] of capitalGates) {
    const angle = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[dir]
    const c = Math.cos(angle),
      s = Math.sin(angle)
    for (const sign of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const len = (216 - 7) / 4,
          mid = sign * (7 + (i + 0.5) * len),
          b = city.kit(x + c * mid, z - s * mid, angle)
        b.box('marble', hue.ash, 0, 0.81, 0, len + 0.02, 1.62, 7.6, true)
        b.box('marble', hue.cool, 0, 6, 0, len + 0.015, 12, 6.08, true)
        b.box('marble', hue.ivory, 0, 11.77, 0, len + 0.02, 0.46, 6.61, true)
        b.box('marble', hue.base, 0, 9.65, 0, len + 0.05, 0.28, 6.4)
        b.box('marble', hue.cool, 0, 12.4, 3.08, len + 0.02, 0.8, 0.52, true)
        for (let k = 0; k < 15; k++) {
          const a = -len * 0.5 + ((k + 0.5) * len) / 15
          b.box('marble', hue.ivory, a, 13.12, 3.07, 1.64, 0.73, 0.65)
          if (!(dir === 'south' && Math.abs(mid + a - 28) < 4))
            b.box('marble', hue.cool, a, 12.37, -2.98, 1.38, 0.73, 0.48)
        }
        for (let j = 0; j < 3; j++) {
          const a = -len / 2 + ((j + 0.5) * len) / 3
          b.box('marble', hue.ash, a, 3.84, 3.17, 1.62, 7.67, 1.41)
          b.box('marble', hue.ivory, a, 7.98, 3.17, 1.85, 0.6, 1.57)
          b.box('marble', hue.ash, a, 3.06, -3.18, 1.38, 6.11, 1.1)
        }
        if (i === 1 || i === 3) {
          turret(b, sign * len * 0.35, 5.95, 3.34, 14.2, 0, false)
        }
      }
    const gate = city.kit(x, z, angle)
    gate.box('marble', hue.ivory, 0, 11.66, 0, 14.26, 0.68, 6.63, true)
    arch(gate, 0, 3.75, -2.4, 6.1, 1.3, 1.6)
    arch(gate, 0, 3.75, 2.4, 6.1, 1.3, 1.6)
    for (const sign of [-1, 1]) {
      turret(gate, sign * 9.2, 3.8, 3.05, 17.4, 0, true)
      banner(gate, sign * 7.7, 6.5, -3.28, 4.3, 1.17)
      gate.box('marble', hue.cool, sign * 6.76, 5.82, 0, 1.42, 11.65, 5.3, true)
      for (let j = 0; j < 3; j++)
        gate.box('marble', hue.ivory, sign * (j * 2.03 + 0.85), 12.61, 2.93, 1.18, 1.22, 0.68)
    }
    const plaque = city.kit(x, z, angle + Math.PI)
    plaque.sign(label.split(' · ')[1], 0, 10.63, 3.31, 2.1)
  }
  const stair = city.kit(28, 181)
  stairFlight(stair, 0, 0, 32.35, 12, 4.85)
  stair.sign('城墙巡道', 3.29, 1.66, 0.22, 1.12)
}
export function castle(city) {
  const b = city.kit(-54, -86),
    w = 33,
    d = 39,
    front = d / 2
  b.box('marble', hue.cool, 0, 0.08, 0, w + 0.93, 0.16, d + 0.75, true)
  for (const sign of [-1, 1]) {
    b.box('marble', hue.ivory, (sign * w) / 2, 8.63, 0, 1.08, 17.25, d, true)
    b.box('marble', hue.cool, (sign * (w + 7.5)) / 4, 8.61, front, (w - 7.5) / 2, 17.22, 1.16, true)
    cornice(b, (sign * w) / 2, 13.1, 0, 1.44, d + 0.34)
    for (const zz of [-15, -6, 3, 12]) {
      b.box('marble', hue.cool, sign * (w / 2 + 0.55), 5.7, zz, 1.65, 11.45, 1.42)
      b.rod(
        'marble',
        hue.ash,
        [sign * (w / 2 + 3.45), 0, zz],
        [sign * (w / 2 + 0.47), 9.89, zz],
        0.94,
        true,
      )
    }
    for (const zz of [-10.5, -1.5, 7.5]) {
      const bay = city.kit(-54 + sign * (w / 2 + 0.56), -86 + zz, (sign * Math.PI) / 2)
      sash(bay, 0, 9.17, 0, 1.83, 4.71)
      arch(bay, 0, 11.57, 0.14, 0.96, 0.26, 0.38, false)
      bay.box('marble', hue.ivory, 0, 9.45, 0.29, 0.12, 4.8, 0.14)
      for (const q of [-1, 1])
        bay.rod('marble', hue.ivory, [q * 0.74, 10.27, 0.3], [0, 11.92, 0.3], 0.075)
      sash(bay, 0, 3.78, 0, 1.18, 2.55)
      bay.box('marble', hue.cool, 0, 6.25, 0, 3.07, 0.24, 0.57)
    }
    turret(b, sign * (w / 2 + 0.4), front - 0.38, 2.83, 21.1)
    turret(b, sign * (w / 2 + 0.9), -front - 0.52, 4.13, 27.0)
    for (const off of [6.65, 12.96]) {
      sash(b, sign * off, 9.71, front + 0.62, 1.3, 4.1)
      arch(b, sign * off, 11.73, front + 0.69, 0.65, 0.25, 0.26, false)
      sash(b, sign * off, 3.72, front + 0.62, 0.82, 2.21)
    }
    banner(b, sign * 4.91, 8, front + 0.85, 4.28, 1.1)
  }
  b.box('marble', hue.ivory, 0, 8.61, -front, w, 17.22, 1.2, true)
  b.box('marble', hue.ivory, 0, 13.84, front, 7.65, 6.8, 1.2, true)
  arch(b, 0, 3.93, front + 1.07, 3.84, 0.84, 1.9)
  cornice(b, 0, 17.25, 0, w + 1.0, d + 1.0)
  roof(b, 0, 17.49, 0, w + 2.9, d + 1.8, 6.92)
  // Carved compass rose in the marble tympanum.
  b.cyl('marble', hue.ash, 0, 19.83, front + 0.84, 1.99, 0.28, 1.99, 1, 1, 24, Math.PI / 2)
  b.cyl('metal', hue.water, 0, 19.83, front + 1.03, 1.64, 0.19, 1.64, 1, 1, 24, Math.PI / 2)
  for (let k = 0; k < 12; k++) {
    const angle = (k * Math.PI) / 6
    b.rod(
      'marble',
      k % 2 ? hue.ivory : hue.bronze,
      [0, 19.83, front + 1.16],
      [Math.sin(angle) * 1.58, 19.83 + Math.cos(angle) * 1.58, front + 1.16],
      0.097,
    )
  }
  // Tall crowned crossing and the dovecotes at its corners establish the skyline.
  const keep = city.kit(-54, -119)
  keep.box('marble', hue.cool, 0, 9.8, 0, 27, 19.6, 23, true)
  for (const sign of [-1, 1])
    for (const side of [-1, 1])
      turret(keep, sign * 12.7, side * 10.4, 2.86, 26 + (sign + side === 0 ? 1.7 : 0))
  cornice(keep, 0, 19.65, 0, 27.1, 23.1)
  keep.cyl('marble', hue.ivory, 0, 26.1, 0, 11.33, 12.85, 11.33, 0.93, 1, 12)
  keep.cyl('marble', hue.ash, 0, 32.31, 0, 11.83, 0.83, 11.83, 1, 0.97, 12)
  for (let j = 0; j < 12; j++) {
    const a = (j * Math.PI) / 6,
      xx = Math.sin(a) * 10.42,
      zz = Math.cos(a) * 10.42
    keep.box('metal', '#596e78', xx, 26.66, zz, 1.35, 5.03, 0.3, false, 0, 0, a)
    keep.cyl(
      'marble',
      hue.cool,
      Math.sin(a + 0.12) * 10.5,
      26.65,
      Math.cos(a + 0.12) * 10.5,
      0.45,
      7.1,
      0.45,
      0.85,
      1,
      8,
    )
  }
  keep.cyl('roof', hue.copper, 0, 37.38, 0, 11.74, 9.36, 11.74, 0.59, 1, 16)
  keep.cyl('roof', hue.slate, 0, 45.17, 0, 6.95, 6.32, 6.95, 0.26, 1, 16)
  keep.cyl('marble', hue.ivory, 0, 50.06, 0, 1.68, 3.73, 1.68, 0.88, 1, 10)
  keep.cyl('roof', hue.copper, 0, 54.02, 0, 2.12, 4.67, 2.12, 0.06, 1, 10)
  flag(keep, 0, 56.3, 0, 1.48)
  for (const sign of [-1, 1])
    for (const zz of [-12, -3, 6, 15]) column(b, sign * 7.85, zz, 0.16, 12.3, 0.62)
  b.box('marble', hue.cool, 0, 8.18, -16.44, w - 1, 0.44, 5.56, true)
  for (let j = -7; j <= 7; j++)
    if (Math.abs(j * 2.12 + 12) > 2.5)
      b.box('marble', hue.ivory, j * 2.12, 8.97, -13.72, 1.11, 1.12, 0.37, true)
  stairFlight(b, -12, 13.9, -13.77, 8.4, 3.68)
  b.sign('白砥议庭', 0, 9.82, front + 1.59, 2.75)
  for (const sign of [-1, 1]) {
    const drive = city.kit(-54 + sign * 11, -53)
    column(drive, 0, 0, 0, 5.5, 0.63)
    drive.cyl('metal', hue.bronze, 0, 5.94, 0, 1.06, 0.68, 1.06, 1, 0.54, 10)
    drive.cyl('lamp', '#ffcc85', 0, 6.41, 0, 0.54, 0.74, 0.54, 0.12, 1, 8)
  }
  const v = city.kit(-88, -66, 0, civicLevel - 4.8)
  for (const sign of [-1, 1]) v.box('marble', hue.cool, sign * 5.35, 2.47, 0, 0.81, 4.94, 19.2, true)
  v.box('marble', hue.ash, 0, 2.47, -9.3, 11.28, 4.94, 0.81, true)
  v.box('marble', hue.cool, 0, 4.59, 0, 11.6, 0.67, 19.6, true)
  v.sign('旧印库', 0, 3.91, 9.89, 1.49)
  for (const sign of [-1, 1])
    for (const zz of [-7, -3, 1, 5]) {
      v.box('wood', hue.wood, sign * 4.53, 1.19, zz, 1, 2.24, 2.23)
      v.box('marble', hue.bronze, sign * 4.53, 1.26, zz, 1.06, 0.11, 2.25)
      v.lantern(sign * 3.87, 2.82, zz, 0.96)
    }
}
