let ready
async function load() {
  if (!ready)
    ready = import('@dimforge/rapier3d-compat').then(async ({ default: R }) => {
      await R.init()
      return R
    })
  return ready
}

export async function makePhysics(ground, cylinders, boxes, spawn, radius) {
  const R = await load()
  const world = new R.World({ x: 0, y: -17, z: 0 })
  ground.updateWorldMatrix(true, false)
  const geometry = ground.geometry
  const positions = geometry.attributes.position.array
  const indices = geometry.index
    ? new Uint32Array(geometry.index.array)
    : Uint32Array.from({ length: positions.length / 3 }, (_, i) => i)
  const terrain = R.ColliderDesc.trimesh(
    new Float32Array(positions),
    indices,
    R.TriMeshFlags.FIX_INTERNAL_EDGES,
  )
  terrain.setTranslation(ground.position.x, ground.position.y, ground.position.z)
  world.createCollider(terrain)
  for (const { x, z, y, h, r } of cylinders) {
    if (h > 0 && r > 0)
      world.createCollider(R.ColliderDesc.cylinder(h / 2, r).setTranslation(x, y + h / 2, z))
  }
  for (const { x, y, z, w, h, d, yaw = 0 } of boxes) {
    world.createCollider(
      R.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(x, y, z)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }),
    )
  }
  let center = 0.89
  const body = world.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + center + 0.07, spawn.z),
  )
  const capsule = world.createCollider(R.ColliderDesc.capsule(0.55, 0.34), body)
  const controller = world.createCharacterController(0.025)
  controller.enableAutostep(0.4, 0.25, false)
  controller.enableSnapToGround(0.42)
  controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
  world.step()
  let vy = 0,
    grounded = true
  function feet() {
    const p = body.translation()
    return { x: p.x, y: p.y - center, z: p.z }
  }
  function move(dx, dz, dt, jump, climb = false, waterLevel = null) {
    const p = body.translation()
    if (jump && grounded) {
      vy = 6.6
      grounded = false
    }
    vy = typeof climb === 'number' ? climb : climb ? 1.7 : Math.max(-38, vy - 17 * dt)
    if (waterLevel !== null && p.y < waterLevel + 0.38) {
      const target = waterLevel + 0.06 + (jump ? 0.44 : 0)
      vy = Math.min(3.8, Math.max(-2.2, (target - p.y) * 4))
    }
    const bound = (n) => Math.max(-radius + 2, Math.min(radius - 2, n))
    controller.computeColliderMovement(capsule, {
      x: bound(p.x + dx) - p.x,
      y: vy * dt,
      z: bound(p.z + dz) - p.z,
    })
    const delta = controller.computedMovement()
    body.setNextKinematicTranslation({ x: p.x + delta.x, y: p.y + delta.y, z: p.z + delta.z })
    grounded = controller.computedGrounded()
    if ((grounded && vy < 0) || (vy > 0 && delta.y < vy * dt * 0.35)) vy = 0
    world.timestep = dt
    world.step()
    return feet()
  }
  function clear(from, to) {
    const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }
    const len = Math.hypot(delta.x, delta.y, delta.z)
    if (len < 0.05) return true
    return !world.castRay(
      new R.Ray(from, { x: delta.x / len, y: delta.y / len, z: delta.z / len }),
      len - 0.04,
      true,
      undefined,
      undefined,
      capsule,
    )
  }
  return {
    move,
    feet,
    clear,
    crouch(wanted) {
      const next = wanted ? 0.58 : 0.89
      if (next === center) return center < 0.7
      const foot = feet(),
        pos = { x: foot.x, y: foot.y + next + 0.006, z: foot.z }
      if (
        !wanted &&
        world.intersectionWithShape(
          pos,
          { x: 0, y: 0, z: 0, w: 1 },
          new R.Capsule(0.54, 0.33),
          undefined,
          undefined,
          capsule,
        )
      )
        return true
      capsule.setHalfHeight(next - 0.34)
      center = next
      body.setTranslation(pos, true)
      body.setNextKinematicTranslation(pos)
      return wanted
    },
    get grounded() {
      return grounded
    },
    teleport(x, y, z) {
      body.setTranslation({ x, y: y + center + 0.05, z }, true)
      body.setNextKinematicTranslation(body.translation())
      vy = 0
      grounded = true
      world.step()
    },
    dispose() {
      world.free()
    },
  }
}
