export type ISODate = string
export type HHMM = string
export type Language = 'ru' | 'en'
export type Theme = 'dark' | 'light'
export type MouseMode = 'left-minus' | 'left-plus'

export interface TimelineEvent { id: string; time: HHMM }
export interface DayActivity { date: ISODate; events: TimelineEvent[] }
export interface PlannerState {
  version: 1
  range: { from: ISODate; to: ISODate }
  target: number | null
  days: Record<ISODate, DayActivity>
  settings: {
    language: Language
    theme: Theme
    mouseMode: MouseMode
    randomTimeFrom: HHMM
    randomTimeTo: HHMM
  }
}

export type Action =
  | { type: 'set-range'; from: ISODate; to: ISODate }
  | { type: 'set-count'; date: ISODate; count: number }
  | { type: 'set-time'; date: ISODate; index: number; time: HHMM }
  | { type: 'set-target'; target: number | null }
  | { type: 'set-language'; language: Language }
  | { type: 'set-theme'; theme: Theme }
  | { type: 'set-mouse-mode'; mode: MouseMode }
  | { type: 'set-random-range'; from: HHMM; to: HHMM }
  | { type: 'clear' }

export const STORAGE_KEY = 'gridate.state.v1'
