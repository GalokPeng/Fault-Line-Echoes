import { settlementLayouts as layouts, houseFoundation } from './settlement-sites.js'
import * as THREE from 'three'
import { createCapital } from './capital.js'
import { biomes, heightAt } from './biomes.js'
import { releaseGeometry } from './settlement-geometry.js'
import { makeContext, at, addFeature, gable, awning } from './settlement-kit.js'
import { district } from './settlement-districts.js'

const details = {
  rain: {
    tower: '听雨楼',
    cellar: '沉潮水库',
    shops: ['渡船社', '雨布行', '晒茶坊', '行水驿'],
    people: ['乔芮', '梅枝', '林舟', '禾清', '滕叔', '温砚'],
  },
  salt: {
    tower: '四风塔',
    cellar: '旧盐井',
    shops: ['驼铃驿', '染坊', '盐引所', '风记商行'],
    people: ['唐禾', '沙依', '夏木', '弥山', '季盐', '塔娜'],
  },
  root: {
    tower: '千枝望台',
    cellar: '根下档窟',
    shops: ['苔灯铺', '绳匠家', '山药舍', '木工房'],
    people: ['栖芷', '椴伯', '连枝', '弦秋', '小栗', '苔娘'],
  },
  gorge: {
    tower: '断潮绞盘',
    cellar: '岩腹矿硐',
    shops: ['石工所', '赤铁坊', '渡桥驿', '崖下酒馆'],
    people: ['沈厌', '石旻', '陆安', '秋环', '骆雪', '余岑'],
  },
}

