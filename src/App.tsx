import { useEffect, useMemo, useRef, useState } from 'react'
import type { Action, DayActivity, HHMM, ISODate, Language, PlannerState, Theme } from './domain'
import { STORAGE_KEY } from './domain'
import { activeDays, countEvents, datesForYear, defaultState, downloadFile, eventId, generateRandomTimes, isInRange, isValidDate, normalizeTimes, parseISODate, readPersistedState, sortedEvents } from './utils'

const copy = {
  en: { subtitle: 'Visual Activity Timeline Planner', from: 'From', to: 'To', stats: 'Overview', total: 'TOTAL', active: 'ACTIVE DAYS', target: 'TARGET', remaining: 'REMAINING', history: 'Show History', settings: 'Settings', clear: 'Clear', undo: 'Undo', redo: 'Redo', commits: 'commits', events: 'Events', selected: 'Selected day', random: 'Random time', regenerate: 'Regenerate times', readable: 'Readable', technical: 'Technical', copy: 'Copy', copied: 'Copied', download: 'Download', empty: 'Select a day to inspect activity', mouse: 'Mouse controls', targetHint: 'Optional goal', clearConfirm: 'Clear all activity?', cancel: 'Cancel', confirm: 'Clear all', modeA: 'Left + / Right −', modeB: 'Left − / Right +', randomFrom: 'Random from', randomTo: 'to', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', noHistory: 'No activity yet', remainingSuffix: 'remaining', over: 'over goal' },
  ru: { subtitle: 'Визуальный планировщик активности', from: 'От', to: 'До', stats: 'Обзор', total: 'ВСЕГО', active: 'АКТИВНЫЕ ДНИ', target: 'ЦЕЛЬ', remaining: 'ОСТАЛОСЬ', history: 'Показать историю', settings: 'Настройки', clear: 'Очистить', undo: 'Отменить', redo: 'Повторить', commits: 'событий', events: 'События', selected: 'Выбранный день', random: 'Случайное время', regenerate: 'Перегенерировать', readable: 'Читаемый', technical: 'Технический', copy: 'Копировать', copied: 'Скопировано', download: 'Скачать', empty: 'Выберите день для просмотра активности', mouse: 'Управление мышью', targetHint: 'Необязательная цель', clearConfirm: 'Очистить всю активность?', cancel: 'Отмена', confirm: 'Очистить всё', modeA: 'Левая + / Правая −', modeB: 'Левая − / Правая +', randomFrom: 'Случайное время от', randomTo: 'до', language: 'Язык', theme: 'Тема', light: 'Светлая', dark: 'Тёмная', noHistory: 'Активности пока нет', remainingSuffix: 'осталось', over: 'сверх цели' }
} as const

const monthNames = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'] }
const weekdayNames = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] }

function getDay(state: PlannerState, date: ISODate): DayActivity { return state.days[date] ?? { date, events: [] } }
function displayDate(date: ISODate, language: Language, withYear = true): string {
  const parsed = parseISODate(date); if (!parsed) return date
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)))
}
function cellLevel(count: number): number { return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4 }
function reducer(state: PlannerState, action: Action): PlannerState {
  if (action.type === 'set-range') return { ...state, range: { from: action.from, to: action.to } }
  if (action.type === 'clear') return { ...state, days: {} }
  if (action.type === 'set-count') {
    const current = getDay(state, action.date); const count = Math.max(0, Math.min(99, Math.round(action.count)))
    const times = current.events.slice(0, count)
    while (times.length < count) times.push({ id: eventId(), time: '' })
    return { ...state, days: { ...state.days, [action.date]: { date: action.date, events: normalizeTimes(times) } } }
  }
  if (action.type === 'set-time') {
    const current = getDay(state, action.date); const events = current.events.map((event, index) => index === action.index ? { ...event, time: action.time } : event)
    return { ...state, days: { ...state.days, [action.date]: { date: action.date, events: normalizeTimes(events) } } }
  }
  if (action.type === 'set-target') return { ...state, target: action.target }
  if (action.type === 'set-language') return { ...state, settings: { ...state.settings, language: action.language } }
  if (action.type === 'set-theme') return { ...state, settings: { ...state.settings, theme: action.theme } }
  if (action.type === 'set-mouse-mode') return { ...state, settings: { ...state.settings, mouseMode: action.mode } }
  if (action.type === 'set-random-range') return { ...state, settings: { ...state.settings, randomTimeFrom: action.from, randomTimeTo: action.to } }
  return state
}

