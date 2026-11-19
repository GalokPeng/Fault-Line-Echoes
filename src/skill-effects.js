import * as T from 'three'

// The original bolts own flight and collision. These short effects describe
// a release at the hand, the near edge of a ground strike, or a confirmed hit.
const colors = {
  leaf: ['#8fd6ac', '#d9f4c4'],
  stone: ['#dd9c59', '#ffe3a1'],
  tide: ['#6dc7e1', '#d5f8ee'],
  beam: ['#b49bdf', '#f5d9ef'],
}
const casts = {
  leaf: { q: ['dash', 0.34], e: ['foldback', 0.41], c: ['palm', 0.38], v: ['crosscut', 0.51] },
  stone: { q: ['shoulder', 0.4], e: ['brace', 0.82], c: ['quake', 0.58], v: ['shut', 0.55] },
  tide: { q: ['pulse', 0.32], e: ['wavelets', 0.39], c: ['backwash', 0.38], v: ['triple', 0.69] },
  beam: { q: ['fan', 0.35], e: ['bend', 0.38], c: ['anchor', 0.43], v: ['lattice', 0.53] },
}
const TAU = Math.PI * 2,
  MAX_EFFECTS = 20,
  MAX_VERTICES = 18432
const clamp = (n) => Math.min(1, Math.max(0, n))
const finite = (v) => v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)
const tint = Object.fromEntries(
  Object.entries(colors).map(([role, values]) => [role, values.map((c) => new T.Color(c))]),
)
const guardColors = [new T.Color('#d9914f'), new T.Color('#fff3be')]
const up = new T.Vector3(0, 1, 0)

