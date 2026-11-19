import { MathUtils, Object3D, Vector3 } from 'three'

// A work pose belongs to the same articulated resident who patrols and fights.
export function tradePoses(buildPart, torso, head, arms) {
  const gear = new Map()
  const point = new Vector3()
  let action = null
  let impact = null
  let elapsed = 0
  let face = null
  function outfit(job) {
    const pieces = []
    const piece = (parent, xyz, draw) => {
      const group = buildPart(parent, xyz, draw)
      pieces.push(group)
      return group
    }
    const cloth = job === 'smith' ? '#76563a' : job === 'baker' ? '#e5dbbc' : '#688567'
    piece(torso, [0, 0, 0], (p) => {
      p.block(cloth, 0, 0.2, 0.161, 0.299, 0.39, 0.042)
      p.block(cloth, 0, -0.105, 0.147, 0.342, 0.23, 0.05, [-0.07, 0, 0])
      for (const s of [-1, 1])
        p.rod('#8d7958', [s * 0.117, 0.37, 0.155], [s * 0.162, 0.421, 0.077], 0.016)
      p.block('#544c3c', 0, 0.065, 0.19, 0.31, 0.035, 0.022)
      if (job === 'pharmacy') p.block('#d6c998', -0.078, 0.236, 0.186, 0.067, 0.09, 0.018)
    })
    if (job === 'smith') {
      const hammer = piece(arms[1], [0.073, -0.442, 0.047], (p) => {
        p.rod('#9e7d4f', [0, 0, -0.095], [0, 0.023, 0.396], 0.033)
        p.block('#465158', 0, 0.025, 0.396, 0.23, 0.16, 0.148)
        for (const s of [-1, 1]) p.block('#8c9694', s * 0.106, 0.025, 0.396, 0.028, 0.142, 0.136)
      })
      face = new Object3D()
      face.name = 'forge-hammer-striking-face'
      face.position.set(0, -0.055, 0.396)
      hammer.add(face)
      piece(arms[0], [-0.073, -0.439, 0.047], (p) => {
        for (const s of [-1, 1])
          p.rod('#606a69', [s * 0.027, 0, -0.07], [-s * 0.023, 0.018, 0.35], 0.012)
      })
    } else if (job === 'baker') {
      piece(head, [0, 0.12, 0], (p) => {
        p.cone('#e9e3d3', 0, 0, 0, 0.161, 0.095, 0.146, 0.95, 1, 12)
        p.ball('#f0e8d6', 0, 0.061, -0.008, 0.184, 0.083, 0.154)
      })
      piece(arms[1], [0.073, -0.443, 0.047], (p) => {
        p.rod('#ac8255', [0, 0, -0.065], [0, 0.008, 0.16], 0.024)
        p.block('#c5b993', 0, 0.015, 0.174, 0.14, 0.021, 0.17)
      })
    } else {
      piece(arms[1], [0.073, -0.443, 0.047], (p) => {
        p.rod('#b49776', [0, -0.103, 0.1], [0, 0.175, -0.04], 0.032)
        p.ball('#c9b69a', 0, -0.104, 0.103, 0.047, 0.054, 0.05)
      })
    }
    return pieces
  }
  function neutral() {
    head.rotation.x = 0
    for (const arm of arms) {
      arm.rotation.y = 0
      arm.rotation.z = 0
    }
  }
  function set(job, callback) {
    if (!['smith', 'baker', 'pharmacy'].includes(job)) job = null
    impact = callback
    if (job === action) return
    if (action) for (const part of gear.get(action)) part.visible = false
    action = job
    elapsed = 0
    neutral()
    if (action) {
      if (!gear.has(action)) gear.set(action, outfit(action))
      for (const part of gear.get(action)) part.visible = true
    }
  }
  const ease = (t) => t * t * (3 - 2 * t)
  function update(dt, walking, attacking) {
    if (!action) return
    const working = !walking && !attacking
    for (const part of gear.get(action)) part.visible = working
    if (!working) {
      neutral()
      return
    }
    const previous = elapsed
    elapsed += dt
    if (action === 'smith') {
      const period = 1.46,
        cycle = (elapsed / period) % 1,
        contact = 0.72
      let angle
      if (cycle < 0.48) angle = MathUtils.lerp(-0.58, -2.67, ease(cycle / 0.48))
      else if (cycle < 0.58) angle = -2.67
      else if (cycle < contact)
        angle = MathUtils.lerp(-2.67, -0.4, ((cycle - 0.58) / (contact - 0.58)) ** 1.55)
      else if (cycle < 0.78) angle = -0.4
      else angle = MathUtils.lerp(-0.4, -0.58, ease((cycle - 0.78) / 0.22))
      const lift = MathUtils.clamp((-angle - 0.4) / 2.27, 0, 1)
      torso.position.y = 0.804 + lift * 0.032
      torso.rotation.set(0.135 - 0.081 * lift, -0.028 * lift, 0)
      head.rotation.x = 0.17 + 0.05 * (1 - lift)
      head.rotation.y = 0
      arms[1].rotation.set(angle, 0, 0)
      arms[0].rotation.set(-0.74, 0.22, 0.14)
      if (impact && Math.floor(elapsed / period - contact) > Math.floor(previous / period - contact)) {
        face.getWorldPosition(point)
        impact(point)
      }
    } else {
      const wave = Math.sin(elapsed * (action === 'baker' ? 3.5 : 4.1))
      torso.rotation.set(0.16 + 0.027 * wave, Math.sin(elapsed * 1.34) * 0.065, 0)
      torso.position.y = 0.808 + 0.008 * wave
      head.rotation.set(0.25, Math.sin(elapsed * 1.3) * 0.08, 0)
      arms[0].rotation.set(-0.7 - wave * 0.095, 0.09, 0.2)
      arms[1].rotation.set((action === 'baker' ? -0.92 : -0.77) + wave * 0.28, -0.18, -0.17)
    }
  }
  return { set, update }
}