function Icon({ name }: { name: 'undo' | 'redo' | 'settings' | 'download' | 'copy' | 'sun' | 'moon' | 'chevron' }) {
  const paths = { undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-1', redo: 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h1', settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.3v-2.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2H15v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z', download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 20h16', copy: 'M8 8h10v12H8zM6 16H4V4h12v2', sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', moon: 'M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z', chevron: 'm6 9 6 6 6-6' }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="icon"><path d={paths[name]} /></svg>
}

function CalendarYear({ year, state, selected, onSelect, onAdjust }: { year: number; state: PlannerState; selected: ISODate | null; onSelect: (date: ISODate) => void; onAdjust: (date: ISODate, delta: number) => void }) {
  const [painting, setPainting] = useState(false); const visited = useRef(new Set<string>()); const lang = state.settings.language
  const yearDays = datesForYear(year); const first = yearDays[0]; const firstParsed = parseISODate(first)!; const startOffset = new Date(Date.UTC(firstParsed.year, 0, 1)).getUTCDay()
  const cells: Array<ISODate | null> = [...Array(startOffset).fill(null), ...yearDays]; while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const monthPositions = weeks.map(week => week.find(date => date && parseISODate(date)!.day <= 7)).map(date => date ? parseISODate(date)!.month : null)
  const adjust = (date: ISODate, delta: number) => { if (!isInRange(date, state.range)) return; onAdjust(date, delta) }
  const paint = (date: ISODate | null) => { if (!date || !isInRange(date, state.range) || visited.current.has(date)) return; visited.current.add(date); adjust(date, state.settings.mouseMode === 'left-plus' ? 1 : -1) }
  return <section className="year-section">
    <div className="year-heading"><span>{year}</span><span className="year-total">{yearDays.reduce((sum, date) => sum + getDay(state, date).events.length, 0)} {lang === 'en' ? 'events' : 'событий'}</span></div>
    <div className="calendar-scroll" onPointerUp={() => { setPainting(false); visited.current.clear() }} onPointerLeave={() => setPainting(false)}>
      <div className="calendar-grid" onContextMenu={event => event.preventDefault()}>
        <div className="weekday-labels">{weekdayNames[lang].map((name, i) => <span key={name} className={i % 2 === 1 ? 'weekday-visible' : ''}>{i % 2 === 1 ? name : ''}</span>)}</div>
        <div className="grid-content">
          <div className="month-row">{monthPositions.map((month, index) => <span key={index}>{month && monthPositions[index - 1] !== month ? monthNames[lang][month - 1] : ''}</span>)}</div>
          <div className="weeks">
            {weeks.map((week, weekIndex) => <div className="week" key={weekIndex}>{week.map((date, dayIndex) => {
              const valid = Boolean(date && isInRange(date, state.range)); const activity = date ? getDay(state, date) : null; const count = activity?.events.length ?? 0; const disabled = Boolean(date && !valid)
              return date ? <button key={`${weekIndex}-${dayIndex}`} type="button" className={`day-cell level-${cellLevel(count)} ${selected === date ? 'selected' : ''} ${disabled ? 'outside-range' : ''}`} disabled={!valid} title={`${displayDate(date, lang)} — ${count} ${copy[lang].commits}`} onClick={() => valid && onSelect(date)} onContextMenu={event => event.preventDefault()} onPointerDown={event => { if (!valid) return; event.preventDefault(); visited.current.clear(); setPainting(true); const isRight = event.button === 2; const delta = isRight ? (state.settings.mouseMode === 'left-plus' ? -1 : 1) : (state.settings.mouseMode === 'left-plus' ? 1 : -1); visited.current.add(date); adjust(date, delta); onSelect(date) }} onPointerEnter={() => { if (painting) paint(date) }} aria-label={`${displayDate(date, lang)} — ${count} ${copy[lang].commits}`} /> : <span key={`${weekIndex}-${dayIndex}`} className="day-cell empty-cell" aria-hidden="true" />
            })}</div>)}
          </div>
        </div>
      </div>
    </div>
  </section>
}

function PointerHalo() {
  const pointer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || !window.matchMedia('(pointer: fine)').matches) return
    const move = (event: PointerEvent) => {
      if (!pointer.current) return
      pointer.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
      pointer.current.dataset.interactive = event.target instanceof Element && Boolean(event.target.closest('button, input, select, [role="button"]')) ? 'true' : 'false'
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div ref={pointer} className="pointer-halo" aria-hidden="true" />
}

function App() {
  const [state, setState] = useState<PlannerState>(() => readPersistedState()); const [past, setPast] = useState<PlannerState[]>([]); const [future, setFuture] = useState<PlannerState[]>([])
  const [dateDraft, setDateDraft] = useState(state.range)
  const [selected, setSelected] = useState<ISODate | null>(null); const [showHistory, setShowHistory] = useState(false); const [showSettings, setShowSettings] = useState(false); const [confirmClear, setConfirmClear] = useState(false); const [copied, setCopied] = useState(false); const [historyMode, setHistoryMode] = useState<'readable' | 'technical'>('readable')
  const t = copy[state.settings.language]
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); document.documentElement.dataset.theme = state.settings.theme }, [state])
  useEffect(() => { setDateDraft(state.range) }, [state.range.from, state.range.to])
  const commit = (action: Action) => { setPast(items => [...items.slice(-49), state]); setFuture([]); setState(current => reducer(current, action)) }
  const undo = () => { const previous = past[past.length - 1]; if (!previous) return; setFuture(items => [state, ...items]); setPast(items => items.slice(0, -1)); setState(previous) }
  const redo = () => { const next = future[0]; if (!next) return; setPast(items => [...items, state]); setFuture(items => items.slice(1)); setState(next) }
  const years = useMemo(() => { const from = parseISODate(state.range.from); const to = parseISODate(state.range.to); if (!from || !to) return []; return Array.from({ length: to.year - from.year + 1 }, (_, i) => from.year + i) }, [state.range])
  const total = countEvents(state.days); const active = activeDays(state.days); const remaining = state.target === null ? null : state.target - total
  const selectedDay = selected ? getDay(state, selected) : null
  const history = useMemo(() => sortedEvents(state.days), [state.days]); const technicalText = history.map(item => `${item.date} ${item.event.time}`).join('\n')
  const setCount = (date: ISODate, count: number) => commit({ type: 'set-count', date, count })
  const adjust = (date: ISODate, delta: number) => { const current = getDay(state, date).events.length; setCount(date, Math.max(0, current + delta)) }
  const regenerate = () => { if (!selectedDay || selectedDay.events.length === 0) return; const times = generateRandomTimes(selectedDay.events.length, state.settings.randomTimeFrom, state.settings.randomTimeTo); times.forEach((time, index) => commit({ type: 'set-time', date: selectedDay.date, index, time })) }
  const changeTime = (index: number, value: string) => { if (/^\d{0,2}:?\d{0,2}$/.test(value) && (value === '' || value.length <= 5)) commit({ type: 'set-time', date: selectedDay!.date, index, time: value }) }
  const updateDate = (field: 'from' | 'to', value: string) => {
    const nextDraft = { ...dateDraft, [field]: value }
    setDateDraft(nextDraft)
    if (!isValidDate(value)) return
    const nextRange = field === 'from' ? { from: value, to: value > dateDraft.to ? value : dateDraft.to } : { from: value < dateDraft.from ? value : dateDraft.from, to: value }
    commit({ type: 'set-range', ...nextRange })
  }
  const exportData = (format: 'txt' | 'json') => { if (format === 'txt') downloadFile('gridate-history.txt', technicalText, 'text/plain;charset=utf-8'); else downloadFile('gridate-history.json', JSON.stringify({ range: state.range, target: state.target, events: history.map(({ date, event }) => ({ date, time: event.time })) }, null, 2), 'application/json'); }
  const copyHistory = async () => { await navigator.clipboard?.writeText(technicalText); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }

  return <>
    <PointerHalo />
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">G</div><div><p className="eyebrow">GRIDATE / WORKSPACE</p><h1>Gridate</h1><p>{t.subtitle}</p></div></div>
        <div className="header-status"><span className="status-dot" />LOCAL / PRIVATE</div>
        <div className="top-actions"><div className="segmented"><button className={state.settings.language === 'ru' ? 'active' : ''} onClick={() => commit({ type: 'set-language', language: 'ru' })}>RU</button><button className={state.settings.language === 'en' ? 'active' : ''} onClick={() => commit({ type: 'set-language', language: 'en' })}>EN</button></div><button className="icon-button" aria-label={t.theme} onClick={() => commit({ type: 'set-theme', theme: state.settings.theme === 'dark' ? 'light' : 'dark' })}><Icon name={state.settings.theme === 'dark' ? 'sun' : 'moon'} /></button><button className="icon-button" aria-label={t.settings} onClick={() => setShowSettings(value => !value)}><Icon name="settings" /></button></div>
      </header>
      <main className="workspace">
        <section className="hero-strip"><div><p className="eyebrow">VISUAL ACTIVITY TIMELINE</p><h2>Paint activity. Shape time.</h2></div><div className="hero-readout"><span>{years.length} YEARS</span><strong>{total} {t.commits}</strong></div></section>
        <section className="command-panel panel"><div className="panel-kicker">01 / RANGE</div><div className="command-row"><div className="date-fields"><label>{t.from}<input type="date" value={dateDraft.from} onChange={event => updateDate('from', event.currentTarget.value)} /></label><span className="arrow">→</span><label>{t.to}<input type="date" value={dateDraft.to} onChange={event => updateDate('to', event.currentTarget.value)} /></label></div><div className="toolbar-actions"><button className="ghost-button" onClick={undo} disabled={!past.length}><Icon name="undo" />{t.undo}</button><button className="ghost-button" onClick={redo} disabled={!future.length}><Icon name="redo" />{t.redo}</button><button className="danger-button" onClick={() => setConfirmClear(true)} disabled={total === 0}>{t.clear}</button></div></div></section>
        <section className="overview-row"><section className="overview-panel panel"><div className="panel-kicker">02 / {t.stats.toUpperCase()}</div><div className="stats-grid"><div><span>{t.total}</span><strong>{total}</strong></div><div><span>{t.active}</span><strong>{active}</strong></div><div><span>{t.target}</span><input className="target-input" type="number" min="0" max="99999" placeholder="—" value={state.target ?? ''} onChange={event => commit({ type: 'set-target', target: event.target.value === '' ? null : Math.max(0, Number(event.target.value)) })} /></div><div><span>{t.remaining}</span><strong className={remaining !== null && remaining < 0 ? 'positive' : ''}>{remaining === null ? '—' : remaining < 0 ? `+${Math.abs(remaining)}` : remaining}</strong><small>{remaining !== null ? remaining < 0 ? t.over : t.remainingSuffix : t.targetHint}</small></div></div><div className="signal-track"><span style={{ width: `${state.target && state.target > 0 ? Math.min(100, total / state.target * 100) : total ? 100 : 0}%` }} /></div></section><section className="overview-panel panel interaction-card"><div className="panel-kicker">03 / PAINT MODE</div><strong>{state.settings.mouseMode === 'left-plus' ? 'L +  /  R −' : 'L −  /  R +'}</strong><p>{t.mouse} · {state.settings.mouseMode === 'left-plus' ? 'Left click adds activity' : 'Left click removes activity'}</p></section></section>
        <section className="calendar-panel panel"><div className="panel-heading"><div><p className="panel-kicker">04 / CALENDAR</p><h2>Activity calendar</h2><p>{years.length} {years.length === 1 ? 'year' : 'years'} · {t.commits}</p></div><div className="legend"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className={`day-cell level-${level}`} />)}<span>More</span></div></div>{years.map(year => <CalendarYear key={year} year={year} state={state} selected={selected} onSelect={setSelected} onAdjust={adjust} />)}</section>
        <section className="lower-grid"><section className="day-editor panel"><div className="panel-kicker">05 / {t.selected.toUpperCase()}</div>{selectedDay ? <><div className="selected-date">{displayDate(selectedDay.date, state.settings.language)}</div><div className="count-control"><span>{t.events}</span><button onClick={() => adjust(selectedDay.date, -1)} disabled={!selectedDay.events.length}>−</button><strong>{selectedDay.events.length}</strong><button onClick={() => adjust(selectedDay.date, 1)} disabled={selectedDay.events.length >= 99}>+</button></div><div className="time-list">{selectedDay.events.map((event, index) => <label key={event.id}><span>{String(index + 1).padStart(2, '0')}</span><input type="time" value={event.time} onChange={e => changeTime(index, e.target.value)} /></label>)}</div>{selectedDay.events.length > 0 && <button className="outline-button full" onClick={regenerate}>{t.regenerate}</button>}</> : <div className="empty-state">{t.empty}</div>}</section><section className="tools-panel panel"><div className="panel-kicker">06 / {t.random.toUpperCase()}</div><div className="random-fields"><label>{t.randomFrom}<input type="time" value={state.settings.randomTimeFrom} onChange={e => commit({ type: 'set-random-range', from: e.target.value, to: state.settings.randomTimeTo })} /></label><label>{t.randomTo}<input type="time" value={state.settings.randomTimeTo} onChange={e => commit({ type: 'set-random-range', from: state.settings.randomTimeFrom, to: e.target.value })} /></label></div><div className="mouse-preview"><span>{t.mouse}</span><strong>{state.settings.mouseMode === 'left-minus' ? 'L −  /  R +' : 'L +  /  R −'}</strong></div><p className="helper-copy">{state.settings.mouseMode === 'left-plus' ? 'Left click adds activity' : 'Left click removes activity'}</p></section></section>
        <section className="history-panel panel"><div className="panel-heading"><div><p className="panel-kicker">07 / HISTORY</p><h2>{t.history}</h2><p>{history.length} {t.commits}</p></div><div className="history-actions"><button className="outline-button" onClick={() => setShowHistory(value => !value)}>{showHistory ? 'Hide' : t.history}</button>{showHistory && <><div className="segmented"><button className={historyMode === 'readable' ? 'active' : ''} onClick={() => setHistoryMode('readable')}>{t.readable}</button><button className={historyMode === 'technical' ? 'active' : ''} onClick={() => setHistoryMode('technical')}>{t.technical}</button></div><button className="icon-button" title={t.copy} onClick={copyHistory}><Icon name="copy" /></button><button className="icon-button" title={t.download} onClick={() => exportData('txt')}><Icon name="download" /></button></>}</div></div>{showHistory && <div className="history-content">{history.length === 0 ? <div className="empty-state">{t.noHistory}</div> : historyMode === 'technical' ? <pre>{technicalText}</pre> : <div className="readable-history">{years.map(year => { const entries = history.filter(item => item.date.startsWith(`${year}-`)); const grouped = entries.reduce<Record<string, typeof entries>>((groups, item) => { (groups[item.date] ??= []).push(item); return groups }, {}); return entries.length ? <div key={year}><h3>{year}</h3>{Object.entries(grouped).map(([date, items]) => <div className="history-day" key={date}><strong>{displayDate(date, state.settings.language)}</strong>{items.map(item => <span key={item.event.id}>{item.event.time}</span>)}</div>)}</div> : null })}</div>}{showHistory && <div className="download-row"><button className="text-button" onClick={() => exportData('txt')}><Icon name="download" />TXT</button><button className="text-button" onClick={() => exportData('json')}><Icon name="download" />JSON</button>{copied && <span className="copied-feedback">{t.copied}</span>}</div>}</div>}</section>
      </main>
      {showSettings && <div className="settings-popover panel"><div className="popover-title"><strong>{t.settings}</strong><button className="close-button" onClick={() => setShowSettings(false)}>×</button></div><label>{t.mouse}<select value={state.settings.mouseMode} onChange={e => commit({ type: 'set-mouse-mode', mode: e.target.value as PlannerState['settings']['mouseMode'] })}><option value="left-plus">{t.modeA}</option><option value="left-minus">{t.modeB}</option></select></label><label>{t.language}<select value={state.settings.language} onChange={e => commit({ type: 'set-language', language: e.target.value as Language })}><option value="en">English</option><option value="ru">Русский</option></select></label><label>{t.theme}<select value={state.settings.theme} onChange={e => commit({ type: 'set-theme', theme: e.target.value as Theme })}><option value="dark">{t.dark}</option><option value="light">{t.light}</option></select></label></div>}
      {confirmClear && <div className="modal-backdrop"><div className="confirm-modal panel"><h2>{t.clearConfirm}</h2><p>{t.noHistory}</p><div><button className="ghost-button" onClick={() => setConfirmClear(false)}>{t.cancel}</button><button className="danger-button" onClick={() => { commit({ type: 'clear' }); setConfirmClear(false); setSelected(null) }}>{t.confirm}</button></div></div></div>}
      <footer>Gridate <span>·</span> {t.subtitle} <span>·</span> browser-only, private by default</footer>
    </div>
  </>
}

export default App
