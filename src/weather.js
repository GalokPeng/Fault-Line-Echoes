import * as T from 'three'
export function weatherSystem(scene, id) {
  const rain = id === 'rain',
    dust = id === 'salt' || id === 'gorge',
    count = rain ? 420 : 120
  const geometry = new T.BufferGeometry(),
    coords = new Float32Array(count * (rain ? 6 : 3)),
    seeds = []
  let k = 3471
  const rand = () => {
    k = (Math.imul(k, 1664525) + 1013904223) >>> 0
    return k / 4294967296
  }
  for (let i = 0; i < count; i++) seeds.push([rand() * 36, rand() * 17, rand() * 36, rand()])
  geometry.setAttribute('position', new T.BufferAttribute(coords, 3).setUsage(T.DynamicDrawUsage))
  const material = rain
    ? new T.LineBasicMaterial({ color: 0xc2d9d6, transparent: true, opacity: 0.32, depthWrite: false })
    : new T.PointsMaterial({
        color: dust ? 0xc69c70 : 0x9fe8bf,
        size: dust ? 0.048 : 0.065,
        transparent: true,
        depthWrite: false,
      })
  const mesh = rain ? new T.LineSegments(geometry, material) : new T.Points(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
  const wrap = (n, m) => ((n % m) + m) % m
  return (camera, t, hour, play, indoors) => {
    const wave = 0.5 + 0.5 * Math.sin(hour * 0.76 + (rain ? 0.6 : dust ? 1 : 2))
    mesh.visible = play && !indoors && (id === 'root' ? hour >= 18 || hour < 6 : wave > 0.35)
    if (!mesh.visible) return
    material.opacity = id === 'root' ? 0.7 : (rain ? 0.27 : 0.4) * wave
    const p = camera.position
    for (let i = 0; i < count; i++) {
      const s = seeds[i],
        j = i * (rain ? 6 : 3),
        v = rain ? 11 + s[3] * 5 : 0.32
      const x = wrap(s[0] + t * (rain ? 1.9 : dust ? 3.2 : 0.42) - p.x, 36) - 18 + p.x
      const y = wrap(s[1] - t * v - p.y, 17) - 6 + p.y,
        z = wrap(s[2] + t * 0.32 - p.z, 36) - 18 + p.z
      coords[j] = x
      coords[j + 1] = y
      coords[j + 2] = z
      if (rain) {
        coords[j + 3] = x - 0.055
        coords[j + 4] = y + 0.62
        coords[j + 5] = z - 0.013
      }
    }
    geometry.attributes.position.needsUpdate = true
  }
}
