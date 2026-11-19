import * as T from 'three'
import { civicLevel } from './capital-data.js'

const bamboo = '#c79d62',
  wicker = '#956c41',
  flour = '#f3edda',
  wood = '#76543d',
  iron = '#455058'
const hit = { x: 108.276, y: civicLevel + 0.8063, z: 76.6125 }
const hearth = { x: 110.65, y: civicLevel + 0.92, z: 72.35 }
const steaming = [
  [-20, 15.8, 1.22],
  [-21.18, 14.37, 1.48],
]

function bun(b, x, y, z, s = 1) {
  b.ell('marble', flour, x, y + 0.064 * s, z, 0.136 * s, 0.102 * s, 0.129 * s)
  for (let i = 0; i < 7; i++) {
    const a = (i * 2 * Math.PI) / 7,
      dx = Math.sin(a) * s,
      dz = Math.cos(a) * s
    b.rod(
      'marble',
      '#e4d8ba',
      [x + dx * 0.093, y + 0.123 * s, z + dz * 0.089],
      [x + dx * 0.021, y + 0.164 * s, z + dz * 0.021],
      0.01 * s,
    )
  }
  b.ell('marble', '#e6d9ba', x, y + 0.164 * s, z, 0.032 * s, 0.014 * s, 0.032 * s)
}
function bambooTray(b, x, base, z, r, levels, open = true) {
  const h = 0.15
  for (let j = 0; j < levels; j++) {
    const y = base + j * h
    b.cyl('wood', j % 2 ? bamboo : '#bc924f', x, y + h / 2, z, r, h, r, 1, 0.98, 24)
    for (const off of [0.018, 0.121])
      b.cyl('wood', wicker, x, y + off, z, r + 0.006, 0.016, r + 0.006, 1, 1, 24)
  }
  const top = base + levels * h
  b.cyl('wood', open ? '#bca378' : bamboo, x, top, z, r * 0.9, 0.009, r * 0.9, 1, 1, 24)
  for (let i = -3; i <= 3; i++) {
    const d = i * 0.2 * r,
      len = 2 * Math.sqrt(Math.max(0, (r * 0.87) ** 2 - d * d))
    b.box('wood', open ? '#b4a27e' : '#dcc08c', x + d, top + 0.009, z, 0.017, 0.011, len)
  }
  if (!open) {
    b.rod('wood', wicker, [x - 0.11, top + 0.013, z], [x - 0.04, top + 0.112, z], 0.024)
    b.rod('wood', wicker, [x - 0.04, top + 0.112, z], [x + 0.11, top + 0.013, z], 0.024)
  }
  return top
}
function stall(b, x, z, w, d, h = 0.87) {
  b.box('wood', wood, x, h - 0.04, z, w, 0.085, d, true)
  for (const a of [-1, 1])
    for (const k of [-1, 1])
      b.box(
        'wood',
        '#6b4c35',
        x + a * (w / 2 - 0.1),
        h * 0.46,
        z + k * (d / 2 - 0.09),
        0.1,
        h * 0.92,
        0.11,
      )
}
function bakery(city) {
  const b = city.kit(-20, 15.8)
  stall(b, 0, 0, 2.46, 1.13, 0.9)
  const top = bambooTray(b, 0, 0.9, 0, 0.41, 1)
  bun(b, 0, top, 0)
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    bun(b, Math.sin(a) * 0.243, top, Math.cos(a) * 0.243, 0.89)
  }
  bambooTray(b, -0.79, 0.9, 0.08, 0.29, 3, false)
  const other = bambooTray(b, 0.77, 0.9, -0.04, 0.29, 1)
  for (const [x, z] of [
    [0.65, -0.11],
    [0.88, -0.12],
    [0.76, 0.11],
  ])
    bun(b, x, other, z, 0.75)
  const stove = city.kit(-21.18, 14.37)
  stove.cyl('marble', '#807263', 0, 0.38, 0, 0.46, 0.76, 0.46, 1, 0.89, 12)
  stove.box('metal', '#3f3b31', 0, 0.48, 0.43, 0.39, 0.32, 0.07)
  stove.cyl('metal', '#4d534d', 0, 0.82, 0, 0.45, 0.15, 0.45, 1, 0.83, 14)
  bambooTray(stove, 0, 0.91, 0, 0.43, 3, false)
  stove.hit(0, 0.5, 0, 0.75, 1.0, 0.75)
  const board = city.kit(-19.91, 13.56)
  stall(board, 0, 0, 0.8, 0.5, 0.83)
  board.box('wood', '#d6b88c', 0, 0.84, 0, 0.7, 0.027, 0.42)
  for (let i = 0; i < 3; i++) bun(board, (i - 1) * 0.2, 0.86, 0.1, 0.55)
  // Open bamboo baskets, tins and flour sacks are visible just inside the doorway.
  const kitchen = city.kit(-29, 12, Math.PI / 2)
  for (let j = 0; j < 3; j++) {
    const x = -3.0 + j * 0.74
    kitchen.ell('roof', '#b3a480', x, 0.53, -2.8, 0.38, 0.58, 0.32)
    kitchen.cyl('wood', wicker, x, 1.02, -2.8, 0.13, 0.077, 0.13)
  }
  stall(kitchen, 2.7, -1.83, 2.1, 0.92)
  bambooTray(kitchen, 2.62, 0.87, -1.84, 0.43, 4, false)
  kitchen.sign('现蒸出笼', 0, 1.56, 3.86, 0.69)
}
function blacksmith(city) {
  const b = city.kit(hit.x, hit.z)
  b.cyl('wood', '#76583c', 0, 0.18, 0, 0.32, 0.36, 0.31, 1, 1.04, 12)
  for (const y of [0.08, 0.27]) b.cyl('metal', iron, 0, y, 0, 0.336, 0.046, 0.325, 1, 1, 12)
  b.box('metal', '#4d5659', 0, 0.396, 0, 0.56, 0.095, 0.37)
  b.box('metal', '#4d5659', 0, 0.519, 0, 0.35, 0.19, 0.26)
  b.box('metal', '#859292', 0, 0.677, 0, 0.62, 0.15, 0.35)
  b.cyl('metal', '#6c797b', -0.44, 0.67, 0, 0.14, 0.36, 0.14, 0.1, 1, 10, 0, Math.PI / 2)
  b.box('metal', '#5f6868', 0.37, 0.664, 0, 0.22, 0.1, 0.24)
  b.box('ember', '#ef874a', 0, 0.7785, 0, 0.325, 0.055, 0.073)
  b.hit(0, 0.36, 0, 0.63, 0.72, 0.4)
  const f = city.kit(hearth.x, hearth.z, -Math.PI / 2)
  f.box('marble', '#766354', 0, 0.43, 0.05, 2.18, 0.86, 1.64, true)
  f.box('metal', '#403f39', 0, 1.04, 0, 1.77, 0.37, 1.24)
  for (const a of [-1, 1]) f.box('marble', '#a47d5d', a * 0.99, 1.4, -0.01, 0.25, 1.2, 1.69, true)
  f.box('marble', '#8a6850', 0, 1.5, -0.74, 2.14, 1.32, 0.26, true)
  f.box('marble', '#806652', 0, 2.13, -0.63, 2.04, 0.31, 0.67)
  f.cyl('metal', '#525856', 0, 2.38, -0.53, 1.07, 0.42, 0.8, 0.59, 1, 6)
  f.cyl('metal', '#50585b', 0, 3.56, -0.57, 0.35, 2.12, 0.35, 1, 1, 10)
  f.cyl('metal', '#89735b', 0, 4.66, -0.57, 0.41, 0.14, 0.41)
  for (let i = 0; i < 13; i++) {
    const x = Math.sin(i * 1.77) * 0.67,
      z = Math.cos(i * 1.32) * 0.4
    f.ell(
      i % 3 === 0 ? 'metal' : 'ember',
      i % 3 === 0 ? '#393833' : '#b85d35',
      x,
      1.2 + (i % 2) * 0.04,
      z,
      0.14,
      0.105,
      0.14,
    )
    if (i % 2 === 1)
      f.cyl(
        'ember',
        '#e78245',
        x,
        1.37 + (i % 3) * 0.04,
        z,
        0.077,
        0.25 + (i % 3) * 0.08,
        0.097,
        0.03,
        1,
        7,
        0,
        ((i % 3) - 1) * 0.16,
      )
  }
  for (let j = 0; j < 2; j++) {
    const q = f.pt((j - 0.5) * 0.62, 1.15, 0.42)
    const raw = city.kit(q[0], q[2])
    raw.rod('metal', iron, [-0.35, 1.15, 0], [0.34, 1.28, 0.04], 0.035)
  }
  const rack = city.kit(111.49, 79.2, -Math.PI / 2)
  rack.box('wood', wood, 0, 1.64, 0, 2.36, 0.22, 0.24)
  for (const s of [-1, 1]) rack.box('wood', wood, s * 1.1, 0.8, 0, 0.13, 1.6, 0.17, true)
  for (let j = 0; j < 5; j++) {
    const x = (j - 2) * 0.38
    rack.rod('wood', '#a18157', [x, 1.45, 0.11], [x + 0.05, 1.08, 0.11], 0.028)
    rack.box('metal', '#6e7775', x + 0.05, 1.02, 0.11, 0.14 + (j % 2) * 0.06, 0.11, 0.1)
  }
  const bellows = city.kit(110.54, 71.08)
  bellows.ell('wood', '#825b3e', 0, 0.82, 0, 0.4, 0.24, 0.56)
  for (const off of [0.64, 0.99]) bellows.box('wood', '#ac8257', 0, off, 0, 0.73, 0.08, 0.89)
  bellows.rod('wood', '#78583c', [0, 0.98, -0.28], [0, 1.29, -0.85], 0.066)
  bellows.rod('metal', '#626666', [0, 0.81, 0.4], [0, 0.83, 1.03], 0.091)
}
const herbs = ['#789350', '#9b8a59', '#907284', '#aa7861']
function medicine(city) {
  const shop = city.kit(66, -19, -Math.PI / 2)
  // Drawer fronts, pulls and cabinet labels share the wall visible through the entrance.
  shop.box('wood', '#684c3d', 0, 1.43, -5.52, 8.11, 2.86, 0.62, true)
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 10; col++) {
      const x = (col - 4.5) * 0.77,
        y = 0.37 + row * 0.48
      shop.box('wood', (row + col) % 3 === 0 ? '#a47851' : '#95694c', x, y, -5.16, 0.7, 0.42, 0.085)
      shop.box('marble', '#ddca9e', x, y + 0.052, -5.11, 0.27, 0.105, 0.016)
      shop.cyl('metal', '#c5a36d', x, y - 0.069, -5.078, 0.035, 0.06, 0.035, 1, 1, 8, Math.PI / 2)
    }
  shop.box('wood', '#846348', 0, 2.94, -5.46, 8.28, 0.17, 0.76)
  for (const [x, label] of [
    [-2.6, '花 叶'],
    [0, '根 茎'],
    [2.6, '种 仁'],
  ])
    shop.sign(label, x, 3.13, -5.13, 0.62)
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 0.89,
      col = i % 3 === 0 ? '#c4b79e' : '#718d81'
    shop.ell('marble', col, x, 3.15, -5.48, 0.2, 0.22, 0.18)
    shop.cyl('wood', wood, x, 3.36, -5.48, 0.15, 0.08, 0.15, 1, 1, 10)
  }
  stall(shop, 3.2, 2.06, 3.0, 1.06, 0.9)
  for (let j = 0; j < 5; j++)
    shop.ell('marble', j % 2 ? '#b18b63' : '#858765', 2.21 + j * 0.45, 1.07, 2.05, 0.16, 0.14, 0.16)
  // The dispensing counter and its beam scale are approached from either side.
  const counter = city.kit(67.62, -19, -Math.PI / 2)
  stall(counter, 0, 0, 4.65, 1.14, 0.98)
  counter.box('wood', '#aa845e', 0, 0.54, 0.48, 4.47, 0.86, 0.13, true)
  counter.cyl('metal', '#9e885d', -0.85, 1.08, 0, 0.22, 0.15, 0.22, 1, 1, 12)
  counter.rod('metal', '#a38c64', [-0.85, 1.13, 0], [-0.85, 1.78, 0], 0.036)
  counter.rod('metal', '#ac976c', [-1.45, 1.73, 0], [-0.25, 1.73, 0], 0.025)
  for (const x of [-1.43, -0.27]) {
    for (const side of [-1, 1])
      counter.rod('metal', '#88785b', [x, 1.72, 0], [x + side * 0.15, 1.33, 0.03], 0.009)
    counter.cyl('metal', '#baa475', x, 1.3, 0.03, 0.19, 0.068, 0.19, 1, 0.48, 12)
  }
  for (let j = 0; j < 3; j++) {
    const x = 0.45 + j * 0.44
    counter.ell('marble', j % 2 ? '#7c9b92' : '#cdc2a2', x, 1.13, 0, 0.14, 0.17, 0.13)
    counter.cyl('wood', wood, x, 1.32, 0, 0.09, 0.056, 0.09)
    counter.box('marble', '#e9d7b3', x, 1.15, 0.127, 0.11, 0.075, 0.011)
  }
  const bench = city.kit(64.8, -15.18, -Math.PI / 2)
  stall(bench, 0, 0, 2.59, 0.59, 0.52)
  bench.box('wood', '#9e7650', 0, 0.82, -0.24, 2.64, 0.52, 0.095)
  const stand = city.kit(57.7, -21.6, -Math.PI / 2)
  stall(stand, 0, 0.13, 2.67, 0.83, 0.83)
  stand.cyl('marble', '#b0ae99', 0.25, 0.91, 0.07, 0.19, 0.15, 0.19, 1, 0.65, 12)
  stand.cyl('marble', '#747a6a', 0.25, 0.985, 0.07, 0.135, 0.016, 0.135)
  for (let j = 0; j < 3; j++) {
    const x = -0.95 + j * 0.43
    stand.box('wood', '#bc9772', x, 0.91, 0.15, 0.38, 0.12, 0.44)
    for (let k = 0; k < 7; k++) {
      const px = x + ((k % 3) - 1) * 0.086,
        pz = 0.15 + (Math.floor(k / 3) - 0.8) * 0.092
      stand.ell('roof', herbs[j], px, 0.995 + (k % 2) * 0.025, pz, 0.061, 0.026, 0.098, 0, k * 0.29)
    }
  }
  for (let j = 0; j < 5; j++) {
    const s = (j - 2) * 0.74
    shop.rod('wood', '#9b8861', [s, 3.11, 6.61], [s, 2.79, 6.61], 0.012)
    for (let k = 0; k < 3; k++) {
      const xx = s + (k - 1) * 0.09
      shop.rod('wood', '#8a7958', [s, 2.79, 6.61], [xx, 2.45, 6.67], 0.016)
      shop.ell('roof', herbs[(j + k) % 4], xx, 2.41, 6.66, 0.074, 0.146, 0.062, 0, (k - 1) * 0.17)
    }
  }
}
function signboard(city, at, yaw, word, name, background, trim) {
  const b = city.kit(at[0], at[1], yaw)
  const y = 3.5
  b.box('wood', wood, 0, y + 0.34, -0.27, 0.15, 0.18, 1.22)
  for (const s of [-1, 1])
    b.rod('metal', '#685c47', [s * 0.24, y + 0.32, 0.17], [s * 0.24, y + 0.02, 0.17], 0.019)
  b.box('wood', '#604c38', 0, y - 0.58, 0.17, 1.19, 1.31, 0.116)
  if (typeof document === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 280
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, 256, 280)
  ctx.strokeStyle = trim
  ctx.lineWidth = 5
  ctx.strokeRect(9, 9, 238, 262)
  ctx.lineWidth = 1.6
  ctx.strokeRect(16, 16, 224, 248)
  ctx.fillStyle = trim
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 127px "Microsoft YaHei","Noto Sans CJK SC",serif'
  ctx.fillText(word, 128, 105, 193)
  ctx.fillRect(36, 184, 184, 2)
  ctx.font = 'bold 33px "Microsoft YaHei","Noto Sans CJK SC",serif'
  ctx.fillText(name, 128, 218, 190)
  const tex = new T.CanvasTexture(canvas)
  tex.colorSpace = T.SRGBColorSpace
  const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.79, side: T.DoubleSide })
  const plane = new T.Mesh(new T.PlaneGeometry(1.12, 1.25), mat)
  plane.position.set(...b.pt(0, y - 0.59, 0.236))
  plane.rotation.y = yaw
  city.group.add(plane)
  return () => {
    mat.dispose()
    tex.dispose()
  }
}
export function buildShops(city) {
  bakery(city)
  blacksmith(city)
  medicine(city)
  const signs = [
    signboard(city, [-23.4, 8.5], Math.PI / 2, '包', '程记鲜蒸', '#77543b', '#f3db9e'),
    signboard(city, [111.6, 70.9], -Math.PI / 2, '铁', '鸣铁铸坊', '#3e5153', '#e8bd76'),
    signboard(city, [59.7, -24.1], -Math.PI / 2, '药', '回春药铺', '#426450', '#e2d7a1'),
  ]
  return () => {
    for (const dispose of signs) dispose?.()
  }
}
function particles(group, n, spark) {
  const coords = new Float32Array(n * 3),
    sizes = new Float32Array(n),
    alphas = new Float32Array(n)
  const geometry = new T.BufferGeometry()
  for (const [key, array, dim] of [
    ['position', coords, 3],
    ['radius', sizes, 1],
    ['alpha', alphas, 1],
  ]) {
    geometry.setAttribute(key, new T.BufferAttribute(array, dim).setUsage(T.DynamicDrawUsage))
  }
  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: spark ? T.AdditiveBlending : T.NormalBlending,
    uniforms: { tint: { value: new T.Color(spark ? '#ffad61' : '#f1efdf') } },
    vertexShader: `attribute float radius;attribute float alpha;varying float fade;
    void main(){vec4 p=modelViewMatrix*vec4(position,1.);fade=alpha;gl_PointSize=clamp(radius*480./max(.1,-p.z),1.,100.);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 tint;varying float fade;void main(){float d=length(gl_PointCoord-.5)*2.;float a=fade*(1.-smoothstep(.10,1.,d));if(a<.005)discard;gl_FragColor=vec4(tint,a);
    #include <colorspace_fragment>
    }`,
  })
  const mesh = new T.Points(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 4
  group.add(mesh)
  return {
    mesh,
    set(i, x, y, z, r, a) {
      coords.set([x, y, z], i * 3)
      sizes[i] = r
      alphas[i] = a
    },
    commit() {
      for (const attr of Object.values(geometry.attributes)) attr.needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
    },
  }
}
export function workshopEffects(scene) {
  const group = new T.Group()
  group.name = '白砥作坊火花与蒸汽'
  scene.add(group)
  const steam = particles(group, 28, false),
    embers = particles(group, 34, true),
    strikes = particles(group, 36, true)
  const flying = []
  let serial = 0,
    cursor = 0
  const noise = (k, n) => {
    const v = Math.sin(k * 13.571 + n * 26.17) * 14731.442
    return v - Math.floor(v)
  }
  return {
    impact(p) {
      if (Math.hypot(p.x - hit.x, p.z - hit.z) > 0.55 || Math.abs(p.y - hit.y) > 0.32) return
      for (let j = 0; j < 12; j++) {
        const k = serial++,
          a = noise(k, 1) * 2 * Math.PI,
          vel = 1.12 + noise(k, 2) * 1.67
        flying[cursor] = {
          x: p.x,
          y: p.y + 0.02,
          z: p.z,
          vx: Math.sin(a) * vel,
          vz: Math.cos(a) * vel,
          vy: 0.76 + noise(k, 3) * 1.34,
          age: 0,
          life: 0.21 + 0.19 * noise(k, 4),
        }
        cursor = (cursor + 1) % 36
      }
    },
    update(dt, time) {
      const cam = scene.userData.capitalCamera
      steam.mesh.visible = !cam || Math.hypot(cam.x + 20, cam.z - 15) < 62
      embers.mesh.visible = strikes.mesh.visible = !cam || Math.hypot(cam.x - 109, cam.z - 75) < 70
      if (steam.mesh.visible) {
        for (let i = 0; i < 28; i++) {
          const s = steaming[i % 2],
            u = (time * (0.38 + noise(i, 2) * 0.21) + noise(i, 1)) % 1
          const x = s[0] + (noise(i, 3) - 0.5) * 0.33 + u * (0.14 + 0.12 * Math.sin(i + time * 1.4))
          const z = s[1] + (noise(i, 4) - 0.5) * 0.32 + Math.cos(i * 1.86 + time * 1.55) * u * 0.13
          steam.set(i, x, civicLevel + s[2] + u * 1.14, z, 0.16 + u * 0.48, 0.19 * Math.sin(Math.PI * u))
        }
        steam.commit()
      }
      if (embers.mesh.visible) {
        for (let i = 0; i < 34; i++) {
          const u = (time * (0.7 + noise(i, 9) * 0.4) + noise(i, 8)) % 1
          embers.set(
            i,
            hearth.x + (noise(i, 5) - 0.5) * 0.83 + 0.18 * Math.sin(u * 5 + i) * u,
            civicLevel + 1.27 + u * (0.83 + noise(i, 7) * 1.25),
            hearth.z + (noise(i, 6) - 0.5) * 0.64 + 0.18 * u,
            0.017 + 0.022 * (1 - u),
            0.8 * Math.sin(Math.PI * u),
          )
        }
        embers.commit()
      }
      for (let i = 0; i < 36; i++) {
        const p = flying[i]
        if (!p || p.age >= p.life) {
          strikes.set(i, 0, 0, 0, 0, 0)
          continue
        }
        p.age += dt
        const t = p.age
        strikes.set(
          i,
          p.x + p.vx * t,
          p.y + p.vy * t - 4.2 * t * t,
          p.z + p.vz * t,
          0.037 * (1 - t / p.life) + 0.008,
          Math.max(0, 1 - t / p.life),
        )
      }
      if (strikes.mesh.visible) strikes.commit()
    },
    dispose() {
      steam.dispose()
      embers.dispose()
      strikes.dispose()
      group.removeFromParent()
    },
  }
}
