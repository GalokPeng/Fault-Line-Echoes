import { attackStyle } from './combat.js'

// Each mark uses a single silhouette, shaded planes, lit edges and an optional
// engraved line. Flat colours keep its shape legible on a small action button.
const palettes = {
  leaf: { ink: '#233e35', face: '#8cc49c', shade: '#527e67', light: '#e0f5c6' },
  stone: { ink: '#483325', face: '#dda575', shade: '#956746', light: '#ffdda1' },
  tide: { ink: '#203f50', face: '#78c0d4', shade: '#457e96', light: '#d5f7ee' },
  beam: { ink: '#40354c', face: '#b9a2d2', shade: '#77668f', light: '#f4dcf0' },
}
const art = {
  leaf: {
    // Forward leaf, turnback ribbon, open palm and broken lines.
    q: [
      'M4 36 16 25 10 25 26 13 43 6 37 24 24 36 26 28 16 34Z',
      'M43 6 32 24 24 36 26 28 16 34 22 26Z',
      'M10 25 26 13 43 6 28 16 20 23Z M4 40 14 34 11 39Z',
      'M20 29 34 16',
    ],
    e: [
      'M6 22 22 7 21 15 30 15Q43 17 42 28 41 41 23 42L17 39Q33 36 33 28 33 23 26 23L20 23 19 31Z',
      'M42 25Q46 40 23 42L17 39Q37 37 38 28L36 23Z M6 22 20 23 19 31Z',
      'M6 22 22 7 20 12 13 20Z M23 16Q33 14 38 21L33 19 24 18Z',
      '',
    ],
    c: [
      'M9 37 13 29 9 22Q8 19 10 18L17 23 16 13Q16 10 19 11L22 20 22 10Q22 7 25 9L27 19 28 12Q29 9 31 11L32 22 34 19Q37 17 37 20L34 29Q32 34 26 36L21 42Z',
      'M9 37 14 29 22 33 30 30 26 36 21 42Z',
      'M4 16Q4 10 11 7L13 9Q8 12 7 17Z M7 22Q6 15 14 13L15 15Q11 17 10 21Z',
      'M18 25Q22 24 25 28',
    ],
    v: [
      'M3 14 21 10 18 16 5 19Z M24 9 45 5 31 14 22 15Z M4 25 20 21 16 28 5 30Z M24 20 43 15 32 24 20 27Z M8 36 18 33 14 40 5 42Z M23 31 39 26 29 35 18 39Z',
      'M5 19 18 16 21 10 16 14Z M5 30 16 28 20 21 15 26Z M5 42 14 40 18 33 13 38Z',
      'M26 9 45 5 28 11Z M26 20 43 15 27 22Z M25 31 39 26 24 33Z',
      '',
    ],
  },
  stone: {
    // Braced shoulder, a deflecting guard, a ground pulse and closing sluices.
    q: [
      'M5 39 9 28 17 22 21 15 31 13 39 18 44 28 36 31 28 27 20 38 15 42Z M17 15 18 9 24 6 29 9 28 14 22 17Z',
      'M9 28 17 22 24 23 20 31 15 42 5 39Z M31 21 40 23 44 28 36 31 29 27Z',
      'M21 15 31 13 39 18 30 17 24 20Z M3 22 13 19 11 22 3 25Z',
      'M23 26 27 22',
    ],
    e: [
      'M10 12 28 6 35 9 34 22 29 31 21 38 13 34 9 25Z M27 36 37 26 33 26 44 17 42 31 39 29 33 38Z',
      'M23 13 35 9 34 22 29 31 21 38 18 33 23 25Z',
      'M10 12 28 6 31 8 14 15 13 25 10 26Z M5 31 13 38 21 41 16 43 8 38Z',
      'M16 20 21 17',
    ],
    c: [
      'M3 32Q12 24 21 25L27 17 31 8 35 6 35 17 30 25Q38 24 45 29 37 37 26 37L18 43 20 36Q10 36 3 32Z',
      'M3 32 12 32 20 34 26 32 35 33 45 29Q38 37 26 37L18 43 20 36Q10 36 3 32Z',
      'M10 30 21 27 29 21 24 29 17 32Z M29 19 31 8 35 6 33 15Z',
      'M32 29 38 29',
    ],
    v: [
      'M4 11 18 6 22 10 22 36 17 41 4 36Z M26 10 30 6 44 11 44 36 31 41 26 36Z',
      'M17 12 22 10 22 36 17 41Z M26 10 31 13 31 41 26 36Z',
      'M5 12 18 7 20 10 7 15Z M28 10 30 7 43 12 41 15Z M6 23 12 20 17 24 12 28 6 26Z M42 23 36 20 31 24 36 28 42 26Z',
      'M8 31 14 33 M34 33 40 31',
    ],
  },
  tide: {
    q: [
      'M5 41 13 29 19 25Q19 18 27 15L44 5 36 23Q33 31 26 31L18 36Z',
      'M5 41 27 26 44 5 36 23Q33 31 26 31L18 36Z',
      'M23 23Q24 19 30 17L40 10 30 21Z M5 31 13 23 15 24 9 31Z',
      '',
    ],
    e: [
      'M3 36Q9 29 16 19 22 10 31 9 39 9 43 15 35 13 32 18 31 22 36 26 40 29 45 27 39 37 30 37 21 37 17 32 10 39 3 36Z',
      'M3 36Q15 36 21 26 19 35 30 34 39 34 45 27 39 37 30 37 21 37 17 32 10 39 3 36Z M32 18 36 14 43 15 37 16 35 20 36 26Z',
      'M14 25Q21 12 30 10 35 9 39 12 29 11 24 17Z',
      'M17 40Q28 43 36 39',
    ],
    c: [
      'M4 27 16 14 16 21 23 14 23 25 16 32 15 38Z M25 26Q23 19 30 15L43 9 38 23Q34 31 25 26Z',
      'M4 27 15 28 15 38Z M25 26 35 21 43 9 38 23Q34 31 25 26Z',
      'M4 27 16 14 15 20 9 26Z M27 20 40 12 32 20Z M28 35 39 29 36 34Z',
      '',
    ],
    v: [
      'M4 28 9 18 17 14 15 23 8 29Z M13 35 19 20 32 11 27 26 18 34Z M24 40 31 28 45 20 39 33 30 40Z',
      'M4 28 13 21 17 14 15 23 8 29Z M13 35 24 26 32 11 27 26 18 34Z M24 40 38 31 45 20 39 33 30 40Z',
      'M6 23 9 18 16 15 12 20Z M17 28 20 20 29 14 23 22Z M29 34 32 28 42 23 35 30Z',
      '',
    ],
  },
  beam: {
    q: [
      'M6 38 11 24 16 8 19 13 14 29 27 10 32 8 31 15 17 32 37 21 44 21 41 27 17 38 11 41Z',
      'M6 38 11 35 17 32 37 21 44 21 41 27 17 38 11 41Z',
      'M11 25 16 8 18 13 14 24Z M16 31 27 10 31 9 26 18Z M21 33 40 23 37 27Z',
      '',
    ],
    e: [
      'M4 38 19 17 29 19 42 6 38 20 28 31 19 27 9 39Z',
      'M4 38 20 23 27 26 42 6 38 20 28 31 19 27 9 39Z',
      'M7 32 19 17 29 19 26 22 20 20Z M32 16 42 6 39 13Z',
      'M12 42 20 33',
    ],
    c: [
      'M8 34 16 29 22 20 22 11 28 6 33 12 29 20 25 23 21 32 29 34 37 31 34 39 19 42 8 39Z',
      'M8 34 19 37 30 35 37 31 34 39 19 42 8 39Z M22 20 28 15 33 12 29 20 25 23Z',
      'M22 11 28 6 31 10 26 14Z M4 26 13 21 12 25 4 29Z',
      'M17 31 21 26',
    ],
    v: [
      'M4 33 15 28 17 20 27 9 26 21 32 16 42 8 38 22 43 20 37 31 25 39 12 41Z',
      'M4 33 15 35 25 32 34 26 43 20 37 31 25 39 12 41Z',
      'M15 30 18 20 27 9 22 23Z M25 28 31 17 41 10 34 21Z M8 35 16 36 22 35 15 39Z',
      'M30 34 36 29',
    ],
  },
}

