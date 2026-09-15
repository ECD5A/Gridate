import * as core from '@actions/core'
import fs from 'node:fs'
import path from 'node:path'
import { buildCalendar, parseActivity, renderSvg } from './renderer.js'

function relativeOutput(workspace, filePath) {
  return path.relative(workspace, filePath).split(path.sep).join('/')
}

async function run() {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
  const dataFile = core.getInput('data-file', { required: true })
  const dataPath = path.resolve(workspace, dataFile)
  const outputDir = path.resolve(workspace, core.getInput('output-dir') || 'dist')
  const baseName = (core.getInput('base-name') || 'gridate').replace(/[^a-zA-Z0-9._-]+/g, '-')
  const title = core.getInput('title') || 'Gridate Activity'
  const from = core.getInput('from') || undefined
  const to = core.getInput('to') || undefined
  const theme = (core.getInput('theme') || 'auto').toLowerCase()
  const includeLegend = core.getBooleanInput('include-legend')

  if (!fs.existsSync(dataPath)) throw new Error(`Activity file not found: ${dataFile}`)
  if (!['auto', 'light', 'dark'].includes(theme)) throw new Error('theme must be auto, light, or dark.')

  const activity = parseActivity(fs.readFileSync(dataPath, 'utf8'), dataPath)
  const calendar = buildCalendar(activity, from, to)
  fs.mkdirSync(outputDir, { recursive: true })

  let lightPath = ''
  let darkPath = ''
  if (theme === 'auto' || theme === 'light') {
    lightPath = path.join(outputDir, `${baseName}.svg`)
    fs.writeFileSync(lightPath, renderSvg(calendar, { theme: 'light', title, includeLegend }))
  }
  if (theme === 'auto' || theme === 'dark') {
    darkPath = path.join(outputDir, `${baseName}-dark.svg`)
    fs.writeFileSync(darkPath, renderSvg(calendar, { theme: 'dark', title, includeLegend }))
  }

  core.setOutput('light-svg', lightPath ? relativeOutput(workspace, lightPath) : '')
  core.setOutput('dark-svg', darkPath ? relativeOutput(workspace, darkPath) : '')
  core.setOutput('active-days', String(calendar.activeDays))
  core.setOutput('total-activity', String(calendar.totalActivity))
  core.info(`Generated ${calendar.activeDays} active days and ${calendar.totalActivity} total activity.`)
  if (lightPath) core.info(`Light SVG: ${relativeOutput(workspace, lightPath)}`)
  if (darkPath) core.info(`Dark SVG: ${relativeOutput(workspace, darkPath)}`)
}

run().catch((error) => core.setFailed(error instanceof Error ? error.message : String(error)))
