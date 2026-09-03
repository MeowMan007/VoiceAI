import assert from 'node:assert/strict'
import test from 'node:test'
import { detectUrgency, evaluateCondition, hoursUntil, parseFieldDate } from './conditions.ts'

const now = new Date('2026-09-03T10:00:00+05:30')

test('parseFieldDate understands tomorrow', () => {
  const d = parseFieldDate('tomorrow', now)
  assert.ok(d)
  assert.equal(d!.toISOString().slice(0, 10), '2026-09-04')
})

test('hoursUntil tomorrow morning is under 24h from 10:00', () => {
  const h = hoursUntil('2026-09-04', now)
  assert.ok(h !== null)
  assert.ok(h! < 24)
  assert.ok(h! > 0)
})

test('cake shop brief: required_date tomorrow with less_than 24 is urgent', () => {
  const urgency = detectUrgency(
    { flavour: 'chocolate', weight: 1, required_date: 'tomorrow' },
    [{ field: 'required_date', operator: 'less_than', value: '24', action: 'mark_urgent' }],
    [{ key: 'required_date', type: 'date' }],
    now
  )
  assert.equal(urgency, 'urgent')
})

test('required_date next week is not urgent under 24h rule', () => {
  const urgency = detectUrgency(
    { required_date: '2026-09-12' },
    [{ field: 'required_date', operator: 'less_than', value: '24', action: 'mark_urgent' }],
    [{ key: 'required_date', type: 'date' }],
    now
  )
  assert.equal(urgency, 'normal')
})

test('equals / not_equals / contains', () => {
  assert.equal(evaluateCondition('Emergency', 'equals', 'Emergency'), true)
  assert.equal(evaluateCondition('Urgent', 'not_equals', 'Normal'), true)
  assert.equal(evaluateCondition('chocolate truffle', 'contains', 'chocolate'), true)
})

test('numeric greater_than / less_than', () => {
  assert.equal(evaluateCondition('3', 'greater_than', '2', 'number'), true)
  assert.equal(evaluateCondition('1kg', 'less_than', '2', 'number'), true)
})
