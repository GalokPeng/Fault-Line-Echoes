import * as T from 'three'

// Keep the CPU collision surface continuous. Upload full-resolution render patches on approach.
export function streamTerrain(source) {
  const geo = source.geometry,
    row = Math.sqrt(geo.attributes.position.count),
    quads = row - 1
  if (!Number.isInteger(row) || quads % 16 !== 0) return null
  const chunks = [],
    group = new T.Group(),
    tile = quads / 16
  source.parent.add(group)
  group.position.copy(source.position)
  source.visible = false
  function patch(x, z, step) {
    const g = new T.BufferGeometry(),
      indices = [],
      count = tile / step + 1
    // A lowered rim seals the vertical gap where neighbouring detail levels meet.
    const boundary = []
    for (let i = 0; i < count - 1; i++) boundary.push(i)
    for (let j = 0; j < count - 1; j++) boundary.push(j * count + count - 1)
    for (let i = count - 1; i > 0; i--) boundary.push((count - 1) * count + i)
    for (let j = count - 1; j > 0; j--) boundary.push(j * count)
    const vertices = count * count
    for (const [key, attr] of Object.entries(geo.attributes)) {
      const array = new attr.array.constructor((vertices + boundary.length) * attr.itemSize)
      let k = 0
      for (let j = 0; j <= tile; j += step)
        for (let i = 0; i <= tile; i += step) {
          const offset = ((z + j) * row + x + i) * attr.itemSize
          for (let a = 0; a < attr.itemSize; a++) array[k++] = attr.array[offset + a]
        }
      for (const vertex of boundary) {
        for (let a = 0; a < attr.itemSize; a++)
          array[k++] = array[vertex * attr.itemSize + a] - (key === 'position' && a === 1 ? 14 : 0)
      }
      g.setAttribute(key, new T.BufferAttribute(array, attr.itemSize, attr.normalized))
    }
    for (let j = 0; j < count - 1; j++)
      for (let i = 0; i < count - 1; i++) {
        const v = j * count + i
        indices.push(v, v + count, v + 1, v + 1, v + count, v + count + 1)
      }
    for (let i = 0; i < boundary.length; i++) {
      const j = (i + 1) % boundary.length
      indices.push(boundary[i], boundary[j], vertices + i, boundary[j], vertices + j, vertices + i)
    }
    g.setIndex(indices)
    g.computeBoundingSphere()
    const m = new T.Mesh(g, source.material)
    m.receiveShadow = true
    group.add(m)
    return m
  }
  for (let z = 0; z < quads; z += tile)
    for (let x = 0; x < quads; x += tile) {
      const low = patch(x, z, tile % 4 === 0 ? 4 : 1)
      chunks.push({ x, z, low, hi: null, sphere: low.geometry.boundingSphere })
    }
  const f = new T.Frustum(),
    matrix = new T.Matrix4(),
    lastLook = new T.Quaternion()
  let elapsed = 0.3,
    last = new T.Vector3(Infinity, 0, 0)
  return {
    update(dt, camera, quality) {
      elapsed += dt
      if (
        dt > 0 &&
        elapsed < 0.16 &&
        last.distanceToSquared(camera.position) < 16 &&
        Math.abs(lastLook.dot(camera.quaternion)) > 0.9994
      )
        return
      elapsed = 0
      last.copy(camera.position)
      lastLook.copy(camera.quaternion)
      camera.updateMatrixWorld()
      f.setFromProjectionMatrix(
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      )
      let newTiles = 0
      for (const c of chunks) {
        const d = c.sphere.center.distanceTo(camera.position) - c.sphere.radius
        const near = d < (quality === 'low' ? 105 : 178),
          visible = f.intersectsSphere(c.sphere)
        if (visible && near && !c.hi && newTiles < 5) {
          c.hi = patch(c.x, c.z, 1)
          newTiles++
        }
        if (c.hi) {
          c.hi.visible = visible && near
          if (d > 305) {
            c.hi.removeFromParent()
            c.hi.geometry.dispose()
            c.hi = null
          }
        }
        c.low.visible = visible && !(c.hi && near)
      }
    },
    dispose() {
      group.traverse((m) => m.geometry?.dispose())
      group.removeFromParent()
    },
  }
}
