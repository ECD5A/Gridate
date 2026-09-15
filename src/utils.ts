import type { DayActivity, HHMM, ISODate, PlannerState, TimelineEvent } from './domain'

export const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(year: number, month: number, day: number): ISODate {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function parseISODate(value: ISODate): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day ? { year, month, day } : null
}

export function dateToUTC(value: ISODate): number {
  const parsed = parseISODate(value)
  return parsed ? Date.UTC(parsed.year, parsed.month - 1, parsed.day) : NaN
}

export function isValidDate(value: string): value is ISODate { return parseISODate(value) !== null }

export function daysBetween(from: ISODate, to: ISODate): ISODate[] {
  const start = dateToUTC(from); const end = dateToUTC(to)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return []
  const result: ISODate[] = []
  for (let stamp = start; stamp <= end; stamp += 86400000) {
    const date = new Date(stamp); result.push(toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()))
  }
  return result
}

export function datesForYear(year: number): ISODate[] {
  return daysBetween(toISODate(year, 1, 1), toISODate(year, 12, 31))
}

export function isInRange(date: ISODate, range: PlannerState['range']): boolean {
  return date >= range.from && date <= range.to
}

export function formatDateInput(value: ISODate): string { return value }

export function minutes(value: HHMM): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return NaN
  const hour = Number(match[1]); const minute = Number(match[2])
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60 ? hour * 60 + minute : NaN
}

export function formatTime(total: number): HHMM { return `${pad(Math.floor(total / 60))}:${pad(total % 60)}` }

export function generateRandomTimes(count: number, from: HHMM, to: HHMM): HHMM[] {
  if (!Number.isInteger(count) || count <= 0) return []
  const start = minutes(from); const end = minutes(to)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return Array.from({ length: count }, (_, i) => formatTime(Math.min(1439, i)))
  const available = end - start + 1
  const selected = new Set<number>()
  while (selected.size < Math.min(count, available)) selected.add(start + Math.floor(Math.random() * available))
  const values = [...selected].sort((a, b) => a - b)
  while (values.length < count) values.push(start + (values.length % available))
  return values.sort((a, b) => a - b).map(formatTime)
}

export function eventId(): string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }

export function countEvents(days: Record<ISODate, DayActivity>): number { return Object.values(days).reduce((sum, day) => sum + day.events.length, 0) }
export function activeDays(days: Record<ISODate, DayActivity>): number { return Object.values(days).filter(day => day.events.length > 0).length }
export function sortedEvents(days: Record<ISODate, DayActivity>): Array<{ date: ISODate; event: TimelineEvent }> {
  return Object.values(days).flatMap(day => day.events.map(event => ({ date: day.date, event }))).sort((a, b) => a.date.localeCompare(b.date) || a.event.time.localeCompare(b.event.time))
}

export function normalizeTimes(events: TimelineEvent[]): TimelineEvent[] { return events.map((event, index) => ({ ...event, time: /^\d{2}:\d{2}$/.test(event.time) && Number.isFinite(minutes(event.time)) ? event.time : formatTime(index) })).sort((a, b) => a.time.localeCompare(b.time)) }

export function defaultRange(): { from: ISODate; to: ISODate } {
  const now = new Date(); const year = now.getUTCFullYear(); const month = now.getUTCMonth() + 1; const day = now.getUTCDate()
  return { from: toISODate(year - 2, 1, 1), to: toISODate(year, month, day) }
}

export function rollingThreeYearRange(): { from: ISODate; to: ISODate } { return defaultRange() }

export function defaultState(): PlannerState {
  return { version: 1, range: defaultRange(), target: null, days: {}, settings: { language: navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en', theme: 'dark', mouseMode: 'left-plus', randomTimeFrom: '18:00', randomTimeTo: '23:30' } }
}

export function readPersistedState(): PlannerState {
  try {
    const raw = localStorage.getItem('gridate.state.v1'); if (!raw) return defaultState()
    const value = JSON.parse(raw) as Partial<PlannerState>
    if (value.version !== 1 || !value.range || !isValidDate(value.range.from) || !isValidDate(value.range.to) || value.range.from > value.range.to) return defaultState()
    const migrated = localStorage.getItem('gridate.mouse-mode.v2') === '1' ? undefined : 'left-plus'
    const hasActivity = Boolean(value.days && Object.keys(value.days).length)
    const freshRange = !hasActivity && localStorage.getItem('gridate.range.v3') !== '1' ? defaultRange() : value.range
    const state = { ...defaultState(), ...value, range: freshRange, days: value.days && typeof value.days === 'object' ? value.days : {}, settings: { ...defaultState().settings, ...(value.settings ?? {}), ...(migrated ? { mouseMode: migrated } : {}) } } as PlannerState
    if (migrated) localStorage.setItem('gridate.mouse-mode.v2', '1')
    if (!hasActivity) localStorage.setItem('gridate.range.v3', '1')
    return state
  } catch { return defaultState() }
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
}
