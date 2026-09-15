import fs from 'node:fs'
import path from 'node:path'
import { buildCalendar, parseActivity, renderSvg } from '../action-src/renderer.js'

const root = process.cwd()
const activity = parseActivity(fs.readFileSync(path.join(root, 'action-sample', 'activity.json'), 'utf8'), 'activity.json')
const calendar = buildCalendar(activity, '2026-01-01', '2026-12-31')
fs.mkdirSync(path.join(root, 'action-preview'), { recursive: true })
fs.writeFileSync(path.join(root, 'action-preview', 'gridate.svg'), renderSvg(calendar, { theme: 'light', title: 'Gridate Activity' }))
fs.writeFileSync(path.join(root, 'action-preview', 'gridate-dark.svg'), renderSvg(calendar, { theme: 'dark', title: 'Gridate Activity' }))
