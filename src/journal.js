import { biomes, heightAt } from './biomes.js'
import { main, side, steps, skins, gear } from './story.js'
import { oldSluice } from './field-world.js'
import { newBook, migrateBook } from './handbook.js'
const storage = 'faultline.atlas.v1'
export function fresh() {
  return {
    version: 1,
    role: 'leaf',
    skin: '巡线原色',
    hour: 9.3,
    main: 0,
    sub: 0,
    side: {},
    choices: {},
    items: [],
    secrets: [],
    tracked: null,
    handbook: newBook(),
    positions: {},
    ending: '',
    visited: [],
    field: { rescue: '', rescued: false, badge: false, taken: {} },
  }
}
export function readSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(storage))
    return raw?.version === 1 ? Object.assign(fresh(), migrateBook(raw)) : fresh()
  } catch {
    return fresh()
  }
}
export function writeSave(data) {
  try {
    localStorage.setItem(storage, JSON.stringify(data))
  } catch {}
}
export function current(data, which = data.tracked) {
  const m = which === 'main',
    q = m ? main[data.main] : side.find((q) => q.id === which)
  if (!q) return null
  const list = steps(q, data.choices),
    index = m ? data.sub : data.side[q.id] || 0,
    step = list[index]
  return step ? { q, step, index, list, main: m } : null
}
export function completeStep(data, which, choice) {
  const task = current(data, which)
  if (!task) return
  const { q, step, main: m } = task
  if (step.choice) {
    if (!step.choice.some(([key]) => key === choice) || (choice === 'triple' && data.secrets.length < 3))
      return
    data.choices[q.id] = choice
  }
  if (m) data.sub++
  else data.side[q.id] = task.index + 1
  if ((m ? data.sub : data.side[q.id]) >= steps(q, data.choices).length) {
    if (!data.items.includes(q.reward)) data.items.push(q.reward)
    if (q.secret && !data.secrets.includes(q.secret)) data.secrets.push(q.secret)
    if (m) {
      data.main++
      data.sub = 0
      if (step.finish)
        data.ending = { old: '旧渠长明', town: '白盐有井', triple: '三闸同声' }[data.choices.M07]
      if (!main[data.main] && data.tracked === which) data.tracked = null
    } else if (data.tracked === which) data.tracked = null
    return q.reward
  }
}
export function positions(id, town) {
  if (id === 'capital') return {}
  const b = biomes[id],
    f = (kind) => town.features.find((p) => p.kind === kind),
    g = (x, z) => ({ x, z, y: heightAt(id, x, z) })
  const tr = (n, offset = 0) => {
    const [x, z] = b.trail[n]
    return g(x + offset, z)
  }
  const upper = f('upper'),
    lower = f('underground'),
    ent = f('entrance'),
    gate = f('gate'),
    stairs = f('stairs')
  return {
    ...(id === 'rain' ? oldSluice() : {}),
    camp: g(1, 10),
    gate: gate || tr(1),
    watch: upper,
    canopy: { ...upper, x: upper.x + 0.9 },
    bank: tr(3),
    work: tr(4),
    shelter: g(-2, 8),
    entry: ent,
    valve: { ...lower, z: lower.z + 1.5 },
    under: lower,
    records: { ...lower, x: lower.x + 0.7 },
    back: { ...lower, z: lower.z - 1 },
    rim: tr(6),
    bridge: tr(7),
    far: tr(8),
    yard: stairs || g(-3, -3),
  }
}
export { main, side, skins, gear }
