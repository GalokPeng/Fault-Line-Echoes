import { capitalFeatures, capitalNpcs, capitalShops, civicLevel } from './capital-data.js'
import {
  hue,
  architect,
  arch,
  banner,
  column,
  cornice,
  roof,
  sash,
  brazier,
  flag,
} from './capital-architecture.js'
import { castle, curtain } from './capital-citadel.js'
import { buildShops, workshopEffects } from './capital-workshops.js'
import { heightAt, hash } from './biomes.js'

const pi = Math.PI
function house(city, x, z, yaw, w, d, h, index, shop = null, label = '') {
  const b = city.kit(x, z, yaw),
    det = city.kit(x, z, yaw, civicLevel, true),
    f = d / 2,
    door = shop ? 2.7 : 1.72
  const stone =
    index % 4 === 0 ? '#d5c9b2' : index % 4 === 1 ? '#d6d7ca' : index % 4 === 2 ? '#e0dac9' : '#c7ccc5'
  const eave = h + (index % 3 === 1 ? 0.27 : 0)
  b.box('marble', hue.base, 0, 0.085, 0, w + 0.45, 0.17, d + 0.45, true)
  // Public businesses and some ordinary homes can be entered through their front door.
  const open = Boolean(shop) || index % 4 === 0
  if (open) {
    for (const sign of [-1, 1]) {
      b.box('marble', stone, sign * (w / 2 - 0.19), h / 2, 0, 0.38, h, d, true)
      b.box('marble', stone, (sign * (w + door)) / 4, h / 2, f, (w - door) / 2, h, 0.36, true)
    }
    b.box('marble', stone, 0, h / 2, -f, w, h, 0.37, true)
    b.box('marble', stone, 0, (h + 2.65) / 2, f, door, h - 2.65, 0.37, true)
  } else b.box('marble', stone, 0, h / 2, 0, w, h, d, true)
  b.box('marble', hue.cool, 0, h + 0.01, 0, w + 0.43, 0.28, d + 0.48)
  roof(
    b,
    0,
    eave + 0.19,
    0,
    w + 1.1,
    d + 0.9,
    index % 2 ? 2.15 : 3.13,
    index % 5 === 0 ? '#89776e' : index % 3 === 0 ? hue.copper : hue.slate,
  )
  const front = city.kit(x, z, yaw),
    n = w > 12 ? 4 : 2
  det.box('marble', hue.cool, 0, 3.14, f + 0.13, door + 0.63, 0.23, 0.49)
  if (!open) det.box('wood', hue.wood, 0, 1.31, f + 0.06, door, 2.62, 0.15)
  for (const s of [-1, 1]) {
    det.box('marble', hue.ash, s * (door / 2 + 0.12), 1.47, f + 0.1, 0.24, 2.94, 0.38)
    for (let j = 0; j < n / 2; j++) {
      const wx = s * (w * 0.3 + (j - (n / 2 - 1) * 0.5) * 2.01)
      sash(det, wx, 1.92, f + 0.15, 0.95, 1.4)
      if (h > 5.25) sash(det, wx, h - 1.45, f + 0.15, 0.99, 1.6)
    }
    const ex = s * (w / 2 - 0.04)
    b.box('marble', hue.cool, ex, h / 2, f + 0.07, 0.34, h, 0.33)
    if (shop || index % 3 === 1) {
      det.box('marble', hue.ivory, ex, h * 0.47, f + 0.19, 0.51, 0.22, 0.47)
    }
    for (const sign of [-1, 1]) {
      const zz = sign * d * 0.27
      b.box(
        (index + sign) % 3 ? 'wood' : 'window',
        hue.ink,
        s * (w * 0.5 + 0.049),
        h * 0.64,
        zz,
        0.072,
        1.43,
        1.1,
      )
      det.box('marble', hue.ivory, s * (w * 0.5 + 0.1), h * 0.64 - 0.79, zz, 0.23, 0.16, 1.39)
      det.box('wood', hue.wood, s * (w * 0.5 + 0.11), h * 0.64, zz, 0.12, 1.44, 0.072)
      if (h > 7) b.box('metal', '#75878a', s * (w * 0.5 + 0.056), 2.11, zz, 0.08, 1.23, 1.04)
    }
    b.box('metal', hue.ink, s * w * 0.3, h - 1.43, -f - 0.058, 1.1, 1.43, 0.09)
    b.box('wood', hue.ink, s * w * 0.3, h - 1.43, f + 0.046, 1.05, 1.41, 0.08)
  }
  if (index % 2 === 0 || shop) {
    front.box('marble', hue.ash, w * 0.27, h + 1.18, -d * 0.25, 0.93, 2.65, 0.9)
    front.box('marble', hue.cool, w * 0.27, h + 2.54, -d * 0.25, 1.09, 0.22, 1.06)
  }
  if (shop) {
    b.sign(label, 0, 3.66, f + 0.32, 1.56)
    const cloth =
      shop === 'butcher'
        ? '#aa7161'
        : shop === 'outfitter'
          ? '#8e6d86'
          : shop === 'baker'
            ? '#b09362'
            : hue.flag
    det.box('roof', cloth, 0, 3.22, f + 1.05, w * 0.81, 0.17, 1.92, false, 0.1)
    for (let j = 0; j < 6; j++)
      det.box(
        'roof',
        '#d6c69f',
        ((j - 2.5) * w * 0.81) / 6,
        3.31,
        f + 1.05,
        w * 0.045,
        0.03,
        1.92,
        false,
        0.1,
      )
    for (const s of [-1, 1]) {
      det.box('wood', hue.wood, s * w * 0.39, 1.52, f + 1.85, 0.11, 3.04, 0.11)
      b.lantern(s * (door / 2 + 0.47), 2.38, f + 0.56, 1)
    }
    if (shop === 'inn') {
      for (const s of [-1, 1])
        for (const v of [-1, 1]) {
          det.box('wood', hue.wood, s * w * 0.32, 0.34, v * d * 0.32, 2.2, 0.52, 3.33, true)
          det.box('roof', '#9cafa5', s * w * 0.32, 0.67, v * d * 0.32, 2.06, 0.19, 3.19)
          det.box('roof', '#d4cdb2', s * w * 0.32, 0.81, v * d * 0.32 + 0.96, 1.63, 0.13, 0.63)
        }
      b.sign('上房', 0, 2.24, -f + 0.22, 0.94)
    } else if (shop === 'smith') {
      det.box('marble', hue.ash, -w * 0.31, 0.79, -d * 0.19, 2.32, 1.57, 2.17, true)
      det.box('metal', hue.ink, -w * 0.31, 1.62, -d * 0.19, 1.77, 0.42, 1.35)
      brazier(det, w * 0.31, 0)
    } else if (shop !== 'pharmacy' && shop !== 'baker') {
      det.box('wood', hue.wood, 0, 0.89, -f + 1.67, w * 0.55, 0.19, 1.22)
      for (const s of [-1, 1]) det.box('wood', hue.wood, s * w * 0.22, 0.41, -f + 1.67, 0.19, 0.82, 0.19)
      det.barrel(w * 0.37, 0, -f + 1.3, 1.6)
    }
  }
}
function cypress(b, x, z, h) {
  b.cyl('wood', hue.wood, x, h * 0.21, z, h * 0.047, h * 0.42, h * 0.047, 0.68, 1, 8)
  for (let i = 0; i < 3; i++)
    b.cyl(
      'roof',
      i === 0 ? '#516c58' : i === 1 ? '#607963' : '#6d8268',
      x,
      h * (0.37 + i * 0.19),
      z,
      h * (0.15 - i * 0.033),
      h * 0.47,
      h * (0.15 - i * 0.033),
      0.1,
      1,
      9,
    )
  b.hit(x, h * 0.27, z, h * 0.065, h * 0.54, h * 0.065)
}
function plazas(city) {
  const gate = city.kit(0, -44)
  for (const sign of [-1, 1]) {
    gate.box('marble', hue.ash, sign * 9.65, 0.45, 0, 5.28, 0.9, 5.67, true)
    gate.box('marble', hue.cool, sign * 9.65, 5.88, 0, 4.43, 11.76, 4.82, true)
    for (const side of [-1, 1]) column(gate, sign * 9.65 + side * 1.37, 2.85, 0.48, 10.49, 0.55)
    cornice(gate, sign * 9.65, 11.7, 0, 4.51, 4.89)
    banner(gate, sign * 9.65, 6.46, 2.52, 4.9, 1.63)
    gate.cyl('marble', hue.ivory, sign * 9.65, 13.62, 0, 1.31, 3.42, 1.31, 0.82, 1, 8)
    gate.cyl('roof', hue.copper, sign * 9.65, 16.01, 0, 1.5, 1.85, 1.5, 0.03, 1, 8)
    flag(gate, sign * 9.65, 17.42, 0, 0.91)
  }
  arch(gate, 0, 3.7, 0, 7.12, 1.15, 4.63, false)
  gate.box('marble', hue.ivory, 0, 12.14, 0, 23.93, 1.12, 5.61)
  gate.box('marble', hue.cool, 0, 12.92, 0, 23.2, 0.43, 5.14)
  gate.sign('白砥城', 0, 12.23, 2.86, 2.25)

  // A roofed mineral spring sits off the main walking axis.
  const f = city.kit(11.8, 4)
  f.cyl('marble', hue.ash, 0, 0.13, 0, 2.82, 0.26, 2.82, 1, 1, 18)
  f.cyl('marble', hue.cool, 0, 0.64, 0, 1.99, 1.01, 1.99, 1, 0.91, 20)
  f.cyl('marble', hue.ivory, 0, 1.22, 0, 2.2, 0.26, 2.2, 1, 1, 20)
  f.cyl('metal', hue.water, 0, 1.36, 0, 1.69, 0.05, 1.69, 1, 1, 24)
  f.hit(0, 0.65, 0, 2.62, 1.3, 2.62)
  for (let i = 0; i < 6; i++) {
    const a = (i * pi) / 3
    column(f, Math.sin(a) * 2.65, Math.cos(a) * 2.65, 0, 4.0, 0.22)
  }
  f.cyl('marble', hue.ivory, 0, 4.12, 0, 3.16, 0.32, 3.16, 1, 1, 12)
  f.cyl('roof', hue.copper, 0, 4.83, 0, 3.24, 1.14, 3.24, 0.69, 1, 12)
  f.cyl('roof', hue.copper, 0, 5.79, 0, 2.23, 0.83, 2.23, 0.13, 1, 12)
  f.cyl('metal', hue.bronze, 0, 6.48, 0, 0.17, 0.81, 0.17, 0.06, 1, 8)
  const sign = city.kit(-4, 23, pi * 0.88)
  sign.box('marble', hue.cool, 0, 1.24, 0, 1.04, 2.47, 0.51, true)
  sign.box('marble', hue.ash, 0, 0.18, 0, 1.52, 0.36, 0.93, true)
  sign.sign('四境驿路', 0, 1.85, 0.266, 0.61)
  sign.sign('西雨　东盐', 0, 1.41, 0.269, 0.62)
  sign.sign('北林　南峡', 0, 0.99, 0.269, 0.62)
  // Two public arcades frame the long view towards the castle.
  for (const [px, pz, angle] of [
    [27, -12, -pi / 2],
    [-25, -19, pi / 2],
  ]) {
    const a = city.kit(px, pz, angle)
    for (let i = -2; i <= 2; i++) column(a, i * 4.26, 0, 0, 5.48, 0.41)
    a.box('marble', hue.cool, 0, 5.65, 0, 19.7, 0.42, 1.9)
    a.box('roof', hue.copper, 0, 5.99, 0, 19.93, 0.31, 2.17)
    for (const s of [-1, 1]) {
      a.box('marble', hue.cool, s * 5.4, 0.5, 1.0, 2.8, 0.24, 0.69, true)
      a.box('marble', hue.ash, s * 5.4, 0.19, 1.0, 1.66, 0.36, 0.45)
    }
  }
  for (const [x, z] of [
    [-17, 22],
    [20, 21],
    [-16, -28],
    [17, -39],
    [-32, -55],
    [-71, -50],
    [26, 32],
    [39, -19],
  ]) {
    const b = city.kit(x, z)
    b.cyl('marble', hue.cool, 0, 0.37, 0, 1.36, 0.74, 1.36, 0.91, 1, 8)
    cypress(b, 0, 0, 6.9 + hash(x, z, 481) * 2.0)
  }
}
function library(city) {
  const b = city.kit(47, -123)
  b.box('marble', hue.cool, 0, 0.18, 0, 33, 0.36, 28, true)
  for (const s of [-1, 1]) {
    b.box('marble', hue.ivory, s * 14, 5.05, 0, 0.79, 10.1, 22.7, true)
    b.box('marble', hue.ivory, s * 9, 5.05, 10.7, 10.06, 10.1, 0.81, true)
  }
  b.box('marble', hue.ivory, 0, 5.05, -10.72, 29, 10.1, 1.01, true)
  for (let j = -3; j <= 3; j++) if (j) column(b, j * 4.03, 13.25, 0, 8.62, 0.75)
  cornice(b, 0, 8.75, 13.25, 28.07, 2.52)
  cornice(b, 0, 10.21, 0, 29.36, 22.95)
  b.cyl('marble', hue.cool, 0, 13.13, 0, 9.33, 5.66, 9.33, 1, 1, 14)
  b.ell('roof', hue.copper, 0, 15.91, 0, 10.11, 7.21, 10.11)
  b.cyl('marble', hue.ivory, 0, 23.83, 0, 1.49, 2.75, 1.49, 0.82, 1, 8)
  b.cyl('roof', hue.copper, 0, 25.71, 0, 1.79, 1.48, 1.79, 0.03, 1, 8)
  b.sign('衡星书院', 0, 8.78, 14.65, 2)
}
function quarters(city) {
  const reserved = [
    [-52, -91, 56, 64],
    [47, -123, 22, 22],
    [0, 0, 34, 31],
    [0, -44, 15, 5],
    [28, 196, 5, 21],
    ...capitalShops.map(([, x, z, , w, d]) => [x, z, w * 0.52 + 4, d * 0.52 + 4]),
    ...capitalNpcs.map((a) => [a.x, a.z, 4, 4]),
  ]
  let serial = 0
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const x = sx * (26 + i * 54),
            z = sz * (25 + j * 54),
            r = hash(i * sx, j * sz, 75)
          const centers = [
            [-13, -13],
            [13, -13],
            [-13, 13],
            [13, 13],
          ].map(([a, b]) => [x + a, z + b])
          if (r > 0.38) centers.push([x, z + (r > 0.72 ? 12 : -12)])
          if (r > 0.82) centers.push([x, z - 13])
          for (const [a, b] of centers) {
            const k = serial++,
              w = 9.0 + hash(k, 2, 175) * 3.6,
              d = 9.1 + hash(k, 3, 175) * 4.6,
              h = 5.25 + hash(k, 4, 174) * 6.4
            if (
              reserved.some(
                ([xx, zz, hx, hz]) => Math.abs(a - xx) < hx + w * 0.6 && Math.abs(b - zz) < hz + d * 0.6,
              )
            )
              continue
            const axis = k % 4 === 0 ? 0 : k % 4 === 1 ? pi / 2 : k % 4 === 2 ? pi : -pi / 2
            house(city, a, b, axis, w, d, h, k)
            if (k % 5 === 1) {
              const c = city.kit(a, b, axis)
              cypress(c, w * 0.65, -d * 0.35, 6.1 + 3 * r)
            }
          }
        }
  for (const [i, row] of capitalShops.entries()) {
    const [shop, x, z, yaw, w, d, h, label] = row
    house(city, x, z, yaw, w, d, h, 300 + i, shop, label)
  }
  for (const feature of capitalFeatures) {
    const b = city.kit(feature.x, feature.z)
    if (feature.kind === 'torch') brazier(b, 0, 0)
    if (feature.kind !== 'owned' || feature.id === 'loaves') continue
    b.box('wood', hue.wood, 0, 0.76, 0, 1.53, 0.15, 0.92, true)
    for (const s of [-1, 1]) b.box('wood', hue.wood, s * 0.55, 0.36, 0, 0.14, 0.73, 0.68)
    for (let j = 0; j < 4; j++) {
      const x = ((j % 2) - 0.5) * 0.65,
        z = (Math.floor(j / 2) - 0.5) * 0.36
      if (feature.item === 'bun')
        b.ell('wood', j % 2 ? '#c99a64' : '#dab67a', x, 0.94, z, 0.23, 0.14, 0.16)
      else if (feature.item === 'meat') b.ell('roof', '#a96760', x, 0.95, z, 0.23, 0.13, 0.16)
      else b.box('roof', j % 2 ? '#79a195' : '#987780', x, 0.9 + (j % 2) * 0.045, z, 0.42, 0.14, 0.26)
    }
  }
}
export function createCapital(scene) {
  const city = architect(scene)
  quarters(city)
  plazas(city)
  castle(city)
  library(city)
  curtain(city)
  const releaseShops = buildShops(city),
    craft = workshopEffects(scene)
  city.finish()
  const features = capitalFeatures.map((f) => ({
    ...f,
    y: f.kind === 'underground' || f.kind === 'entrance' ? heightAt('capital', f.x, f.z) : f.y,
  }))
  return {
    colliders: city.colliders,
    features,
    npcSpawns: capitalNpcs,
    workImpact: craft.impact,
    update(dt, time, daylight) {
      city.update(daylight, time)
      craft.update(dt, time)
    },
    dispose() {
      releaseShops()
      craft.dispose()
      city.dispose()
    },
  }
}
