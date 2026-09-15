import { describe, expect, it } from 'vitest'
import { daysBetween, generateRandomTimes, isValidDate, parseISODate } from './utils'

describe('date helpers', () => {
  it('handles leap day without timezone shifts', () => {
    expect(isValidDate('2024-02-29')).toBe(true)
    expect(parseISODate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 })
    expect(daysBetween('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01'])
  })
  it('rejects invalid dates and reversed ranges', () => {
    expect(isValidDate('2023-02-29')).toBe(false)
    expect(daysBetween('2024-01-02', '2024-01-01')).toEqual([])
  })
})

describe('random times', () => {
  it('returns sorted times inside the requested range', () => {
    const values = generateRandomTimes(8, '18:00', '18:30')
    expect(values).toHaveLength(8)
    expect(values.every(value => value >= '18:00' && value <= '18:30')).toBe(true)
    expect(values).toEqual([...values].sort())
  })
  it('handles zero and invalid ranges safely', () => {
    expect(generateRandomTimes(0, '18:00', '19:00')).toEqual([])
    expect(generateRandomTimes(2, 'bad', 'also-bad')).toHaveLength(2)
  })
})
