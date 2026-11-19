import * as T from 'three'
import { biomes, heightAt, waterAt } from './biomes.js'
import { createLandscape } from './landscape.js'
import { createSettlement } from './settlements.js'
import { createActor } from './actors.js'
import { makeSky } from './sky.js'
import { weatherSystem } from './weather.js'
import { streamTerrain } from './terrain-stream.js'
import { gates, borderRoads } from './borders.js'

export function makeView(canvas, quality) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  })
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.shadowMap.enabled = quality !== 'low'
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  const camera = new T.PerspectiveCamera(68, 1, 0.07, 1800)
  camera.rotation.order = 'YXZ'
  let scene,
    land,
    town,
    sky,
    weather,
    stream,
    id,
    elapsed = 0,
    angle = 0,
    pitch = 0,
    zoom = 1,
    castTime = 9,
    shownHand = 0,
    shadowTime = 0
  const orbitOffset = new T.Vector3(),
    look = new T.Vector3(),
    base = new T.Vector3(),
    target = new T.Vector3()
  const hands = new T.Group(),
    arms = [],
    fingers = []
  const skin = new T.MeshStandardMaterial({ color: '#bb8d71', roughness: 0.92 })
  const sleeve = new T.MeshStandardMaterial({ color: '#627b70', roughness: 0.94 })
  const band = new T.MeshStandardMaterial({ color: '#655644', roughness: 1 })
  for (const sign of [-1, 1]) {
    const arm = new T.Group()
    const part = (g, m, x, y, z, sx, sy, sz) => {
      const p = new T.Mesh(g, m)
      p.position.set(x, y, z)
      p.scale.set(sx, sy, sz)
      arm.add(p)
      return p
    }
    part(new T.CapsuleGeometry(0.09, 0.28, 3, 9), sleeve, 0, -0.08, 0.11, 0.89, 1, 1)
    part(new T.CylinderGeometry(0.098, 0.087, 0.095, 10), band, 0, 0.09, 0.105, 1, 1, 1)
    part(new T.SphereGeometry(0.093, 11, 8), skin, 0, 0.17, 0.098, 1, 0.94, 0.86)
    const digits = []
    for (let i = 0; i < 4; i++) {
      const phalanx = part(
        new T.CapsuleGeometry(0.015, 0.038 + (i === 1 ? 0.014 : 0), 3, 7),
        skin,
        (i - 1.5) * 0.034,
        0.212,
        0.059,
        1,
        1,
        1,
      )
      phalanx.rotation.x = -1.12
      digits.push(phalanx)
    }
    fingers.push(digits)
    part(new T.SphereGeometry(0.037, 8, 6), skin, -sign * 0.065, 0.165, 0.046, 1, 1.2, 1)
    arm.rotation.x = -0.85
    arm.rotation.z = sign * 0.35
    hands.add(arm)
    arms.push(arm)
  }
  camera.add(hands)
  const staff = new T.Group(),
    wood = new T.Mesh(new T.CylinderGeometry(0.023, 0.032, 0.49, 8), band)
  const wick = new T.Mesh(
    new T.IcosahedronGeometry(0.074, 1),
    new T.MeshBasicMaterial({ color: 0xffac48 }),
  )
  wood.position.y = 0.25
  wick.position.y = 0.54
  staff.add(wood, wick)
  staff.position.set(-0.013, 0.18, 0.095)
  arms[0].add(staff)
  staff.visible = false
  const weapon = new T.Group(),
    rod = new T.Mesh(new T.CylinderGeometry(0.02, 0.032, 0.84, 8), band)
  const blade = new T.Mesh(
    new T.OctahedronGeometry(0.1, 0),
    new T.MeshStandardMaterial({ color: 0xbfc9c4, metalness: 0.56, roughness: 0.35 }),
  )
  blade.scale.set(0.37, 1.8, 0.15)
  weapon.add(rod, blade)
  arms[1].add(weapon)
  weapon.position.set(0, 0.22, 0.09)
  const lantern = new T.PointLight(0xffab58, 0, 16, 1.5)
  lantern.position.set(-0.27, 0.1, -0.55)
  camera.add(lantern)
  const pellets = []
  function clear() {
    if (!scene) return
    for (const bullet of pellets) bullet.mesh.removeFromParent()
    pellets.length = 0
    camera.removeFromParent()
    stream?.dispose()
    stream = null
    land.dispose?.()
    town.dispose?.()
    const mats = new Set(),
      geos = new Set()
    scene.traverse((o) => {
      if (o.geometry) geos.add(o.geometry)
      if (o.material) [].concat(o.material).forEach((m) => mats.add(m))
    })
    mats.forEach((m) => m.dispose())
    geos.forEach((g) => g.dispose())
    scene.clear()
    renderer.renderLists.dispose()
  }
  function resize() {
    const w = innerWidth,
      h = innerHeight
    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, quality === 'fine' ? 1.65 : quality === 'low' ? 0.75 : 1.05),
    )
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  addEventListener('resize', resize)
  resize()
  const boltGeo = new T.IcosahedronGeometry(0.17, 1),
    boltMat = new T.MeshBasicMaterial({ color: 0xa3eadb })
  return {
    renderer,
    camera,
    get scene() {
      return scene
    },
    get land() {
      return land
    },
    get town() {
      return town
    },
    quality(v) {
      quality = v
      renderer.shadowMap.enabled = v !== 'low'
      renderer.shadowMap.needsUpdate = true
      resize()
    },
    load(world) {
      clear()
      id = world
      scene = new T.Scene()
      scene.add(camera)
      land = createLandscape(scene, id)
      stream = streamTerrain(land.ground)
      town = createSettlement(scene, id)
      sky = makeSky(scene, id)
      weather = weatherSystem(scene, id)
      angle = 0
      pitch = 0
      zoom = 1
      elapsed = 0
      return { land, town }
    },
    orbit(dx, dy, wheel = 0) {
      angle += dx * 0.004
      pitch = T.MathUtils.clamp(pitch + dy * 0.16, -38, 70)
      zoom = T.MathUtils.clamp(zoom + wheel * 0.0006, 0.45, 1.8)
    },
    preview(dt, free) {
      land.setWaterActor?.(null)
      lantern.intensity = 0
      const vista = biomes[id].vista
      elapsed += dt
      hands.visible = false
      base.fromArray(vista.from)
      target.fromArray(vista.to)
      orbitOffset.copy(base).sub(target)
      orbitOffset
        .applyAxisAngle(T.Object3D.DEFAULT_UP, angle + (!free ? Math.sin(elapsed * 0.053) * 0.045 : 0))
        .multiplyScalar(zoom)
      camera.position.copy(target).add(orbitOffset)
      camera.position.y = Math.max(
        camera.position.y + pitch,
        heightAt(id, camera.position.x, camera.position.z) + 5,
      )
      camera.lookAt(target)
      camera.fov = 54
      camera.updateProjectionMatrix()
    },
    player(p, yaw, tilt, moving, guard, crouch, dt, time, grip = null, torch = false, weaponId = null) {
      camera.fov = 72
      camera.updateProjectionMatrix()
      const bob = moving ? Math.sin(time * 10) * 0.034 : 0
      camera.position.set(p.x, p.y + (crouch ? 1.08 : 1.64) + bob, p.z)
      camera.rotation.set(tilt, yaw, 0, 'YXZ')
      hands.visible = true
      staff.visible = torch && !grip
      weapon.visible = !!weaponId && !grip
      if (weapon.visible) {
        const knife = weaponId === 'saltKnife'
        rod.scale.y = knife ? 0.22 : 1
        rod.position.y = knife ? 0.02 : 0.25
        blade.visible = knife || weaponId === 'rainFang'
        blade.position.y = knife ? 0.24 : 0.71
      }
      lantern.intensity = staff.visible ? 11 + 1.1 * Math.sin(time * 14) : 0
      wick.scale.set(0.75, 1.45 + 0.22 * Math.sin(time * 11), 0.75)
      castTime += dt
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1,
          pulse = shownHand === i ? Math.max(0, Math.sin(Math.min(1, castTime / 0.35) * Math.PI)) : 0
        arms[i].position.set(
          s * (guard ? 0.185 : 0.266),
          (guard ? -0.29 : -0.413) + bob * 0.4 + Math.sin(time * 1.8 + i) * 0.012 + pulse * 0.065,
          -0.44 - pulse * 0.3,
        )
        arms[i].rotation.x = -0.85 - pulse * 0.78
        arms[i].rotation.z = s * (guard ? 0.63 : 0.3)
        for (let j = 0; j < 4; j++) {
          const finger = fingers[i][j],
            openness = grip ? 0.55 + 0.45 * Math.sin(grip.phase * 6 + i * Math.PI) : 0
          finger.rotation.x = -1.12 + openness * 1.08
          finger.position.y = 0.212 + 0.04 * openness
          finger.rotation.z = (j - 1.5) * 0.09 * openness
        }
        if (grip) {
          const phase = grip.phase * 6 + i * Math.PI,
            lift = (1 + Math.sin(phase)) * 0.5
          arms[i].position.set(s * (0.26 - 0.065 * lift), -0.35 + 0.32 * lift, -0.43 - 0.16 * lift)
          arms[i].rotation.x = -0.35 - 0.59 * lift
          arms[i].rotation.z = s * (0.2 + 0.23 * lift)
          camera.position.y += 0.016 * Math.sin(grip.phase * 8)
        } else if (staff.visible && i === 0) {
          arms[i].position.x = -0.29
          arms[i].position.y = -0.34
          arms[i].rotation.x = -0.45
        }
      }
    },
    punch() {
      castTime = 0
      shownHand = 1 - shownHand
    },
    actor(kind, world, color) {
      const a = createActor(kind, world, color)
      scene.add(a.group)
      return a
    },
    effect(from, to) {
      const mesh = new T.Mesh(boltGeo, boltMat)
      mesh.position.set(from.x, from.y, from.z)
      mesh.scale.set(0.72, 0.72, 2)
      scene.add(mesh)
      mesh.lookAt(to.x, to.y, to.z)
      pellets.push({
        mesh,
        from: mesh.position.clone(),
        end: new T.Vector3(to.x, to.y, to.z),
        life: 0,
        duration: Math.max(0.1, Math.min(0.5, Math.hypot(to.x - from.x, to.z - from.z) / 38)),
      })
    },
    render(dt, hour, time) {
      const day = sky(camera, hour, time)
      stream?.update(dt, camera, quality)
      land.update(dt, time, day, camera)
      town.update(dt, time, day)
      shadowTime -= dt
      if (dt === 0 || shadowTime <= 0) {
        renderer.shadowMap.needsUpdate = true
        shadowTime = 0.64
      }
      const cp = camera.position,
        indoors = Math.hypot(cp.x, cp.z) < 55 && cp.y < biomes[id].level - 0.6
      weather(camera, time, hour, hands.visible, indoors)
      for (let i = pellets.length - 1; i >= 0; i--) {
        const b = pellets[i]
        b.life += dt
        b.mesh.position.lerpVectors(b.from, b.end, b.life / b.duration)
        if (b.life >= b.duration) {
          b.mesh.removeFromParent()
          pellets.splice(i, 1)
        }
      }
      renderer.render(scene, camera)
      return day
    },
    vector() {
      camera.getWorldDirection(look)
      return look
    },
  }
}

