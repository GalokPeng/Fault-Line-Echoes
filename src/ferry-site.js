import { heightAt, riverX, waterAt } from './biomes.js'
const ground = (x, z) => ({ x, z, y: heightAt('rain', x, z) })
let site
export function ferrySite() {
  if (site) return site
  const fordZ = 530,
    bridgeZ = 478
  const fordX = riverX('rain', fordZ),
    bridgeX = riverX('rain', bridgeZ)
  const deck = waterAt('rain', bridgeX, bridgeZ).level + 6.35
  function abutment(side) {
    let distance = 10
    while (distance < 100 && heightAt('rain', bridgeX + distance * side, bridgeZ) < deck)
      distance += 0.25
    return bridgeX + distance * side
  }
  site = {
    fork: ground(fordX - 27, fordZ + 4),
    ford: { x: fordX, z: fordZ, y: waterAt('rain', fordX, fordZ).level - 0.15 },
    bridge: { x: bridgeX, z: bridgeZ, y: deck },
    west: abutment(-1),
    east: abutment(1),
    boatman: ground(fordX + 29, fordZ - 3),
  }
  return site
}

export function onFerryWorks(id, x, z, margin = 0) {
  if (id !== 'rain' || z < 468 - margin || z > 544 + margin) return false
  const s = ferrySite()
  if (Math.abs(z - s.bridge.z) < 3.8 + margin && x >= s.west - 3 - margin && x <= s.east + 3 + margin)
    return true
  if (Math.abs(z - s.ford.z) < 3.4 + margin && x > s.fork.x - 4 - margin && x < s.boatman.x + 4 + margin)
    return true
  if (Math.hypot(x - s.boatman.x, z - s.boatman.z) < 5 + margin) return true
  return z >= s.bridge.z && z <= s.fork.z && Math.abs(x - riverX(id, z) + 30) < 3 + margin
}
