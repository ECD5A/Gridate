import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCalendar, parseActivity, renderSvg } from '../action-src/renderer.js'

test('parses object JSON and combines duplicate dates', () => {
  const activity = parseActivity(JSON.stringify([
    { date: '2026-01-01', count: 2 },
    { date: '2026-01-01', count: 2 },
    { date: '2026-01-02', count: 3 },
  ]))
  assert.equal(activity.get('2026-01-01'), 4)
  assert.equal(activity.get('2026-01-02'), 3)
})

test('parses CSV rows', () => {
  const activity = parseActivity('date,count\n2026-01-01,2\n2026-01-02,5\n', 'activity.csv')
  assert.equal(activity.size, 2)
  assert.equal(activity.get('2026-01-02'), 5)
})

test('builds and renders an accessible calendar', () => {
  const activity = parseActivity('[{"date":"2026-01-01","count":4},{"date":"2026-01-08","count":2}]')
  const calendar = buildCalendar(activity, '2026-01-01', '2026-01-31')
  const svg = renderSvg(calendar, { theme: 'dark', title: 'Release activity' })
  assert.equal(calendar.activeDays, 2)
  assert.equal(calendar.totalActivity, 6)
  assert.match(svg, /role="img"/)
  assert.match(svg, /Release activity/)
  assert.match(svg, /2026-01-08: 2/)
})
