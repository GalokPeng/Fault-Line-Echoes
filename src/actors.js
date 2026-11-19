import * as THREE from 'three'
import { tradePoses } from './capital-trade-poses.js'
import { avatarLook, gestureFor } from './avatar.js'
import { torsoDetails, headDetails, wristDetails } from './avatar-tailor.js'
import { nightCreature } from './perception-night-models.js'
import { Batch, beam, shape, releaseGeometry } from './settlement-geometry.js'

const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.88,
  side: THREE.DoubleSide,
})
const animalMaterial = material.clone()
animalMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader =
    'varying vec3 hidePosition;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nhidePosition=position;',
    )
  shader.fragmentShader =
    'varying vec3 hidePosition;\n' +
    shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
    #include <color_fragment>
    vec3 p=hidePosition;
    float mottle=sin(p.z*18.+sin(p.y*19.+p.x*11.)*1.3)*sin(p.x*21.-p.y*12.);
    float grain=sin(p.y*97.+p.z*56.+sin(p.x*86.));
    diffuseColor.rgb*=.94+.11*mottle+.025*grain;`,
    )
}
const palettes = {
  capital: ['#516b79', '#d4ad6f', '#3a4148'],
  rain: ['#5a8274', '#e2af6f', '#3b5149'],
  salt: ['#cd9a61', '#406f78', '#5e4b42'],
  root: ['#67546a', '#9dbe76', '#3e463d'],
  gorge: ['#975749', '#d6b889', '#384954'],
}
const hide = '#413526',
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
  group.userData.animal = !!parent.userData.animal
  const batch = new Batch(group, { body: group.userData.animal ? animalMaterial : material })
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
function person(group, kind, id, color, look) {
  const [regionCoat, regionTrim, regionTrousers] = palettes[id] || palettes.rain
  const coat = look?.coat || color || regionCoat,
    trim = look?.trim || regionTrim,
    trousers = look?.trousers || regionTrousers,
    skin = look?.flesh || '#ac7857',
    skinLight = look?.flesh || '#bd8764',
    hair = look?.hair || hide,
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
    if (look) torsoDetails(p, look)
  })
  const head = buildPart(torso, [0, 0.63, 0.005], (p) => {
    p.ball(skin, 0.0, 0, 0.0, 0.137, 0.178, 0.122)
    p.ball(skinLight, 0, -0.008, 0.118, 0.028, 0.043, 0.032)
    if (look) {
      p.rod('#83594c', [-0.034, -0.066, 0.11], [0.031, -0.064, 0.111], 0.005)
      for (const side of [-1, 1]) p.ball('#e1c7ae', side * 0.053, 0.024, 0.113, 0.019, 0.009, 0.008)
    }
    for (const s of [-1, 1]) {
      p.ball(skin, s * 0.132, -0.012, 0, 0.028, 0.049, 0.027)
      p.block('#33302c', s * 0.055, 0.024, 0.108, 0.034, 0.012, 0.012)
      p.block(hide, s * 0.056, 0.048, 0.105, 0.042, 0.012, 0.014, [0, 0, s * 0.1])
    }
    p.ball(hair, 0, 0.089, -0.006, 0.142, 0.102, 0.128)
    p.ball(hair, 0, 0.01, -0.092, 0.124, 0.1, 0.051)
    if (look) headDetails(p, look)
    else if (guard) {
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
        if (look) {
          wristDetails(p, look, s)
          if (look.role === 'tide' || look.role === 'beam') {
            for (let j = 0; j < 4; j++) {
              const x = s * 0.073 + (j - 1.5) * 0.022
              p.rod(
                skinLight,
                [x, -0.463, 0.071],
                [x + (j - 1.5) * 0.008, -0.52 + (j === 3 ? 0.015 : 0), 0.087],
                0.011,
              )
            }
          }
        }
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
  const pose = (phase, walk, strike, t, tell = 0, movement = '') => {
    torso.position.y = 0.83 + Math.abs(Math.sin(phase)) * 0.034 * walk + Math.sin(t * 2) * 0.006
    torso.rotation.y = Math.sin(phase) * 0.055 * walk + Math.sin(strike * Math.PI) * 0.16
    torso.rotation.x = -tell * 0.14
    head.rotation.y = Math.sin(t * 0.79) * 0.11 * (1 - walk)
    legs.forEach((limb, i) => (limb.rotation.x = Math.sin(phase + i * Math.PI) * 0.59 * walk))
    arms.forEach((limb, i) => {
      limb.rotation.x =
        -Math.sin(phase + i * Math.PI) * 0.45 * walk -
        (i === 1 ? 1.5 : 0.71) * Math.sin(Math.PI * strike) -
        tell * (i ? 1.05 : 0.48)
      if (look) {
        const side = i ? 1 : -1,
          pulse = Math.sin(strike * Math.PI)
        const open = ['palm', 'sweep', 'double', 'edge', 'lance', 'volley', 'press'].includes(movement)
        limb.rotation.z =
          side *
          ((look.role === 'stone' ? 0.16 : 0.09) +
            (movement === 'sweep' ? 0.82 : movement === 'edge' ? 0.51 : 0.17) * pulse)
        limb.rotation.y = side * (open ? 0.43 : 0.15) * pulse
        limb.rotation.x -= look.role === 'tide' ? 0.27 : look.role === 'stone' ? 0.16 : 0
        limb.rotation.x -= open ? (i ? 0.24 : 0.86) * pulse : 0
        if (movement === 'guard' || (movement === 'brace' && pulse > 0.04)) {
          limb.rotation.x -= 0.79
          limb.rotation.z = side * 0.53
        }
      }
    })
  }
  if (id === 'capital' && kind === 'resident') pose.trade = tradePoses(buildPart, torso, head, arms)
  return pose
}
function creature(group, id, species = {}) {
  if (species.phase === 'night') return nightCreature(buildPart, group, species)
  const form = species.form || { rain: 'drake', salt: 'scorpion', root: 'boar', gorge: 'bird' }[id]
  const salt = form === 'scorpion',
    root = ['boar', 'hart', 'ram', 'ox'].includes(form),
    gorge = form === 'bird',
    boss = species.boss
  const main = species.color || (salt ? '#977542' : root ? '#635446' : gorge ? '#8a7160' : '#496759')
  const under = salt ? '#c7a15b' : root ? '#927960' : gorge ? '#b88053' : '#91a583'
  const accent = salt ? '#695d47' : root ? '#b5b989' : gorge ? '#a14d38' : '#4c9e91'
  const base = salt ? 0.56 : form === 'hart' ? 1.24 : root ? 1.01 : gorge ? 1.37 : 0.77
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
    } else if (form === 'hart') {
      p.ball(main, 0, 0.15, 0.3, 0.42, 0.43, 0.54)
      p.rod(main, [0, 0.18, 0.36], [0, 0.66, 0.82], 0.22)
      p.ball(under, 0, 0.32, 0.57, 0.22, 0.34, 0.16, [0.4, 0, 0])
      for (const s of [-1, 1])
        for (let j = 0; j < 5; j++) {
          p.ball(
            '#b9ae83',
            s * (0.5 - 0.04 * Math.cos(j * 1.27)),
            0.2 + 0.045 * Math.sin(j * 2),
            -0.49 + j * 0.18,
            0.052,
            0.051,
            0.065,
          )
        }
    } else if (form === 'ox') {
      p.ball(main, 0, 0.13, 0.18, 0.65, 0.61, 0.79)
      p.ball('#4a4039', 0, 0.34, 0.39, 0.55, 0.48, 0.5)
      p.ball(under, 0, -0.14, 0.65, 0.27, 0.41, 0.24)
    } else if (form === 'ram') {
      p.ball(under, 0, 0.19, 0.32, 0.52, 0.49, 0.58)
      for (const s of [-1, 1])
        for (let j = 0; j < 5; j++) {
          p.ball(
            j % 2 ? main : under,
            s * 0.43,
            0.17 + 0.04 * Math.sin(j),
            -0.47 + j * 0.21,
            0.16,
            0.18,
            0.2,
          )
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
    if (boss) {
      for (let j = 0; j < 7; j++) {
        const z = -0.68 + j * 0.19,
          w = 0.22 + 0.14 * Math.sin((j * Math.PI) / 6)
        if (salt) {
          for (const s of [-1, 1])
            p.cone(
              j % 2 ? '#e5b863' : '#d6d4ad',
              s * (0.33 + 0.13 * Math.sin(j * 0.53)),
              0.37,
              z,
              0.11,
              w + 0.14,
              0.11,
              0.05,
              1,
              5,
              [s * 0.11, 0, -s * 0.47],
            )
        } else if (!root && !gorge) {
          p.ball(j % 2 ? '#e6bd71' : '#5fc2b8', 0, 0.46, z, 0.048, w + 0.18, 0.17, [-0.29, 0, 0])
          for (const s of [-1, 1])
            p.cone('#bfa960', s * 0.37, 0.17, z, 0.067, 0.24, 0.06, 0, 1, 6, [0, 0, -s * 0.9])
        }
      }
    }
  })
  const headHeight = form === 'hart' ? 0.64 : gorge ? 0.49 : form === 'ram' ? 0.3 : root ? 0.14 : 0.035
  const head = buildPart(torso, [0, headHeight, gorge || form === 'hart' ? 0.82 : 0.67], (p) => {
    p.ball(
      main,
      0,
      0,
      0.15,
      salt ? 0.33 : form === 'hart' ? 0.26 : root ? 0.39 : 0.27,
      salt ? 0.17 : 0.3,
      0.39,
    )
    p.ball(under, 0, -0.092, 0.39, form === 'hart' ? 0.17 : root ? 0.265 : 0.21, 0.144, 0.205)
    if (form === 'hart' || form === 'ram' || form === 'ox')
      p.ball('#443c32', 0, -0.093, 0.57, form === 'hart' ? 0.12 : 0.15, 0.061, 0.055)
    for (const s of [-1, 1]) {
      // Forward-facing lids keep the creature's gaze legible from the combat camera.
      const eyeX = s * (root ? 0.205 : salt ? 0.18 : 0.16),
        eyeY = salt ? 0.11 : 0.135,
        eyeZ = salt ? 0.44 : 0.416
      p.ball('#2e3029', eyeX, eyeY, eyeZ, 0.074, 0.064, 0.055, [0, s * 0.27, -s * 0.14])
      p.ball(boss ? '#f5c566' : '#b6a25d', eyeX, eyeY + 0.006, eyeZ + 0.041, 0.049, 0.034, 0.021)
      p.ball('#242621', eyeX, eyeY + 0.004, eyeZ + 0.059, 0.012, 0.03, 0.01)
      p.ball('#efe3b2', eyeX - s * 0.014, eyeY + 0.019, eyeZ + 0.063, 0.012, 0.01, 0.008)
      p.ball(main, eyeX + s * 0.01, eyeY + 0.061, eyeZ - 0.008, 0.091, 0.023, 0.041, [
        0,
        s * 0.25,
        s * 0.21,
      ])
      if (!gorge) p.ball('#443d30', s * 0.092, -0.068, 0.568, 0.022, 0.013, 0.027)
      if (boss && !salt && !root && !gorge) {
        // Layered cheek fins form a broad collar around the rain sovereign.
        for (let j = 0; j < 4; j++) {
          p.ball(
            j % 2 ? '#6dafa2' : '#91baa7',
            s * (0.32 + j * 0.047),
            0.045 + j * 0.078,
            -0.045 - j * 0.042,
            0.083,
            0.205,
            0.075,
            [0.25, 0, -s * (0.83 - j * 0.1)],
          )
          p.rod(
            '#bda36b',
            [s * 0.225, 0.02, -0.02],
            [s * (0.45 + j * 0.045), 0.12 + j * 0.1, -0.11 - j * 0.039],
            0.026,
          )
        }
        p.rod('#d7c6a1', [s * 0.17, -0.065, 0.48], [s * 0.18, -0.21, 0.54], 0.047)
        p.cone('#ede0bd', s * 0.18, -0.258, 0.55, 0.04, 0.13, 0.039, 1, 0, 8, [0.16, 0, s * 0.09])
      }
      if (boss && salt) {
        p.rod(under, [s * 0.21, 0.09, 0.24], [s * 0.3, 0.25, 0.38], 0.042)
        p.ball('#3a392d', s * 0.3, 0.25, 0.38, 0.054, 0.051, 0.058)
        p.ball('#ddbd79', s * 0.3, 0.26, 0.425, 0.029, 0.025, 0.016)
      }
      p.ball('#312e26', s * (root ? 0.32 : 0.216), 0.065, 0.29, 0.06, 0.067, 0.071)
      p.ball('#eaca79', s * (root ? 0.35 : 0.24), 0.08, 0.315, 0.024, 0.039, 0.036)
      if (form === 'ox') {
        p.rod('#b6ab92', [s * 0.23, 0.2, 0.08], [s * 0.54, 0.27, -0.04], 0.092)
        p.rod('#c2b59a', [s * 0.54, 0.27, -0.04], [s * 0.75, 0.5, -0.14], 0.066)
        p.rod('#484137', [s * 0.75, 0.5, -0.14], [s * 0.79, 0.62, -0.12], 0.037)
        p.ball(main, s * 0.42, 0.05, 0.04, 0.22, 0.1, 0.12, [0, s * 0.22, -s * 0.32])
        p.ball('#353330', s * 0.083, -0.098, 0.59, 0.029, 0.021, 0.025)
      } else if (form === 'hart' || form === 'ram') {
        const horn = form === 'hart' ? '#bdac80' : '#d9c8a5'
        const pts =
          form === 'hart'
            ? [
                [0.18, 0.17, 0.08],
                [0.31, 0.4, 0.02],
                [0.47, 0.65, -0.17],
                [0.65, 0.83, -0.22],
              ]
            : [
                [0.19, 0.16, 0.02],
                [0.37, 0.31, -0.12],
                [0.49, 0.2, -0.26],
                [0.49, 0.03, -0.22],
                [0.4, -0.02, -0.08],
              ]
        for (let j = 1; j < pts.length; j++) {
          const A = pts[j - 1],
            B = pts[j],
            size = boss ? 1.36 : 1
          const a = [s * A[0] * size, A[1] * size, A[2]],
            b = [s * B[0] * size, B[1] * size, B[2]]
          p.rod(horn, a, b, (form === 'ram' ? 0.123 : 0.076) * (1 - j / (pts.length + 1)))
          if (form === 'hart' && j > 1)
            p.rod(
              boss ? '#b2d59b' : horn,
              a,
              [s * (A[0] * size + 0.04), A[1] * size + 0.22, A[2] + 0.15],
              0.043,
            )
        }
        p.ball(under, s * 0.29, 0.15, 0.04, 0.11, 0.12, 0.06, [0, 0, -s * 0.61])
      } else if (form === 'fox') {
        p.cone(under, s * 0.18, 0.21, 0.04, 0.14, 0.41, 0.11, 0, 1, 6, [-0.18, 0, -s * 0.2])
        p.cone('#785745', s * 0.18, 0.22, 0.09, 0.081, 0.25, 0.05, 0, 1, 6, [-0.18, 0, -s * 0.2])
      } else if (root) {
        p.cone('#dac49b', s * 0.25, -0.01, 0.46, 0.065, 0.35, 0.064, 0, 1, 8, [0.29, 0, -s * 0.42])
        p.ball(under, s * 0.3, 0.19, -0.01, 0.142, 0.19, 0.058, [0, 0, -s * 0.62])
      } else if (!salt) {
        p.cone(accent, s * 0.22, 0.255, 0.005, 0.09, 0.38, 0.11, 0, 1, 6, [-0.52, 0, -s * 0.56])
      }
    }
    if (gorge) {
      p.cone('#6a513c', 0, -0.045, 0.56, 0.143, 0.42, 0.13, 0, 1, 8, [1.69, 0, 0])
      p.cone('#453b31', 0, -0.115, 0.71, 0.061, 0.15, 0.058, 0, 1, 8, [2.1, 0, 0])
    }
    if (species.id === 'kingfisher')
      for (let j = -1; j <= 1; j++) {
        p.ball(j ? '#55a6a1' : '#cd994e', j * 0.063, 0.29, -0.03, 0.044, 0.26, 0.06, [
          -0.64,
          0,
          -j * 0.22,
        ])
      }
    if (species.id === 'duskOwl')
      for (const s of [-1, 1]) {
        p.ball('#aa9b83', s * 0.135, 0.088, 0.412, 0.138, 0.132, 0.055, [0, s * 0.2, 0])
        p.ball('#302e2c', s * 0.145, 0.105, 0.463, 0.087, 0.082, 0.035)
        p.ball('#dcad5c', s * 0.145, 0.11, 0.488, 0.052, 0.055, 0.018)
        p.ball('#282a29', s * 0.145, 0.112, 0.501, 0.029, 0.044, 0.013)
      }
    if (boss && gorge)
      for (let j = -2; j <= 2; j++) {
        p.ball(
          j % 2 ? '#ce8a4b' : '#dbb476',
          j * 0.072,
          0.39 - Math.abs(j) * 0.03,
          -0.12,
          0.057,
          0.37,
          0.065,
          [-0.58, 0, -j * 0.14],
        )
      }
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
    } else if (form === 'ox') {
      p.rod(main, [0, 0.16, 0], [0, -0.47, -0.29], 0.04)
      p.ball('#393630', 0, -0.55, -0.29, 0.073, 0.15, 0.065)
    } else {
      p.ball(main, 0, 0.055, -0.35, root ? 0.093 : 0.167, 0.13, 0.55, [0.13, 0, 0])
      if (form === 'fox') {
        p.ball(main, 0, 0.15, -0.69, 0.21, 0.19, 0.47, [-0.25, 0, 0])
        p.ball('#e4d9bb', 0, 0.29, -1.03, 0.14, 0.13, 0.23, [-0.33, 0, 0])
      } else if (!root) p.ball(accent, 0, 0.17, -0.89, 0.081, 0.08, 0.39, [0.22, 0, 0])
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
          if (boss && gorge)
            for (let j = 0; j < 4; j++) {
              p.ball(
                j % 2 ? '#bd8a59' : '#a4734c',
                s * 0.068,
                -base * (0.59 + j * 0.055),
                -0.14 + j * 0.042,
                0.072,
                0.047,
                0.057,
              )
            }
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
  return (phase, walk, strike, t, tell = 0, action = '') => {
    const rear = action === 'ring' || action === 'eruption' || action === 'bolt'
    torso.position.y =
      base +
      Math.sin(t * 1.9) * 0.015 +
      Math.abs(Math.sin(phase)) * 0.048 * walk +
      tell * (rear ? -0.015 : -0.13)
    torso.rotation.x = Math.sin(strike * Math.PI) * 0.24 + tell * (rear ? -0.31 : 0.25)
    legs.forEach(({ limb, beat }) => {
      limb.rotation.x = Math.sin(phase + beat) * 0.47 * walk
    })
    tail.rotation.y =
      Math.sin(t * (salt ? 1.55 : 2.15)) * (salt ? 0.1 : 0.23) + (action === 'sweep' ? tell * 0.86 : 0)
    tail.rotation.x = salt ? -tell * 0.41 : 0
    head.rotation.x =
      Math.sin(t * 1.87) * 0.024 + Math.sin(strike * Math.PI) * 0.2 + tell * (rear ? -0.39 : 0.3)
    if (form === 'ox' && !action)
      head.rotation.x += (1 - walk) * (0.3 + 0.23 * Math.sin(t * 0.9 + phase))
  }
}
export function createActor(kind, id, color) {
  const group = new THREE.Group()
  const beast = kind === 'beast',
    species = beast && color && typeof color === 'object' ? color : {}
  group.userData.animal = beast
  if (beast) group.scale.setScalar(species.scale || 1)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(kind === 'beast' ? 2.2 : 1.02, kind === 'beast' ? 3.1 : 1.15),
    shadowMaterial,
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.038
  shadow.renderOrder = 2
  group.add(shadow)
  const body = new THREE.Group()
  body.userData.animal = beast
  group.add(body)
  const look = ['player', 'duelist'].includes(kind)
    ? avatarLook(color?.role, color?.skin || color)
    : null
  if (look) {
    body.scale.x = look.width
    group.userData.avatar = look
  }
  const animate = beast ? creature(body, id, species) : person(body, kind, id, look ? null : color, look)
  let phase = Math.random() * Math.PI * 2,
    weight = 0,
    elapsed = 0,
    strike = 1,
    gesture = ''
  return {
    group,
    perform(key) {
      if (look) {
        gesture = gestureFor(look.role, key)
        strike = 0
      }
    },
    setWork(action, onImpact) {
      animate.trade?.set(action, onImpact)
    },
    fall(seconds, side = 1) {
      animate.trade?.set(null)
      const progress = THREE.MathUtils.smoothstep(seconds, 0, 0.62)
      body.rotation.z = side * 1.36 * progress
      body.rotation.x = -0.1 * progress
      body.position.y = 0.4 * progress
      shadow.position.x = -side * 0.48 * progress
      animate(phase, 0, 1, elapsed)
    },
    update(dt, moving, attacking, time, windup) {
      body.rotation.set(0, 0, 0)
      body.position.y = 0
      shadow.position.x = 0
      elapsed += dt
      const speed = typeof moving === 'number' ? Math.min(1, Math.abs(moving)) : moving ? 1 : 0
      weight = THREE.MathUtils.damp(weight, speed, 10, dt)
      phase += dt * (kind === 'beast' ? 8 : 9) * weight
      if (attacking && strike >= 1) strike = 0
      strike = Math.min(1, strike + dt * 3.3)
      animate(
        phase,
        weight,
        strike,
        Number.isFinite(time) ? time : elapsed,
        windup ? Math.min(1, 0.19 + windup.progress * 1.15) : 0,
        look ? windup?.type || gesture : windup?.type,
      )
      animate.trade?.update(dt, moving, attacking || Boolean(windup))
    },
    dispose: () => releaseGeometry(group),
  }
}
