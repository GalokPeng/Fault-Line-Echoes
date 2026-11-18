import * as T from 'three'
import { biomes, heightAt, riverX, riverWidth } from './biomes.js'
import { createLandscape } from './landscape.js'
import { createSettlement } from './settlements.js'
import { createActor } from './actors.js'
import { makeSky } from './sky.js'
import { weatherSystem } from './weather.js'

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
    arms = []
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
    }
    part(new T.CapsuleGeometry(0.09, 0.28, 3, 9), sleeve, 0, -0.08, 0.11, 0.89, 1, 1)
    part(new T.CylinderGeometry(0.098, 0.087, 0.095, 10), band, 0, 0.09, 0.105, 1, 1, 1)
    part(new T.SphereGeometry(0.093, 11, 8), skin, 0, 0.17, 0.098, 1, 0.94, 0.86)
    for (let i = 0; i < 4; i++)
      part(new T.SphereGeometry(0.024, 7, 5), skin, (i - 1.5) * 0.035, 0.216, 0.049, 1, 1.18, 1.15)
    part(new T.SphereGeometry(0.037, 8, 6), skin, -sign * 0.065, 0.165, 0.046, 1, 1.2, 1)
    arm.rotation.x = -0.85
    arm.rotation.z = sign * 0.35
    hands.add(arm)
    arms.push(arm)
  }
  camera.add(hands)
  const pellets = []
  function clear() {
    if (!scene) return
    for (const bullet of pellets) bullet.mesh.removeFromParent()
    pellets.length = 0
    camera.removeFromParent()
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
    player(p, yaw, tilt, moving, guard, crouch, dt, time) {
      camera.fov = 72
      camera.updateProjectionMatrix()
      const bob = moving ? Math.sin(time * 10) * 0.034 : 0
      camera.position.set(p.x, p.y + (crouch ? 1.08 : 1.64) + bob, p.z)
      camera.rotation.set(tilt, yaw, 0, 'YXZ')
      hands.visible = true
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

export function drawMap(canvas, id, p, places, goal) {
  const ctx = canvas.getContext('2d'),
    w = (canvas.width = 600),
    h = (canvas.height = 360)
  const b = biomes[id],
    extent = Math.max(280, Math.abs(p?.x || 0) + 45, Math.abs(p?.z || 0) + 70)
  const scale = h / (extent * 1.58),
    ox = w / 2,
    oz = h * 0.75,
    X = (x) => ox + x * scale,
    Z = (z) => oz + z * scale
  const step = 4
  for (let z = 0; z < h; z += step)
    for (let x = 0; x < w; x += step) {
      const xx = (x - ox) / scale,
        zz = (z - oz) / scale,
        a = heightAt(id, xx, zz),
        l = heightAt(id, xx - 4, zz - 4) - a
      const shade = Math.max(14, Math.min(80, 34 + l * 2 + a * 0.18)),
        contour = Math.floor(a / 7) !== Math.floor((a + l) / 7)
      ctx.fillStyle =
        Math.abs(xx - riverX(id, zz)) < riverWidth(id, zz)
          ? '#48736e'
          : contour
            ? '#8c8866'
            : `rgb(${shade},${shade + 18},${shade + 7})`
      ctx.fillRect(x, z, step, step)
    }
  ctx.strokeStyle = '#c4a579'
  ctx.lineWidth = 2
  ctx.beginPath()
  b.trail.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))))
  ctx.stroke()
  ctx.font = '14px "Microsoft YaHei UI",sans-serif'
  for (const [label, pt] of [
    [b.city, b.town],
    [b.wild, b.landmark],
  ]) {
    ctx.fillStyle = '#e8c58d'
    ctx.fillRect(X(pt[0]) - 3, Z(pt[1]) - 3, 6, 6)
    ctx.fillText(label, X(pt[0]) + 8, Z(pt[1]) - 5)
  }
  if (goal) {
    ctx.strokeStyle = '#ffdf89'
    ctx.beginPath()
    ctx.arc(X(goal.x), Z(goal.z), 7, 0, 7)
    ctx.stroke()
  }
  if (p) {
    ctx.fillStyle = '#e8fff2'
    ctx.beginPath()
    ctx.arc(X(p.x), Z(p.z), 4, 0, 7)
    ctx.fill()
  }
  ctx.fillStyle = '#e3d6b5'
  ctx.fillText('N ↑', 14, 22)
}
