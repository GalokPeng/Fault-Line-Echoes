import { BufferGeometry, Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let template, loading
const enamel = new MeshStandardMaterial({ vertexColors: true, metalness: 0.24, roughness: 0.58 })

// One self-contained binary, loaded on the first sighting of the character.
// Vite embeds the URL in production, including the downloadable offline game.
export function preparePhaseDial(buffer) {
  if (!loading) {
    const loader = new GLTFLoader()
    const gltf = buffer
      ? loader.parseAsync(buffer, '')
      : loader.loadAsync(new URL('./avatar-models/phase-dial.glb?inline', import.meta.url).href)
    loading = gltf
      .then(({ scene }) => {
        const model = scene.getObjectByName('TidalSoundGauge')
        template = model.geometry
        model.material.dispose()
        return template
      })
      .catch((err) => {
        loading = undefined
        throw err
      })
  }
  return loading
}

// Each sleeve owns its small geometry, so changing skins or unloading an actor is independent.
export function attachPhaseDial(parent, x, y, z) {
  const geometry = new BufferGeometry()
  const gauge = new Mesh(geometry, enamel)
  gauge.name = '潮汐听针'
  gauge.position.set(x, y, z)
  parent.add(gauge)
  let live = true
  geometry.addEventListener('dispose', () => {
    live = false
  })
  function install(model) {
    if (live) geometry.copy(model)
  }
  if (template) install(template)
  else if (loading || typeof document !== 'undefined')
    preparePhaseDial().then(install, (err) => {
      if (live) console.error('听针模型未能载入', err)
    })
  return gauge
}
