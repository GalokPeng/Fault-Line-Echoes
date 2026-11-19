import * as T from 'three'
import { Batch, beam, shape, releaseGeometry } from './settlement-geometry.js'
import { palette } from './settlement-kit.js'

// The face points towards the main street. Its interaction point is in front
// of the counter, on walkable ground shared by the renderer and Rapier.
const posts = {
  rain: { x: -6.8, z: 7.4, yaw: 0.72, title: '汇流镇委托栏', seal: '渡', mark: '汇流镇　渡船社' },
  salt: { x: 6.9, z: -6.8, yaw: -0.79, title: '白盐城委托栏', seal: '盐', mark: '白盐城　盐引所' },
  root: { x: -7, z: -4.6, yaw: 0.92, title: '古根庭委托栏', seal: '林', mark: '古根庭　绳匠家' },
  gorge: { x: 7.7, z: 1.5, yaw: -0.92, title: '断潮关委托栏', seal: '关', mark: '断潮关　石工所' },
}
export function commissionPostSite(zone) {
  const p = posts[zone]
  return p ? { x: p.x + 1.5 * Math.sin(p.yaw), z: p.z + 1.5 * Math.cos(p.yaw), title: p.title } : null
}

function papers(ctx, theme, zone) {
  const width = 640,
    height = 360
  ctx.fillStyle = '#513e30'
  ctx.fillRect(0, 0, width, height)
  for (let j = 0; j < 6; j++) {
    ctx.fillStyle = j % 2 ? '#664d39' : '#735840'
    ctx.fillRect(0, j * 60, width, 57)
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = 'rgba(37,28,21,.22)'
      ctx.lineWidth = 1.7
      ctx.beginPath()
      ctx.moveTo(0, j * 60 + i * 11 + 3)
      ctx.bezierCurveTo(150, j * 60 + i * 11 + 8, 340, j * 60 + i * 11 - 4, width, j * 60 + i * 11 + 3)
      ctx.stroke()
    }
  }
  ctx.fillStyle = theme.shade
  ctx.fillRect(0, 0, width, 73)
  ctx.strokeStyle = theme.trim
  ctx.lineWidth = 3
  ctx.strokeRect(5, 5, width - 10, 62)
  ctx.fillStyle = '#f0dfac'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.font = 'bold 41px "Microsoft YaHei","Noto Sans CJK SC",sans-serif'
  ctx.fillText('委 托 布 告', 320, 36)
  ctx.font = '19px "Microsoft YaHei",sans-serif'
  ctx.fillText(zone.seal, 48, 35)
  ctx.fillText(zone.seal, 592, 35)
  const sheets = [
    { x: 63, y: 101, w: 151, h: 200, r: -0.045 },
    { x: 244, y: 97, w: 173, h: 220, r: 0.027 },
    { x: 448, y: 112, w: 131, h: 177, r: -0.035 },
  ]
  sheets.forEach(({ x, y, w, h, r }, i) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(r)
    ctx.fillStyle = '#3d3428'
    ctx.fillRect(3, 4, w, h)
    ctx.fillStyle = ['#dbca9e', '#f0e0ac', '#ddc697'][i]
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(w, 0)
    ctx.lineTo(w, h - 5)
    ctx.lineTo(w * 0.58, h)
    ctx.lineTo(w * 0.51, h - 5)
    ctx.lineTo(1, h)
    ctx.fill()
    ctx.fillStyle = '#4c4332'
    ctx.font = 'bold 24px "Microsoft YaHei",sans-serif'
    ctx.fillText(['告示', '巡线委托', '招募'][i], w / 2, 34)
    ctx.fillStyle = '#8a7558'
    for (let k = 0; k < 7; k++)
      ctx.fillRect(15, 58 + 15 * k, w * (0.59 + 0.18 * Math.sin(i + k * 3.4)), 2.4)
    ctx.strokeStyle = '#a34833'
    ctx.lineWidth = 2.6
    ctx.strokeRect(w - 38, h - 41, 23, 23)
    ctx.font = 'bold 14px "Microsoft YaHei",sans-serif'
    ctx.fillStyle = '#a34833'
    ctx.fillText(zone.seal, w - 26, h - 28)
    ctx.fillStyle = '#594e3d'
    ctx.beginPath()
    ctx.arc(w * 0.49, 9, 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
  ctx.fillStyle = '#e6cf9e'
  ctx.textAlign = 'right'
  ctx.font = '16px "Microsoft YaHei",sans-serif'
  ctx.fillText(zone.mark, 618, 339)
}
function faceTexture(theme, post) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  papers(ctx, theme, post)
  const map = new T.CanvasTexture(canvas)
  map.colorSpace = T.SRGBColorSpace
  map.anisotropy = 4
  return map
}
export function buildCommissionPost(scene, zone, ground) {
  const post = posts[zone],
    colliders = []
  if (!post) return { group: null, colliders, dispose() {} }
  const { x, z, yaw } = post,
    co = Math.cos(yaw),
    sn = Math.sin(yaw),
    theme = palette[zone],
    y = ground(x, z)
  const world = (u, v) => [x + u * co + v * sn, z - u * sn + v * co]
  const group = new T.Group()
  group.name = post.title
  group.position.set(x, y, z)
  group.rotation.y = yaw
  scene.add(group)
  const frame = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 })
  const batch = new Batch(group, { frame })
  const box = (color, x, y, z, w, h, d, rotation) =>
    batch.add('frame', shape.box(), color, x, y, z, w, h, d, rotation)
  const rod = (color, a, b, r) => beam(batch, 'frame', color, a, b, r)
  const solid = (u, h, v, w, t, d) => {
    const [cx, cz] = world(u, v)
    colliders.push({ x: cx, y: y + h, z: cz, w, h: t, d, yaw })
  }
  for (const side of [-1, 1]) {
    const u = side * 1.33,
      [px, pz] = world(u, 0),
      toe = ground(px, pz) - y - 0.1
    const high = 2.45
    const timber = zone === 'root' || zone === 'rain'
    if (timber) rod(theme.wood, [u, toe, 0], [u + 0.04 * side, high, 0], 0.11)
    else box(theme.wood, u, (toe + high) / 2, 0, 0.16, high - toe, 0.18)
    box(theme.base, u, toe + 0.2, 0, 0.37, 0.41, 0.37)
    for (const yy of [0.44, 1.96, 2.08]) box(theme.trim, u, yy, 0, 0.246, 0.055, 0.245)
    solid(u, (toe + high) / 2, 0, 0.23, high - toe, 0.23)
  }
  box(theme.wood, 0, 1.44, 0, 2.72, 1.6, 0.145)
  solid(0, 1.44, 0, 2.72, 1.6, 0.18)
  box(theme.edge, 0, 0.66, 0.025, 2.84, 0.11, 0.23)
  box(theme.trim, 0, 2.23, 0, 2.85, 0.085, 0.2)
  if (zone === 'rain') {
    for (const s of [-1, 1]) box(theme.roof, 0, 2.46, s * 0.246, 3.14, 0.09, 0.66, [-s * 0.27, 0, 0])
    rod(theme.edge, [-1.63, 2.59, 0], [1.63, 2.59, 0], 0.062)
  } else if (zone === 'salt') {
    for (let i = 0; i < 8; i++)
      box(
        i % 2 ? theme.trim : theme.cloth,
        (i - 3.5) * 0.38,
        2.46,
        0.13,
        0.381,
        0.075,
        0.92,
        [-0.16, 0, 0],
      )
    for (let i = 0; i < 6; i++)
      box(i % 2 ? theme.cloth : theme.trim, (i - 2.5) * 0.49, 2.32, 0.58, 0.42, 0.19, 0.035)
  } else if (zone === 'root') {
    for (const s of [-1, 1]) {
      rod(theme.edge, [s * 1.36, 2.17, 0], [s * 0.91, 2.52, 0], 0.082)
      rod(theme.wood, [s * 0.91, 2.52, 0], [s * 0.18, 2.54, 0], 0.075)
      for (let i = 0; i < 6; i++)
        batch.add(
          'frame',
          shape.ball(),
          i % 2 ? theme.roof : theme.base,
          s * (0.31 + i * 0.19),
          2.53 - i * 0.042,
          0.08,
          0.18,
          0.043,
          0.105,
          [0, s * 0.48, s * 0.22],
        )
    }
  } else {
    box(theme.shade, 0, 2.39, 0, 3.01, 0.15, 0.43)
    for (const s of [-1, 1]) rod(theme.trim, [s * 1.35, 1.94, 0], [s * 0.96, 2.37, 0], 0.07)
    for (let i = 0; i < 6; i++)
      batch.add(
        'frame',
        shape.cyl(1, 1, 8),
        theme.trim,
        (i - 2.5) * 0.49,
        2.39,
        0.23,
        0.037,
        0.047,
        0.037,
        [Math.PI / 2, 0, 0],
      )
  }
  // A document tray projects towards the reader; the large clickable area stays outside it.
  box(theme.edge, 0, 0.68, 0.16, 2.7, 0.06, 0.31)
  batch.finish()
  const texture = faceTexture(theme, post)
  const material = new T.MeshStandardMaterial({
    color: texture ? '#ffffff' : '#ddc99d',
    map: texture,
    roughness: 0.94,
    emissive: '#ba9c67',
    emissiveMap: texture,
    emissiveIntensity: 0.12,
  })
  const face = new T.Mesh(new T.PlaneGeometry(2.57, 1.45), material)
  face.position.set(0, 1.45, 0.08)
  face.name = 'posted-notices'
  group.add(face)
  return {
    group,
    colliders,
    dispose() {
      releaseGeometry(group)
      texture?.dispose()
      material.dispose()
      frame.dispose()
    },
  }
}
