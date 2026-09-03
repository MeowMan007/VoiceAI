import type { Urgency, WorkflowCondition, WorkflowField } from '@/types'

const RELATIVE_DATES: Record<string, number> = {
  today: 0,
  tomorrow: 1,
  'day after tomorrow': 2,
}

export function parseFieldDate(value: unknown, now = new Date()): Date | null {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null

  const lower = raw.toLowerCase()
  if (lower in RELATIVE_DATES) {
    // A date field has no time-of-day. Normalise relative dates to 00:00 UTC of the target
    // calendar day so "tomorrow" is a stable, whole-day offset — matching the YYYY-MM-DD branch
    // below (which also parses to UTC midnight). Preserving now's time here made "tomorrow"
    // land exactly 24h out, which then failed a strict `less_than 24` rule.
    const base = new Date(now)
    return new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + RELATIVE_DATES[lower])
    )
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const parsed = Date.parse(raw)
  if (!Number.isNaN(parsed)) return new Date(parsed)
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

// Whether a value should be compared temporally (hours-until) rather than numerically.
// Crucially, a bare number (e.g. "3") is NOT a date — even though Date.parse loosely accepts
// it as a year — otherwise numeric conditions would be misrouted to the temporal path.
function looksTemporal(value: unknown, now: Date): boolean {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return false
  if (raw in RELATIVE_DATES) return true
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return true
  if (/^\d{1,2}:\d{2}/.test(raw)) return true
  if (/^-?\d+(\.\d+)?$/.test(raw)) return false
  return parseFieldDate(raw, now) !== null
}

export function hoursUntil(value: unknown, now = new Date()): number | null {
  const date = parseFieldDate(value, now)
  if (!date) return null
  return (date.getTime() - now.getTime()) / 3_600_000
}

export function evaluateCondition(
  fieldValue: unknown,
  operator: WorkflowCondition['operator'],
  conditionValue: string,
  fieldType?: WorkflowField['type'],
  now = new Date()
): boolean {
  if (operator === 'greater_than' || operator === 'less_than') {
    const threshold = asNumber(conditionValue)
    if (threshold === null) return false

    // date/time fields compare "hours until the value" against the threshold; a field with no
    // declared type is treated temporally only when the value itself clearly looks like a date.
    const treatAsTemporal =
      fieldType === 'date' ||
      fieldType === 'time' ||
      (fieldType === undefined && looksTemporal(fieldValue, now))

    if (treatAsTemporal) {
      const remaining = hoursUntil(fieldValue, now)
      if (remaining === null) return false
      return operator === 'greater_than' ? remaining > threshold : remaining < threshold
    }

    const left = asNumber(fieldValue)
    if (left === null) return false
    return operator === 'greater_than' ? left > threshold : left < threshold
  }

  const left = String(fieldValue ?? '').toLowerCase()
  const right = conditionValue.toLowerCase()

  if (operator === 'equals') return left === right
  if (operator === 'not_equals') return left !== right
  if (operator === 'contains') return left.includes(right)
  return false
}

export function detectUrgency(
  collectedData: Record<string, unknown>,
  conditions: Array<Pick<WorkflowCondition, 'field' | 'operator' | 'value' | 'action'>>,
  fields: Array<Pick<WorkflowField, 'key' | 'type'>> = [],
  now = new Date()
): Urgency {
  const fieldTypes = Object.fromEntries(fields.map(f => [f.key, f.type]))

  for (const condition of conditions) {
    if (condition.action !== 'mark_urgent') continue
    const matched = evaluateCondition(
      collectedData[condition.field],
      condition.operator,
      condition.value,
      fieldTypes[condition.field],
      now
    )
    if (matched) return 'urgent'
  }
  return 'normal'
}
