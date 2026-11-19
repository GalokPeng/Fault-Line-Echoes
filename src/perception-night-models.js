import * as T from 'three'

const membrane = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.71, side: T.DoubleSide })
function fan(group, origin, outline, colors) {
  const pos = [],
    col = []
  for (let i = 0; i < outline.length - 1; i++) {
    for (const [p, c] of [
      [origin, colors[0]],
      [outline[i], colors[1 + (i % 2)]],
      [outline[i + 1], colors[1 + ((i + 1) % 2)]],
    ]) {
      pos.push(...p)
      const tone = new T.Color(c)
      col.push(tone.r, tone.g, tone.b)
    }
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  const mesh = new T.Mesh(g, membrane)
  mesh.castShadow = mesh.receiveShadow = true
  group.add(mesh)
}
function frog(part, body) {
  const back = '#3b766a',
    dark = '#284f50',
    lip = '#b7cf87',
    spots = '#81ad83'
  const torso = part(body, [0, 0.49, 0], (p) => {
    p.ball(back, 0, 0, -0.11, 0.84, 0.42, 0.85)
    p.ball(lip, 0, -0.19, 0.19, 0.67, 0.26, 0.62)
    p.ball(back, 0, 0.11, 0.55, 0.89, 0.35, 0.55)
    p.ball(dark, 0, 0.04, 0.76, 0.8, 0.135, 0.39)
    p.ball(lip, 0, 0.01, 0.78, 0.75, 0.087, 0.38)
    for (const s of [-1, 1]) {
      p.ball(back, s * 0.53, 0.36, 0.59, 0.22, 0.21, 0.21)
      p.ball('#e1cc6f', s * 0.55, 0.4, 0.7, 0.16, 0.14, 0.14)
      p.ball('#161e24', s * 0.55, 0.405, 0.818, 0.104, 0.034, 0.026)
      for (let j = 0; j < 5; j++)
        p.ball(spots, s * (0.31 + j * 0.08), 0.36 - j * 0.042, 0.14 - j * 0.19, 0.09, 0.045, 0.11)
    }
  })
  const sac = part(torso, [0, -0.11, 0.79], (p) => {
    for (const side of [-1, 1]) {
      const cx = side * 0.32
      p.ball('#94c69d', cx, -0.034, 0.092, 0.333, 0.278, 0.32)
      for (let i = -2; i <= 2; i++) {
        const xx = cx + i * 0.078,
          zz = 0.372 - 0.022 * Math.abs(i)
        p.rod('#669f88', [xx, -0.1, zz], [cx + i * 0.058, -0.202, zz - 0.041], 0.012)
      }
      p.ball('#b7d4aa', cx + side * 0.082, -0.014, 0.38, 0.052, 0.016, 0.021)
    }
  })
  const legs = []
  for (const s of [-1, 1])
    for (const hind of [false, true]) {
      const leg = part(torso, [s * (hind ? 0.53 : 0.56), -0.07, hind ? -0.46 : 0.34], (p) => {
        if (hind) p.ball(back, s * 0.16, 0.029, -0.09, 0.31, 0.22, 0.47, [0, s * 0.32, 0])
        p.rod(dark, [0, 0, 0], [s * 0.35, -0.18, hind ? -0.35 : 0.14], hind ? 0.11 : 0.066)
        p.rod(
          spots,
          [s * 0.35, -0.18, hind ? -0.35 : 0.14],
          [s * 0.46, -0.36, hind ? 0.12 : 0.39],
          hind ? 0.088 : 0.054,
        )
        for (let i = -1; i <= 1; i++) {
          let d = s * (0.46 + i * 0.12)
          p.rod(
            lip,
            [s * 0.46, -0.36, hind ? 0.12 : 0.39],
            [d, -0.385, (hind ? 0.12 : 0.39) + 0.18 - Math.abs(i) * 0.04],
            0.025,
          )
          p.ball(spots, d, -0.39, (hind ? 0.12 : 0.39) + 0.18 - Math.abs(i) * 0.04, 0.046, 0.021, 0.043)
        }
      })
      const reach = hind ? 0.12 : 0.39
      fan(
        leg,
        [s * 0.46, -0.35, reach],
        [
          [s * 0.34, -0.38, reach + 0.14],
          [s * 0.394, -0.377, reach + 0.12],
          [s * 0.46, -0.375, reach + 0.18],
          [s * 0.523, -0.377, reach + 0.125],
          [s * 0.58, -0.38, reach + 0.14],
        ],
        ['#759879', '#90aa84', '#7b9b7a'],
      )
      legs.push(leg)
    }
  return (phase, walk, strike, t, tell = 0) => {
    const hop = Math.max(0, Math.sin(phase))
    torso.position.y = 0.49 + 0.13 * hop * walk - 0.095 * tell
    torso.rotation.x = -0.12 * hop * walk - 0.17 * tell
    const inflate = 1 + 0.075 * Math.sin(t * 3.2) + 1.08 * tell
    sac.scale.set(inflate, inflate, inflate)
    legs.forEach((leg, i) => (leg.rotation.x = Math.sin(phase + (i % 2) * 2.5) * walk * 0.51))
  }
}
function viper(part, body) {
  const sand = '#ad8e7f',
    dusk = '#6e5963',
    ivory = '#dcc8a3'
  const coils = []
  for (let i = 0; i < 13; i++) {
    const a = i * 0.46 - 1.7,
      r = 0.69 - i * 0.019
    const pos = [Math.cos(a) * r, 0.19 + Math.max(0, i - 7) * 0.055, Math.sin(a) * r - 0.08]
    coils.push(
      part(body, pos, (p) => {
        p.ball(i % 3 ? dusk : sand, 0, 0, 0, 0.22, 0.2, 0.32, [0, -a, 0])
        p.ball(ivory, 0, 0.147, 0, 0.12, 0.062, 0.14, [0, -a, 0])
      }),
    )
  }
  const neck = part(body, [-0.03, 0.4, 0.21], (p) => {
    p.rod(sand, [0, -0.05, 0], [0, 0.73, 0.2], 0.15)
    for (let i = 0; i < 7; i++) {
      const k = i / 7
      p.ball(i % 2 ? '#c9b799' : '#d9c8a4', 0, 0.035 + k * 0.74, 0.105 + k * 0.19, 0.144, 0.061, 0.058)
    }
    for (const s of [-1, 1])
      for (let i = 0; i < 5; i++)
        p.rod(
          ivory,
          [s * 0.08, 0.16 + i * 0.13, 0.02],
          [s * (0.25 + 0.36 * Math.sin((i * Math.PI) / 7)), 0.34 + i * 0.13, 0.02],
          0.03,
        )
  })
  for (const s of [-1, 1])
    fan(
      neck,
      [s * 0.07, 0.41, 0.035],
      [
        [s * 0.12, 0.13, 0.06],
        [s * 0.4, 0.19, 0.015],
        [s * 0.62, 0.66, 0.02],
        [s * 0.5, 0.91, 0.05],
        [s * 0.13, 0.86, 0.14],
      ],
      [dusk, sand, ivory],
    )
  const head = part(neck, [0, 0.86, 0.23], (p) => {
    p.ball(sand, 0, 0, 0.02, 0.36, 0.19, 0.32)
    p.ball(ivory, 0, -0.06, 0.22, 0.255, 0.09, 0.19)
    for (const side of [-1, 1]) {
      p.ball('#4f4752', side * 0.11, 0.028, 0.295, 0.024, 0.018, 0.03)
      p.rod(dusk, [side * 0.18, 0.002, 0.19], [side * 0.24, -0.02, 0.23], 0.022)
    }
    p.rod('#795565', [0, -0.105, 0.29], [0, -0.129, 0.47], 0.021)
    for (const side of [-1, 1]) p.rod('#915a6c', [0, -0.129, 0.47], [side * 0.06, -0.13, 0.545], 0.012)
    for (const s of [-1, 1]) {
      p.ball('#d2ac55', s * 0.245, 0.06, 0.16, 0.082, 0.064, 0.1)
      p.rod(dusk, [s * 0.246, 0.045, 0.25], [s * 0.246, 0.103, 0.249], 0.013)
      p.cone(ivory, s * 0.18, -0.155, 0.29, 0.037, 0.18, 0.039, 0, 1, 8, [Math.PI, 0, 0])
    }
  })
  return (phase, walk, strike, t, tell = 0) => {
    coils.forEach((c, i) => {
      c.rotation.y = 0.16 * Math.sin(t * 2 + i * 0.52 + phase) * (0.4 + walk)
      c.scale.x = 1 + Math.sin(phase + i * 0.49) * 0.11 * walk
    })
    neck.rotation.z = 0.11 * Math.sin(t * 1.5 + phase * 0.19) * (1 - tell)
    neck.scale.x = 1 + 0.62 * tell
    neck.rotation.x = -tell * 0.31 + Math.sin(strike * Math.PI) * 0.45
    head.rotation.y = 0.12 * Math.sin(t * 1.9) * (1 - tell)
  }
}
function flyer(part, body, isMoth) {
  const coat = isMoth ? '#847f90' : '#584c63',
    pale = isMoth ? '#dfd4aa' : '#bda3a9',
    vein = isMoth ? '#545064' : '#958391'
  const torso = part(body, [0, isMoth ? 1.08 : 1.24, 0], (p) => {
    p.ball(coat, 0, 0.03, -0.11, 0.22, 0.19, 0.58)
    p.ball(pale, 0, 0.09, 0.2, 0.28, 0.23, 0.28)
    p.ball(coat, 0, 0.11, 0.42, 0.24, 0.21, 0.23)
    if (!isMoth) {
      p.ball('#7e6375', 0, 0.065, 0.57, 0.16, 0.115, 0.11)
      for (const side of [-1, 1]) {
        p.ball('#342e37', side * 0.066, 0.089, 0.658, 0.035, 0.029, 0.025)
        p.ball('#8d7081', side * 0.085, 0.008, 0.604, 0.069, 0.046, 0.05)
        p.cone('#c8b5a5', side * 0.065, -0.061, 0.612, 0.018, 0.064, 0.018, 0, 1, 6, [Math.PI, 0, 0])
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const z = -0.56 + i * 0.13
        p.ball(i % 2 ? vein : pale, 0, 0.07, z, 0.145 + i * 0.012, 0.101, 0.074)
      }
      for (let i = 0; i < 13; i++) {
        const a = i * 2.399
        p.ball(
          i % 2 ? '#c8c3a3' : '#bab1ac',
          Math.sin(a) * 0.21,
          0.15 + Math.cos(a) * 0.11,
          0.19 + (i % 3) * 0.046,
          0.066,
          0.078,
          0.063,
        )
      }
      for (let i = 0; i < 8; i++) {
        const x = 0.052 * Math.sin(i * 0.62),
          y = -0.053 + i * 0.001 + Math.cos(i * 0.62) * 0.037
        p.ball(vein, x, y, 0.606 + i * 0.003, 0.019, 0.019, 0.019)
      }
    }
    for (const s of [-1, 1]) {
      p.ball(isMoth ? '#3a4853' : '#c3a65e', s * 0.149, 0.164, 0.545, 0.071, 0.06, 0.058)
      p.ball(isMoth ? '#c4d3b9' : '#362d34', s * 0.15, 0.174, 0.599, 0.026, 0.027, 0.015)
      if (isMoth) {
        p.rod(pale, [s * 0.1, 0.2, 0.46], [s * 0.42, 0.44, 0.69], 0.021)
        for (let i = 0; i < 7; i++)
          p.rod(
            pale,
            [s * (0.12 + 0.038 * i), 0.23 + 0.027 * i, 0.48 + 0.026 * i],
            [s * (0.2 + 0.04 * i), 0.29 + 0.026 * i, 0.46 + 0.024 * i],
            0.012,
          )
      } else {
        p.cone(pale, s * 0.19, 0.365, 0.37, 0.16, 0.5, 0.11, 0.055, 0.94, 8, [0, 0, -s * 0.29])
        p.cone('#875c76', s * 0.213, 0.38, 0.427, 0.086, 0.32, 0.04, 0, 1, 7, [0, 0, -s * 0.29])
        p.rod(vein, [s * 0.1, -0.07, -0.34], [s * 0.22, -0.27, -0.52], 0.036)
        p.rod(pale, [s * 0.22, -0.27, -0.52], [s * 0.26, -0.27, -0.62], 0.021)
      }
    }
  })
  const wings = []
  for (const s of [-1, 1]) {
    const wing = part(torso, [s * 0.12, 0.11, 0.12], (p) => {
      p.rod(vein, [0, 0, 0], [s * 0.68, 0.18, 0.26], 0.05)
      const fore = isMoth ? [s * 1.52, 0.27, 0.69] : [s * 1.92, 0.38, 0.44]
      p.rod(vein, [s * 0.68, 0.18, 0.26], fore, isMoth ? 0.025 : 0.037)
      if (!isMoth)
        for (const [x, y, z] of [
          [1.46, 0.15, -0.19],
          [1.06, -0.12, -0.54],
          [0.48, -0.19, -0.63],
        ])
          p.rod(vein, [s * 0.68, 0.18, 0.26], [s * x, y, z], 0.024)
    })
    if (isMoth) {
      fan(
        wing,
        [s * 0.5, 0.17, 0.09],
        [
          [0, 0, 0],
          [s * 0.72, 0.24, 0.53],
          [s * 1.5, 0.27, 0.72],
          [s * 1.38, 0.22, 0.29],
          [s * 1.2, 0.18, 0.05],
          [s * 0.78, 0.07, -0.12],
          [s * 0.31, -0.04, -0.33],
          [0, 0, 0],
        ],
        ['#827f91', '#b5a7ab', '#cabb99'],
      )
      fan(
        wing,
        [s * 0.34, 0.05, -0.17],
        [
          [0, 0, 0],
          [s * 1.16, 0.15, -0.01],
          [s * 1.29, 0.13, -0.43],
          [s * 0.81, 0.01, -0.6],
          [s * 0.41, -0.14, -1.02],
          [s * 0.37, -0.07, -0.51],
          [0, 0, 0],
        ],
        ['#7d8291', '#beb397', '#9d9da3'],
      )
      for (const [x, y, z, r] of [
        [0.98, 0.217, 0.32, 0.272],
        [0.79, 0.093, -0.27, 0.14],
      ]) {
        part(wing, [s * x, y, z], (p) => {
          p.ball('#55475d', 0, 0, 0, r, 0.045, r * 0.78)
          for (const side of [-1, 1]) {
            p.ball('#d7bc82', 0, side * 0.039, 0, r * 0.79, 0.024, r * 0.56)
            p.ball('#575675', 0, side * 0.06, 0, r * 0.57, 0.02, r * 0.39)
            p.ball('#cbdac9', s * 0.018, side * 0.078, -0.021, r * 0.28, 0.016, r * 0.195)
          }
        })
      }
    } else {
      fan(
        wing,
        [s * 0.68, 0.18, 0.26],
        [
          [0, 0, 0],
          [s * 1.92, 0.38, 0.44],
          [s * 1.6, 0.17, 0.03],
          [s * 1.46, 0.15, -0.19],
          [s * 1.25, 0.11, -0.16],
          [s * 1.06, -0.12, -0.54],
          [s * 0.8, -0.02, -0.36],
          [s * 0.48, -0.19, -0.63],
          [0, 0, 0],
        ],
        ['#8a7184', '#766278', '#a78a90'],
      )
    }
    wing.rotation.x = isMoth ? 0.59 : 0.21
    wings.push(wing)
  }
  return (phase, walk, strike, t, tell = 0) => {
    torso.position.y = (isMoth ? 1.08 : 1.24) + 0.13 * Math.sin(t * 3.2) + 0.11 * tell
    torso.rotation.x = -0.18 * tell + 0.19 * Math.sin(strike * Math.PI)
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1
      wings[i].rotation.z =
        s *
        (0.07 +
          Math.sin(t * (isMoth ? 6.2 : 4.7) + phase * 0.12) * (0.24 + 0.1 * walk) * (1 - 0.72 * tell) +
          tell * (isMoth ? 0.64 : 0.38))
    }
  }
}
export function nightCreature(part, body, species) {
  body.name = species.id
  if (species.form === 'frog') return frog(part, body)
  if (species.form === 'viper') return viper(part, body)
  return flyer(part, body, species.form === 'moth')
}