export function drawMap(canvas, id, p, places, goal, { local = false, yaw = 0, pin = null } = {}) {
  const ctx = canvas.getContext('2d'),
    w = (canvas.width = 760),
    h = (canvas.height = 460),
    b = biomes[id]
  const radius = local ? (id === 'capital' ? 95 : 138) : id === 'capital' ? 266 : b.radius + 18
  const scale = (h - 24) / (2 * radius),
    cx = local ? p.x : 0,
    cz = local ? p.z : 0,
    X = (x) => w / 2 + (x - cx) * scale,
    Z = (z) => h / 2 + (z - cz) * scale
  const step = 4
  for (let z = 0; z < h; z += step)
    for (let x = 0; x < w; x += step) {
      const xx = (x - w / 2) / scale + cx,
        zz = (z - h / 2) / scale + cz,
        a = heightAt(id, xx, zz),
        l = heightAt(id, xx - 4, zz - 4) - a
      const shade = Math.max(20, Math.min(90, 43 + l * 2 + a * 0.13))
      ctx.fillStyle =
        Math.max(Math.abs(xx), Math.abs(zz)) > b.radius
          ? '#15231f'
          : waterAt(id, xx, zz).wet
            ? '#4b7978'
            : Math.floor(a / 8) !== Math.floor((a + l) / 8)
              ? '#8a8d6d'
              : `rgb(${shade},${shade + 17},${shade + 6})`
      ctx.fillRect(x, z, step, step)
    }
  function line(points, color, width) {
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = width
    points.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))))
    ctx.stroke()
  }
  function dot(x, z, color, r = 3) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(X(x), Z(z), r, 0, 7)
    ctx.fill()
  }
  function label(x, z, name, color) {
    ctx.font = '15px "Microsoft YaHei UI",sans-serif'
    ctx.strokeStyle = '#14241e'
    ctx.lineWidth = 3
    ctx.strokeText(name, X(x) + 6, Z(z) - 4)
    ctx.fillStyle = color
    ctx.fillText(name, X(x) + 6, Z(z) - 4)
  }
  if (id === 'capital') {
    line(
      [
        [-216, -216],
        [216, -216],
        [216, 216],
        [-216, 216],
        [-216, -216],
      ],
      '#b0aba0',
      3,
    )
    line(
      [
        [-216, 0],
        [216, 0],
      ],
      '#cdba86',
      2,
    )
    line(
      [
        [0, -216],
        [0, 216],
      ],
      '#cdba86',
      2,
    )
  } else {
    line(b.trail, '#c4a579', 2)
    for (const road of borderRoads(id)) line(road.points, '#a59672', 1.6)
    label(...b.town, b.city, '#f4e3b7')
    label(...b.landmark, b.wild, '#f4e3b7')
  }
  for (const mark of places || []) {
    if (mark.boss) {
      dot(mark.x, mark.z, '#f99777', 4)
      label(mark.x, mark.z, mark.name, '#edb593')
    } else if (mark.kind === 'shore') {
      dot(mark.x, mark.z, '#81c7d5', 3.5)
      if (local) label(mark.x, mark.z, mark.name, '#acdfe3')
    } else if (mark.kind === 'habitat') {
      dot(mark.x, mark.z, '#d0bf82', 3.5)
      if (local) label(mark.x, mark.z, mark.name, '#e5d49a')
    } else if (mark.service || ['well', 'inn', 'upper', 'underground'].includes(mark.kind)) {
      dot(mark.x, mark.z, '#a4ceb3')
      if (local || (id === 'capital' && ['well', 'inn'].includes(mark.kind)))
        label(mark.x, mark.z, mark.job || mark.name, '#d1debd')
    }
  }
  for (const g of gates(id)) {
    dot(g.x, g.z, '#e9c68a', 5)
    label(g.x, g.z, '通往' + biomes[g.to].name, '#ffdea3')
  }
  if (goal) {
    dot(goal.x, goal.z, '#e5b74b', 5)
    label(goal.x, goal.z, '调查', 'white')
  }
  if (pin) {
    ctx.strokeStyle = '#ffc554'
    ctx.beginPath()
    ctx.arc(X(pin.x), Z(pin.z), 8, 0, 7)
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(X(p.x), Z(p.z))
  ctx.rotate(-yaw)
  ctx.fillStyle = '#f4ffef'
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(5, 6)
  ctx.lineTo(0, 3)
  ctx.lineTo(-5, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#f1e3bd'
  ctx.font = '15px Georgia, serif'
  ctx.fillText('N ↑', 14, 22)
  ctx.fillRect(14, h - 19, 50 * scale, 2)
  ctx.fillText('50 m', 14, h - 24)
}
