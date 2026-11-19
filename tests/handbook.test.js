import test from 'node:test'
import assert from 'node:assert/strict'
import { fresh, completeStep, current } from '../src/journal.js'
import { opening, questStatus, migrateBook, recordEvidence, acceptCommission } from '../src/handbook.js'

test('a fresh city visit leaves all offers unaccepted and allows parallel commissions', () => {
  const s = fresh()
  assert.equal(s.tracked, null)
  assert.equal(questStatus(s, 'medicine', { phase: 'offered' }), 'open')
  assert.equal(questStatus(s, 'prologue'), 'open')
  assert.equal(questStatus(s, 'M00'), 'locked')
  assert.equal(acceptCommission(s, 'S03'), false)
  s.tracked = 'prologue'
  assert.equal(recordEvidence(s, 'gauge', 3), false)
  assert.equal(acceptCommission(s, 'prologue'), true)
  assert.equal(acceptCommission(s, 'S01'), true)
  assert.equal(acceptCommission(s, 'S01'), false)
  assert.equal(questStatus(s, 'S01'), 'active')
  assert.equal(questStatus(s, 'prologue'), 'active')
})
test('readings, bell sequence and handover advance once, then nine existing chapters take over', () => {
  const s = fresh()
  acceptCommission(s, 'prologue')
  for (const [site, reading, valid] of [
    ['bell', 'ssl', false],
    ['gauge', 2, false],
    ['gauge', 3, true],
    ['gauge', 3, false],
    ['bell', 'sss', false],
    ['bell', 'ssl', true],
    ['clerk', null, true],
    ['clerk', null, false],
  ])
    assert.equal(recordEvidence(s, site, reading), valid)
  assert.deepEqual(s.items, [opening.reward])
  assert.equal(s.tracked, 'main')
  assert.equal(questStatus(s, 'prologue'), 'done')
  assert.equal(questStatus(s, 'M00'), 'active')
  completeStep(s, 'main')
  assert.equal(current(s).index, 1)
  completeStep(s, 'main')
  assert.equal(questStatus(s, 'M00'), 'done')
  assert.equal(questStatus(s, 'M01'), 'active')
})
test('old saves retain partial work, decisions and medicine, with a free start for an untouched save', () => {
  const s = { ...fresh(), tracked: 'main' }
  assert.equal(migrateBook({ version: 1, role: 'tide' }).role, 'tide')
  delete s.handbook
  assert.equal(migrateBook(s).tracked, null)
  const old = {
    ...s,
    main: 2,
    side: { S01: 1 },
    tracked: 'S01',
    field: { medicine: { phase: 'floating' } },
  }
  delete old.handbook
  migrateBook(old)
  assert.equal(questStatus(old, 'M02'), 'active')
  assert.equal(questStatus(old, 'S01'), 'active')
  assert.equal(questStatus(old, 'medicine', old.field.medicine), 'active')
  assert.equal(questStatus(old, 'prologue'), 'open')
  assert.equal(migrateBook(old).tracked, 'S01')
  acceptCommission(old, 'prologue')
  recordEvidence(old, 'gauge', 3)
  recordEvidence(old, 'bell', 'ssl')
  recordEvidence(old, 'clerk')
  assert.equal(current(old).q.id, 'M02')
  assert.equal(old.handbook.accepted.filter((key) => key === 'main').length, 1)
})