function dwelling(ctx, x, z, yaw, w, d, h, variant, sign) {
  const site = houseFoundation(ctx.id, x, z, yaw, w, d),
    b = at(ctx, x, z, yaw, site.base),
    c = ctx.colors,
    id = ctx.id
  const timber = id === 'rain' || id === 'root',
    front = d / 2,
    door = 1.62,
    wall = 0.26
  const dock = site.dock,
    bottom = site.min - site.base,
    cap = timber ? 0.14 : 0.09
  b.box(
    'masonry',
    c.stone,
    0,
    (dock - cap + bottom) / 2,
    0,
    w + 0.72,
    dock - cap - bottom,
    d + 0.81,
    true,
  )
  b.box(timber ? 'wood' : 'masonry', c.edge, 0, dock - cap / 2, 0, w + 0.76, cap, d + 0.85, true)
  for (const step of site.steps)
    b.box(
      'masonry',
      c.base,
      0,
      (step.top + step.min) / 2 - site.base,
      step.offset,
      2.35,
      step.top - step.min,
      site.tread + 0.008,
      true,
    )
  const mat = timber ? 'plaster' : 'masonry'
  for (const s of [-1, 1]) {
    b.box(mat, c.wall, s * (w * 0.5 - wall * 0.5), h * 0.5 + dock, 0, wall, h, d, true)
    const side = (w - door) / 2
    b.box(mat, c.wall, s * (w / 2 - side / 2), h * 0.5 + dock, front, side, h, wall, true)
  }
  b.box(mat, c.wall, 0, h * 0.5 + dock, -front, w, h, wall, true)
  b.box('wood', c.wood, 0, 2.35 + dock, front, door + 0.24, 0.2, 0.37, true)
  if (h > 2.47) b.box(mat, c.wall, 0, (h + 2.47) * 0.5 + dock, front, door, h - 2.47, wall, true)
  for (const s of [-1, 1]) {
    b.box('wood', c.wood, s * (door * 0.5 + 0.03), 1.17 + dock, front + 0.02, 0.14, 2.35, 0.29)
    for (const f of [-1, 1]) {
      if (timber)
        b.box(
          'wood',
          c.wood,
          s * (w * 0.5 - 0.11),
          h * 0.5 + dock,
          f * (front - 0.06),
          0.22,
          h + 0.08,
          0.22,
        )
    }
    const q = s * (w / 2 + door / 2) * 0.49
    b.box('wood', c.wood, q, 1.64 + dock, front + 0.15, 0.93, 1.01, 0.06)
    b.box('plaster', c.shade, q, 1.65 + dock, front + 0.2, 0.73, 0.82, 0.025)
    for (const a of [-1, 1])
      b.box('wood', c.edge, q + a * 0.18, 1.63 + dock, front + 0.23, 0.046, 0.86, 0.043)
    b.box('wood', c.edge, q, 1.56 + dock, front + 0.23, 0.82, 0.052, 0.05)
  }
  if (timber) {
    b.box('wood', c.edge, 0, h - 0.13 + dock, 0, w + 0.53, 0.2, d + 0.4)
    const pitch = id === 'root' ? 2.1 : 1.41
    gable(b, c, 0, h + dock, 0, w + 1.14, d + 1.3, pitch)
    // Ventilated timber end walls follow the roof slope. The eaves project
    // beyond the boards, keeping the join and the upper vent in shade.
    const courses = Math.ceil(pitch / 0.22)
    for (const end of [-1, 1]) {
      const face = end * (front - 0.06)
      for (let i = 0; i < courses; i++) {
        const rise = (pitch * (i + 0.5)) / courses
        const width = Math.min(w, (w + 1.14) * (1 - (i + 1) / courses))
        if (width > 0.1)
          b.box(
            'wood',
            i % 3 ? c.wall : c.edge,
            0,
            h + dock + rise,
            face,
            width,
            pitch / courses - 0.038,
            0.14,
          )
      }
      for (const side of [-1, 1])
        b.rod(
          'wood',
          c.wood,
          [0, h + dock + pitch - 0.09, face + end * 0.1],
          [(side * w) / 2, h + dock + 0.08, face + end * 0.1],
          0.13,
          true,
        )
      b.rod(
        'wood',
        c.edge,
        [0, h + dock, face + end * 0.12],
        [0, h + dock + pitch - 0.14, face + end * 0.12],
        0.14,
        true,
      )
    }
    // Tied timber braces and a drying pole under the eaves.
    for (const s of [-1, 1])
      b.rod(
        'wood',
        c.edge,
        [s * w * 0.47, h * 0.74 + dock, front + 0.14],
        [s * w * 0.32, h + dock, front + 0.14],
        0.093,
        true,
      )
    if (id === 'rain') {
      b.rod(
        'wood',
        c.edge,
        [-w * 0.54, h * 0.81, front + 0.71],
        [w * 0.54, h * 0.81, front + 0.71],
        0.06,
      )
      for (let t = 0; t < 3; t++)
        b.box(
          'cloth',
          t % 2 ? c.cloth : c.trim,
          -w * 0.39 + t * 0.33,
          h * 0.81 - 0.29,
          front + 0.71,
          0.26,
          0.54,
          0.035,
          false,
          0,
          0.025 * t,
        )
    } else {
      for (const s of [-1, 1])
        b.rod(
          'wood',
          c.wood,
          [s * w * 0.54, -0.03, -front * 0.65],
          [s * w * 0.43, h * 0.8, -front * 0.83],
          0.24,
        )
    }
  } else {
    b.box('masonry', c.base, 0, h + dock, 0, w + 0.44, 0.26, d + 0.42, true)
    b.box('plaster', c.wall, 0, h + 0.22 + dock, 0, w + 0.3, 0.26, d + 0.33)
    for (const f of [-1, 1])
      b.box('masonry', c.wall, 0, h + 0.47 + dock, f * front, w + 0.26, 0.49, 0.32)
    for (const s of [-1, 1])
      b.box('masonry', c.wall, s * w * 0.5, h + 0.47 + dock, 0, 0.32, 0.49, d + 0.26)
    for (let k = 0; k < 5; k++)
      b.box('wood', c.wood, (k - 2) * w * 0.19, h - 0.23 + dock, front + 0.22, 0.16, 0.15, 0.4)
    if (id === 'salt' && variant % 2 === 0) {
      const a = -w * 0.19,
        e = -d * 0.15
      b.box('masonry', c.wall, a, h + 1.26 + dock, e, 1.65, 2.1, 1.38)
      for (const s of [-1, 1])
        b.box('wood', c.shade, a + s * 0.35, h + 1.78 + dock, e + 0.71, 0.43, 0.83, 0.05)
      b.box('masonry', c.base, a, h + 2.39 + dock, e, 1.86, 0.21, 1.56)
    } else if (id === 'gorge') {
      b.box('masonry', c.base, -w * 0.29, h + 0.93 + dock, -d * 0.24, 0.77, 1.61, 0.8)
      for (const s of [-1, 1])
        b.box('metal', c.shade, s * w * 0.49, h * 0.5 + dock, front + 0.13, 0.13, h, 0.07)
    }
  }
  const [barrelX, , barrelZ] = b.pt(-w * 0.44, 0, front + 1.13)
  b.barrel(-w * 0.44, heightAt(id, barrelX, barrelZ) - site.base, front + 1.13, 0.95)
  b.lantern(door * 0.66, 2.04 + dock, front + 0.41, 0.77)
  b.box('wood', c.wood, -w * 0.25, 0.65 + dock, -front + 0.73, 1.56, 0.13, 0.7)
  for (const s of [-1, 1])
    b.box('wood', c.edge, -w * 0.25 + s * 0.57, 0.32 + dock, -front + 0.73, 0.14, 0.64, 0.15)
  if (sign) b.sign(sign, 0, 2.72 + dock, front + 0.25, 0.9)
}
function entryGate(ctx) {
  const c = ctx.colors,
    b = at(ctx, 0, -33),
    id = ctx.id
  if (id === 'salt' || id === 'gorge') {
    const w = id === 'gorge' ? 3.6 : 2.6,
      h = id === 'gorge' ? 8.4 : 6.4
    for (const s of [-1, 1]) {
      b.box('masonry', c.base, s * 5, 0.46, 0, w + 0.65, 0.92, w + 0.7, true)
      b.box('masonry', c.wall, s * 5, h / 2, 0, w, h, w, true)
      for (const k of [0.25, 0.76, 0.98])
        b.box('masonry', c.base, s * 5, h * k, 0, w + 0.32, 0.24, w + 0.33)
      for (const a of [-1, 1])
        for (const z of [-1, 1])
          b.box('masonry', c.base, s * 5 + a * w * 0.32, h + 0.32, z * w * 0.34, 0.58, 0.69, 0.58)
      b.box('plaster', c.shade, s * 5, h * 0.65, w * 0.5 + 0.02, 0.21, 1.36, 0.07)
      b.lantern(s * 3.61, 2.75, w * 0.52, 0.95)
      b.rod('wood', c.wood, [s * 5.3, h + 0.4, 0], [s * 5.3, h + 3.4, 0], 0.062)
      b.box('cloth', c.cloth, s * 5.3 + 0.55, h + 2.77, 0, 1.12, 0.75, 0.04, false, 0, -0.08)
    }
    for (let i = 0; i < 13; i++) {
      const a = ((i + 0.5) * Math.PI) / 13
      b.box(
        'masonry',
        i % 2 ? c.wall : c.base,
        3.88 * Math.cos(a),
        3.1 + 3.1 * Math.sin(a),
        0,
        0.99,
        0.59,
        1.68,
        false,
        0,
        a - Math.PI / 2,
      )
    }
  } else {
    for (const s of [-1, 1]) {
      b.cyl('wood', c.wood, s * 4.53, 3.26, 0, 0.43, 6.64, 0.45, 0.78, 1, 10)
      b.hit(s * 4.53, 3.2, 0, 0.78, 6.4, 0.8)
      for (const q of [1.15, 5.65]) b.cyl('cloth', c.trim, s * 4.53, q, 0, 0.46, 0.23, 0.46, 0.98, 1, 10)
      b.rod('wood', c.edge, [s * 4.54, 3.15, 0], [s * 2.78, 5.88, 0], 0.22)
      b.lantern(s * 3.18, 3.89, 0.18, 0.94)
    }
    if (id === 'rain') {
      b.box('wood', c.wood, 0, 5.72, 0, 10.6, 0.38, 0.6)
      gable(b, c, 0, 5.95, 0, 11.1, 2.05, 1.37)
    } else {
      for (const k of [-1, 1]) b.rod('wood', c.edge, [k * 4.54, 5.62, 0], [0, 7.5, 0], 0.32)
      for (let i = -3; i <= 3; i++)
        b.rod(
          'leaf',
          c.roof,
          [i, 6.94 - Math.abs(i) * 0.37, 0],
          [i + 0.18, 6.07 - Math.abs(i) * 0.34, 0.15],
          0.048,
        )
    }
  }
  addFeature(ctx, '北行城门', 0, ctx.base, -32, 'gate')
}
function watchtower(ctx) {
  const c = ctx.colors,
    id = ctx.id,
    t = {
      rain: [-12, -10, 5.1],
      salt: [-13, -11, 6.38],
      root: [-14, -12, 7.05],
      gorge: [-13, -10, 5.86],
    }[id]
  const [x, z, h] = t,
    b = at(ctx, x, z)
  const deckW = id === 'root' ? 8.3 : 6.9,
    deckD = 6.6,
    front = deckD / 2
  b.box(id === 'salt' ? 'masonry' : 'wood', c.edge, 0, h - 0.19, 0, deckW, 0.38, deckD, true)
  const steps = Math.ceil(h / 0.205),
    tread = 0.48
  for (let i = 0; i < steps; i++) {
    const rise = (h * (i + 1)) / steps,
      off = front + (steps - i - 0.5) * tread
    if (id === 'salt')
      b.box(
        'masonry',
        i % 4 === 0 ? c.edge : c.base,
        0,
        rise / 2 - 0.012,
        off,
        2.81,
        rise + 0.024,
        tread + 0.012,
        true,
      )
    else
      b.box('wood', i % 4 === 0 ? c.edge : c.wood, 0, rise - 0.08, off, 2.94, 0.16, tread + 0.022, true)
    if (i % 6 === 1 && i < steps - 1)
      for (const s of [-1, 1])
        b.rod('wood', c.wood, [s * 1.4, rise, off], [s * 1.4, rise + 0.83, off], 0.06)
  }
  for (const s of [-1, 1]) {
    if (id !== 'salt') {
      b.rod(
        'wood',
        c.edge,
        [s * 1.21, 0.04, front + steps * tread],
        [s * 1.21, h - 0.24, front],
        0.24,
        true,
      )
      for (let j = 1; j < 4; j++) {
        const y = (h * j) / 4,
          off = front + (1 - j / 4) * steps * tread
        b.box('wood', c.wood, s * 1.17, y * 0.5, off, 0.2, y, 0.22, true)
      }
    }
    b.rod('wood', c.wood, [s * 1.4, 0.9, front + steps * tread], [s * 1.4, h + 0.92, front], 0.075)
    for (const f of [-1, 1]) {
      const xp = s * (deckW / 2 - 0.22),
        zp = f * (front - 0.22)
      b.box(id === 'salt' ? 'masonry' : 'wood', c.wood, xp, h * 0.5, zp, 0.38, h, 0.38, true)
      if (id !== 'salt') b.rod('wood', c.edge, [xp, 0.78, zp], [xp * 0.46, h - 0.28, zp], 0.17, true)
    }
    b.box('wood', c.wood, s * deckW * 0.482, h + 0.63, 0, 0.135, 1.2, deckD, true)
    b.box('wood', c.edge, s * deckW * 0.482, h + 1.24, 0, 0.2, 0.12, deckD)
    b.box(
      'wood',
      c.wood,
      s * (deckW / 2 + 1.56) * 0.5,
      h + 0.54,
      front,
      deckW / 2 - 1.56,
      1.05,
      0.14,
      true,
    )
  }
  b.box('wood', c.wood, 0, h + 0.55, -front, deckW, 1.1, 0.13, true)
  if (id === 'rain') {
    for (const s of [-1, 1])
      for (const f of [-1, 1])
        b.cyl('wood', c.wood, s * (deckW / 2 - 0.38), h + 1.58, f * (front - 0.38), 0.17, 3.16, 0.17)
    gable(b, c, 0, h + 3.14, 0, deckW + 1.83, deckD + 1.5, 2.08)
    gable(b, c, 0, h + 4.83, -0.32, 3.1, 3.38, 0.98)
    for (const s of [-1, 1]) b.lantern(s * 2.56, h + 2.28, front + 0.1)
  } else if (id === 'salt') {
    for (const s of [-1, 1])
      for (const f of [-1, 1]) {
        b.box('masonry', c.wall, s * 2.45, h + 3.2, f * 2.17, 0.74, 6.4, 0.77, true)
        b.box('masonry', c.trim, s * 2.45, h + 3.69, f * 2.17, 1.03, 0.18, 1.02)
      }
    for (const f of [-1, 1]) b.box('masonry', c.wall, 0, h + 4.27, f * 2.17, 5.48, 0.88, 0.77)
    for (const s of [-1, 1]) b.box('masonry', c.wall, s * 2.45, h + 4.27, 0, 0.74, 0.88, 4.8)
    for (const f of [-1, 1])
      for (const k of [-1, 0, 1]) b.box('wood', c.base, k * 1.04, h + 5.35, f * 2.17, 0.13, 1.46, 0.27)
    b.box('masonry', c.wall, 0, h + 6.44, 0, 5.95, 0.53, 5.36)
    b.cyl('masonry', c.trim, 0, h + 7.11, 0, 2.58, 1.0, 2.43, 0.36, 1, 4)
    b.cyl('metal', c.trim, 0, h + 8.24, 0, 0.08, 1.69, 0.08)
  } else if (id === 'root') {
    b.cyl('wood', c.wood, -1.78, h * 0.83, -0.96, 1.15, h * 1.68, 0.98, 0.69, 1.3, 11)
    b.hit(-1.78, h * 0.85, -0.96, 1.58, h * 1.7, 1.53)
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399,
        r = 2.48 + (i % 3) * 0.55,
        dx = Math.cos(a) * r,
        dz = Math.sin(a) * r,
        top = h + 3.7 + (i % 4) * 1.09
      b.rod('wood', c.wood, [-1.78, h + 1.47, -0.96], [-1.78 + dx, top, -0.96 + dz], 0.27)
      b.ell('leaf', i % 2 ? '#637d64' : '#81916a', dx - 1.78, top + 0.63, dz - 0.96, 2.62, 1.18, 2.19)
      if (i % 2 === 0) {
        b.rod(
          'leaf',
          c.roof,
          [dx - 1.78, top + 0.09, dz - 0.96],
          [dx - 1.66, top - 1.88, dz - 0.81],
          0.051,
        )
      }
    }
    b.lantern(1.5, h + 2.08, -0.9, 1.27)
  } else {
    for (const s of [-1, 1]) {
      b.rod('metal', c.shade, [s * 2.31, h, -2.42], [s * 0.55, h + 7, -1.6], 0.31, true)
      b.rod('metal', c.shade, [s * 2.31, h, 2.42], [s * 0.55, h + 7, -1.6], 0.31, true)
    }
    b.rod('wood', c.wood, [-0.1, h + 5.71, 0.43], [0.14, h + 7.83, -6.94], 0.36, true)
    b.rod('metal', c.shade, [0.14, h + 7.63, -6.82], [0.14, h + 1.63, -6.82], 0.04)
    b.box('wood', c.edge, 0.14, h + 1.43, -6.82, 1.12, 0.61, 1.14)
    for (const s of [-1, 1]) {
      b.cyl('metal', c.shade, s * 0.92, h + 1.72, -0.54, 1.06, 0.19, 1.06, 1, 1, 18, 0, Math.PI / 2)
      b.cyl('metal', c.trim, s * 1.09, h + 1.72, -0.54, 0.19, 0.18, 0.19, 1, 1, 12, 0, Math.PI / 2)
    }
  }
  b.sign(details[id].tower, 0, h - 0.45, front + 0.07, 1.2)
  addFeature(ctx, details[id].tower + '阶道', x, ctx.base, z + front + steps * tread + 0.6, 'stairs')
  addFeature(ctx, details[id].tower, x, ctx.base + h, z + 0.6, 'upper')
}

