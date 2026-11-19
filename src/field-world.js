import { buildFloodEvidence } from './flood-evidence.js'
import { buildCommissionPost, commissionPostSite } from './commission-post.js'
import { createGateway } from './settlement-gateways.js'
import * as T from 'three'
import { biomes, heightAt, waterSurfaceData } from './biomes.js'
import { gates, borderRoads } from './borders.js'
import { createActor } from './actors.js'
import { passageFor, passageVeils } from './passages.js'

export function windLull(time) {
  return time % 24 >= 14
}

export function oldSluice() {
  const [x, z] = biomes.rain.trail[5],
    base = heightAt('rain', x, z)
  const point = (i, j) => ({ x: x + i, z: z + j, y: heightAt('rain', x + i, z + j) })
  return {
    x,
    z,
    base,
    oldValve: point(-3, 3),
    rope: { x: x + 5, z: z - 2, y: base + 4.1 },
    lostApprentice: point(-1, -5),
    worksExit: point(2, 12),
    cache: point(-3, -7),
  }
}
const labels = {
  M00: ['听雨铜钟', '巡线夹册'],
  M01: ['近侧排水阀', '学徒的信号灯', '护闸员的巡检牌'],
  M02: ['湿井绳', '迁户名单', '避洪栓'],
  M03: ['铜收声口', '调度留声筒'],
  M04: ['原始名单', '旧水路图', '密封档案袋'],
  M05: ['撤离路线图', '放行绞盘'],
  M06: ['断潮塔压力表', '双联读数器'],
  M07: ['三闸分流盘', '旧渠控制轮', '水尺签章'],
  M08: ['新水位尺', '交接日志'],
}
export function objectName(task) {
  return labels[task?.q.id]?.[task.index] || task?.step.label || ''
}
const shoreLandmarks = {
  rain: [
    ['浅汊渡口', 12, 530],
    ['三叠跌水', 0, -282],
  ],
  salt: [['旧盐池', 18, -164]],
  root: [['根湾渡口', -20, 510]],
  gorge: [['断潮河滩', 35, 500]],
}
function markedBanks(id) {
  const sections = shoreLandmarks[id]
  if (!sections) return []
  const shores = waterSurfaceData(id).shorelines
  return sections.flatMap(([name, approachX, atZ]) => {
    let best = Infinity,
      point
    for (const [p, q] of shores) {
      const x = (p.x + q.x) / 2,
        z = (p.z + q.z) / 2
      const score = Math.abs(atZ - z) * 2 + Math.abs(approachX - x) * 0.12
      if (score < best) {
        best = score
        point = { kind: 'shore', name, x, z, y: (p.y + q.y) / 2 }
      }
    }
    return point ? [point] : []
  })
}
export function makeField(scene, id, town, data) {
  const b = biomes[id],
    group = new T.Group(),
    structures = [],
    features = [...gates(id), ...markedBanks(id)],
    lights = [],
    models = []
  scene.add(group)
  const ground = (x, z) => heightAt(id, x, z)
  const evidence = id === 'capital' ? buildFloodEvidence(group, ground) : null
  const post = buildCommissionPost(group, id, ground)
  structures.push(...(evidence?.structures || []), ...post.colliders)
  const postSite = commissionPostSite(id)
  if (postSite)
    features.push({
      ...postSite,
      kind: 'commission',
      name: postSite.title,
      y: ground(postSite.x, postSite.z),
    })
  const portals = features.map((g) => passageFor(id, g)).filter(Boolean)
  const veils = passageVeils(group, portals)
  const gateways = id === 'capital' ? [] : portals.map((g) => createGateway(group, id, g))
  for (const gateway of gateways) structures.push(...gateway.colliders)
  const materials = new Map(),
    maps = [],
    geos = new Set()
  function mat(color, glow = false) {
    const k = color + glow
    if (!materials.has(k))
      materials.set(
        k,
        glow
          ? new T.MeshBasicMaterial({ color })
          : new T.MeshStandardMaterial({ color, roughness: 0.87 }),
      )
    return materials.get(k)
  }
  function mesh(parent, geo, m, x, y, z) {
    geos.add(geo)
    const o = new T.Mesh(geo, m)
    o.position.set(x, y, z)
    parent.add(o)
    return o
  }
  const cube = new T.BoxGeometry(1, 1, 1),
    pole = new T.CylinderGeometry(0.8, 1, 1, 8),
    flame = new T.OctahedronGeometry(1, 0)
  function box(x, y, z, w, h, d, color, solid = false, parent = group) {
    const o = mesh(parent, cube, mat(color), x, y, z)
    o.scale.set(w, h, d)
    o.receiveShadow = true
    if (solid) structures.push({ x, y, z, w, h, d })
    return o
  }
  function stake(x, y, z, r, h, col, parent = group) {
    const o = mesh(parent, pole, mat(col), x, y + h / 2, z)
    o.scale.set(r, h, r)
    return o
  }
  function torch(x, y, z) {
    stake(x, y, z, 0.105, 1.75, '#625141')
    const f = mesh(group, flame, mat('#ffae4e', true), x, y + 1.9, z)
    f.scale.set(0.14, 0.35, 0.14)
    lights.push(f)
  }
  function plaque(text, x, y, z, w = 3.8) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 112
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#263b37'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#c4a879'
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, 500, 100)
    ctx.font = '600 49px "Microsoft YaHei UI",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f2e5c6'
    ctx.fillText(text, 256, 57, 474)
    const g = new T.CanvasTexture(c)
    g.colorSpace = T.SRGBColorSpace
    maps.push(g)
    const m = new T.MeshBasicMaterial({ map: g, side: T.DoubleSide })
    materials.set(g.uuid, m)
    const board = mesh(group, new T.PlaneGeometry(w, (w * 112) / 512), m, x, y, z)
    return board
  }
  function pathRibbon(points) {
    const pts = []
    for (let i = 1; i < points.length; i++) {
      const [x, z] = points[i - 1],
        [ex, ez] = points[i],
        n = Math.ceil(Math.hypot(ex - x, ez - z) / 2)
      for (let j = 0; j < n; j++) pts.push([x + ((ex - x) * j) / n, z + ((ez - z) * j) / n])
    }
    pts.push(points.at(-1))
    const verts = [],
      idx = []
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i],
        [ax, az] = pts[Math.max(0, i - 1)],
        [bx, bz] = pts[Math.min(pts.length - 1, i + 1)],
        len = Math.hypot(bx - ax, bz - az) || 1
      for (const s of [-1, 1]) {
        const px = x + ((s * (bz - az)) / len) * 1.3,
          pz = z - ((s * (bx - ax)) / len) * 1.3
        verts.push(px, heightAt(id, px, pz) + 0.055, pz)
      }
      if (i) {
        const k = i * 2
        idx.push(k - 2, k, k - 1, k - 1, k, k + 1)
      }
    }
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    const m = new T.MeshStandardMaterial({
      color: id === 'salt' ? '#b49f70' : '#8e8265',
      transparent: true,
      opacity: 0.49,
      depthWrite: false,
      side: T.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
    materials.set(m.uuid, m)
    mesh(group, geo, m, 0, 0, 0)
  }
  if (id !== 'capital') {
    for (const road of borderRoads(id)) {
      pathRibbon(road.points)
      for (let j = 6; j < road.points.length - 1; j += 6) {
        const [x, z] = road.points[j],
          y = heightAt(id, x + 2, z)
        stake(x + 2, y, z, 0.14, 1.4, '#83715b')
        box(x + 2, y + 1.19, z, 0.64, 0.2, 0.2, '#dec89d')
      }
    }
    const well = { kind: 'well', name: '聚落石井', x: 2.4, z: 17, y: heightAt(id, 2.4, 17) }
    features.push(well)
    const rim = mesh(
      group,
      new T.TorusGeometry(0.85, 0.16, 7, 22),
      mat('#9c9984'),
      well.x,
      well.y + 0.66,
      well.z,
    )
    rim.rotation.x = Math.PI / 2
    stake(well.x, well.y, well.z, 0.83, 0.6, '#787867')
    box(well.x, well.y + 0.61, well.z, 1, 0.08, 1, '#4b8285')
    for (const [x, z] of [
      [3, 12],
      [-4, -22],
      [4, -40],
    ]) {
      const y = heightAt(id, x, z)
      torch(x, y, z)
      features.push({ kind: 'fire', name: '驿站火盆', x, y, z })
    }
    features.push({ kind: 'inn', name: '驿站铺位', x: -2, z: 15, y: heightAt(id, -2, 15) })
  }
  let water,
    ladder,
    apprentice,
    questGroup,
    questKey = '',
    questVisible = true,
    ring,
    token,
    station,
    windBand
  if (id === 'salt') {
    const tower = town.features.find((p) => p.kind === 'upper')
    if (tower) {
      const { x, y, z } = tower
      stake(x + 1.7, y, z, 0.07, 2.55, '#775b40')
      windBand = new T.Group()
      windBand.position.set(x + 1.7, y + 2.49, z)
      group.add(windBand)
      box(0, -0.64, 0, 0.16, 1.28, 0.028, '#bb6446', false, windBand)
    }
  }
  if (id === 'rain') {
    station = oldSluice()
    const { x, z, base: y, cache } = station
    const meadow = {
      kind: 'habitat',
      name: '浅汊草滩 · 野牛饮水地',
      x: 20,
      z: 549,
      y: heightAt(id, 20, 549),
    }
    const signY = heightAt(id, 4, 556)
    stake(4, signY, 556, 0.13, 1.8, '#79634c')
    plaque('浅汊草滩 · 野牛出没', 4, signY + 1.5, 556, 3.2)
    features.push(meadow, { kind: 'ally', name: '阿弦', x: 3.8, z: 11, y: heightAt(id, 3.8, 11) })
    for (const s of [-1, 1]) {
      box(x + s * 3.6, y + 0.76, z - 4, 0.6, 1.7, 9, '#726f5b', true)
      for (const t of [-6, -1, 4])
        box(x + 5 + s * 1.45, y + 1.9, z + t, 0.27, 4.2, 0.27, '#594d3e', true)
    }
    box(x + 5, y + 3.94, z - 1, 3.55, 0.32, 11, '#8a6c4c', true)
    const baseStep = heightAt(id, x + 5, z + 16)
    for (let i = 0; i < 22; i++) {
      const zz = z + 16 - i * 0.56,
        top = baseStep + ((y + 4.1 - baseStep) * (i + 1)) / 22
      box(x + 5, top - 0.15, zz, 3, 0.3, 0.59, '#987954', true)
    }
    water = box(x, y + 0.4, z - 4, 6.5, 0.12, 8.8, '#548783')
    for (let i = 0; i < 7; i++) {
      const wind = mesh(
        group,
        new T.TorusGeometry(0.24, 0.036, 5, 16),
        mat('#d2b98e'),
        station.rope.x - 0.6,
        station.rope.y + 0.78,
        station.rope.z + i * 0.065,
      )
      wind.rotation.y = 0.17
    }
    ladder = new T.Group()
    group.add(ladder)
    for (const s of [-1, 1]) stake(x + 3.08, y, z - 2 + s * 0.45, 0.055, 4.35, '#b19d76', ladder)
    for (let j = 0; j < 11; j++)
      box(x + 3.08, y + 0.4 + j * 0.33, z - 2, 0.14, 0.09, 0.9, '#ab8560', false, ladder)
    torch(x - 5, y, z + 1)
    plaque('北支渠 · 雨林废闸', x + 1, y + 2.4, z + 8, 3.8)
    features.push(
      { ...station.rope, kind: 'rope', name: '高架救援绳盘' },
      { ...cache, kind: 'cache', name: '水线下的旧巡线牌' },
    )
    token = box(cache.x, cache.y + 0.18, cache.z, 0.65, 0.12, 0.44, '#c2a25e')
    apprentice = createActor('resident', id, '#d0a46d')
    group.add(apprentice.group)
    models.push(apprentice)
  }
  function object(task) {
    if (!task?.p) {
      if (questGroup) questGroup.visible = false
      questKey = ''
      return
    }
    const key = task.q.id + '-' + task.index
    if (key === questKey) {
      questGroup.visible = questVisible
      return
    }
    questKey = key
    if (questGroup) {
      questGroup.removeFromParent()
      questGroup.traverse((n) => {
        if (n.geometry && n.geometry !== cube && n.geometry !== pole) {
          n.geometry.dispose()
          geos.delete(n.geometry)
        }
      })
    }
    questGroup = new T.Group()
    group.add(questGroup)
    const p = task.p
    questGroup.position.set(p.x, p.y, p.z)
    const label = objectName(task)
    if (/绳/.test(label)) {
      for (let j = 0; j < 5; j++) {
        const coil = mesh(
          questGroup,
          new T.TorusGeometry(0.31 - j * 0.023, 0.032, 6, 16),
          mat('#ab895f'),
          0,
          0.12 + 0.052 * j,
          0,
        )
        coil.rotation.x = Math.PI / 2
      }
      stake(0.4, 0, 0, 0.052, 0.72, '#67543d', questGroup)
    } else if (/压力表|读数器/.test(label)) {
      box(0, 0.55, 0, 0.66, 1.1, 0.34, '#4a5d59', false, questGroup)
      mesh(questGroup, new T.CircleGeometry(0.275, 24), mat('#e6dbb6'), 0, 0.96, 0.176)
      box(0.06, 1.01, 0.19, 0.2, 0.018, 0.024, '#993c2d', false, questGroup).rotation.z = 0.53
    } else if (/阀|盘|轮|绞/.test(label)) {
      stake(0, 0, 0, 0.15, 1.05, '#605944', questGroup)
      const wheel = mesh(questGroup, new T.TorusGeometry(0.44, 0.065, 8, 20), mat('#bf8356'), 0, 1.1, 0)
      for (let i = 0; i < 3; i++)
        box(0, 1.1, 0, 0.8, 0.045, 0.06, '#a27049', false, questGroup).rotation.z = (i * Math.PI) / 3
    } else if (/灯/.test(label)) {
      stake(0, 0, 0, 0.105, 0.67, '#615241', questGroup)
      box(0, 0.83, 0, 0.3, 0.38, 0.3, '#efbd6e', false, questGroup)
      box(0, 1.05, 0, 0.4, 0.09, 0.4, '#654d39', false, questGroup)
    } else if (/钟|声|铜/.test(label)) {
      stake(-0.46, 0, 0, 0.07, 1.8, '#655340', questGroup)
      box(0, 1.76, 0, 1.05, 0.1, 0.15, '#766950', false, questGroup)
      mesh(
        questGroup,
        new T.CylinderGeometry(0.16, 0.36, 0.52, 12, 1, true),
        mat('#ad8e52'),
        0.14,
        1.32,
        0,
      )
    } else if (/尺|表|栓/.test(label)) {
      box(0, 0.85, 0, 0.28, 1.7, 0.2, '#ccc6a2', false, questGroup)
      for (let i = 0; i < 7; i++)
        box(0.03, 0.25 + i * 0.2, 0.112, 0.19, 0.035, 0.02, '#5f4c3b', false, questGroup)
    } else {
      box(0, 0.43, 0, 0.85, 0.78, 0.56, '#74634b', false, questGroup)
      const page = box(0, 0.85, 0, 0.53, 0.06, 0.37, '#e6dbb7', false, questGroup)
      page.rotation.y = -0.15
      for (let j = 0; j < 4; j++)
        box(
          -0.04,
          0.886,
          -0.12 + j * 0.065,
          0.3 + 0.028 * (j % 2),
          0.008,
          0.009,
          '#7f7360',
          false,
          questGroup,
        )
    }
    ring = mesh(questGroup, new T.TorusGeometry(0.19, 0.022, 6, 4), mat('#f2cf78', true), 0, 2.25, 0)
    ring.userData.hidden = !!task.step.hidden
  }
  let drops = []
  function showDrops(list = []) {
    for (const o of drops) o.removeFromParent()
    drops = []
    for (const p of list.filter((d) => d.zone === id)) {
      const bundle = box(
        p.x,
        p.y + 0.21,
        p.z,
        p.kind === 'remains' ? 0.76 : 0.44,
        0.36,
        0.37,
        p.kind === 'remains' ? '#866f54' : '#ad8755',
      )
      bundle.rotation.y = 0.38
      drops.push(bundle)
    }
  }
  function refresh() {
    if (!station) return
    const drained = data.field.rescue === 'valve',
      rescued = data.field.rescued || data.main > 1
    if (water.userData.drained == null) water.position.y = station.base + (drained ? -1.6 : 0.4)
    water.userData.drained = drained
    ladder.visible = data.field.rescue === 'rope'
    token.visible = drained && !data.field.badge
    const where = rescued ? { x: 3.8, z: 11, y: heightAt(id, 3.8, 11) } : station.lostApprentice
    apprentice.group.position.set(where.x, where.y, where.z)
  }
  refresh()
  const ladderGrip = station
    ? { kind: 'ladder', x: station.x + 3.08, z: station.z - 2, y: station.base, h: 4.14, r: 0.18 }
    : null
  return {
    features,
    portals,
    structures,
    refresh,
    object,
    get ladderGrip() {
      return ladder?.visible ? ladderGrip : null
    },
    drops: showDrops,
    update(dt, t, day, cam) {
      veils.update(t)
      if (windBand)
        windBand.rotation.z = T.MathUtils.damp(
          windBand.rotation.z,
          windLull(t) ? 0.04 * Math.sin(t * 2) : 1.21 + 0.17 * Math.sin(t * 7),
          5,
          dt,
        )
      for (const f of lights) {
        f.visible = day < 0.8
        f.scale.y = 0.33 + 0.09 * Math.sin(t * 10 + f.position.x)
      }
      if (ring) {
        ring.rotation.y = t
        ring.position.y = 2.15 + 0.1 * Math.sin(t * 2)
      }
      if (water) {
        const target = station.base + (water.userData.drained ? -1.6 : 0.4)
        water.position.y = T.MathUtils.damp(water.position.y, target, 1.15, dt)
        water.visible = water.position.y > station.base - 1.54
      }
      if (questGroup) {
        const d = questGroup.position.distanceTo(cam.position)
        questVisible = d < (ring?.userData.hidden ? 7 : 145)
        questGroup.visible = questVisible && !!questKey
        if (ring) ring.visible = d < (ring.userData.hidden ? 3 : 85)
      }
      apprentice?.update(dt, false, false, t)
    },
    dispose() {
      evidence?.dispose()
      post.dispose()
      veils.dispose()
      for (const gateway of gateways) gateway.dispose()
      models.forEach((a) => a.dispose())
      group.removeFromParent()
      geos.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      maps.forEach((m) => m.dispose())
    },
  }
}