const hints = {
  leaf: {
    q: '向前突进，打击近身目标',
    e: '后撤一步，同时近身反击',
    c: '向准星发出一道掌波，射程{shot}米',
    v: '快速前冲，打出一记重击',
  },
  stone: {
    q: '沉肩前顶，撞击近身目标',
    e: '架开正面攻势，招架窗口{parry}秒',
    c: '推出一道震波，射程{shot}米',
    v: '合掌重击，攻击身前{dist}米内的目标',
  },
  tide: {
    q: '向准星高速直射，射程{shot}米',
    e: '发出略宽的浪波，射程{shot}米',
    c: '迅速后撤，同时向前发射声波',
    v: '发出三拍脉冲，射程{shot}米',
  },
  beam: {
    q: '发出宽幅扇形脉冲，射程{shot}米',
    e: '向准星发出集中脉冲，射程{shot}米',
    c: '向前踏进，打击近身目标',
    v: '推出宽幅强脉冲，射程{shot}米',
  },
}
const NS = 'http://www.w3.org/2000/svg'

export function skillHint(role, key) {
  const slot = String(key).toLowerCase()
  if (!Object.hasOwn(hints, role) || !Object.hasOwn(hints[role], slot)) return ''
  const style = attackStyle(role, slot)
  return hints[role][slot].replace(/\{(shot|parry|dist)\}/g, (_, field) => String(style[field]))
}
export function skillIcon(role, key) {
  const icon = document.createElementNS(NS, 'svg')
  icon.setAttribute('viewBox', '0 0 48 48')
  icon.setAttribute('width', '48')
  icon.setAttribute('height', '48')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  const colors = palettes[role],
    layers = art[role]?.[String(key).toLowerCase()]
  if (!colors || !Array.isArray(layers)) return icon
  const [silhouette, shade, light, line] = layers
  function path(d, fill, stroke, width) {
    const shape = document.createElementNS(NS, 'path')
    shape.setAttribute('d', d)
    shape.setAttribute('fill', fill)
    if (stroke) {
      shape.setAttribute('stroke', stroke)
      shape.setAttribute('stroke-width', width)
      shape.setAttribute('stroke-linejoin', 'round')
      shape.setAttribute('stroke-linecap', 'round')
    }
    icon.append(shape)
  }
  path(silhouette, colors.face, colors.ink, '1.7')
  path(shade, colors.shade)
  path(light, colors.light)
  if (line) path(line, 'none', colors.light, '1.45')
  return icon
}
