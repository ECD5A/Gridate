const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const THEMES = {
  light: {
    background: '#ffffff',
    panel: '#f6f8fa',
    text: '#1f2328',
    muted: '#59636e',
    line: '#d0d7de',
    empty: '#ebedf0',
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  },
  dark: {
    background: '#0d1117',
    panel: '#161b22',
    text: '#f0f6fc',
    muted: '#8b949e',
    line: '#30363d',
    empty: '#21262d',
    levels: ['#21262d', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function dateFromIso(value) {
  if (!ISO_DATE.test(value)) throw new Error(`Invalid date: ${value}`)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: ${value}`)
  }
  return date
}

function toIso(date) {
  return date.toISOString().slice(0, 10)
}

function numericCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) return 0
  return Math.min(99, Math.floor(count))
}

function readEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const date = String(entry.date ?? '').trim()
  const value = entry.count ?? entry.activity ?? entry.value ?? 0
  return date ? { date, count: numericCount(value) } : null
}

export function parseActivity(text, fileName = 'activity.json') {
  const extension = fileName.toLowerCase().split('.').pop()
  const entries = []

  if (extension === 'csv') {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (!lines.length) throw new Error('The CSV activity file is empty.')
    const header = lines[0].split(',').map((cell) => cell.trim().toLowerCase())
    const dateIndex = Math.max(0, header.indexOf('date'))
    const countIndex = header.indexOf('count') >= 0 ? header.indexOf('count') : 1
    const start = header.includes('date') ? 1 : 0
    for (const line of lines.slice(start)) {
      if (line.startsWith('#')) continue
      const cells = line.split(',').map((cell) => cell.trim())
      const entry = readEntry({ date: cells[dateIndex], count: cells[countIndex] })
      if (entry) entries.push(entry)
    }
  } else {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new Error(`Could not parse ${fileName} as JSON: ${error.message}`)
    }
    const source = parsed?.activities ?? parsed?.data ?? parsed
    if (Array.isArray(source)) {
      for (const item of source) {
        const entry = readEntry(item)
        if (entry) entries.push(entry)
      }
    } else if (source && typeof source === 'object') {
      for (const [date, value] of Object.entries(source)) {
        const count = value && typeof value === 'object'
          ? value.count ?? value.activity ?? value.value
          : value
        entries.push({ date, count: numericCount(count) })
      }
    } else {
      throw new Error('Activity JSON must be an array or an object keyed by date.')
    }
  }

  const activity = new Map()
  for (const entry of entries) {
    const date = dateFromIso(entry.date)
    const iso = toIso(date)
    activity.set(iso, (activity.get(iso) ?? 0) + entry.count)
  }
  if (!activity.size) throw new Error('No valid activity entries were found.')
  return activity
}

function sundayBefore(date) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() - result.getUTCDay())
  return result
}

function saturdayAfter(date) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + (6 - result.getUTCDay()))
  return result
}

function addDays(date, count) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + count)
  return result
}

function levelFor(count, max) {
  if (count <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)))
}

export function buildCalendar(activity, fromInput, toInput) {
  const dates = [...activity.keys()].sort()
  const from = dateFromIso(fromInput || dates[0])
  const to = dateFromIso(toInput || dates[dates.length - 1])
  if (from > to) throw new Error('The from date must be before or equal to the to date.')

  const start = sundayBefore(from)
  const end = saturdayAfter(to)
  const weeks = Math.floor((end - start) / (7 * 24 * 60 * 60 * 1000)) + 1
  const selectedValues = dates
    .filter((date) => date >= toIso(from) && date <= toIso(to))
    .map((date) => activity.get(date) ?? 0)
  const max = Math.max(0, ...selectedValues)
  const activeDays = selectedValues.filter((value) => value > 0).length
  const totalActivity = selectedValues.reduce((sum, value) => sum + value, 0)

  return {
    activity,
    from,
    to,
    start,
    weeks,
    max,
    activeDays,
    totalActivity,
    width: 44 + weeks * 14 + 16,
    height: 172,
  }
}

function monthLabels(calendar) {
  const labels = []
  let previous = ''
  for (let week = 0; week < calendar.weeks; week += 1) {
    const date = addDays(calendar.start, week * 7)
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    if (key !== previous) {
      labels.push({
        x: 44 + week * 14,
        label: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      })
      previous = key
    }
  }
  return labels
}

export function renderSvg(calendar, { theme = 'light', title = 'Gridate Activity', includeLegend = true } = {}) {
  const colors = THEMES[theme]
  if (!colors) throw new Error(`Unknown theme: ${theme}`)
  const titleId = `gridate-title-${theme}`
  const descriptionId = `gridate-description-${theme}`
  const dateRange = `${toIso(calendar.from)} → ${toIso(calendar.to)}`
  const headerMeta = `${calendar.activeDays} active days · ${calendar.totalActivity} total activity`
  const cells = []

  for (let week = 0; week < calendar.weeks; week += 1) {
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(calendar.start, week * 7 + row)
      const iso = toIso(date)
      const inside = date >= calendar.from && date <= calendar.to
      const count = inside ? calendar.activity.get(iso) ?? 0 : 0
      const level = levelFor(count, calendar.max)
      const x = 44 + week * 14
      const y = 48 + row * 14
      cells.push(`<rect x="${x}" y="${y}" width="11" height="11" rx="2" fill="${inside ? colors.levels[level] : colors.empty}" opacity="${inside ? 1 : 0.42}"><title>${iso}: ${count}</title></rect>`)
    }
  }

  const labels = monthLabels(calendar)
    .map(({ x, label }) => `<text x="${x}" y="36" fill="${colors.muted}" font-size="10">${label}</text>`)
    .join('')
  const dayLabels = [
    ['Mon', 1],
    ['Wed', 3],
    ['Fri', 5],
  ].map(([label, row]) => `<text x="6" y="${51 + row * 14}" fill="${colors.muted}" font-size="9">${label}</text>`).join('')
  const legend = includeLegend
    ? [0, 1, 2, 3, 4].map((level, index) => `<rect x="${calendar.width - 146 + index * 14}" y="140" width="11" height="11" rx="2" fill="${colors.levels[level]}"/>`).join('')
    : ''
  const legendLabel = includeLegend ? `<text x="${calendar.width - 194}" y="149" fill="${colors.muted}" font-size="9">less</text><text x="${calendar.width - 70}" y="149" fill="${colors.muted}" font-size="9">more</text>` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${calendar.width} ${calendar.height}" role="img" aria-labelledby="${titleId} ${descriptionId}" width="${calendar.width}" height="${calendar.height}">
  <title id="${titleId}">${escapeXml(title)}</title>
  <desc id="${descriptionId}">${escapeXml(`${headerMeta} from ${dateRange}`)}</desc>
  <rect width="100%" height="100%" rx="12" fill="${colors.background}"/>
  <rect x="1" y="1" width="${calendar.width - 2}" height="${calendar.height - 2}" rx="11" fill="none" stroke="${colors.line}"/>
  <text x="16" y="22" fill="${colors.text}" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${escapeXml(title)}</text>
  <text x="${calendar.width - 16}" y="22" text-anchor="end" fill="${colors.muted}" font-size="10" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${escapeXml(headerMeta)}</text>
  ${dayLabels}
  ${labels}
  ${cells.join('')}
  ${legendLabel}
  ${legend}
  <text x="16" y="164" fill="${colors.muted}" font-size="9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${escapeXml(dateRange)} · gridate</text>
</svg>`
}

export { THEMES }