function undercroft(ctx) {
  const id = ctx.id,
    c = ctx.colors,
    b = at(ctx, 23, -1, 0, ctx.base - 4.8)
  const masonry = id === 'salt' || id === 'gorge'
  for (const s of [-1, 1]) {
    b.box('masonry', c.stone, s * 6, 2.33, 0, 1.25, 4.85, 17, true)
    for (const f of [-6.4, -2.2, 2.3, 6.6]) {
      b.box(
        masonry ? 'masonry' : 'wood',
        masonry ? c.wall : c.wood,
        s * 4.92,
        2.1,
        f,
        0.54,
        4.42,
        0.58,
        true,
      )
      b.rod(masonry ? 'masonry' : 'wood', c.edge, [s * 4.88, 2.55, f], [s * 3.12, 4.23, f], 0.28, true)
      if (f !== -2.2) b.lantern(s * 4.32, 2.19, f, 1.07)
    }
  }
  b.box('masonry', c.stone, 0, 2.45, -8.15, 12.58, 4.94, 1.2, true)
  b.box('masonry', c.stone, 0, 4.8, 0, 13.6, 1.13, 17.55, true)
  b.box('plaster', c.base, 0, 5.41, 0, 13.78, 0.22, 17.74, true)
  for (const s of [-1, 1]) b.box('masonry', c.base, s * 6.71, 5.77, 0, 0.27, 0.68, 17.79, true)
  for (const f of [-6.4, -2.2, 2.3, 6.6]) {
    b.box('wood', c.edge, 0, 4.1, f, 10.33, 0.29, 0.47)
    if (id === 'root')
      for (const s of [-1, 1]) {
        b.rod('wood', c.wood, [s * 5.3, 0.13, f], [s * 4.66, 3.55, f + 1.28], 0.26)
        b.ell('leaf', '#84ada0', s * 4.55, 2.38, f + 0.65, 0.22, 0.093, 0.25)
      }
  }
  b.box('wood', c.wood, 0, 4.11, 8.52, 12.59, 0.67, 0.55)
  b.sign(details[id].cellar, 0, 4.12, 8.83, 1.45)
  // An active piece of the waterworks survives underground in each district.
  b.cyl('metal', c.shade, -3.54, 1.18, -3.1, 0.32, 7.62, 0.32, 1, 1, 12, Math.PI / 2)
  for (const f of [-5.4, -2.2, 0.2])
    b.cyl('metal', c.trim, -3.54, 1.18, f, 0.36, 0.13, 0.36, 1, 1, 12, Math.PI / 2)
  b.box('wood', c.edge, 3.94, 0.9, -5.23, 2.06, 0.19, 0.78)
  for (const s of [-1, 1]) b.box('wood', c.wood, 3.94 + s * 0.8, 0.44, -5.23, 0.11, 0.88, 0.57)
  for (let i = 0; i < 4; i++)
    b.box(
      'plaster',
      i % 2 ? '#beaf8d' : '#b3a077',
      3.4 + i * 0.23,
      1.07,
      -5.2,
      0.17,
      0.17,
      0.39,
      false,
      0,
      i * 0.04,
    )
  const atH = (x, z) => heightAt(id, x, z)
  addFeature(ctx, details[id].cellar + '坡口', 23, atH(23, 17), 17, 'entrance')
  addFeature(ctx, details[id].cellar, 23, atH(23, -3), -3, 'underground')
}
function streetLife(ctx) {
  const id = ctx.id,
    c = ctx.colors
  const market = at(ctx, 7.2, 8.2, -Math.PI / 2, ctx.base)
  awning(market, c, 0, 2.69, 0, 4.2, 2.55)
  market.box('wood', c.edge, 0, 0.87, 0, 3.91, 0.16, 1.26, true)
  for (const a of [-1, 1])
    for (const f of [-1, 1]) market.box('wood', c.wood, a * 1.65, 0.46, f * 0.49, 0.14, 0.9, 0.14)
  for (let j = 0; j < 9; j++) {
    const a = -1.56 + j * 0.39
    if (id === 'rain')
      market.ell('metal', j % 2 ? '#8d9e94' : '#a0a99c', a, 1.07, 0.12, 0.13, 0.085, 0.3, 0, 0.05)
    else if (id === 'salt')
      market.cyl('plaster', j % 2 ? c.cloth : c.wall, a, 1.13, 0.12, 0.14, 0.32, 0.14, 0.64, 1, 10)
    else if (id === 'root')
      market.ell('leaf', j % 2 ? '#9d925f' : '#a9836b', a, 1.06, 0.09, 0.15, 0.13, 0.19)
    else market.box('metal', j % 2 ? '#808785' : '#887567', a, 1.05, 0.08, 0.24, 0.14, 0.51)
  }
  market.lantern(1.39, 2.26, 0.58, 0.88)
  for (const [x, z] of [
    [-5, 15],
    [4.9, -15],
    [-4.8, -26],
    [7, -37],
  ]) {
    const b = at(ctx, x, z)
    b.box('wood', c.wood, 0, 1.81, 0, 0.15, 3.62, 0.15, true)
    b.rod('wood', c.edge, [0, 3.4, 0], [0.9, 3.54, 0], 0.092)
    b.lantern(0.79, 2.88, 0.01, 0.95)
  }
  if (id === 'rain') {
    const b = at(ctx, 9, -16)
    for (const s of [-1, 1]) b.rod('wood', c.edge, [s * 2.2, 0, 0], [s * 2.15, 3.98, 0], 0.1)
    for (let i = 0; i < 10; i++) {
      const x = -1.87 + i * 0.42,
        dip = Math.cos(x * 0.75) * 0.35
      b.rod('cloth', c.trim, [x, 3.33 - dip, 0], [x - 0.28, 1.16 - dip, -0.08], 0.023)
      b.rod('cloth', c.edge, [x, 3.33 - dip, 0], [x + 0.31, 1.16 - dip, -0.08], 0.023)
    }
    for (let i = 0; i < 7; i++)
      b.rod('cloth', c.edge, [-2.12, 3.28 - i * 0.31, 0], [2.12, 3.28 - i * 0.31, 0], 0.023)
  } else if (id === 'salt') {
    const b = at(ctx, 7, -14)
    b.cyl('masonry', c.wall, 0, 0.5, 0, 1.73, 0.98, 1.73, 1, 1, 14)
    b.hit(0, 0.48, 0, 2.6, 0.96, 2.6)
    b.cyl('plaster', c.shade, 0, 1.01, 0, 1.22, 0.035, 1.22)
    for (const s of [-1, 1]) b.rod('wood', c.wood, [s * 1.53, 0.76, 0], [s * 1.53, 3.42, 0], 0.13)
    b.rod('wood', c.wood, [-1.73, 3.34, 0], [1.73, 3.34, 0], 0.16)
    b.rod('cloth', c.trim, [0, 3.35, 0], [0, 0.98, 0], 0.034)
  } else if (id === 'root') {
    const b = at(ctx, 8, -15)
    for (let k = 0; k < 3; k++) {
      const x = k * 0.92 - 1,
        z = (k % 2) * 0.58,
        h = 1.0 + k * 0.33
      b.cyl('wood', c.edge, x, h * 0.5, z, 0.42, h, 0.42, 1, 0.84, 12)
      b.cyl('cloth', c.trim, x, h + 0.02, z, 0.434, 0.062, 0.434, 1, 1, 12)
      for (const s of [-1, 1])
        b.rod('cloth', c.wood, [x + s * 0.38, 0.09, z + 0.15], [x + s * 0.35, h, z + 0.23], 0.031)
    }
  } else {
    const b = at(ctx, 8, -17)
    for (const s of [-1, 1]) b.box('metal', c.shade, s * 0.6, 0.12, 0, 0.095, 0.12, 9.32)
    for (let i = -4; i <= 4; i++) b.box('wood', c.edge, 0, 0.05, i, 1.7, 0.1, 0.27)
    b.box('metal', c.shade, 0, 0.83, 0, 1.53, 0.8, 2.25, true)
    for (const s of [-1, 1])
      for (const f of [-1, 1])
        b.cyl('metal', c.wood, s * 0.7, 0.34, f * 0.68, 0.26, 0.12, 0.26, 1, 1, 12, 0, Math.PI / 2)
    for (let i = 0; i < 6; i++)
      b.ell(
        'masonry',
        i % 2 ? c.stone : c.base,
        Math.sin(i * 6.84) * 0.46,
        1.16,
        Math.cos(i * 8.32) * 0.74,
        0.28,
        0.26,
        0.32,
      )
  }
}
export function createSettlement(scene, id) {
  if (id === 'capital') return createCapital(scene)
  const group = new THREE.Group()
  group.name = biomes[id].city
  scene.add(group)
  const ctx = makeContext(group, id)
  layouts[id].forEach(([x, z, a, w, d, h], i) =>
    dwelling(ctx, x, z, a, w, d, h, i, i < 4 ? details[id].shops[i] : ''),
  )
  watchtower(ctx)
  undercroft(ctx)
  entryGate(ctx)
  streetLife(ctx)
  const releaseDistrict = district(ctx, layouts[id])
  ctx.batch.finish()
  const names = details[id].people
  const npcSpawns = [
    { name: names[0], x: -2.8, z: 12.8, job: '巡线员' },
    { name: names[1], x: 4.1, z: 6.1, job: '市集商贩' },
    { name: names[2], x: -3.8, z: -25.0, job: '城门守卫', guard: true },
    { name: names[3], x: 3.8, z: -3.8, job: '值班守卫', guard: true },
    { name: names[4], x: -7.4, z: 18.0, job: '旅人' },
    { name: names[5], x: 7.3, z: -19.4, job: '修造师' },
  ]
  return {
    colliders: ctx.colliders,
    features: ctx.features,
    npcSpawns,
    update(dt, time, daylight) {
      ctx.materials.lamp.emissiveIntensity =
        0.3 + (1 - Math.min(1, Math.max(0, daylight))) * 2.8 + Math.sin(time * 5.1) * 0.025
    },
    dispose() {
      releaseDistrict()
      releaseGeometry(group)
      for (const m of Object.values(ctx.materials)) {
        m.map?.dispose()
        m.dispose()
      }
      for (const m of ctx.signs) {
        m.map.dispose()
        m.dispose()
      }
    },
  }
}