export function createSkillEffects(scene, groundAt) {
  const positions = new T.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3).setUsage(
    T.DynamicDrawUsage,
  )
  const colors = new T.BufferAttribute(new Uint8Array(MAX_VERTICES * 4), 4, true).setUsage(
    T.DynamicDrawUsage,
  )
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', positions)
  geo.setAttribute('color', colors)
  geo.setDrawRange(0, 0)
  const material = new T.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: T.DoubleSide,
    toneMapped: false,
    forceSinglePass: true,
  })
  const mesh = new T.Mesh(geo, material)
  mesh.name = 'skill-cast-and-contact'
  mesh.frustumCulled = false
  mesh.renderOrder = 4
  mesh.visible = false
  scene.add(mesh)
  const live = []
  const a = new T.Vector3(),
    b = new T.Vector3(),
    axis = new T.Vector3(),
    view = new T.Vector3(),
    cam = new T.Vector3()
  const l0 = new T.Vector3(),
    r0 = new T.Vector3(),
    l1 = new T.Vector3(),
    r1 = new T.Vector3()
  let effect,
    fade,
    phase,
    written = 0,
    dead = false,
    camNode = null
  function emit(v, color, alpha) {
    if (written >= MAX_VERTICES) return
    positions.setXYZ(written, v.x, v.y, v.z)
    // BufferAttribute.setXYZW performs the normalized-to-byte conversion.
    colors.setXYZW(written, color.r, color.g, color.b, clamp(alpha))
    written++
  }
  function local(out, u, v, w) {
    return out
      .copy(effect.origin)
      .addScaledVector(effect.right, u)
      .addScaledVector(effect.up, v)
      .addScaledVector(effect.dir, w)
  }
  function floor(out, u, w, lift = 0.075) {
    const e = effect
    out.set(
      e.origin.x + u * e.flatZ + w * e.flatX,
      e.floor + lift,
      e.origin.z - u * e.flatX + w * e.flatZ,
    )
    if (e.followTerrain) out.y = groundAt(out.x, out.z) + e.terrainOffset + lift
    return out
  }
  function stroke(point, steps, width, color = 0, opacity = 1) {
    const rgb = effect.colors[color],
      alpha = fade * opacity
    if (alpha < 0.008 || written + steps * 6 > MAX_VERTICES) return
    point(0, a)
    for (let i = 1; i <= steps; i++) {
      const u = i / steps
      point(u, b)
      axis.subVectors(b, a)
      view.subVectors(cam, a)
      axis.cross(view)
      if (axis.lengthSq() < 1e-8) axis.copy(effect.right)
      axis.normalize().multiplyScalar(width * 0.5)
      if (i === 1) {
        l0.copy(a).addScaledVector(axis, 0.55)
        r0.copy(a).addScaledVector(axis, -0.55)
      }
      const tip = i === steps ? 0.47 : 1
      l1.copy(b).addScaledVector(axis, tip)
      r1.copy(b).addScaledVector(axis, -tip)
      emit(l0, rgb, alpha)
      emit(r0, rgb, alpha)
      emit(l1, rgb, alpha)
      emit(l1, rgb, alpha)
      emit(r0, rgb, alpha)
      emit(r1, rgb, alpha)
      l0.copy(l1)
      r0.copy(r1)
      a.copy(b)
    }
  }
  function arc(u, v, w, rx, ry, start, end, width, color = 0, opacity = 1) {
    stroke(
      (t, out) => {
        const p = start + (end - start) * t
        return local(out, u + Math.cos(p) * rx, v + Math.sin(p) * ry, w)
      },
      12,
      width,
      color,
      opacity,
    )
  }
  function sweep(start, end, curve, width, color = 0, opacity = 1) {
    stroke(
      (t, out) => {
        const h = Math.sin(t * Math.PI)
        return local(
          out,
          start[0] + (end[0] - start[0]) * t + curve[0] * h,
          start[1] + (end[1] - start[1]) * t + curve[1] * h,
          start[2] + (end[2] - start[2]) * t + curve[2] * h,
        )
      },
      6,
      width,
      color,
      opacity,
    )
  }
  function groundArc(origin, r, angle, width, color = 0) {
    stroke(
      (t, out) => {
        const p = (t - 0.5) * angle
        return floor(out, Math.sin(p) * r, origin + Math.cos(p) * r)
      },
      18,
      width,
      color,
      0.86,
    )
  }
  function flecks(count, reach, lift, width) {
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399 + effect.seed,
        dx = Math.cos(angle),
        dz = Math.sin(angle),
        travel = 0.26 + phase * 0.77
      stroke(
        (t, out) =>
          local(
            out,
            dx * reach * (travel + t * 0.13),
            dz * reach * (travel + t * 0.13) + lift * Math.sin(Math.PI * phase),
            -0.09 + phase * 0.13,
          ),
        1,
        width,
        i % 2,
        0.82,
      )
    }
  }
  function ripple(u, v, w, r, color = 0) {
    arc(u, v, w, r, r * 0.85, -0.19, Math.PI * 0.87, 0.026, color)
    arc(u, v, w, r, r * 0.85, Math.PI * 0.98, Math.PI * 1.83, 0.019, 1 - color, 0.82)
  }
  function renderCast() {
    const s = phase,
      n = 0.78 + 0.73 * s,
      d = Math.min(effect.range, 2.5),
      spread = effect.spread
    switch (effect.variant) {
      case 'dash':
        for (const k of [-1, 1])
          sweep(
            [k * (0.54 + s * 0.18), -0.31, 0.71],
            [k * 0.17, -0.06, n + 0.43],
            [k * -0.11, 0.085, 0.18],
            0.047,
          )
        break
      case 'foldback':
        for (const k of [-1, 1])
          arc(
            k * 0.37,
            -0.18,
            1.07 - s * 0.29,
            0.2 + s * 0.12,
            0.22,
            0.35 + k * 0.5,
            4.3 + k * 0.5,
            0.038,
            k > 0 ? 1 : 0,
          )
        break
      case 'palm':
        ripple(0.19, -0.15, 0.88 + s * 0.6, 0.13 + 0.27 * s)
        sweep([0.31, -0.33, 0.65], [0.05, -0.04, 1.58 + s * 0.24], [-0.08, 0.06, 0], 0.031, 1)
        break
      case 'crosscut':
        for (const k of [-1, 1])
          sweep(
            [k * 0.62, -0.34, 0.8],
            [-k * 0.51, 0.22, 1.25 + s * 0.72],
            [k * 0.06, 0.12, 0.3],
            0.083,
            k > 0 ? 0 : 1,
          )
        break
      case 'shoulder':
        for (const k of [-1, 1])
          sweep([k * 0.59, -0.39, 0.64], [k * 0.22, -0.16, 1.3 + s * 0.34], [0, 0.14, 0.18], 0.069)
        groundArc(0.18, 0.51 + s * 0.73, 1.55, 0.054, 1)
        break
      case 'brace':
        for (let i = 0; i < 6; i++) {
          const t = (i * Math.PI) / 3 + 0.16,
            rad = 0.3 + 0.043 * Math.sin(s * Math.PI)
          stroke(
            (j, out) => {
              const q = t + (j * 0.82 * Math.PI) / 3
              return local(out, -0.18 + rad * Math.cos(q), -0.18 + rad * Math.sin(q), 1.03)
            },
            3,
            0.046,
            i % 2,
          )
        }
        break
      case 'quake':
        for (let i = 0; i < 2; i++)
          groundArc(0.64, (0.48 + s * (d - 0.67)) * (i ? 0.65 : 1), 1.8, 0.065 - i * 0.014, i)
        for (let i = -2; i <= 2; i++)
          stroke(
            (t, out) =>
              floor(
                out,
                i * (0.19 + 0.09 * s),
                1.25 + s * 0.81 + t * 0.18,
                0.24 + (0.5 + 0.16 * Math.cos(i * 2.2)) * Math.sin(Math.PI * s) + 0.29 * t,
              ),
            1,
            0.051,
            1,
          )
        break
      case 'shut':
        for (const k of [-1, 1]) {
          stroke(
            (t, out) => floor(out, k * (0.31 + (1 - s) * 0.56), 0.61 + t * (d - 0.57), 0.1),
            8,
            0.084,
          )
          sweep([k * (0.74 - 0.4 * s), -0.43, 0.95], [k * 0.13, 0.04, d], [0, 0.13, -0.07], 0.072, 1)
        }
        break
      case 'pulse':
        ripple(0.14, -0.12, 0.86 + s * 0.52, 0.115 + 0.1 * s)
        ripple(0.08, -0.07, 1.12 + s * 0.63, 0.071 + 0.045 * s, 1)
        break
      case 'wavelets':
        for (let k = -1; k <= 1; k++)
          ripple(
            k * (0.15 + spread * 1.3),
            -0.14 + 0.045 * Math.abs(k),
            1 + s * 0.57,
            0.085 + s * 0.085,
            k === 0 ? 1 : 0,
          )
        break
      case 'backwash':
        for (const k of [-1, 1])
          sweep(
            [k * 0.11, -0.15, 1.47],
            [k * (0.53 + 0.12 * s), -0.34, 1.02 - s * 0.28],
            [k * 0.14, 0.1, -0.13],
            0.045,
            k > 0 ? 0 : 1,
          )
        break
      case 'triple':
        for (let i = 0; i < 3; i++) {
          const age = effect.age - i * 0.17
          if (age < 0 || age > 0.31) continue
          const f = age / 0.31
          arc(
            0.11,
            -0.13,
            0.91 + f * 0.71,
            0.085 + f * 0.23,
            0.085 + f * 0.22,
            i * 0.8,
            i * 0.8 + 5.6,
            0.032,
            i % 2,
            1 - f * 0.47,
          )
        }
        break
      case 'fan':
        for (let k = -1; k <= 1; k++)
          sweep(
            [0.16, -0.25, 0.8],
            [0.08 + k * Math.tan(spread) * n * 1.32, -0.08 + 0.036 * Math.abs(k), 1.15 + n * 0.6],
            [0, 0.047, 0],
            0.028,
            k === 0 ? 1 : 0,
          )
        break
      case 'bend':
        for (const k of [-1, 1])
          sweep(
            [0.17 + k * 0.066, -0.24, 0.73],
            [0.03 + k * 0.048, 0.01, 1.23 + s * 0.62],
            [k * 0.13, 0.12, -0.08],
            0.031,
            k > 0 ? 1 : 0,
          )
        break
      case 'anchor':
        for (const k of [-1, 1]) {
          sweep([k * 0.27, -0.12, 0.99], [k * 0.17, -0.31, 1.26 + s * 0.16], [0, 0, 0.045], 0.035, 1)
          sweep([k * 0.17, -0.31, 1.26 + s * 0.16], [k * 0.08, -0.28, 1.31 + s * 0.16], [0, 0, 0], 0.029)
          stroke(
            (t, out) => floor(out, k * (0.33 - 0.23 * t), 0.46 + t * (0.84 + 0.51 * s), 0.12),
            4,
            0.06,
          )
          stroke(
            (t, out) => floor(out, k * (0.1 + 0.2 * t), 1.3 + 0.51 * s - t * 0.24, 0.12),
            3,
            0.042,
            1,
          )
        }
        break
      case 'lattice':
        for (let i = 0; i < 2; i++) {
          const r = 0.19 + s * 0.16 + i * 0.07
          stroke(
            (t, out) => {
              const p = TAU * t + Math.PI / 4
              const u = Math.cos(p),
                v = Math.sin(p),
                scale = r / Math.max(Math.abs(u), Math.abs(v))
              return local(out, 0.04 + u * scale, -0.08 + v * scale, 1.15 + s * 0.52 + i * 0.22)
            },
            16,
            0.028,
            i,
          )
        }
        for (const k of [-1, 1])
          sweep(
            [k * 0.28, -0.26, 0.96],
            [k * (spread + 0.08), 0.08, 1.72 + s * 0.28],
            [0, 0.05, 0],
            0.022,
            1,
          )
    }
  }
  function renderContact() {
    if (effect.blocked) {
      for (let i = 0; i < 6; i++)
        arc(
          0,
          0,
          0,
          0.19 + phase * 0.19,
          0.21 + phase * 0.19,
          (i * Math.PI) / 3 + 0.05,
          ((i + 1) * Math.PI) / 3 - 0.1,
          0.034,
          1,
        )
      flecks(4, 0.41, 0.06, 0.027)
      return
    }
    const heavy = effect.key === 'v' || effect.key === 'heavy',
      r = (heavy ? 0.51 : 0.34) * (0.45 + phase)
    if (effect.role === 'tide') ripple(0, 0, 0, r)
    if (effect.role === 'stone') arc(0, 0, 0, r, r * 0.71, 0.21, 5.85, 0.047)
    if (effect.role === 'beam')
      for (const k of [-1, 1]) sweep([k * r, 0, 0], [0, r, 0], [0, 0, 0], 0.029, 1)
    flecks(heavy ? 9 : 6, r + 0.11, 0.12, heavy ? 0.041 : 0.032)
  }
  function schedule(spec, origin, dir, contact, blocked) {
    if (
      dead ||
      !finite(origin) ||
      (!contact && (!finite(dir) || Math.hypot(dir.x, dir.y, dir.z) < 0.001))
    )
      return false
    const role = spec?.role || spec?.visual,
      key = spec?.key
    if (
      !Object.hasOwn(casts, role) ||
      (!Object.hasOwn(casts[role], key) && !(contact && ['light', 'heavy'].includes(key)))
    )
      return false
    const style = casts[role][key],
      f = new T.Vector3()
    if (dir) f.copy(dir).normalize()
    else {
      camNode = scene.getObjectByProperty('isCamera', true)
      if (camNode) camNode.getWorldPosition(f).sub(origin).normalize()
      else f.set(0, 0, -1)
    }
    if (f.lengthSq() < 0.0001) f.set(0, 0, -1)
    const right = new T.Vector3().crossVectors(f, up)
    if (right.lengthSq() < 0.0001) right.set(1, 0, 0)
    right.normalize()
    const planar = Math.hypot(f.x, f.z),
      flatX = planar > 0.01 ? f.x / planar : 0,
      flatZ = planar > 0.01 ? f.z / planar : -1
    const hasSupport = Number.isFinite(spec.groundY)
    const floorY = hasSupport ? spec.groundY : origin.y - 1.59
    const terrainY = !contact && groundAt ? groundAt(origin.x, origin.z) : NaN
    const terrainOffset = hasSupport ? floorY - terrainY : 0
    // Bridges, towers and tunnels supply their own support altitude. On soil,
    // preserve the small difference between the collision mesh and terrain LOD.
    const followTerrain = Number.isFinite(terrainY) && Math.abs(terrainOffset) <= 0.4
    if (live.length === MAX_EFFECTS) live.shift()
    live.push({
      origin: new T.Vector3().copy(origin),
      dir: f,
      right,
      up: new T.Vector3().crossVectors(right, f),
      flatX,
      flatZ,
      role,
      key,
      contact,
      blocked,
      variant: style?.[0],
      life: contact ? 0.32 : style[1],
      age: 0,
      range: Math.max(0.15, Number(spec.shot || spec.dist || 2)),
      spread: spec.spread ?? 0.12,
      floor: floorY,
      followTerrain,
      terrainOffset,
      colors: blocked ? guardColors : tint[role],
      seed: origin.x * 0.17 + origin.z * 0.11,
    })
    return true
  }
  function refresh() {
    written = 0
    if (!camNode || !camNode.parent) camNode = scene.getObjectByProperty('isCamera', true)
    if (camNode) camNode.getWorldPosition(cam)
    for (const e of live) {
      effect = e
      phase = clamp(e.age / e.life)
      fade = 0.89 * (1 - phase ** 1.8)
      if (!camNode) cam.copy(e.origin).addScaledVector(e.dir, -1.6)
      if (e.contact) renderContact()
      else renderCast()
    }
    mesh.visible = written > 0
    geo.setDrawRange(0, written)
    for (const [attr, count] of [
      [positions, 3],
      [colors, 4],
    ]) {
      attr.clearUpdateRanges()
      if (written) {
        attr.addUpdateRange(0, written * count)
        attr.needsUpdate = true
      }
    }
  }
  function clear() {
    live.length = 0
    geo.setDrawRange(0, 0)
    mesh.visible = false
  }
  return {
    cast(spec, from, dir) {
      return schedule(spec, from, dir, false, false)
    },
    impact(spec, point, blocked = false) {
      return schedule(spec, point, null, true, blocked)
    },
    update(dt) {
      if (dead || (!live.length && !mesh.visible)) return
      const step = Number.isFinite(dt) ? Math.max(0, dt) : 0
      for (let i = live.length - 1; i >= 0; i--)
        if ((live[i].age += step) >= live[i].life) live.splice(i, 1)
      refresh()
    },
    clear,
    dispose() {
      if (!dead) {
        clear()
        dead = true
        mesh.removeFromParent()
        geo.dispose()
        material.dispose()
      }
    },
  }
}
