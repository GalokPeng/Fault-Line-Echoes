import * as THREE from 'three'
import { Batch, beam, shape, releaseGeometry } from './settlement-geometry.js'

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.88,
  side: THREE.DoubleSide,
})
const palettes = {
  rain: ['#5a8274', '#e2af6f', '#3b5149'],
  salt: ['#cd9a61', '#406f78', '#5e4b42'],
  root: ['#67546a', '#9dbe76', '#3e463d'],
  gorge: ['#975749', '#d6b889', '#384954'],
}
const hide = '#413526',
  skin = '#ac7857',
  skinLight = '#bd8764',
  iron = '#59666a'
const shadowMaterial = (() => {
  const n = 32,
    data = new Uint8Array(n * n * 4)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const alpha = Math.max(0, 1 - ((x - 15.5) / 15.5) ** 2 - ((y - 15.5) / 15.5) ** 2)
      data.set([22, 24, 20, Math.round(alpha ** 1.5 * 144)], i)
    }
  const map = new THREE.DataTexture(data, n, n)
  map.magFilter = THREE.LinearFilter
  map.needsUpdate = true
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
})()
function buildPart(parent, origin, draw) {
  const group = new THREE.Group()
  group.position.set(...origin)
  parent.add(group)
  const batch = new Batch(group, { body: material })
  const p = {
    ball: (c, x, y, z, a, b, d, rot = [0, 0, 0]) =>
      batch.add('body', shape.ball(), c, x, y, z, a, b, d, rot),
    block: (c, x, y, z, a, b, d, rot = [0, 0, 0]) =>
      batch.add('body', shape.box(), c, x, y, z, a, b, d, rot),
    cone: (c, x, y, z, a, b, d, t = 0, base = 1, n = 10, rot = [0, 0, 0]) =>
      batch.add('body', shape.cyl(t, base, n), c, x, y, z, a, b, d, rot),
    rod: (c, a, b, r) => beam(batch, 'body', c, a, b, r),
  }
  draw(p)
  batch.finish()
  return group
}
function person(group, kind, id, color) {
  const [regionCoat, trim, trousers] = palettes[id] || palettes.rain
  const coat = color || regionCoat,
    guard = kind === 'guard'
  const torso = buildPart(group, [0, 0.83, 0], (p) => {
    p.cone(coat, 0, 0.21, 0, 0.245, 0.49, 0.16, 0.94, 0.85, 10)
    p.cone(trousers, 0, -0.015, 0, 0.22, 0.2, 0.145, 0.85, 1, 10)
    p.cone(hide, 0, 0.07, 0, 0.23, 0.065, 0.154, 0.96, 1, 12)
    p.block('#b69a68', 0, 0.073, 0.15, 0.082, 0.054, 0.027)
    p.ball(trim, 0, 0.415, 0.008, 0.248, 0.085, 0.17)
    p.block(trim, 0.102, 0.285, 0.145, 0.072, 0.29, 0.022, [0.02, 0, -0.17])
    p.ball(hide, -0.205, 0.056, 0.048, 0.077, 0.103, 0.074)
    p.block(trousers, 0, 0.24, -0.147, 0.26, 0.34, 0.12, [-0.04, 0, 0])
    p.block(trim, 0, 0.23, -0.207, 0.18, 0.025, 0.013)
    p.cone(skin, 0, 0.48, 0, 0.079, 0.16, 0.078)
  })
  const head = buildPart(torso, [0, 0.63, 0.005], (p) => {
    p.ball(skin, 0.0, 0, 0.0, 0.137, 0.178, 0.122)
    p.ball(skinLight, 0, -0.008, 0.118, 0.028, 0.043, 0.032)
    for (const s of [-1, 1]) {
      p.ball(skin, s * 0.132, -0.012, 0, 0.028, 0.049, 0.027)
      p.block('#33302c', s * 0.055, 0.024, 0.108, 0.034, 0.012, 0.012)
      p.block(hide, s * 0.056, 0.048, 0.105, 0.042, 0.012, 0.014, [0, 0, s * 0.1])
    }
    p.ball(hide, 0, 0.089, -0.006, 0.142, 0.102, 0.128)
    p.ball(hide, 0, 0.01, -0.092, 0.124, 0.1, 0.051)
    if (guard) {
      p.cone(iron, 0, 0.09, 0, 0.16, 0.12, 0.146, 0.72, 1, 10)
      p.cone('#869293', 0, 0.05, 0, 0.174, 0.023, 0.159, 0.94, 1, 12)
      p.block(trim, 0, 0.169, -0.018, 0.046, 0.064, 0.125)
    } else if (id === 'salt') {
      p.ball('#d2b18a', 0, 0.085, -0.015, 0.163, 0.098, 0.15)
      p.cone(trim, 0, 0.091, 0, 0.164, 0.052, 0.15, 0.99, 1, 12)
      p.block('#ceb894', -0.087, -0.062, -0.091, 0.105, 0.24, 0.054)
    } else if (id === 'rain') {
      p.cone('#92774c', 0, 0.13, 0, 0.255, 0.118, 0.219, 0.07, 1, 14)
    } else {
      p.ball(hide, 0, 0.161, -0.066, 0.075, 0.069, 0.073)
    }
  })
  const arms = [],
    legs = []
  for (const s of [-1, 1]) {
    arms.push(
      buildPart(torso, [s * 0.203, 0.37, 0.005], (p) => {
        p.ball(guard ? iron : coat, s * 0.02, 0.014, 0, 0.107, 0.108, 0.106)
        p.cone(coat, s * 0.043, -0.114, 0, 0.078, 0.236, 0.083, 0.94, 0.74, 10, [0, 0, s * 0.17])
        p.rod(skin, [s * 0.064, -0.22, 0], [s * 0.073, -0.413, 0.045], 0.053)
        p.cone(
          guard ? iron : trim,
          s * 0.071,
          -0.344,
          0.027,
          0.064,
          0.1,
          0.066,
          0.95,
          0.85,
          8,
          [-0.2, 0, 0],
        )
        p.ball(skinLight, s * 0.073, -0.442, 0.047, 0.056, 0.074, 0.046)
      }),
    )
    legs.push(
      buildPart(group, [s * 0.115, 0.82, 0], (p) => {
        p.cone(trousers, 0, -0.177, 0, 0.096, 0.345, 0.088, 1, 0.78)
        p.cone(trousers, 0, -0.476, 0, 0.074, 0.3, 0.07, 1, 0.78)
        p.cone(hide, 0, -0.648, 0, 0.074, 0.167, 0.076, 1, 0.86)
        p.ball(hide, 0, -0.744, 0.042, 0.08, 0.073, 0.142)
      }),
    )
  }
  return (phase, walk, strike, t) => {
    torso.position.y = 0.83 + Math.abs(Math.sin(phase)) * 0.034 * walk + Math.sin(t * 2) * 0.006
    torso.rotation.y = Math.sin(phase) * 0.055 * walk + Math.sin(strike * Math.PI) * 0.16
    head.rotation.y = Math.sin(t * 0.79) * 0.11 * (1 - walk)
    legs.forEach((limb, i) => (limb.rotation.x = Math.sin(phase + i * Math.PI) * 0.59 * walk))
    arms.forEach((limb, i) => {
      limb.rotation.x =
        -Math.sin(phase + i * Math.PI) * 0.45 * walk -
        (i === 1 ? 1.5 : 0.71) * Math.sin(Math.PI * strike)
    })
  }
}
function creature(group, id) {
  const salt = id === 'salt',
    root = id === 'root',
    gorge = id === 'gorge'
  const main = salt ? '#977542' : root ? '#635446' : gorge ? '#8a7160' : '#496759'
  const under = salt ? '#c7a15b' : root ? '#927960' : gorge ? '#b88053' : '#91a583'
  const accent = salt ? '#695d47' : root ? '#b5b989' : gorge ? '#a14d38' : '#4c9e91'
  const base = salt ? 0.56 : root ? 1.01 : gorge ? 1.37 : 0.77
  const torso = buildPart(group, [0, base, 0], (p) => {
    p.ball(
      main,
      0,
      0,
      0,
      salt ? 0.65 : root ? 0.59 : 0.4,
      salt ? 0.25 : root ? 0.54 : 0.38,
      salt ? 0.94 : 0.88,
    )
    p.ball(under, 0, -0.12, 0.23, salt ? 0.52 : 0.36, 0.25, 0.55)
    if (salt) {
      for (let i = 0; i < 6; i++)
        p.ball(
          i % 2 ? main : accent,
          0,
          0.13,
          -0.59 + i * 0.205,
          0.53 + Math.sin(i * 0.55) * 0.1,
          0.18,
          0.183,
        )
      for (const s of [-1, 1]) {
        p.rod(under, [s * 0.35, -0.02, 0.55], [s * 0.84, -0.12, 0.85], 0.098)
        p.ball(main, s * 0.92, -0.06, 1, 0.22, 0.2, 0.36, [0, s * 0.17, 0])
        p.cone(under, s * 0.91, -0.065, 1.31, 0.092, 0.35, 0.09, 0, 1, 8, [1.32, s * 0.15, 0])
        p.cone(under, s * 1.05, -0.062, 1.3, 0.071, 0.3, 0.07, 0, 1, 8, [1.25, -s * 0.2, 0])
      }
    } else if (root) {
      p.ball(main, 0, 0.12, 0.39, 0.6, 0.63, 0.57)
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const z = -0.53 + i * 0.25
          p.ball(i % 2 ? '#aeb487' : '#7b895e', s * (0.43 + i * 0.021), 0.3, z, 0.26, 0.085, 0.23, [
            0,
            0,
            s * 0.18,
          ])
        }
      for (let i = 0; i < 6; i++)
        p.cone(accent, 0, 0.53, -0.63 + i * 0.2, 0.075, 0.32, 0.075, 0, 1, 6, [-0.36, 0, 0])
    } else if (gorge) {
      for (const s of [-1, 1]) {
        p.ball(accent, s * 0.31, 0.025, -0.2, 0.174, 0.285, 0.72, [-0.2, 0, s * 0.13])
        for (let i = 0; i < 4; i++)
          p.ball(
            i % 2 ? accent : main,
            s * (0.35 + i * 0.011),
            0.03 - i * 0.06,
            -0.62 - i * 0.072,
            0.087,
            0.118,
            0.42,
            [-0.22, 0, s * 0.19],
          )
      }
      p.rod(under, [0, 0.09, 0.47], [0, 0.45, 0.79], 0.17)
    } else {
      for (let i = 0; i < 7; i++)
        p.cone(accent, 0, 0.42, -0.64 + i * 0.2, 0.068, 0.25 - i * 0.012, 0.15, 0, 1, 6, [-0.38, 0, 0])
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++) p.ball(under, s * 0.375, 0.016, -0.48 + i * 0.2, 0.03, 0.068, 0.046)
    }
  })
  const head = buildPart(torso, [0, gorge ? 0.49 : root ? 0.14 : 0.035, gorge ? 0.82 : 0.67], (p) => {
    p.ball(main, 0, 0, 0.15, salt ? 0.33 : root ? 0.39 : 0.27, salt ? 0.17 : 0.3, 0.39)
    p.ball(under, 0, -0.092, 0.39, root ? 0.265 : 0.21, 0.144, 0.205)
    for (const s of [-1, 1]) {
      p.ball('#312e26', s * (root ? 0.32 : 0.216), 0.065, 0.29, 0.06, 0.067, 0.071)
      p.ball('#eaca79', s * (root ? 0.35 : 0.24), 0.08, 0.315, 0.024, 0.039, 0.036)
      if (root) {
        p.cone('#dac49b', s * 0.25, -0.01, 0.46, 0.065, 0.35, 0.064, 0, 1, 8, [0.29, 0, -s * 0.42])
        p.ball(under, s * 0.3, 0.19, -0.01, 0.142, 0.19, 0.058, [0, 0, -s * 0.62])
      } else if (!salt) {
        p.cone(accent, s * 0.22, 0.255, 0.005, 0.09, 0.38, 0.11, 0, 1, 6, [-0.52, 0, -s * 0.56])
      }
    }
    if (gorge) p.cone('#54443b', 0, -0.05, 0.53, 0.136, 0.36, 0.12, 0, 1, 8, [1.63, 0, 0])
  })
  const tail = buildPart(torso, [0, 0.03, -0.68], (p) => {
    if (salt) {
      const pts = [
        [0, 0, 0],
        [0, 0.12, -0.37],
        [0, 0.42, -0.61],
        [0, 0.78, -0.66],
        [0, 1.07, -0.52],
        [0, 1.2, -0.21],
      ]
      for (let i = 1; i < pts.length; i++) {
        p.rod(i % 2 ? main : under, pts[i - 1], pts[i], 0.115 - i * 0.008)
        p.ball(main, ...pts[i], 0.115, 0.12, 0.125)
      }
      p.cone(accent, 0, 1.1, -0.07, 0.059, 0.33, 0.07, 0, 1, 8, [2.5, 0, 0])
    } else {
      p.ball(main, 0, 0.055, -0.35, root ? 0.093 : 0.167, 0.13, 0.55, [0.13, 0, 0])
      if (!root) p.ball(accent, 0, 0.17, -0.89, 0.081, 0.08, 0.39, [0.22, 0, 0])
    }
  })
  const legs = []
  const stations = salt ? [-0.53, -0.05, 0.43] : gorge ? [0] : [-0.48, 0.48]
  stations.forEach((z, idx) => {
    for (const s of [-1, 1]) {
      const limb = buildPart(torso, [s * (salt ? 0.44 : root ? 0.36 : 0.26), -0.08, z], (p) => {
        if (salt) {
          p.rod(main, [0, 0, 0], [s * 0.49, -0.03, -0.14], 0.068)
          p.rod(under, [s * 0.49, -0.03, -0.14], [s * 0.67, -0.41, 0.071], 0.045)
          p.ball(accent, s * 0.68, -0.43, 0.072, 0.056, 0.054, 0.086)
        } else {
          p.ball(main, s * 0.04, -base * 0.2, 0, 0.126, base * 0.28, 0.14, [-0.16, 0, -s * 0.13])
          p.rod(
            under,
            [s * 0.05, -base * 0.41, -0.08],
            [s * 0.061, -base * 0.69, -0.18],
            gorge ? 0.066 : 0.08,
          )
          p.rod(main, [s * 0.061, -base * 0.69, -0.18], [s * 0.075, -base * 0.84, 0], 0.065)
          p.ball(under, s * 0.075, -base * 0.86, 0.08, 0.115, 0.085, 0.17)
          if (gorge)
            for (let j = -1; j <= 1; j++)
              p.rod(
                '#54443b',
                [s * 0.075, -base * 0.87, 0.11],
                [s * 0.08 + j * 0.068, -base * 0.89, 0.34 - Math.abs(j) * 0.04],
                0.026,
              )
        }
      })
      legs.push({ limb, beat: (idx + (s === 1 ? 1 : 0)) * Math.PI })
    }
  })
  return (phase, walk, strike, t) => {
    torso.position.y = base + Math.sin(t * 1.9) * 0.015 + Math.abs(Math.sin(phase)) * 0.048 * walk
    torso.rotation.x = Math.sin(strike * Math.PI) * 0.24
    legs.forEach(({ limb, beat }) => {
      limb.rotation.x = Math.sin(phase + beat) * 0.47 * walk
    })
    tail.rotation.y = Math.sin(t * (salt ? 1.55 : 2.15)) * (salt ? 0.1 : 0.23)
    head.rotation.x = Math.sin(t * 1.87) * 0.024 + Math.sin(strike * Math.PI) * 0.2
  }
}
export function createActor(kind, id, color) {
  const group = new THREE.Group()
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(kind === 'beast' ? 2.2 : 1.02, kind === 'beast' ? 3.1 : 1.15),
    shadowMaterial,
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.038
  shadow.renderOrder = 2
  group.add(shadow)
  const animate = kind === 'beast' ? creature(group, id) : person(group, kind, id, color)
  let phase = Math.random() * Math.PI * 2,
    weight = 0,
    elapsed = 0,
    strike = 1
  return {
    group,
    update(dt, moving, attacking, time) {
      elapsed += dt
      const speed = typeof moving === 'number' ? Math.min(1, Math.abs(moving)) : moving ? 1 : 0
      weight = THREE.MathUtils.damp(weight, speed, 10, dt)
      phase += dt * (kind === 'beast' ? 8 : 9) * weight
      if (attacking && strike >= 1) strike = 0
      strike = Math.min(1, strike + dt * 3.3)
      animate(phase, weight, strike, Number.isFinite(time) ? time : elapsed)
    },
    dispose: () => releaseGeometry(group),
  }
}
