import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Assemble rigid architectural and anatomical parts into a few draw calls.
const shapes = new Map()
function cached(id, build) {
  if (!shapes.has(id)) shapes.set(id, build())
  return shapes.get(id)
}
export const shape = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  ball: () => cached('sphere', () => new THREE.SphereGeometry(1, 12, 8)),
  rock: () => cached('rock', () => new THREE.IcosahedronGeometry(1, 0)),
  cyl: (top = 1, bottom = 1, sides = 12) =>
    cached(`c${top}/${bottom}/${sides}`, () => new THREE.CylinderGeometry(top, bottom, 1, sides)),
  ring: () => cached('ring', () => new THREE.TorusGeometry(1, 0.065, 5, 24)),
}
const white = new THREE.Color('white')
export class Batch {
  constructor(group, materials, mapped = false) {
    this.group = group
    this.materials = materials
    this.mapped = mapped
    this.parts = new Map()
  }
  add(mat, geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, rotation = [0, 0, 0]) {
    const quaternion = rotation.isQuaternion
      ? rotation
      : new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation, 'YXZ'))
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      quaternion,
      new THREE.Vector3(sx, sy, sz),
    )
    const geo = geometry.index ? geometry.toNonIndexed() : geometry.clone()
    geo.applyMatrix4(matrix)
    const pos = geo.getAttribute('position'),
      norm = geo.getAttribute('normal')
    const tint = color ? new THREE.Color(color) : white
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) tint.toArray(colors, i * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    if (this.mapped) {
      const uv = new Float32Array(pos.count * 2)
      for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(norm.getX(i)),
          ny = Math.abs(norm.getY(i)),
          nz = Math.abs(norm.getZ(i))
        uv[i * 2] = (nx > ny && nx > nz ? pos.getZ(i) : pos.getX(i)) * 0.53
        uv[i * 2 + 1] = (ny > nx && ny > nz ? pos.getZ(i) : pos.getY(i)) * 0.53
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    } else geo.deleteAttribute('uv')
    if (!this.parts.has(mat)) this.parts.set(mat, [])
    this.parts.get(mat).push(geo)
  }
  finish() {
    for (const [id, parts] of this.parts) {
      const geo = mergeGeometries(parts)
      for (const part of parts) part.dispose()
      const mesh = new THREE.Mesh(geo, this.materials[id])
      mesh.receiveShadow = true
      mesh.castShadow = id !== 'lamp'
      this.group.add(mesh)
    }
    this.parts.clear()
    return this.group
  }
}
export function beam(batch, mat, color, a, b, r, square = false) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b)
  const direction = end.clone().sub(start),
    len = direction.length()
  if (len < 0.001) return
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  )
  const mid = end.add(start).multiplyScalar(0.5)
  batch.add(
    mat,
    square ? shape.box() : shape.cyl(1, 1, 8),
    color,
    mid.x,
    mid.y,
    mid.z,
    r,
    len,
    r,
    rotation,
  )
}
export function releaseGeometry(group) {
  group.traverse((node) => node.geometry?.dispose())
  group.removeFromParent()
}
