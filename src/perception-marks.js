import * as THREE from 'three'

// Build the warning on the walkable terrain so a charge still reads on a sloping trail.
export function markAttack(scene, plan, height) {
  if (!scene?.isScene) return null
  const m = plan.move,
    center = plan.center
  const verts = [],
    set = (x, z) => [x, height(x, z) + 0.085, z]
  function ribbon(a, b, c, d) {
    verts.push(...set(...a), ...set(...b), ...set(...d), ...set(...b), ...set(...c), ...set(...d))
  }
  function circle(radius, thickness, angle = 2 * Math.PI, rotation = 0) {
    const point = (a, r) => [center.x + Math.sin(a) * r, center.z + Math.cos(a) * r]
    for (let i = 0; i < 56; i++) {
      const a = rotation - angle * 0.5 + (angle * i) / 56,
        b = a + angle / 56
      ribbon(
        point(a, radius),
        point(b, radius),
        point(b, radius + thickness),
        point(a, radius + thickness),
      )
    }
  }
  if (m.type === 'charge') {
    const sn = Math.sin(plan.yaw),
      cs = Math.cos(plan.yaw),
      side = m.width
    const at = (s, d) => [center.x + sn * d + cs * s, center.z + cs * d - sn * s]
    for (const s of [-side, side]) {
      for (let i = 0; i < 10; i++)
        ribbon(
          at(s - 0.045, (m.distance * i) / 10),
          at(s + 0.045, (m.distance * i) / 10),
          at(s + 0.045, (m.distance * (i + 1)) / 10),
          at(s - 0.045, (m.distance * (i + 1)) / 10),
        )
    }
  } else if (m.type === 'eruption' || m.type === 'ring') circle(m.radius, 0.13)
  else if (m.type === 'sweep') circle(m.reach, 0.11, 2.55, plan.yaw)
  else circle(Math.min(1.65, m.reach), 0.08)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffa15d,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(g, mat)
  scene.add(mesh)
  return {
    update(f) {
      mat.opacity = 0.36 + 0.43 * f + 0.14 * Math.sin(f * 9)
    },
    dispose() {
      mesh.removeFromParent()
      g.dispose()
      mat.dispose()
    },
  }
}

export function movingRing(scene, center, height) {
  if (!scene?.isScene) return null
  const n = 64,
    vertices = new Float32Array(n * 18),
    g = new THREE.BufferGeometry()
  const attr = new THREE.BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage)
  g.setAttribute('position', attr)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xbbd78a,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: 0.8,
  })
  const mesh = new THREE.Mesh(g, mat)
  mesh.frustumCulled = false
  scene.add(mesh)
  return {
    update(r) {
      let j = 0
      for (let i = 0; i < n; i++)
        for (const [k, width] of [
          [i, 0],
          [i + 1, 0],
          [i, 1],
          [i + 1, 0],
          [i + 1, 1],
          [i, 1],
        ]) {
          const a = (2 * Math.PI * k) / n,
            x = center.x + Math.sin(a) * (r + width * 0.28),
            z = center.z + Math.cos(a) * (r + width * 0.28)
          vertices[j++] = x
          vertices[j++] = height(x, z) + 0.09 + 0.14 * width
          vertices[j++] = z
        }
      attr.needsUpdate = true
    },
    dispose() {
      mesh.removeFromParent()
      g.dispose()
      mat.dispose()
    },
  }
}
