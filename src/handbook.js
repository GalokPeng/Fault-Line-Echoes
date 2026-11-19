import { main, side, steps } from './story.js'
import { medicineTitle } from './medicine.js'

export const opening = {
  id: 'prologue',
  name: '未盖章的汛报',
  zone: 'capital',
  reward: '白砥汛印',
  summary: '上游送来一封空着水位栏的汛报。议庭书记衡书需要一个亲眼看过水痕、亲手试过警钟的人签字。',
  steps: [
    { point: 'gauge', label: '到泉井旁的旧汛尺拓下最高的新泥痕' },
    { point: 'bell', label: '按警钟台铭牌试敲汛号' },
    { point: 'clerk', label: '把水痕拓片和试钟记录交还衡书' },
  ],
}
export const medicineEntry = {
  id: 'medicine',
  name: medicineTitle,
  zone: 'capital',
  reward: '8 行券与渡工信物',
  summary: '回春药铺有一箱急药，要越过青雨林的浅汊，交给东岸的渡工。',
}
export const handbookEntries = [opening, medicineEntry, ...main, ...side]
export function newBook() {
  return { accepted: [], openingStep: 0 }
}
export function migrateBook(data) {
  if (data.handbook) return data
  const book = newBook()
  if (data.main > 0 || data.sub > 0 || data.ending) book.accepted.push('main')
  for (const q of side) if (data.side?.[q.id] > 0 || data.tracked === q.id) book.accepted.push(q.id)
  if (data.tracked === 'main' && (!book.accepted.includes('main') || data.ending)) data.tracked = null
  data.handbook = book
  return data
}
export function questStatus(data, key, medicine) {
  const book = data.handbook
  if (key === 'medicine')
    return medicine.phase === 'done' ? 'done' : medicine.phase === 'offered' ? 'open' : 'active'
  if (key === 'prologue')
    return book.openingStep >= opening.steps.length
      ? 'done'
      : book.accepted.includes(key)
        ? 'active'
        : 'open'
  const chapter = main.findIndex((q) => q.id === key)
  if (chapter >= 0)
    return chapter < data.main
      ? 'done'
      : chapter === data.main && book.accepted.includes('main')
        ? 'active'
        : 'locked'
  const q = side.find((q) => q.id === key)
  if (!q) return 'locked'
  if ((data.side[key] || 0) >= steps(q, data.choices).length) return 'done'
  if (book.accepted.includes(key)) return 'active'
  return data.main >= q.open ? 'open' : 'locked'
}
export function trackingKey(entry) {
  return main.includes(entry) ? 'main' : entry.id
}
export function acceptCommission(data, key) {
  if (!(key === 'prologue' || side.some((q) => q.id === key)) || questStatus(data, key) !== 'open')
    return false
  data.handbook.accepted.push(key)
  data.tracked = key
  return true
}
// A wrong reading or a replayed interaction must never advance the next station.
export function recordEvidence(data, point, reading) {
  const book = data.handbook
  if (questStatus(data, 'prologue') !== 'active' || opening.steps[book.openingStep]?.point !== point)
    return false
  if ((point === 'gauge' && reading !== 3) || (point === 'bell' && reading !== 'ssl')) return false
  book.openingStep++
  if (book.openingStep === opening.steps.length) {
    if (!data.items.includes(opening.reward)) data.items.push(opening.reward)
    if (!book.accepted.includes('main')) book.accepted.push('main')
    if (data.tracked === 'prologue') data.tracked = main[data.main] ? 'main' : null
  }
  return true
}
